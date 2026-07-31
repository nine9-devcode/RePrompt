import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * SVG filter used by the 'pixel' censor style. Previously copy-pasted into both the
 * gallery and the settings preview with different hardcoded ids.
 */
@Component({
  selector: 'app-pixelate-filter',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg aria-hidden="true" focusable="false" style="display: none;">
      <defs>
        <filter [attr.id]="filterId()" x="0" y="0">
          <feFlood [attr.x]="size()" [attr.y]="size()" [attr.height]="size() / 2" [attr.width]="size() / 2" />
          <feComposite [attr.width]="size()" [attr.height]="size()" />
          <feTile result="a" />
          <feComposite in="SourceGraphic" in2="a" operator="in" />
          <feMorphology operator="dilate" [attr.radius]="size() / 2" />
        </filter>
      </defs>
    </svg>
  `,
})
export class PixelateFilterComponent {
  readonly filterId = input('pixelate');
  readonly size = input(20);
}
