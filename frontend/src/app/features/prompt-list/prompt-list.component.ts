import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NgClass, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Prompt, Suggestions } from '../../core/models/prompt.model';
import { PromptService } from '../../core/services/prompt.service';
import { SettingsService } from '../../core/services/settings.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { FilterBarComponent } from '../../shared/components/filter-bar/filter-bar.component';
import { PixelateFilterComponent } from '../../shared/components/pixelate-filter/pixelate-filter.component';
import { PromptCardComponent } from '../../shared/components/prompt-card/prompt-card.component';
import { PromptDetailModalComponent } from './prompt-detail-modal/prompt-detail-modal.component';

interface PendingConfirm {
  title: string;
  message: string;
  action: () => void;
}

const PAGE_SIZE = 20;

@Component({
  selector: 'app-prompt-list',
  standalone: true,
  imports: [
    NgClass,
    RouterLink,
    ConfirmDialogComponent,
    FilterBarComponent,
    PixelateFilterComponent,
    PromptCardComponent,
    PromptDetailModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './prompt-list.component.html',
})
export class PromptListComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly promptService = inject(PromptService);
  private readonly toastService = inject(ToastService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly settings = inject(SettingsService);

  protected readonly prompts = signal<Prompt[]>([]);
  protected readonly totalFound = signal(0);
  protected readonly loading = signal(true);
  protected readonly isLoadingMore = signal(false);
  protected readonly suggestions = signal<Suggestions>({
    models: [],
    samplers: [],
    categories: [],
    tags: [],
  });

  protected readonly search = signal('');
  protected readonly category = signal('');
  protected readonly selectedModel = signal('');
  protected readonly selectedTags = signal<string[]>([]);

  protected readonly selectedPrompt = signal<Prompt | null>(null);
  protected readonly revealedIds = signal<ReadonlySet<number>>(new Set());
  protected readonly pendingConfirm = signal<PendingConfirm | null>(null);

  private readonly sentinel = viewChild<ElementRef<HTMLElement>>('sentinel');
  private observer: IntersectionObserver | null = null;
  private sentinelVisible = false;

  ngOnInit(): void {
    this.fetchData();
    this.promptService.getSuggestions().subscribe({
      next: data => this.suggestions.set(data),
      error: () => this.suggestions.set({ models: [], samplers: [], categories: [], tags: [] }),
    });
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    this.observer = new IntersectionObserver(
      entries => {
        this.sentinelVisible = entries.some(entry => entry.isIntersecting);
        this.loadMoreIfSentinelVisible();
      },
      { root: null, rootMargin: '200px', threshold: 0.1 }
    );

    const element = this.sentinel()?.nativeElement;
    if (element) this.observer.observe(element);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.restoreScroll();
  }

  protected isRevealed(id: number | undefined): boolean {
    return id !== undefined && this.revealedIds().has(id);
  }

  protected toggleReveal(id: number | undefined): void {
    if (id === undefined) return;
    this.revealedIds.update(current => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  protected onFiltersChanged(): void {
    this.fetchData();
  }

  protected resetFilters(): void {
    this.search.set('');
    this.category.set('');
    this.selectedModel.set('');
    this.selectedTags.set([]);
    this.fetchData();
  }

  protected get hasActiveFilters(): boolean {
    return (
      this.search() !== '' ||
      this.category() !== '' ||
      this.selectedModel() !== '' ||
      this.selectedTags().length > 0
    );
  }

  /** Clicking a tag on a card or in the modal narrows the gallery to it. */
  protected onTagSelected(tag: string): void {
    if (this.selectedTags().includes(tag)) return;
    this.selectedTags.set([...this.selectedTags(), tag]);
    this.closeModal();
    this.fetchData();
  }

  protected toggleStrictHide(): void {
    const next = !this.settings.strictHideNsfw();
    this.settings.setStrictHideNsfw(next);
    this.toastService.show(
      next ? 'เปิดโหมดปลอดภัยแล้ว (STRICT_MODE_ON)' : 'ปิดโหมดปลอดภัยแล้ว (STRICT_MODE_OFF)',
      'success'
    );
    // Strict mode is a server-side filter now, so the list has to be refetched for
    // totalFound to stay consistent with what is rendered.
    this.fetchData();
  }

  protected toggleGlobalNsfw(): void {
    if (this.settings.showNsfw()) {
      this.settings.setShowNsfw(false);
      this.toastService.show('โหมดเซ็นเซอร์เปิดอยู่ (CENSORED_MODE)', 'success');
      return;
    }

    this.pendingConfirm.set({
      title: 'SYSTEM_WARNING',
      message: 'คุณกำลังจะเปิดการแสดงผลเนื้อหา NSFW (18+) ทั้งหมด คุณแน่ใจหรือไม่?',
      action: () => {
        this.settings.setShowNsfw(true);
        this.toastService.show('โหมดไม่เซ็นเซอร์เปิดอยู่ (UNCENSORED_MODE)', 'success');
      },
    });
  }

  protected onDelete(id: number): void {
    this.pendingConfirm.set({
      title: 'SYSTEM_ACTION',
      message: 'คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนี้ออกจากฐานข้อมูลอย่างถาวร?',
      action: () => {
        this.promptService.deletePrompt(id).subscribe({
          next: () => {
            this.prompts.update(current => current.filter(prompt => prompt.id !== id));
            this.totalFound.update(total => Math.max(0, total - 1));
            if (this.selectedPrompt()?.id === id) this.closeModal();
            this.toastService.show('ลบข้อมูลสำเร็จ (RESOURCE_PURGED)', 'success');
            // The list just got shorter, which may have pulled the sentinel into view.
            this.loadMoreIfSentinelVisible();
          },
          error: error => {
            console.error('Purge failed', error);
            this.toastService.show('การลบล้มเหลว (PURGE_FAILED)', 'error');
          },
        });
      },
    });
  }

  protected runConfirm(): void {
    const pending = this.pendingConfirm();
    this.pendingConfirm.set(null);
    pending?.action();
  }

  protected openModal(prompt: Prompt): void {
    if (!prompt.images?.length) return;
    this.selectedPrompt.set(prompt);
    if (this.isBrowser) document.body.style.overflow = 'hidden';
  }

  protected closeModal(): void {
    this.selectedPrompt.set(null);
    this.restoreScroll();
  }

  protected copyToClipboard(payload: { text: string; message: string }): void {
    if (!this.isBrowser) return;
    navigator.clipboard.writeText(payload.text).then(
      () => this.toastService.show(payload.message, 'success'),
      error => {
        console.error('Clipboard write failed', error);
        this.toastService.show('คัดลอกไม่สำเร็จ (COPY_FAILED)', 'error');
      }
    );
  }

  /**
   * IntersectionObserver only reports transitions. Once the sentinel is on screen and
   * stays there — a short page, or a delete that shrinks the list — no further callback
   * arrives, so loading has to be re-checked after every list change.
   */
  private loadMoreIfSentinelVisible(): void {
    if (!this.sentinelVisible || this.loading() || this.isLoadingMore()) return;
    if (this.prompts().length >= this.totalFound()) return;

    // Using the loaded count as the offset keeps paging correct after a delete, which
    // a separately tracked offset did not.
    this.fetchData(true);
  }

  private fetchData(append = false): void {
    if (append) {
      this.isLoadingMore.set(true);
    } else {
      this.loading.set(true);
    }

    this.promptService
      .getPrompts({
        search: this.search(),
        category: this.category(),
        model: this.selectedModel(),
        tags: this.selectedTags(),
        includeNsfw: !this.settings.strictHideNsfw(),
        limit: PAGE_SIZE,
        offset: append ? this.prompts().length : 0,
      })
      .subscribe({
        next: response => {
          this.prompts.update(current => (append ? [...current, ...response.prompts] : response.prompts));
          this.totalFound.set(response.totalCount);
          this.loading.set(false);
          this.isLoadingMore.set(false);
          // A short first page can leave the sentinel on screen with nothing to re-trigger it.
          this.loadMoreIfSentinelVisible();
        },
        error: error => {
          console.error('Error loading prompts:', error);
          this.loading.set(false);
          this.isLoadingMore.set(false);
          this.toastService.show('ไม่สามารถโหลดข้อมูลได้ (STREAMS_ERROR)', 'error');
        },
      });
  }

  private restoreScroll(): void {
    if (this.isBrowser) document.body.style.overflow = '';
  }
}
