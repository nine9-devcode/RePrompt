import { Component, OnInit, OnDestroy, inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PromptService } from '../../core/services/prompt.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-terminal-log',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="max-w-6xl mx-auto px-6 h-[75vh] flex flex-col bg-[#0D1117] font-mono text-[12px] border border-[#30363D] rounded-lg overflow-hidden shadow-2xl">
      <!-- Terminal Header -->
      <div class="bg-[#161B22] px-4 py-3 border-b border-[#30363D] flex items-center justify-between text-[#8B949E]">
        <div class="flex items-center gap-3">
          <div class="flex gap-1.5">
            <div class="w-2.5 h-2.5 rounded-full bg-[#FF5F56]"></div>
            <div class="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]"></div>
            <div class="w-2.5 h-2.5 rounded-full bg-[#27C93F]"></div>
          </div>
          <span class="uppercase tracking-[0.2em] text-[9px] font-bold">System_Activity_Monitor — Live_Output</span>
        </div>
        <button (click)="clearLogs()" class="hover:text-white transition-colors text-[9px] uppercase tracking-widest">[ flush_buffer ]</button>
      </div>

      <!-- Logs Content -->
      <div #scrollContainer class="flex-grow p-6 overflow-y-auto custom-scrollbar space-y-2 bg-[#0D1117]">
        <div *ngFor="let log of logs" class="flex gap-4 leading-relaxed group">
          <span class="text-[#484F58] shrink-0 font-bold">[{{ log.time }}]</span>
          <span class="text-[#8B949E] font-bold">INFO:</span>
          <span [ngClass]="{
            'text-blue-400': log.message.includes('GET'),
            'text-green-400': log.message.includes('POST') || log.message.includes('created'),
            'text-red-400': log.message.includes('DELETE') || log.message.includes('purged'),
            'text-[#C9D1D9]': !log.message.match('GET|POST|DELETE')
          }">{{ log.message }}</span>
        </div>
        <div *ngIf="logs.length === 0" class="flex flex-col items-center justify-center h-full opacity-20">
           <div class="w-12 h-12 border-2 border-dashed border-[#8B949E] rounded-full animate-spin mb-4"></div>
           <p class="text-[10px] tracking-[0.5em] uppercase">listening_for_events</p>
        </div>
      </div>
      
      <div class="bg-[#161B22] px-4 py-2 border-t border-[#30363D] text-[9px] text-[#484F58] flex justify-between uppercase tracking-widest">
         <span>Log_Level: Verbose</span>
         <span>Output: stdout</span>
      </div>
    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #30363D; border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #484F58; }
  `]
})
export class TerminalLogComponent implements OnInit, OnDestroy {
  private promptService = inject(PromptService);
  private sub?: Subscription;
  
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  logs: { time: string, message: string }[] = [];

  ngOnInit(): void {
    this.sub = this.promptService.logs$.subscribe(fullMessage => {
      const parts = fullMessage.match(/\[(.*?)\] (.*)/);
      if (parts) {
        this.logs.push({ time: parts[1], message: parts[2] });
        this.scrollToBottom();
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  clearLogs(): void {
    this.logs = [];
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      try {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      } catch (err) {}
    }, 100);
  }
}
