import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="max-w-4xl mx-auto p-6 font-mono text-[#C9D1D9]">
      <div class="mb-8 border-b border-[#30363D] pb-6">
        <h1 class="text-xl font-bold text-[#F0F6FC] tracking-tight flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 text-blue-500">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.311.173.68.214 1.018.114l1.246-.368c.528-.156 1.096.106 1.32.585l1.296 2.245c.243.42.148.955-.224 1.256l-1.047.843c-.276.223-.424.562-.395.918.016.31.066.626.066.945s-.05.636-.066.945c-.029.356.119.695.395.918l1.047.843c.372.301.467.836.224 1.256l-1.296 2.245c-.224.48-.792.741-1.32.585l-1.246-.368c-.338-.1-.707-.06-1.018.114-.332.184-.582.496-.645.87l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a1.008 1.008 0 00-1.018-.114l-1.246.368c-.528.156-1.096-.106-1.32-.585L4.76 14.17c-.243-.42-.148-.956.224-1.256l1.047-.843c.276-.223.424-.562.395-.918a5.952 5.952 0 01-.066-.945c0-.319.05-.635.066-.945.029-.356-.119-.695-.395-.918l-1.047-.843c-.372-.301-.467-.836-.224-1.256l1.296-2.245c.224-.48.792-.741 1.32-.585l1.246.368c.338.1.707.06 1.018-.114.332-.184.582-.496.645-.87l.213-1.28z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          การตั้งค่าระบบ (SYSTEM_SETTINGS)
        </h1>
        <p class="text-[#8B949E] text-xs mt-1">// ปรับแต่งการทำงานของแอปพลิเคชัน (Configure application preferences)</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Sidebar Tabs -->
        <div class="space-y-1">
          <button class="w-full text-left px-4 py-2 bg-[#21262D] text-[#F0F6FC] rounded-md text-xs border border-[#30363D]">
            ความปลอดภัยและเซนเซอร์ (SECURITY_CENSOR)
          </button>
          <button class="w-full text-left px-4 py-2 hover:bg-[#161B22] text-[#8B949E] hover:text-[#F0F6FC] rounded-md text-xs transition-colors">
            การแสดงผล (APPEARANCE) - Soon
          </button>
          <button class="w-full text-left px-4 py-2 hover:bg-[#161B22] text-[#8B949E] hover:text-[#F0F6FC] rounded-md text-xs transition-colors">
            เครือข่าย (NETWORK) - Soon
          </button>
        </div>

        <!-- Settings Content -->
        <div class="md:col-span-2 space-y-8">
          <section class="bg-[#161B22] border border-[#30363D] rounded-lg overflow-hidden shadow-xl">
            <div class="bg-[#0D1117] px-4 py-2 border-b border-[#30363D] text-[10px] text-[#8B949E] font-bold uppercase tracking-widest">
              NSFW & Censor Configuration
            </div>
            
            <div class="p-6 space-y-8">
              <!-- Censor Style Selection -->
              <div class="space-y-4">
                <h3 class="text-sm font-bold text-[#F0F6FC]">รูปแบบการเซนเซอร์ (Censor Style)</h3>
                <div class="grid grid-cols-3 gap-3">
                  <button type="button" (click)="censorStyle = 'blur'; saveSettings()" 
                          [ngClass]="{'border-blue-500 bg-blue-500/10': censorStyle === 'blur'}"
                          class="p-4 border border-[#30363D] rounded-md text-center transition-all hover:border-[#8B949E]">
                    <div class="text-xs font-bold text-[#F0F6FC] mb-1">Blur</div>
                    <div class="text-[9px] text-[#8B949E]">// เบลอ (Default)</div>
                  </button>
                  <button type="button" (click)="censorStyle = 'pixel'; saveSettings()" 
                          [ngClass]="{'border-blue-500 bg-blue-500/10': censorStyle === 'pixel'}"
                          class="p-4 border border-[#30363D] rounded-md text-center transition-all hover:border-[#8B949E]">
                    <div class="text-xs font-bold text-[#F0F6FC] mb-1">Pixelate</div>
                    <div class="text-[9px] text-[#8B949E]">// พิกเซล</div>
                  </button>
                  <button type="button" (click)="censorStyle = 'block'; saveSettings()" 
                          [ngClass]="{'border-blue-500 bg-blue-500/10': censorStyle === 'block'}"
                          class="p-4 border border-[#30363D] rounded-md text-center transition-all hover:border-[#8B949E]">
                    <div class="text-xs font-bold text-[#F0F6FC] mb-1">Solid Block</div>
                    <div class="text-[9px] text-[#8B949E]">// ปิดทึบ</div>
                  </button>
                </div>
              </div>

              <div class="space-y-4" *ngIf="censorStyle !== 'block'">
                <div class="flex justify-between items-center">
                   <div>
                     <h3 class="text-sm font-bold text-[#F0F6FC]">{{ censorStyle === 'blur' ? 'ระดับความเข้มของการเบลอ (Blur Intensity)' : 'ขนาดของพิกเซล (Pixel Size)' }}</h3>
                     <p class="text-[11px] text-[#8B949E] mt-1">// {{ censorStyle === 'blur' ? 'กำหนดความเบลอของรูปภาพ' : 'กำหนดขนาดเม็ดพิกเซล (แนะนำ 4-12)' }}</p>
                   </div>
                   <span class="text-blue-400 font-bold text-sm">{{ nsfwBlurAmount }}{{ censorStyle === 'blur' ? 'px' : '' }}</span>
                </div>
                
                <input type="range" [(ngModel)]="nsfwBlurAmount" (ngModelChange)="saveSettings()"
                       [min]="censorStyle === 'blur' ? 0 : 2" [max]="censorStyle === 'blur' ? 64 : 20" step="1"
                       class="w-full h-1.5 bg-[#0D1117] rounded-lg appearance-none cursor-pointer accent-blue-500 border border-[#30363D]">
                
                <div class="flex justify-between text-[10px] text-[#484F58]">
                   <span>{{ censorStyle === 'blur' ? '0px' : '2' }}</span>
                   <span>{{ censorStyle === 'blur' ? '32px' : '11' }}</span>
                   <span>{{ censorStyle === 'blur' ? '64px' : '20' }}</span>
                </div>
              </div>

              <!-- Auto-Flag Keywords -->
              <div class="pt-6 border-t border-[#30363D] space-y-4">
                <div>
                  <h3 class="text-sm font-bold text-[#F0F6FC]">คำค้นหาสำหรับเซนเซอร์อัตโนมัติ (Auto-Flag Keywords)</h3>
                  <p class="text-[11px] text-[#8B949E] mt-1">// ระบุคำที่ต้องการให้ระบบติ๊กช่อง NSFW ให้อัตโนมัติ (คั่นด้วยเครื่องหมายลูกน้ำ)</p>
                </div>
                
                <textarea [(ngModel)]="nsfwKeywords" (ngModelChange)="saveSettings()"
                          rows="3"
                          placeholder="nsfw, nude, gore, blood..."
                          class="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-md text-[#7EE787] text-xs focus:border-blue-500 outline-none transition-all resize-none font-mono"></textarea>
                
                <p class="text-[10px] text-[#484F58] tracking-tight leading-relaxed">
                  * ระบบจะตรวจสอบจาก Positive Prompt และ Negative Prompt หากพบคำที่ระบุไว้จะทำการติ๊กถูกที่ช่อง NSFW ให้ทันทีในหน้าเพิ่มข้อมูล
                </p>
              </div>

              <!-- Preview Area -->
              <div class="pt-6 border-t border-[#30363D]">
                 <h4 class="text-[10px] text-[#8B949E] font-bold uppercase mb-4 tracking-widest">ตัวอย่างการแสดงผล (CENSOR_PREVIEW)</h4>
                 <div class="relative rounded-lg overflow-hidden border border-[#30363D] bg-black aspect-video max-w-sm mx-auto group">
                    <!-- Preview Image -->
                    <div class="w-full h-full relative" [class.bg-[#0D1117]]="censorStyle === 'block' && isPreviewBlurred">
                        <img *ngIf="censorStyle !== 'block' || !isPreviewBlurred" 
                             src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop" 
                             class="w-full h-full object-cover transition-all duration-300"
                             [style.filter]="getPreviewFilter()">
                    </div>
                    
                    <!-- Overlay Badge -->
                    <div *ngIf="isPreviewBlurred" 
                         (click)="isPreviewBlurred = false"
                         class="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/20 backdrop-blur-[2px] hover:bg-black/0 transition-all duration-300">
                      <div class="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-red-500/50 flex flex-col items-center gap-1 text-red-500">
                        <div class="flex items-center gap-2">
                           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                             <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                           </svg>
                           <span class="text-[10px] font-mono text-white font-bold uppercase tracking-widest">NSFW Content</span>
                        </div>
                        <span class="text-[8px] font-mono text-red-400 opacity-80 uppercase tracking-tighter">[ คลิกเพื่อแสดงรูป (CLICK_TO_VIEW) ]</span>
                      </div>
                    </div>

                    <!-- Reset Button in Preview -->
                    <button *ngIf="!isPreviewBlurred" (click)="isPreviewBlurred = true"
                            class="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-blue-500 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                           <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                    </button>
                 </div>
                 
                 <!-- SVG Dynamic Filter for Preview -->
                 <svg style="display: none;">
                    <defs>
                      <filter [id]="'preview-pixelate'" x="0" y="0">
                        <feFlood [attr.x]="nsfwBlurAmount" [attr.y]="nsfwBlurAmount" [attr.height]="nsfwBlurAmount / 2" [attr.width]="nsfwBlurAmount / 2" />
                        <feComposite [attr.width]="nsfwBlurAmount" [attr.height]="nsfwBlurAmount" />
                        <feTile result="a" />
                        <feComposite in="SourceGraphic" in2="a" operator="in" />
                        <feMorphology operator="dilate" [attr.radius]="nsfwBlurAmount / 2" />
                      </filter>
                    </defs>
                  </svg>

                 <p class="text-center text-[10px] text-[#484F58] mt-3 tracking-tighter border-l-2 border-[#30363D] inline-block px-3 ml-1/2 -translate-x-1/2">
                   {{ isPreviewBlurred ? 'รูปภาพถูกเซ็นเซอร์ (IMAGE_ENCRYPTED)' : 'แสดงรูปภาพต้นฉบับ (SOURCE_REVEALED)' }}
                 </p>
              </div>
            </div>
          </section>

          <div class="flex justify-end gap-3">
             <a routerLink="/" class="px-6 py-2 bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-[#C9D1D9] text-xs font-bold rounded-md transition-all">
               กลับสู่คลังภาพ (RETURN_TO_GALLERY)
             </a>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SettingsComponent implements OnInit {
  private toastService = inject(ToastService);
  private platformId = inject(PLATFORM_ID);

  nsfwBlurAmount = 20;
  nsfwKeywords = 'nsfw, nude, gore, blood';
  censorStyle = 'blur';
  isPreviewBlurred = true;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const savedBlur = localStorage.getItem('nsfwBlurAmount');
      if (savedBlur) {
        this.nsfwBlurAmount = parseInt(savedBlur);
      }

      const savedKeywords = localStorage.getItem('nsfwKeywords');
      if (savedKeywords) {
        this.nsfwKeywords = savedKeywords;
      }

      const savedStyle = localStorage.getItem('censorStyle');
      if (savedStyle) {
        this.censorStyle = savedStyle;
      }
    }
  }

  saveSettings(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('nsfwBlurAmount', this.nsfwBlurAmount.toString());
      localStorage.setItem('nsfwKeywords', this.nsfwKeywords);
      localStorage.setItem('censorStyle', this.censorStyle);
    }
  }

  getPreviewFilter(): string {
    if (!this.isPreviewBlurred) return 'none';
    
    if (this.censorStyle === 'blur') {
      return `blur(${this.nsfwBlurAmount}px) saturate(0.5) brightness(0.75)`;
    } else if (this.censorStyle === 'pixel') {
      return 'url(#preview-pixelate)';
    }
    return 'none';
  }
}
