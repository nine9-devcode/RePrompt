import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type CensorStyle = 'blur' | 'pixel' | 'block';

export const DEFAULT_NSFW_KEYWORDS = 'nsfw, nude, gore, blood';
export const DEFAULT_BLUR_AMOUNT = 20;

const STORAGE_KEYS = {
  showNsfw: 'showNsfw',
  strictHideNsfw: 'strictHideNsfw',
  blurAmount: 'nsfwBlurAmount',
  censorStyle: 'censorStyle',
  nsfwKeywords: 'nsfwKeywords',
} as const;

/**
 * Owns every NSFW/censor preference. These used to be read and written directly from
 * three separate components, so changing a setting did not reach the gallery until a
 * navigation, and never reached other tabs at all.
 */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly showNsfw = signal(false);
  readonly strictHideNsfw = signal(false);
  readonly blurAmount = signal(DEFAULT_BLUR_AMOUNT);
  readonly censorStyle = signal<CensorStyle>('blur');
  readonly nsfwKeywords = signal(DEFAULT_NSFW_KEYWORDS);

  /** Trimmed, lowercased, empty entries dropped — ready for matching. */
  readonly keywordList = computed(() =>
    this.nsfwKeywords()
      .split(',')
      .map(keyword => keyword.trim().toLowerCase())
      .filter(keyword => keyword.length > 0)
  );

  constructor() {
    if (!this.isBrowser) return;

    this.readAll();

    // Another tab changed a setting; mirror it here.
    window.addEventListener('storage', event => {
      if (event.key === null || Object.values(STORAGE_KEYS).includes(event.key as never)) {
        this.readAll();
      }
    });
  }

  setShowNsfw(value: boolean): void {
    this.showNsfw.set(value);
    this.write(STORAGE_KEYS.showNsfw, String(value));
  }

  setStrictHideNsfw(value: boolean): void {
    this.strictHideNsfw.set(value);
    this.write(STORAGE_KEYS.strictHideNsfw, String(value));
  }

  setBlurAmount(value: number): void {
    this.blurAmount.set(value);
    this.write(STORAGE_KEYS.blurAmount, String(value));
  }

  setCensorStyle(value: CensorStyle): void {
    this.censorStyle.set(value);
    this.write(STORAGE_KEYS.censorStyle, value);
  }

  setNsfwKeywords(value: string): void {
    this.nsfwKeywords.set(value);
    this.write(STORAGE_KEYS.nsfwKeywords, value);
  }

  /**
   * CSS filter for a censored image. `pixelateFilterId` lets the settings preview point
   * at its own SVG filter without duplicating this logic.
   */
  buildCensorFilter(pixelateFilterId = 'pixelate'): string {
    switch (this.censorStyle()) {
      case 'blur':
        return `blur(${this.blurAmount()}px) saturate(0.5) brightness(0.75)`;
      case 'pixel':
        return `url(#${pixelateFilterId})`;
      default:
        // 'block' hides the image element outright rather than filtering it.
        return 'none';
    }
  }

  /** True when the given prompt text contains any auto-flag keyword. */
  matchesNsfwKeyword(...texts: (string | null | undefined)[]): boolean {
    const keywords = this.keywordList();
    if (keywords.length === 0) return false;

    const haystack = texts.filter(Boolean).join(' ').toLowerCase();
    return keywords.some(keyword => haystack.includes(keyword));
  }

  private readAll(): void {
    this.showNsfw.set(localStorage.getItem(STORAGE_KEYS.showNsfw) === 'true');
    this.strictHideNsfw.set(localStorage.getItem(STORAGE_KEYS.strictHideNsfw) === 'true');

    const blur = Number.parseInt(localStorage.getItem(STORAGE_KEYS.blurAmount) ?? '', 10);
    this.blurAmount.set(Number.isFinite(blur) ? blur : DEFAULT_BLUR_AMOUNT);

    const style = localStorage.getItem(STORAGE_KEYS.censorStyle);
    this.censorStyle.set(style === 'pixel' || style === 'block' ? style : 'blur');

    this.nsfwKeywords.set(localStorage.getItem(STORAGE_KEYS.nsfwKeywords) ?? DEFAULT_NSFW_KEYWORDS);
  }

  private write(key: string, value: string): void {
    if (this.isBrowser) localStorage.setItem(key, value);
  }
}
