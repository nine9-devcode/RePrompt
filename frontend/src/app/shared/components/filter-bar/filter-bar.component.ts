import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, model, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { Suggestions } from '../../../core/models/prompt.model';

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './filter-bar.component.html',
})
export class FilterBarComponent {
  readonly suggestions = input<Suggestions>({ models: [], samplers: [], categories: [] });

  readonly search = model('');
  readonly category = model('');
  readonly selectedModel = model('');

  /** Fires once the user has settled on a value, not on every keystroke. */
  readonly changed = output<void>();

  private readonly searchInput = new Subject<string>();

  constructor() {
    inject(DestroyRef);
    this.searchInput
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.changed.emit());
  }

  onSearchInput(value: string): void {
    this.search.set(value);
    this.searchInput.next(value);
  }

  onSelectChange(): void {
    this.changed.emit();
  }
}
