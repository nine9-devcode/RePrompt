import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, tap } from 'rxjs';
import { Prompt, Suggestions, PaginatedResponse } from '../models/prompt.model';

@Injectable({
  providedIn: 'root'
})
export class PromptService {
  private apiUrl = 'http://localhost:5144/api';
  private logSubject = new Subject<string>();
  logs$ = this.logSubject.asObservable();

  constructor(private http: HttpClient) { }

  addLog(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    this.logSubject.next(`[${timestamp}] ${message}`);
  }

  getPrompts(search?: string, category?: string, model?: string, limit: number = 20, offset: number = 0): Observable<PaginatedResponse<Prompt>> {
    let params: any = { limit, offset };
    if (search) params.search = search;
    if (category) params.category = category;
    if (model) params.model = model;

    return this.http.get<PaginatedResponse<Prompt>>(`${this.apiUrl}/prompts`, { params }).pipe(
      tap(res => this.addLog(`GET /api/prompts - Received ${res.prompts.length} items (Total: ${res.totalCount})`))
    );
  }

  getPrompt(id: number): Observable<Prompt> {
    return this.http.get<Prompt>(`${this.apiUrl}/prompts/${id}`).pipe(
      tap(() => this.addLog(`GET /api/prompts/${id} - Inspecting resource`))
    );
  }

  createPrompt(prompt: Prompt): Observable<Prompt> {
    return this.http.post<Prompt>(`${this.apiUrl}/prompts`, prompt).pipe(
      tap(res => this.addLog(`POST /api/prompts - Resource created: ID=${res.id}`))
    );
  }

  updatePrompt(id: number, prompt: Prompt): Observable<Prompt> {
    return this.http.put<Prompt>(`${this.apiUrl}/prompts/${id}`, prompt).pipe(
      tap(() => this.addLog(`PUT /api/prompts/${id} - Resource updated successfully`))
    );
  }

  deletePrompt(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/prompts/${id}`).pipe(
      tap(() => this.addLog(`DELETE /api/prompts/${id} - Resource purged from database and filesystem`))
    );
  }

  uploadImage(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string }>(`${this.apiUrl}/upload`, formData).pipe(
      tap(res => this.addLog(`POST /api/upload - Binary asset uploaded: ${res.url}`))
    );
  }

  getSuggestions(): Observable<{ models: string[], samplers: string[], categories: string[] }> {
    return this.http.get<{ models: string[], samplers: string[], categories: string[] }>(`${this.apiUrl}/suggestions`);
  }
}
