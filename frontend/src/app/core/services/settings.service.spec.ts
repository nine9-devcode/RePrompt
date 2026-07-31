import { TestBed } from '@angular/core/testing';
import { DEFAULT_BLUR_AMOUNT, DEFAULT_NSFW_KEYWORDS, SettingsService } from './settings.service';

describe('SettingsService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  afterAll(() => localStorage.clear());

  function create(): SettingsService {
    TestBed.configureTestingModule({});
    return TestBed.inject(SettingsService);
  }

  it('falls back to defaults when nothing is stored', () => {
    const settings = create();

    expect(settings.showNsfw()).toBeFalse();
    expect(settings.strictHideNsfw()).toBeFalse();
    expect(settings.blurAmount()).toBe(DEFAULT_BLUR_AMOUNT);
    expect(settings.censorStyle()).toBe('blur');
    expect(settings.nsfwKeywords()).toBe(DEFAULT_NSFW_KEYWORDS);
  });

  it('restores previously stored values', () => {
    localStorage.setItem('showNsfw', 'true');
    localStorage.setItem('nsfwBlurAmount', '42');
    localStorage.setItem('censorStyle', 'pixel');

    const settings = create();

    expect(settings.showNsfw()).toBeTrue();
    expect(settings.blurAmount()).toBe(42);
    expect(settings.censorStyle()).toBe('pixel');
  });

  it('ignores a corrupted blur amount and an unknown censor style', () => {
    localStorage.setItem('nsfwBlurAmount', 'not-a-number');
    localStorage.setItem('censorStyle', 'kaleidoscope');

    const settings = create();

    expect(settings.blurAmount()).toBe(DEFAULT_BLUR_AMOUNT);
    expect(settings.censorStyle()).toBe('blur');
  });

  it('persists every setter', () => {
    const settings = create();

    settings.setShowNsfw(true);
    settings.setStrictHideNsfw(true);
    settings.setBlurAmount(12);
    settings.setCensorStyle('block');
    settings.setNsfwKeywords('a, b');

    expect(localStorage.getItem('showNsfw')).toBe('true');
    expect(localStorage.getItem('strictHideNsfw')).toBe('true');
    expect(localStorage.getItem('nsfwBlurAmount')).toBe('12');
    expect(localStorage.getItem('censorStyle')).toBe('block');
    expect(localStorage.getItem('nsfwKeywords')).toBe('a, b');
  });

  it('normalises the keyword list', () => {
    const settings = create();
    settings.setNsfwKeywords('  NSFW ,, nude,  GORE  ,');

    expect(settings.keywordList()).toEqual(['nsfw', 'nude', 'gore']);
  });

  describe('buildCensorFilter', () => {
    it('uses a css blur for the blur style', () => {
      const settings = create();
      settings.setCensorStyle('blur');
      settings.setBlurAmount(30);

      expect(settings.buildCensorFilter()).toBe('blur(30px) saturate(0.5) brightness(0.75)');
    });

    it('points at the requested svg filter for the pixel style', () => {
      const settings = create();
      settings.setCensorStyle('pixel');

      expect(settings.buildCensorFilter()).toBe('url(#pixelate)');
      expect(settings.buildCensorFilter('preview-pixelate')).toBe('url(#preview-pixelate)');
    });

    it('applies no filter for the block style, which hides the element instead', () => {
      const settings = create();
      settings.setCensorStyle('block');

      expect(settings.buildCensorFilter()).toBe('none');
    });
  });

  describe('matchesNsfwKeyword', () => {
    it('matches case-insensitively across all supplied fields', () => {
      const settings = create();
      settings.setNsfwKeywords('nude, gore');

      expect(settings.matchesNsfwKeyword('a NUDE portrait', null)).toBeTrue();
      expect(settings.matchesNsfwKeyword(null, 'lots of Gore')).toBeTrue();
      expect(settings.matchesNsfwKeyword('a landscape', 'blurry')).toBeFalse();
    });

    it('never matches when no keywords are configured', () => {
      const settings = create();
      settings.setNsfwKeywords('   ');

      expect(settings.matchesNsfwKeyword('nude gore blood')).toBeFalse();
    });
  });
});
