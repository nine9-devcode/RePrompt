import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

/**
 * Chip-style tag editor. Commits on Enter or comma, removes the last chip on Backspace
 * when the field is empty, and offers the tags already used elsewhere in the library.
 */
@Component({
  selector: 'app-tag-input',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tag-input.component.html',
})
export class TagInputComponent {
  readonly tags = model<string[]>([]);
  readonly suggestions = input<string[]>([]);
  readonly maxTags = input(30);

  protected readonly draft = signal('');

  /** Already-used tags are filtered out, plus a prefix match on what is being typed. */
  protected readonly available = computed(() => {
    const chosen = new Set(this.tags());
    const term = this.draft().trim().toLowerCase();

    return this.suggestions()
      .filter(tag => !chosen.has(tag))
      .filter(tag => term.length === 0 || tag.includes(term))
      .slice(0, 12);
  });

  protected readonly isFull = computed(() => this.tags().length >= this.maxTags());

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.commit(this.draft());
      return;
    }

    if (event.key === 'Backspace' && this.draft().length === 0 && this.tags().length > 0) {
      this.remove(this.tags()[this.tags().length - 1]);
    }
  }

  protected commit(raw: string): void {
    const name = raw.trim().toLowerCase();
    this.draft.set('');

    if (name.length === 0 || name.length > 50) return;
    if (this.isFull() || this.tags().includes(name)) return;

    this.tags.set([...this.tags(), name]);
  }

  protected remove(name: string): void {
    this.tags.set(this.tags().filter(tag => tag !== name));
  }
}
