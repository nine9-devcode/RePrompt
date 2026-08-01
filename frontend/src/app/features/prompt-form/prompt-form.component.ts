import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  OnInit,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { PromptService } from '../../core/services/prompt.service';
import { SettingsService } from '../../core/services/settings.service';
import { ToastService } from '../../core/services/toast.service';
import { Prompt, Suggestions } from '../../core/models/prompt.model';
import { TagInputComponent } from '../../shared/components/tag-input/tag-input.component';

interface ImageMeta {
  name: string;
  width: number;
  height: number;
  size: string;
}

/** `datetime-local` expects local wall-clock time; toISOString() would shift it by the UTC offset. */
function toDateTimeLocalValue(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

@Component({
  selector: 'app-prompt-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TagInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './prompt-form.component.html',
})
export class PromptFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly promptService = inject(PromptService);
  private readonly settings = inject(SettingsService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly promptForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    positivePrompt: ['', Validators.required],
    negativePrompt: [''],
    modelName: [''],
    sampler: ['Euler a'],
    steps: [20, [Validators.min(1), Validators.max(1000)]],
    cfgScale: [7.0, [Validators.min(0), Validators.max(100)]],
    seed: [''],
    category: ['General'],
    isNsfw: [false],
    createdAt: [toDateTimeLocalValue(new Date())],
  });

  protected readonly suggestions = signal<Suggestions>({
    models: [],
    samplers: [],
    categories: [],
    tags: [],
  });

  /** Tags live outside the reactive form; the chip editor owns them. */
  protected readonly tags = signal<string[]>([]);
  protected readonly imagePreview = signal<string | null>(null);
  protected readonly imageMeta = signal<ImageMeta | null>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly isEditMode = signal(false);
  protected readonly isDragging = signal(false);

  private selectedFile: File | null = null;
  private promptId: number | null = null;
  private existingImageUrl: string | null = null;
  private dragCounter = 0;

  ngOnInit(): void {
    this.promptService.getSuggestions().subscribe({
      next: data => this.suggestions.set(data),
      error: () => this.suggestions.set({ models: [], samplers: [], categories: [], tags: [] }),
    });

    this.promptForm.controls.positivePrompt.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => this.checkNsfwKeywords(value, this.promptForm.controls.negativePrompt.value));

    this.promptForm.controls.negativePrompt.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => this.checkNsfwKeywords(this.promptForm.controls.positivePrompt.value, value));

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.promptId = Number(id);
      this.loadPrompt(this.promptId);
    }
  }

  protected selectOption(controlName: 'category' | 'modelName' | 'sampler', value: string): void {
    this.promptForm.controls[controlName].setValue(value);
  }

  private checkNsfwKeywords(positive: string, negative: string): void {
    if (this.promptForm.controls.isNsfw.value) return;

    const matched = this.settings
      .keywordList()
      .find(keyword => `${positive} ${negative}`.toLowerCase().includes(keyword));

    if (matched) {
      this.promptForm.controls.isNsfw.setValue(true, { emitEvent: false });
      this.toastService.show(`ตรวจพบคำที่เกี่ยวข้องกับ NSFW: "${matched}" (AUTO_FLAGGED)`, 'info');
    }
  }

  private loadPrompt(id: number): void {
    this.promptService.getPrompt(id).subscribe({
      next: prompt => {
        this.promptForm.patchValue({
          title: prompt.title,
          positivePrompt: prompt.positivePrompt,
          negativePrompt: prompt.negativePrompt ?? '',
          modelName: prompt.modelName ?? '',
          sampler: prompt.sampler ?? '',
          steps: prompt.steps,
          cfgScale: prompt.cfgScale,
          seed: prompt.seed ?? '',
          category: prompt.category,
          isNsfw: prompt.isNsfw ?? false,
          createdAt: toDateTimeLocalValue(prompt.createdAt ? new Date(prompt.createdAt) : new Date()),
        });

        this.tags.set(prompt.tags ?? []);

        if (prompt.images?.length) {
          this.existingImageUrl = prompt.images[0].imageUrl;
          this.imagePreview.set(this.promptService.absoluteImageUrl(this.existingImageUrl));
        }
      },
      error: error => {
        console.error('Failed to load prompt', error);
        this.toastService.show('ไม่สามารถโหลดข้อมูลได้ (LOAD_FAILED)', 'error');
      },
    });
  }

  @HostListener('window:dragenter', ['$event'])
  protected onDragEnter(event: DragEvent): void {
    event.preventDefault();
    this.dragCounter++;
    this.isDragging.set(true);
  }

  @HostListener('window:dragover', ['$event'])
  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  @HostListener('window:dragleave', ['$event'])
  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragCounter = Math.max(0, this.dragCounter - 1);
    if (this.dragCounter === 0) this.isDragging.set(false);
  }

  @HostListener('window:drop', ['$event'])
  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    this.dragCounter = 0;

    const file = event.dataTransfer?.files?.[0];
    if (file?.type.startsWith('image/')) void this.processFile(file);
  }

  protected onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) void this.processFile(file);
  }

  private async processFile(file: File): Promise<void> {
    if (!this.isBrowser) return;

    this.selectedFile = file;

    if (!this.promptForm.controls.title.value) {
      this.promptForm.controls.title.setValue(file.name.replace(/\.[^/.]+$/, ''));
    }

    const reader = new FileReader();
    reader.onload = () => this.imagePreview.set(reader.result as string);
    reader.readAsDataURL(file);

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      this.imageMeta.set({
        name: file.name,
        width: image.width,
        height: image.height,
        size: formatBytes(file.size),
      });
      URL.revokeObjectURL(objectUrl);
    };
    image.onerror = () => URL.revokeObjectURL(objectUrl);
    image.src = objectUrl;

    try {
      const exifr = (await import('exifr')).default;
      const metadata = await exifr.parse(file, true);
      const rawParams = metadata?.parameters || metadata?.UserComment;
      if (rawParams) {
        this.parseSDParameters(String(rawParams));
        this.toastService.show('ดึงข้อมูลจากรูปภาพสำเร็จ (METADATA_EXTRACTED)', 'success');
      }
    } catch (error) {
      console.warn('Metadata parsing skipped or failed', error);
    }
  }

  private parseSDParameters(rawText: string): void {
    const positive = rawText.split('Negative prompt:')[0].split('Steps:')[0].trim();

    const negative = rawText.includes('Negative prompt:')
      ? rawText.split('Negative prompt:')[1].split('Steps:')[0].trim()
      : '';

    const settingsPart = rawText.includes('Steps:') ? `Steps:${rawText.split('Steps:')[1]}` : '';
    const getValue = (key: string): string | null => {
      const match = settingsPart.match(new RegExp(`${key}:\\s*([^,]+)`, 'i'));
      return match ? match[1].trim() : null;
    };

    const steps = getValue('Steps');
    const cfg = getValue('CFG scale');
    const current = this.promptForm.getRawValue();

    this.promptForm.patchValue({
      positivePrompt: positive,
      negativePrompt: negative,
      steps: steps ? Number.parseInt(steps, 10) : current.steps,
      sampler: getValue('Sampler') ?? current.sampler,
      cfgScale: cfg ? Number.parseFloat(cfg) : current.cfgScale,
      seed: getValue('Seed') ?? current.seed,
      modelName: getValue('Model') ?? current.modelName,
    });

    this.checkNsfwKeywords(positive, negative);
  }

  protected onSubmit(): void {
    if (this.promptForm.invalid || this.isSubmitting()) return;
    this.isSubmitting.set(true);

    if (this.selectedFile) {
      this.promptService.uploadImage(this.selectedFile).subscribe({
        next: response => this.saveOrUpdatePrompt(response.url, response.url),
        error: error => {
          console.error('Upload failed', error);
          this.toastService.show('อัปโหลดรูปล้มเหลว (UPLOAD_FAILED)', 'error');
          this.isSubmitting.set(false);
        },
      });
    } else {
      this.saveOrUpdatePrompt(this.existingImageUrl ?? undefined);
    }
  }

  /**
   * @param freshUploadUrl set only when this save follows a new upload, so the file can be
   *        cleaned up if the save fails and nothing ends up referencing it.
   */
  private saveOrUpdatePrompt(imageUrl?: string, freshUploadUrl?: string): void {
    const value = this.promptForm.getRawValue();

    const promptData: Prompt = {
      ...value,
      // The control holds local wall-clock time; send an absolute instant.
      createdAt: value.createdAt ? new Date(value.createdAt) : undefined,
      tags: this.tags(),
      images: imageUrl ? [{ imageUrl }] : [],
    };

    const request$ =
      this.isEditMode() && this.promptId !== null
        ? this.promptService.updatePrompt(this.promptId, promptData)
        : this.promptService.createPrompt(promptData);

    const successMessage = this.isEditMode()
      ? 'อัปเดตข้อมูลสำเร็จ (RESOURCE_UPDATED)'
      : 'บันทึกข้อมูลสำเร็จ (RESOURCE_CREATED)';
    const failureMessage = this.isEditMode()
      ? 'การอัปเดตล้มเหลว (UPDATE_FAILED)'
      : 'การบันทึกล้มเหลว (SAVE_FAILED)';

    request$.subscribe({
      next: () => {
        this.toastService.show(successMessage, 'success');
        void this.router.navigate(['/']);
      },
      error: error => {
        console.error('Save failed', error);
        this.toastService.show(failureMessage, 'error');
        this.isSubmitting.set(false);

        if (freshUploadUrl) {
          this.promptService.discardUpload(freshUploadUrl).subscribe({
            error: cleanupError => console.warn('Could not discard orphaned upload', cleanupError),
          });
        }
      },
    });
  }
}

function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(Math.max(0, decimals)))} ${sizes[i]}`;
}
