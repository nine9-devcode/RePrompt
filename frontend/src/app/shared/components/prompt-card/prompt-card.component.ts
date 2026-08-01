import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Prompt } from '../../../core/models/prompt.model';
import { PromptService } from '../../../core/services/prompt.service';
import { SettingsService } from '../../../core/services/settings.service';
import { NsfwOverlayComponent } from '../nsfw-overlay/nsfw-overlay.component';

@Component({
  selector: 'app-prompt-card',
  standalone: true,
  imports: [DatePipe, RouterLink, NsfwOverlayComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './prompt-card.component.html',
})
export class PromptCardComponent {
  private readonly promptService = inject(PromptService);
  protected readonly settings = inject(SettingsService);

  readonly prompt = input.required<Prompt>();
  /** Set when the user has clicked through this specific card's censor. */
  readonly revealed = input(false);

  readonly openDetail = output<Prompt>();
  readonly reveal = output<void>();
  readonly recensor = output<void>();
  readonly remove = output<number>();
  readonly copyText = output<{ text: string; message: string }>();
  readonly tagSelected = output<string>();

  // Derived from signals, so the parent no longer has to rebuild the whole prompt
  // array every time a censor setting changes.
  protected readonly isBlurred = computed(
    () => !!this.prompt().isNsfw && !this.settings.showNsfw() && !this.revealed()
  );

  protected readonly isBlockedOut = computed(
    () => this.isBlurred() && this.settings.censorStyle() === 'block'
  );

  protected readonly censorFilter = computed(() =>
    this.isBlurred() ? this.settings.buildCensorFilter() : 'none'
  );

  private readonly firstImage = computed(() => this.prompt().images?.[0]);

  /** Prefers the generated thumbnail; older rows without one fall back to the original. */
  protected readonly imageUrl = computed(() => {
    const image = this.firstImage();
    if (!image) return '';
    return this.promptService.absoluteImageUrl(image.thumbnailUrl ?? image.imageUrl);
  });

  // Given to the <img> so the browser reserves the right box before the file arrives,
  // which stops the masonry columns reflowing as images stream in.
  protected readonly width = computed(() => this.firstImage()?.width ?? null);
  protected readonly height = computed(() => this.firstImage()?.height ?? null);

  protected onPreviewClick(): void {
    if (this.isBlurred()) {
      this.reveal.emit();
    } else {
      this.openDetail.emit(this.prompt());
    }
  }
}
