import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CensorStyle, SettingsService } from '../../core/services/settings.service';
import { NsfwOverlayComponent } from '../../shared/components/nsfw-overlay/nsfw-overlay.component';
import { PixelateFilterComponent } from '../../shared/components/pixelate-filter/pixelate-filter.component';

const PREVIEW_FILTER_ID = 'preview-pixelate';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [NgClass, FormsModule, RouterLink, NsfwOverlayComponent, PixelateFilterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings.component.html',
})
export class SettingsComponent {
  protected readonly settings = inject(SettingsService);
  protected readonly previewFilterId = PREVIEW_FILTER_ID;

  protected readonly isPreviewCensored = signal(true);

  protected readonly previewFilter = computed(() =>
    this.isPreviewCensored() ? this.settings.buildCensorFilter(PREVIEW_FILTER_ID) : 'none'
  );

  protected readonly isPreviewBlockedOut = computed(
    () => this.isPreviewCensored() && this.settings.censorStyle() === 'block'
  );

  protected readonly sliderMin = computed(() => (this.settings.censorStyle() === 'blur' ? 0 : 2));
  protected readonly sliderMax = computed(() => (this.settings.censorStyle() === 'blur' ? 64 : 20));

  protected setCensorStyle(style: CensorStyle): void {
    this.settings.setCensorStyle(style);
  }

  protected onBlurAmountChange(value: number): void {
    this.settings.setBlurAmount(Number(value));
  }

  protected onKeywordsChange(value: string): void {
    this.settings.setNsfwKeywords(value);
  }
}
