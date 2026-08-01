import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
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
  readonly suggestions = input<Suggestions>({ models: [], samplers: [], categories: [], tags: [] });

  readonly search = model('');
  readonly category = model('');
  readonly selectedModel = model('');
  readonly selectedTags = model<string[]>([]);

  /** Fires once the user has settled on a value, not on every keystroke. */
  readonly changed = output<void>();

  /** Tags not already applied, so the picker only ever offers something new. */
  protected readonly availableTags = computed(() => {
    const chosen = new Set(this.selectedTags());
    return this.suggestions().tags.filter(tag => !chosen.has(tag));
  });

  private readonly searchInput = new Subject<string>();

  constructor() {
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

  addTag(tag: string): void {
    if (!tag || this.selectedTags().includes(tag)) return;
    this.selectedTags.set([...this.selectedTags(), tag]);
    this.changed.emit();
  }

  removeTag(tag: string): void {
    this.selectedTags.set(this.selectedTags().filter(selected => selected !== tag));
    this.changed.emit();
  }
}
