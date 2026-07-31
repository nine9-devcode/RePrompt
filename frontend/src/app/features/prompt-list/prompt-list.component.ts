import { Component, OnInit, OnDestroy, AfterViewInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PromptService } from '../../core/services/prompt.service';
import { ToastService } from '../../core/services/toast.service';
import { Prompt, Suggestions } from '../../core/models/prompt.model';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-prompt-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <style>
      .nsfw-image { transition: filter 0.5s ease, opacity 0.5s ease; }
      .is-nsfw-hidden { filter: var(--nsfw-filter); }
    </style>

    <div class="max-w-7xl mx-auto px-6">
      <!-- Dynamic SVG Filter for Pixelate -->
      <svg style="display: none;">
        <defs>
          <filter id="pixelate" x="0" y="0">
            <feFlood [attr.x]="blurAmount" [attr.y]="blurAmount" [attr.height]="blurAmount / 2" [attr.width]="blurAmount / 2" />
            <feComposite [attr.width]="blurAmount" [attr.height]="blurAmount" />
            <feTile result="a" />
            <feComposite in="SourceGraphic" in2="a" operator="in" />
            <feMorphology operator="dilate" [attr.radius]="blurAmount / 2" />
          </filter>
        </defs>
      </svg>

      <div class="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div class="flex items-center gap-2 text-[#8B949E] text-xs font-mono uppercase tracking-widest">
          <span class="w-2 h-2 rounded-full bg-blue-500" [class.animate-pulse]="loading || isLoadingMore"></span>
          ทรัพยากรที่พบ (SHOWING): {{ prompts.length }} / {{ totalFound }}
        </div>
        
        <div class="flex items-center gap-6">
          <!-- Strict Mode Toggle -->
          <div class="flex items-center gap-3 bg-[#161B22] px-3 py-1.5 rounded-full border border-[#30363D]">
            <span class="text-[9px] font-mono text-[#8B949E] uppercase tracking-tighter">ซ่อน NSFW ถาวร (STRICT)</span>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" [checked]="strictHideNsfw" (change)="toggleStrictHide()" class="sr-only peer">
              <div class="w-8 h-4 bg-[#0D1117] border border-[#30363D] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#484F58] after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-orange-500/20 peer-checked:after:bg-orange-500"></div>
            </label>
          </div>

          <!-- Censor Toggle -->
          <div class="flex items-center gap-3 bg-[#161B22] px-3 py-1.5 rounded-full border border-[#30363D]">
            <span class="text-[9px] font-mono uppercase tracking-tighter" [class.text-[#8B949E]]="!globalShowNsfw" [class.text-red-400]="globalShowNsfw">
              {{ globalShowNsfw ? 'ไม่เซ็นเซอร์ (UNCENSORED)' : 'เซ็นเซอร์ (CENSORED)' }}
            </span>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" [checked]="globalShowNsfw" (change)="toggleGlobalNsfw()" class="sr-only peer">
              <div class="w-8 h-4 bg-[#0D1117] border border-[#30363D] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#484F58] after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-red-500/20 peer-checked:after:bg-red-500"></div>
            </label>
          </div>
        </div>
      </div>

      <!-- Search & Filter Bar -->
      <div class="mb-8 flex flex-col md:flex-row gap-4 bg-[#161B22] p-4 rounded-lg border border-[#30363D] shadow-sm">
        <div class="flex-grow">
          <input type="text" [(ngModel)]="searchQuery" (ngModelChange)="onSearchChange($event)"
                 placeholder="ค้นหาตามชื่อหัวข้อ... (Search by title)" 
                 class="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-md text-[#C9D1D9] text-xs font-mono focus:border-blue-500 outline-none transition-colors">
        </div>
        <div class="md:w-48">
          <select [(ngModel)]="selectedCategory" (ngModelChange)="onFilterChange()"
                  class="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-md text-[#C9D1D9] text-xs font-mono focus:border-blue-500 outline-none transition-colors appearance-none">
            <option value="">ทุกหมวดหมู่ (ALL_CATEGORIES)</option>
            <option *ngFor="let c of suggestions.categories" [value]="c">{{ c }}</option>
          </select>
        </div>
        <div class="md:w-48">
          <select [(ngModel)]="selectedModel" (ngModelChange)="onFilterChange()"
                  class="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-md text-[#C9D1D9] text-xs font-mono focus:border-blue-500 outline-none transition-colors appearance-none">
            <option value="">ทุกโมเดล (ALL_MODELS)</option>
            <option *ngFor="let m of suggestions.models" [value]="m">{{ m }}</option>
          </select>
        </div>
      </div>
      
      <div *ngIf="loading && prompts.length === 0" class="flex flex-col items-center justify-center py-20">
        <div class="w-10 h-10 border-2 border-[#30363D] border-t-blue-500 rounded-full animate-spin"></div>
        <p class="mt-4 font-mono text-[10px] text-[#8B949E] tracking-widest">กำลังโหลดข้อมูล... (STREAMS_LOADING)</p>
      </div>

      <div *ngIf="!loading && prompts.length === 0" class="text-center py-20 border border-[#30363D] rounded-lg bg-[#161B22]">
        <p class="text-[#8B949E] font-mono text-sm">/root/gallery/ไม่พบข้อมูล_no_results</p>
        <a *ngIf="searchQuery === '' && !selectedCategory && !selectedModel" routerLink="/new" class="mt-4 inline-block text-xs font-mono text-blue-400 hover:text-blue-300">>> สร้างพรอมต์ใหม่ (INITIALIZE_NEW_PROMPT)</a>
        <button *ngIf="searchQuery !== '' || selectedCategory || selectedModel" (click)="resetFilters()" class="mt-4 text-xs font-mono text-blue-400 hover:text-blue-300">>> ล้างการกรอง (RESET_FILTERS)</button>
      </div>

      <div class="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
        <ng-container *ngFor="let prompt of prompts; trackBy: trackById">
          <div *ngIf="!strictHideNsfw || !prompt.isNsfw"
               class="break-inside-avoid mb-6 group bg-[#161B22] rounded-lg border border-[#30363D] hover:border-[#8B949E] transition-all duration-300 shadow-lg flex flex-col overflow-hidden"
               [style.--nsfw-filter]="prompt.censorFilter">
            <!-- Preview Window -->
            <div class="relative bg-black cursor-pointer aspect-auto overflow-hidden" (click)="handleImageClick(prompt)">
               <!-- Image Container -->
               <div class="w-full h-full relative" [class.bg-[#0D1117]]="prompt.isBlurred && censorStyle === 'block'">
                  <img *ngIf="prompt.images && prompt.images.length > 0" 
                      [src]="'http://localhost:5144' + prompt.images[0].imageUrl" 
                      loading="lazy"
                      class="w-full h-auto object-cover opacity-80 transition-all duration-500 nsfw-image"
                      [class.invisible]="prompt.isBlurred && censorStyle === 'block'"
                      [class.is-nsfw-hidden]="prompt.isBlurred"
                      [alt]="prompt.title">
               </div>
              
              <div class="absolute top-2 left-2 flex gap-1 pointer-events-none">
                <span class="px-1.5 py-0.5 bg-blue-500/20 text-[8px] font-mono text-blue-400 rounded border border-blue-500/30 uppercase tracking-tighter">
                  {{ prompt.category || 'ทั่วไป (GENERAL)' }}
                </span>
                <span *ngIf="prompt.isNsfw" class="px-1.5 py-0.5 bg-red-500/20 text-[8px] font-mono text-red-400 rounded border border-red-500/30 uppercase tracking-tighter flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-2.5 h-2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  NSFW
                </span>
              </div>

              <!-- NSFW Click-to-Unblur Overlay -->
              <div *ngIf="prompt.isBlurred" 
                   class="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/20 backdrop-blur-[2px] hover:bg-black/0 transition-all duration-300">
                 <div class="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-red-500/50 flex flex-col items-center gap-1 text-red-500 shadow-2xl">
                   <div class="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                      <span class="text-[10px] font-mono text-white font-bold uppercase tracking-widest">NSFW Content</span>
                   </div>
                   <span class="text-[8px] font-mono text-red-400 opacity-80 uppercase tracking-tighter">[ คลิกเพื่อแสดงรูป (CLICK_TO_VIEW) ]</span>
                 </div>
              </div>

              <!-- Re-blur button (shows when unblurred) -->
              <button *ngIf="prompt.isNsfw && !globalShowNsfw && unblurredIds.has(prompt.id!)"
                      (click)="$event.stopPropagation(); toggleUnblur(prompt.id!)"
                      title="เซ็นเซอร์รูปภาพอีกครั้ง (RE_CENSOR)"
                      class="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3 h-3">
                     <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
              </button>
            </div>

            <!-- IDE Actions Row (Copy POS & NEG) -->
            <div class="px-4 py-2 bg-[#0D1117]/50 border-b border-[#30363D] flex items-center gap-2">
              <button (click)="copyToClipboard(prompt.positivePrompt, 'คัดลอกพรอมต์หลักสำเร็จ (POS_COPIED)')" 
                      title="คัดลอกพรอมต์หลัก (Copy POS)"
                      class="flex-1 py-1 bg-green-500/10 hover:bg-green-500/20 text-green-500 text-[10px] font-bold font-mono rounded border border-green-500/20 transition-all flex items-center justify-center gap-1.5">
                <span class="text-lg leading-none">$</span> POS
              </button>
              <button *ngIf="prompt.negativePrompt" 
                      (click)="copyToClipboard(prompt.negativePrompt, 'คัดลอกพรอมต์เชิงลบสำเร็จ (NEG_COPIED)')"
                      title="คัดลอกพรอมต์เชิงลบ (Copy NEG)"
                      class="flex-1 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-bold font-mono rounded border border-red-500/20 transition-all flex items-center justify-center gap-1.5">
                <span class="text-lg leading-none">!</span> NEG
              </button>
            </div>
            
            <!-- Code Info -->
            <div class="p-4 font-mono flex flex-col flex-grow">
              <div class="flex justify-between items-start mb-2 gap-2">
                <h2 class="text-sm font-bold text-[#F0F6FC] line-clamp-1 flex-grow">{{ prompt.title }}</h2>
                <div class="flex items-center gap-2 shrink-0">
                  <!-- Edit Icon -->
                  <a [routerLink]="['/edit', prompt.id]"
                     title="แก้ไขข้อมูล (EDIT_RESOURCE)"
                     class="text-[#8B949E] hover:text-blue-400 transition-colors p-1 hover:bg-blue-400/10 rounded">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-3.5 w-3.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>
                  </a>
                  <!-- Delete Icon -->
                  <button (click)="onDelete(prompt.id!)" 
                          title="ลบข้อมูล (PURGE_RESOURCE)"
                          class="text-[#8B949E] hover:text-red-500 transition-colors p-1 hover:bg-red-500/10 rounded">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div class="flex justify-between items-center text-[9px] text-[#484F58] mb-3 uppercase tracking-tighter border-b border-[#30363D] pb-2">
                 <span class="truncate">{{ prompt.modelName || 'std' }}</span>
                 <span class="shrink-0 ml-2">{{ prompt.createdAt | date:'dd/MM/yyyy' }}</span>
              </div>
              
              <!-- Prompt Previews -->
              <div class="mt-auto space-y-1.5">
                <div class="text-[9px] line-clamp-2 leading-relaxed italic border-l-2 border-[#7EE787] pl-2">
                  <span class="text-[#7EE787]">{{ prompt.positivePrompt }}</span>
                </div>
                <div *ngIf="prompt.negativePrompt" class="text-[9px] line-clamp-1 leading-relaxed italic border-l-2 border-[#FF7B72] pl-2 opacity-80">
                  <span class="text-[#FF7B72]">{{ prompt.negativePrompt }}</span>
                </div>
              </div>
            </div>
          </div>
        </ng-container>
      </div>

      <!-- Sentinel element for Infinite Scroll -->
      <div id="sentinel" class="w-full h-20 flex items-center justify-center mb-10">
        <div *ngIf="isLoadingMore" class="flex flex-col items-center gap-2">
          <div class="w-6 h-6 border-2 border-[#30363D] border-t-blue-500 rounded-full animate-spin"></div>
          <span class="font-mono text-[9px] text-[#8B949E] tracking-widest uppercase">กำลังดึงข้อมูล... (FETCHING)</span>
        </div>
      </div>
    </div>

    <!-- IDE-Style Modal -->
    <div *ngIf="selectedPrompt" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm" (click)="closeModal()">
      <div class="max-w-6xl w-full h-[90vh] flex flex-col bg-[#0D1117] rounded-lg border border-[#30363D] shadow-2xl overflow-hidden group/modal" (click)="$event.stopPropagation()"
           [style.--nsfw-filter]="selectedPrompt.censorFilter">
        
        <!-- Modal Header -->
        <div class="h-10 bg-[#161B22] border-b border-[#30363D] flex items-center justify-between px-4">
          <div class="flex items-center gap-4">
            <div class="flex gap-1.5">
              <div class="w-3 h-3 rounded-full bg-[#FF5F56]"></div>
              <div class="w-3 h-3 rounded-full bg-[#FFBD2E]"></div>
              <div class="w-3 h-3 rounded-full bg-[#27C93F]"></div>
            </div>
            <span class="text-xs font-mono text-[#8B949E]">ตรวจสอบข้อมูล (inspector.sh) — {{ selectedPrompt.title }} [{{ selectedPrompt.category }}]</span>
          </div>
          <div class="flex items-center gap-2">
            <a [routerLink]="['/edit', selectedPrompt.id]" (click)="closeModal()"
               class="text-[10px] font-mono text-blue-400 hover:text-blue-300 px-2 py-1 border border-blue-500/30 rounded bg-blue-500/10">
               [ แก้ไข (EDIT) ]
            </a>
            <button (click)="closeModal()" class="text-[#8B949E] hover:text-[#F0F6FC]">
               <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
               </svg>
            </button>
          </div>
        </div>

        <div class="flex-grow flex flex-col md:flex-row overflow-hidden bg-[#0D1117]">
          <!-- Large Image Section (Auto-Scale) -->
          <div class="md:w-3/5 bg-black flex items-center justify-center p-6 relative overflow-hidden select-none"
               (mousedown)="startPan($event)" (mousemove)="doPan($event)" (mouseup)="endPan()" (mouseleave)="endPan()" (wheel)="doZoom($event)">
            
            <div class="w-full h-full flex items-center justify-center relative" [class.bg-[#0D1117]]="selectedPrompt.isBlurred && censorStyle === 'block'">
                <img *ngIf="selectedPrompt.images && selectedPrompt.images.length > 0 && !(selectedPrompt.isBlurred && censorStyle === 'block')"
                    [src]="'http://localhost:5144' + selectedPrompt.images[0].imageUrl" 
                    class="max-h-full max-w-full object-contain shadow-2xl transition-transform duration-200 nsfw-image"
                    [style.transform]="'scale(' + zoomScale + ') translate(' + panX / zoomScale + 'px, ' + panY / zoomScale + 'px)'"
                    [class.is-nsfw-hidden]="selectedPrompt.isBlurred"
                    [alt]="selectedPrompt.title" draggable="false">
            </div>
            
            <!-- NSFW Click-to-Unblur Overlay in Modal -->
            <div *ngIf="selectedPrompt.isBlurred" 
                 (click)="toggleUnblur(selectedPrompt.id)"
                 class="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/40 backdrop-blur-[2px] hover:bg-black/0 transition-all duration-300">
               <div class="bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-red-500/50 flex flex-col items-center gap-2 text-red-500 shadow-2xl">
                 <div class="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-8 h-8">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                    <span class="text-xs font-mono text-white font-bold uppercase tracking-widest">NSFW Content</span>
                 </div>
                 <span class="text-[10px] font-mono text-red-400 opacity-80 uppercase tracking-tighter">[ คลิกเพื่อแสดงรูป (CLICK_TO_VIEW) ]</span>
               </div>
            </div>

            <!-- Controls Info -->
            <div class="absolute bottom-4 left-4 bg-black/40 px-3 py-1.5 rounded border border-[#30363D] text-[9px] font-mono text-[#8B949E] uppercase tracking-widest pointer-events-none">
              Wheel: Zoom | Drag: Pan | Click: Reveal
            </div>

            <!-- Zoom Toggle Button (Resets Zoom) -->
            <button (click)="resetZoom()" 
                    class="absolute bottom-4 right-4 p-2 bg-black/50 text-white/50 hover:text-white rounded-md opacity-0 group-hover/modal:opacity-100 transition-opacity">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>

          <!-- Code Inspector Section -->
          <div class="md:w-2/5 flex flex-col border-l border-[#30363D] bg-[#0D1117]">
            <!-- Tabs -->
            <div class="flex bg-[#161B22] border-b border-[#30363D]">
              <div class="px-4 py-2 border-r border-[#30363D] border-t-2 border-t-orange-500 bg-[#0D1117] text-[11px] font-mono text-[#F0F6FC]">
                พารามิเตอร์ (parameters.json)
              </div>
            </div>

            <!-- JSON-like Viewer -->
            <div class="p-6 font-mono text-xs overflow-y-auto custom-scrollbar">
              <div class="space-y-6">
                <div>
                  <div class="text-[#8B949E] mb-2 uppercase text-[9px] tracking-widest font-bold">// พรอมต์หลัก (positive_prompt)</div>
                  <div class="bg-[#161B22] p-3 rounded-md border border-[#30363D] text-[#7EE787] leading-relaxed relative">
                    {{ selectedPrompt.positivePrompt }}
                    <button (click)="copyToClipboard(selectedPrompt.positivePrompt, 'คัดลอกพรอมต์หลักสำเร็จ (POS_COPIED)')" 
                            class="absolute top-2 right-2 text-[#8B949E] hover:text-white uppercase text-[10px]">
                      COPY
                    </button>
                  </div>
                </div>

                <div *ngIf="selectedPrompt.negativePrompt">
                  <div class="text-[#8B949E] mb-2 uppercase text-[9px] tracking-widest font-bold">// พรอมต์เชิงลบ (negative_prompt)</div>
                  <div class="bg-[#161B22] p-3 rounded-md border border-[#30363D] text-[#FF7B72] leading-relaxed relative">
                    {{ selectedPrompt.negativePrompt }}
                    <button (click)="copyToClipboard(selectedPrompt.negativePrompt, 'คัดลอกพรอมต์เชิงลบสำเร็จ (NEG_COPIED)')" 
                            class="absolute top-2 right-2 text-[#8B949E] hover:text-white uppercase text-[10px]">
                      COPY
                    </button>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-4 text-[10px]">
                  <div class="bg-[#161B22] p-3 rounded-md border border-[#30363D]">
                    <div class="text-[#8B949E] text-[8px] mb-1 uppercase tracking-tighter">"หมวดหมู่ (category)":</div>
                    <div class="text-blue-400 font-bold">{{ selectedPrompt.category }}</div>
                  </div>
                  <div class="bg-[#161B22] p-3 rounded-md border border-[#30363D]">
                    <div class="text-[#8B949E] text-[8px] mb-1 uppercase tracking-tighter">"โมเดล (model)":</div>
                    <div class="text-[#79C0FF]">{{ selectedPrompt.modelName || 'null' }}</div>
                  </div>
                  <div class="bg-[#161B22] p-3 rounded-md border border-[#30363D]">
                    <div class="text-[#8B949E] text-[8px] mb-1 uppercase tracking-tighter">"ตัวอย่าง (sampler)":</div>
                    <div class="text-[#79C0FF]">{{ selectedPrompt.sampler || 'null' }}</div>
                  </div>
                  <div class="bg-[#161B22] p-3 rounded-md border border-[#30363D]">
                    <div class="text-[#8B949E] text-[8px] mb-1 uppercase tracking-tighter">"ก้าว (steps)":</div>
                    <div class="text-[#D2A8FF]">{{ selectedPrompt.steps }}</div>
                  </div>
                  <div class="bg-[#161B22] p-3 rounded-md border border-[#30363D]">
                    <div class="text-[#8B949E] text-[8px] mb-1 uppercase tracking-tighter">"มาตราส่วน (cfg_scale)":</div>
                    <div class="text-[#D2A8FF]">{{ selectedPrompt.cfgScale }}</div>
                  </div>
                  <div class="bg-[#161B22] p-3 rounded-md border border-[#30363D]">
                    <div class="text-[#8B949E] text-[8px] mb-1 uppercase tracking-tighter">"เมล็ด (seed)":</div>
                    <div class="text-[#D2A8FF]">{{ selectedPrompt.seed || 'null' }}</div>
                  </div>
                  <div class="bg-[#161B22] p-3 rounded-md border border-[#30363D]">
                    <div class="text-[#8B949E] text-[8px] mb-1 uppercase tracking-tighter">"วันที่สร้าง (created_at)":</div>
                    <div class="text-[#8B949E]">{{ selectedPrompt.createdAt | date:'dd/MM/yyyy' }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Custom Confirmation Modal -->
    <div *ngIf="showConfirm" class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
       <div class="max-w-md w-full bg-[#161B22] border border-[#30363D] rounded-lg shadow-2xl overflow-hidden animate-in zoom-in duration-200">
          <div class="bg-[#0D1117] px-4 py-3 border-b border-[#30363D] flex items-center gap-2">
             <div class="w-3 h-3 rounded-full bg-[#FFBD2E]"></div>
             <span class="text-xs font-mono text-[#8B949E] uppercase tracking-widest">{{ confirmTitle }}</span>
          </div>
          <div class="p-6 space-y-6">
             <div class="flex items-start gap-4">
                <div class="p-3 rounded-full bg-red-500/10 text-red-500">
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
                     <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                   </svg>
                </div>
                <div>
                   <p class="text-sm text-[#F0F6FC] font-medium leading-relaxed">{{ confirmMessage }}</p>
                   <p class="text-[11px] text-[#8B949E] mt-2 font-mono">// ยืนยันการดำเนินการระบบ (COMMIT_SYSTEM_ACTION)</p>
                </div>
             </div>
             <div class="flex justify-end gap-3 pt-4">
                <button (click)="showConfirm = false" 
                        class="px-4 py-2 text-xs font-mono text-[#8B949E] hover:text-[#F0F6FC] transition-colors">
                  [ ยกเลิก_ABORT ]
                </button>
                <button (click)="executeConfirm()" 
                        class="px-5 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-mono rounded-md shadow-lg transition-all">
                  ตกลง_CONFIRM
                </button>
             </div>
          </div>
       </div>
    </div>
  `
})
export class PromptListComponent implements OnInit, OnDestroy, AfterViewInit {
  private promptService = inject(PromptService);
  private observer: IntersectionObserver | null = null;
  private toastService = inject(ToastService);
  private platformId = inject(PLATFORM_ID);
  
  prompts: any[] = [];
  loading = true;
  isLoadingMore = false;
  selectedPrompt: any | null = null;
  globalShowNsfw = false;
  strictHideNsfw = false;

  // Zoom & Pan State
  zoomScale = 1;
  panX = 0;
  panY = 0;
  isDragging = false;
  startX = 0;
  startY = 0;

  // Custom Confirm State
  showConfirm = false;
  confirmTitle = '';
  confirmMessage = '';
  confirmAction: () => void = () => {};

  // Pagination & Filter State
  searchQuery = '';
  private searchSubject = new Subject<string>();
  selectedCategory = '';
  selectedModel = '';
  limit = 20;
  offset = 0;
  totalFound = 0;
  suggestions: Suggestions = { models: [], samplers: [], categories: [] };

  blurAmount = 20;
  censorStyle = 'blur';
  unblurredIds = new Set<number>();

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const savedNsfw = localStorage.getItem('showNsfw');
      this.globalShowNsfw = savedNsfw === 'true';

      const savedStrict = localStorage.getItem('strictHideNsfw');
      this.strictHideNsfw = savedStrict === 'true';

      const savedBlur = localStorage.getItem('nsfwBlurAmount');
      this.blurAmount = savedBlur ? parseInt(savedBlur) : 20;

      const savedStyle = localStorage.getItem('censorStyle');
      this.censorStyle = savedStyle || 'blur';
    }

    this.fetchData();
    this.promptService.getSuggestions().subscribe(data => this.suggestions = data);

    // Setup search debouncing
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      this.onFilterChange();
    });
  }

  preparePromptState(prompt: any): any {
    const isBlurred = prompt.isNsfw && !this.globalShowNsfw && !this.unblurredIds.has(prompt.id);
    let censorFilter = 'none';
    if (isBlurred) {
      if (this.censorStyle === 'blur') {
        censorFilter = `blur(${this.blurAmount}px) saturate(0.5) brightness(0.75)`;
      } else if (this.censorStyle === 'pixel') {
        censorFilter = 'url(#pixelate)';
      }
    }
    return {
      ...prompt,
      isBlurred,
      censorFilter
    };
  }

  recomputeAllPromptStates(): void {
    this.prompts = this.prompts.map(p => this.preparePromptState(p));
    if (this.selectedPrompt) {
      this.selectedPrompt = this.preparePromptState(this.selectedPrompt);
    }
  }

  toggleUnblur(id: number | undefined): void {
    if (!id) return;
    if (this.unblurredIds.has(id)) {
      this.unblurredIds.delete(id);
    } else {
      this.unblurredIds.add(id);
    }

    this.prompts = this.prompts.map(p => p.id === id ? this.preparePromptState(p) : p);
    if (this.selectedPrompt && this.selectedPrompt.id === id) {
      this.selectedPrompt = this.preparePromptState(this.selectedPrompt);
    }
  }

  handleImageClick(prompt: any): void {
    if (prompt.isBlurred) {
      this.toggleUnblur(prompt.id);
    } else {
      this.openModal(prompt);
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.setupIntersectionObserver();
    }
  }

  setupIntersectionObserver(): void {
    const options = {
      root: null,
      rootMargin: '200px',
      threshold: 0.1
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.isLoadingMore && !this.loading && this.prompts.length < this.totalFound) {
          this.loadMore();
        }
      });
    }, options);

    const sentinel = document.getElementById('sentinel');
    if (sentinel) {
      this.observer.observe(sentinel);
    }
  }

  ngOnDestroy(): void {
    this.searchSubject.complete();
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  onSearchChange(query: string): void {
    this.searchSubject.next(query);
  }

  trackById(index: number, item: any): number {
    return item.id;
  }

  toggleStrictHide(): void {
    this.strictHideNsfw = !this.strictHideNsfw;
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('strictHideNsfw', this.strictHideNsfw.toString());
    }
    this.toastService.show(this.strictHideNsfw ? 'เปิดโหมดปลอดภัยแล้ว (STRICT_MODE_ON)' : 'ปิดโหมดปลอดภัยแล้ว (STRICT_MODE_OFF)', 'success');
    this.recomputeAllPromptStates();
  }

  triggerConfirm(title: string, msg: string, action: () => void): void {
    this.confirmTitle = title;
    this.confirmMessage = msg;
    this.confirmAction = action;
    this.showConfirm = true;
  }

  executeConfirm(): void {
    this.confirmAction();
    this.showConfirm = false;
  }

  toggleGlobalNsfw(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    if (!this.globalShowNsfw) {
      this.triggerConfirm(
        'SYSTEM_WARNING', 
        'คุณกำลังจะเปิดการแสดงผลเนื้อหา NSFW (18+) ทั้งหมด คุณแน่ใจหรือไม่?', 
        () => {
          this.globalShowNsfw = true;
          localStorage.setItem('showNsfw', 'true');
          this.toastService.show('โหมดไม่เซ็นเซอร์เปิดอยู่ (UNCENSORED_MODE)', 'success');
          this.recomputeAllPromptStates();
        }
      );
    } else {
      this.globalShowNsfw = false;
      localStorage.setItem('showNsfw', 'false');
      this.toastService.show('โหมดเซ็นเซอร์เปิดอยู่ (CENSORED_MODE)', 'success');
      this.recomputeAllPromptStates();
    }
  }

  fetchData(append = false): void {
    if (!append) {
      this.loading = true;
      this.offset = 0;
    } else {
      this.isLoadingMore = true;
    }

    this.promptService.getPrompts(this.searchQuery, this.selectedCategory, this.selectedModel, this.limit, this.offset).subscribe({
      next: (res) => {
        const mappedPrompts = res.prompts.map(p => this.preparePromptState(p));
        if (append) {
          this.prompts = [...this.prompts, ...mappedPrompts];
        } else {
          this.prompts = mappedPrompts;
        }
        this.totalFound = res.totalCount;
        this.loading = false;
        this.isLoadingMore = false;
      },
      error: (err) => {
        console.error('Error loading prompts:', err);
        this.loading = false;
        this.isLoadingMore = false;
        this.toastService.show('ไม่สามารถโหลดข้อมูลได้ (STREAMS_ERROR)', 'error');
      }
    });
  }

  onFilterChange(): void {
    this.fetchData(false);
  }

  loadMore(): void {
    this.offset += this.limit;
    this.fetchData(true);
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedCategory = '';
    this.selectedModel = '';
    this.onFilterChange();
  }

  onDelete(id: number): void {
    this.triggerConfirm(
      'SYSTEM_ACTION',
      'คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนี้ออกจากฐานข้อมูลอย่างถาวร?',
      () => {
        this.promptService.deletePrompt(id).subscribe({
          next: () => {
            this.prompts = this.prompts.filter(p => p.id !== id);
            this.totalFound--;
            this.toastService.show('ลบข้อมูลสำเร็จ (RESOURCE_PURGED)', 'success');
          },
          error: (err) => {
            console.error('Purge failed', err);
            this.toastService.show('การลบล้มเหลว (PURGE_FAILED)', 'error');
          }
        });
      }
    );
  }

  openModal(prompt: any): void {
    if (prompt.images && prompt.images.length > 0) {
      this.selectedPrompt = this.preparePromptState(prompt);
      this.resetZoom();
      if (isPlatformBrowser(this.platformId)) {
        document.body.style.overflow = 'hidden';
      }
    }
  }

  closeModal(): void {
    this.selectedPrompt = null;
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = 'auto';
    }
  }

  // Zoom & Pan Handlers
  doZoom(event: WheelEvent): void {
    event.preventDefault();
    const zoomSpeed = 0.1;
    if (event.deltaY < 0) {
      this.zoomScale += zoomSpeed;
    } else {
      this.zoomScale = Math.max(0.5, this.zoomScale - zoomSpeed);
    }
  }

  resetZoom(): void {
    this.zoomScale = 1;
    this.panX = 0;
    this.panY = 0;
  }

  startPan(event: MouseEvent): void {
    if (this.zoomScale <= 1) return;
    this.isDragging = true;
    this.startX = event.clientX - this.panX;
    this.startY = event.clientY - this.panY;
  }

  doPan(event: MouseEvent): void {
    if (!this.isDragging) return;
    this.panX = event.clientX - this.startX;
    this.panY = event.clientY - this.startY;
  }

  endPan(): void {
    this.isDragging = false;
  }

  copyToClipboard(text: string, toastMsg: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    navigator.clipboard.writeText(text).then(() => {
      this.toastService.show(toastMsg, 'success');
    });
  }
}
