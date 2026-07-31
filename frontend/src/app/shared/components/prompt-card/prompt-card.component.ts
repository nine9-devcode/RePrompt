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

  readonly open = output<Prompt>();
  readonly reveal = output<void>();
  readonly recensor = output<void>();
  readonly remove = output<number>();
  readonly copy = output<{ text: string; message: string }>();

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

  protected readonly imageUrl = computed(() => {
    const images = this.prompt().images;
    return images?.length ? this.promptService.absoluteImageUrl(images[0].imageUrl) : '';
  });

  protected onPreviewClick(): void {
    if (this.isBlurred()) {
      this.reveal.emit();
    } else {
      this.open.emit(this.prompt());
    }
  }
}
