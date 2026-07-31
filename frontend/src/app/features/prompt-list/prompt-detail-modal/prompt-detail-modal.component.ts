import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  PLATFORM_ID,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Prompt } from '../../../core/models/prompt.model';
import { PromptService } from '../../../core/services/prompt.service';
import { SettingsService } from '../../../core/services/settings.service';
import { NsfwOverlayComponent } from '../../../shared/components/nsfw-overlay/nsfw-overlay.component';

@Component({
  selector: 'app-prompt-detail-modal',
  standalone: true,
  imports: [DatePipe, RouterLink, NsfwOverlayComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './prompt-detail-modal.component.html',
})
export class PromptDetailModalComponent implements AfterViewInit, OnDestroy {
  private readonly promptService = inject(PromptService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly settings = inject(SettingsService);

  readonly prompt = input.required<Prompt>();
  readonly revealed = input(false);

  readonly closed = output<void>();
  readonly reveal = output<void>();
  readonly copyText = output<{ text: string; message: string }>();

  protected readonly zoomScale = signal(1);
  protected readonly panX = signal(0);
  protected readonly panY = signal(0);

  private readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');
  private previouslyFocused: HTMLElement | null = null;

  private panStartX = 0;
  private panStartY = 0;
  private onPanMove?: (event: MouseEvent) => void;
  private onPanEnd?: () => void;

  protected readonly isBlurred = computed(
    () => !!this.prompt().isNsfw && !this.settings.showNsfw() && !this.revealed()
  );

  protected readonly isBlockedOut = computed(
    () => this.isBlurred() && this.settings.censorStyle() === 'block'
  );

  protected readonly censorFilter = computed(() =>
    this.isBlurred() ? this.settings.buildCensorFilter() : 'none'
  );

  protected readonly imageUrl = computed(() => {
    const images = this.prompt().images;
    return images?.length ? this.promptService.absoluteImageUrl(images[0].imageUrl) : '';
  });

  protected readonly transform = computed(
    () =>
      `scale(${this.zoomScale()}) translate(${this.panX() / this.zoomScale()}px, ${this.panY() / this.zoomScale()}px)`
  );

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    this.previouslyFocused = document.activeElement as HTMLElement | null;
    this.dialog()?.nativeElement.focus();
  }

  ngOnDestroy(): void {
    this.endPan();
    this.previouslyFocused?.focus();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.closed.emit();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closed.emit();
  }

  protected resetZoom(): void {
    this.zoomScale.set(1);
    this.panX.set(0);
    this.panY.set(0);
  }

  protected doZoom(event: WheelEvent): void {
    event.preventDefault();
    const step = 0.1;
    this.zoomScale.update(scale => Math.min(8, Math.max(0.5, scale + (event.deltaY < 0 ? step : -step))));
  }

  /**
   * Listeners are attached on mousedown and removed on mouseup, rather than a permanent
   * (mousemove) binding that ran change detection on every pointer move over the modal.
   * Listening on the document also means a drag that leaves the image still tracks.
   */
  protected startPan(event: MouseEvent): void {
    if (!this.isBrowser || this.zoomScale() <= 1) return;
    event.preventDefault();

    this.panStartX = event.clientX - this.panX();
    this.panStartY = event.clientY - this.panY();

    this.onPanMove = move => {
      this.panX.set(move.clientX - this.panStartX);
      this.panY.set(move.clientY - this.panStartY);
    };
    this.onPanEnd = () => this.endPan();

    document.addEventListener('mousemove', this.onPanMove);
    document.addEventListener('mouseup', this.onPanEnd);
  }

  private endPan(): void {
    if (!this.isBrowser) return;
    if (this.onPanMove) document.removeEventListener('mousemove', this.onPanMove);
    if (this.onPanEnd) document.removeEventListener('mouseup', this.onPanEnd);
    this.onPanMove = undefined;
    this.onPanEnd = undefined;
  }
}
