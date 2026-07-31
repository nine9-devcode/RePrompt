import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
      <div
        *ngFor="let toast of toastService.toasts()"
        class="pointer-events-auto min-w-[280px] px-4 py-3 rounded-lg border shadow-2xl flex items-center justify-between gap-4 animate-in slide-in-from-right duration-300"
        [ngClass]="{
          'bg-[#161B22] border-[#238636] text-[#7EE787]': toast.type === 'success',
          'bg-[#161B22] border-[#F85149] text-[#FF7B72]': toast.type === 'error',
          'bg-[#161B22] border-[#388BFD] text-[#79C0FF]': toast.type === 'info',
        }"
      >
        <div class="flex items-center gap-3">
          <!-- Icon placeholder based on type -->
          <div
            class="w-2 h-2 rounded-full"
            [ngClass]="{
              'bg-[#238636]': toast.type === 'success',
              'bg-[#F85149]': toast.type === 'error',
              'bg-[#388BFD]': toast.type === 'info',
            }"
          ></div>
          <span class="text-xs font-mono font-medium lowercase tracking-tight">>> {{ toast.message }}</span>
        </div>
        <button
          (click)="toastService.remove(toast.id)"
          class="text-[#8B949E] hover:text-white transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  `,
})
export class ToastComponent {
  toastService = inject(ToastService);
}
