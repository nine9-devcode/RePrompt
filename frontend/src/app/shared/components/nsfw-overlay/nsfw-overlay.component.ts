import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

/**
 * "Click to reveal" cover for censored images. Was pasted three times (gallery card,
 * detail modal, settings preview). Rendered as a real button so it is reachable by
 * keyboard — the original divs were mouse-only.
 */
@Component({
  selector: 'app-nsfw-overlay',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      (click)="reveal.emit()"
      [attr.aria-label]="'แสดงเนื้อหา NSFW (reveal NSFW content)'"
      class="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/20 backdrop-blur-[2px]
             hover:bg-black/0 focus-visible:bg-black/0 focus-visible:outline-2 focus-visible:outline-offset-[-2px]
             focus-visible:outline-red-500 transition-all duration-300"
    >
      <span
        class="bg-black/60 backdrop-blur-md rounded-full border border-red-500/50 flex flex-col items-center
               text-red-500 shadow-2xl"
        [class]="large() ? 'px-6 py-3 gap-2' : 'px-4 py-2 gap-1'"
      >
        <span class="flex items-center" [class]="large() ? 'gap-3' : 'gap-2'">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            aria-hidden="true"
            [class]="large() ? 'w-8 h-8' : 'w-5 h-5'"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
            />
          </svg>
          <span
            class="font-mono text-white font-bold uppercase tracking-widest"
            [class]="large() ? 'text-xs' : 'text-[10px]'"
            >NSFW Content</span
          >
        </span>
        <span
          class="font-mono text-red-400 opacity-80 uppercase tracking-tighter"
          [class]="large() ? 'text-[10px]' : 'text-[8px]'"
        >
          [ คลิกเพื่อแสดงรูป (CLICK_TO_VIEW) ]
        </span>
      </span>
    </button>
  `,
})
export class NsfwOverlayComponent {
  readonly size = input<'sm' | 'lg'>('sm');
  readonly reveal = output<void>();

  protected readonly large = computed(() => this.size() === 'lg');
}
