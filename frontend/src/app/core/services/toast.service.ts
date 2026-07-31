import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  toasts = signal<Toast[]>([]);
  private nextId = 0;

  show(message: string, type: 'success' | 'error' | 'info' = 'success'): void {
    const id = this.nextId++;
    const newToast: Toast = { id, message, type };
    
    this.toasts.update(current => [...current, newToast]);

    // Auto-remove after 3 seconds
    setTimeout(() => this.remove(id), 3000);
  }

  remove(id: number): void {
    this.toasts.update(current => current.filter(t => t.id !== id));
  }
}
