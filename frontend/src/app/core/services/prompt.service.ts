import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Prompt, Suggestions, PaginatedResponse } from '../models/prompt.model';

export interface PromptQuery {
  search?: string;
  category?: string;
  model?: string;
  /** When false the API omits NSFW entries, so totalCount matches what is rendered. */
  includeNsfw?: boolean;
  limit?: number;
  offset?: number;
}

@Injectable({
  providedIn: 'root',
})
export class PromptService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /** Turns a stored `/uploads/...` path into a url the browser can load. */
  absoluteImageUrl(imageUrl: string | null | undefined): string {
    return imageUrl ? `${environment.assetsUrl}${imageUrl}` : '';
  }

  getPrompts(query: PromptQuery = {}): Observable<PaginatedResponse<Prompt>> {
    let params = new HttpParams().set('limit', query.limit ?? 20).set('offset', query.offset ?? 0);

    if (query.search) params = params.set('search', query.search);
    if (query.category) params = params.set('category', query.category);
    if (query.model) params = params.set('model', query.model);
    if (query.includeNsfw === false) params = params.set('includeNsfw', false);

    return this.http.get<PaginatedResponse<Prompt>>(`${this.apiUrl}/prompts`, { params });
  }

  getPrompt(id: number): Observable<Prompt> {
    return this.http.get<Prompt>(`${this.apiUrl}/prompts/${id}`);
  }

  createPrompt(prompt: Prompt): Observable<Prompt> {
    return this.http.post<Prompt>(`${this.apiUrl}/prompts`, prompt);
  }

  updatePrompt(id: number, prompt: Prompt): Observable<Prompt> {
    return this.http.put<Prompt>(`${this.apiUrl}/prompts/${id}`, prompt);
  }

  deletePrompt(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/prompts/${id}`);
  }

  uploadImage(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string }>(`${this.apiUrl}/upload`, formData);
  }

  /**
   * Discards an upload that never got attached to a prompt. The API refuses to delete a
   * file that a saved prompt references, so this is safe to call on any failed save.
   */
  discardUpload(imageUrl: string): Observable<void> {
    const fileName = imageUrl.split('/').pop() ?? '';
    return this.http.delete<void>(`${this.apiUrl}/uploads/${encodeURIComponent(fileName)}`);
  }

  /** Direct link so the browser streams the zip to disk instead of buffering it in memory. */
  get exportUrl(): string {
    return `${this.apiUrl}/export`;
  }

  getSuggestions(): Observable<Suggestions> {
    return this.http.get<Suggestions>(`${this.apiUrl}/suggestions`);
  }
}
