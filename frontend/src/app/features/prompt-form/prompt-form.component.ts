import { Component, OnInit, inject, PLATFORM_ID, HostListener, DestroyRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { PromptService } from '../../core/services/prompt.service';
import { ToastService } from '../../core/services/toast.service';
import { Prompt, Suggestions } from '../../core/models/prompt.model';

@Component({
  selector: 'app-prompt-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="max-w-4xl mx-auto p-6 font-mono text-[#C9D1D9]">
      <!-- Global Drag & Drop Overlay -->
      <div *ngIf="isDragging" class="fixed inset-0 z-[100] bg-[#0D1117]/60 backdrop-blur-[2px] border-4 border-dashed border-blue-500/40 flex flex-col items-center justify-center p-12 pointer-events-none animate-in fade-in duration-200">
         <div class="bg-[#161B22] border border-[#30363D] rounded-2xl p-12 shadow-2xl flex flex-col items-center gap-6 animate-in zoom-in-95 duration-200">
            <div class="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500 animate-bounce">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-12 h-12">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <div class="text-center space-y-2">
              <h2 class="text-2xl font-bold text-[#F0F6FC] uppercase tracking-widest">วางรูปภาพที่นี่ (DROP_IMAGE_HERE)</h2>
              <p class="text-[#8B949E] text-sm font-mono tracking-tighter">// ระบบจะประมวลผลและดึงข้อมูลให้ทันที (Automatic metadata extraction enabled)</p>
            </div>
         </div>
      </div>

      <div class="mb-8 border-b border-[#30363D] pb-6 flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold text-[#F0F6FC] tracking-tight flex items-center gap-2">
            <span class="text-blue-500">{{ isEditMode ? 'แก้ไขข้อมูล (Edit)' : 'สร้างใหม่ (New)' }}</span>_SOURCE_FILE.ts
          </h1>
          <p class="text-[#8B949E] text-xs mt-1">// {{ isEditMode ? 'อัปเดตข้อมูลพรอมต์เดิม (Update existing prompt)' : 'เริ่มต้นสร้างอ็อบเจกต์พรอมต์ใหม่พร้อมข้อมูลเสริม (Initialize a new prompt)' }}</p>
        </div>
        <a routerLink="/" class="text-xs text-red-400 hover:text-red-300 transition-colors uppercase tracking-widest">[ ยกเลิก (Abort) ]</a>
      </div>

      <form [formGroup]="promptForm" (ngSubmit)="onSubmit()" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <!-- Main Editor Section -->
        <div class="lg:col-span-2 space-y-6">
          <div class="bg-[#161B22] border border-[#30363D] rounded-lg overflow-hidden shadow-xl">
            <div class="bg-[#0D1117] px-4 py-2 border-b border-[#30363D] flex items-center gap-2 text-[10px] text-[#8B949E] font-bold">
               <span class="text-green-500">ข้อมูล (JSON)</span> ฟิลด์ที่แก้ไขได้ (EDITABLE_FIELDS)
            </div>
            
            <div class="p-6 space-y-6">
              <!-- Title & Category -->
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <div class="flex items-center gap-2 text-[11px] font-bold">
                    <span class="text-purple-400">const</span> <span class="text-blue-400">ชื่อหัวข้อ (title)</span> =
                  </div>
                  <input type="text" formControlName="title" 
                         placeholder="'ชื่อพรอมต์...'"
                         class="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-md text-[#7EE787] text-sm focus:border-blue-500 outline-none transition-all">
                </div>
                <div class="space-y-2">
                  <div class="flex items-center gap-2 text-[11px] font-bold">
                    <span class="text-purple-400">const</span> <span class="text-blue-400">หมวดหมู่ (category)</span> =
                  </div>
                  <input type="text" formControlName="category"
                         placeholder="'ทั่วไป (General)'"
                         class="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-md text-[#D2A8FF] text-sm focus:border-blue-500 outline-none transition-all">
                  
                  <!-- Clickable Chips for Categories -->
                  <div class="flex flex-wrap gap-1.5 mt-2">
                    <button type="button" *ngFor="let c of suggestions.categories"
                            (click)="selectOption('category', c)"
                            class="px-2 py-0.5 rounded border border-[#30363D] bg-[#21262D] text-[10px] text-[#8B949E] hover:border-blue-500 hover:text-blue-400 transition-all">
                      {{ c }}
                    </button>
                  </div>
                </div>
              </div>

              <!-- Prompts -->
              <div class="space-y-2">
                <div class="flex items-center gap-2 text-[11px] font-bold">
                   <span class="text-purple-400">const</span> <span class="text-blue-400">พรอมต์หลัก (positive_prompt)</span> = \`
                </div>
                <textarea formControlName="positivePrompt" rows="5"
                          placeholder="รายละเอียดภาพที่ต้องการ (Masterpiece, ultra detailed...)"
                          class="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-md text-[#D2A8FF] text-sm focus:border-blue-500 outline-none transition-all resize-none"></textarea>
                <div class="text-[11px] font-bold text-gray-500">\`;</div>
              </div>

              <div class="space-y-2">
                <div class="flex items-center gap-2 text-[11px] font-bold">
                   <span class="text-purple-400">const</span> <span class="text-blue-400">พรอมต์เชิงลบ (negative_prompt)</span> = \`
                </div>
                <textarea formControlName="negativePrompt" rows="3"
                          placeholder="สิ่งที่ไม่ต้องการในภาพ (Low quality, blurry...)"
                          class="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-md text-[#FF7B72] text-sm focus:border-blue-500 outline-none transition-all resize-none"></textarea>
                <div class="text-[11px] font-bold text-gray-500">\`;</div>
              </div>
            </div>
          </div>

          <!-- Parameters Block -->
          <div class="bg-[#161B22] border border-[#30363D] rounded-lg overflow-hidden">
             <div class="bg-[#0D1117] px-4 py-2 border-b border-[#30363D] text-[10px] text-[#8B949E] font-bold">
               การตั้งค่า (ENGINE_CONFIG)
             </div>
             <div class="p-6 grid grid-cols-2 gap-6">
                <div class="space-y-1.5">
                  <span class="text-[10px] text-[#8B949E] font-bold lowercase">ชื่อโมเดล (modelName)</span>
                  <input type="text" formControlName="modelName" class="w-full px-3 py-1.5 bg-[#0D1117] border border-[#30363D] rounded-md text-blue-400 text-xs focus:border-blue-500 outline-none">
                  
                  <!-- Clickable Chips for Models -->
                  <div class="flex flex-wrap gap-1 mt-1.5">
                    <button type="button" *ngFor="let m of suggestions.models"
                            (click)="selectOption('modelName', m)"
                            class="px-1.5 py-0.5 rounded border border-[#30363D] bg-[#21262D] text-[9px] text-[#8B949E] hover:border-blue-500 hover:text-blue-400 transition-all">
                      {{ m }}
                    </button>
                  </div>
                </div>
                <div class="space-y-1.5">
                  <span class="text-[10px] text-[#8B949E] font-bold lowercase">ตัวอย่าง (sampler)</span>
                  <input type="text" formControlName="sampler" class="w-full px-3 py-1.5 bg-[#0D1117] border border-[#30363D] rounded-md text-blue-400 text-xs focus:border-blue-500 outline-none">
                  
                  <!-- Clickable Chips for Samplers -->
                  <div class="flex flex-wrap gap-1 mt-1.5">
                    <button type="button" *ngFor="let s of suggestions.samplers"
                            (click)="selectOption('sampler', s)"
                            class="px-1.5 py-0.5 rounded border border-[#30363D] bg-[#21262D] text-[9px] text-[#8B949E] hover:border-blue-500 hover:text-blue-400 transition-all">
                      {{ s }}
                    </button>
                  </div>
                </div>
                <div class="space-y-1.5">
                  <span class="text-[10px] text-[#8B949E] font-bold lowercase">จำนวนก้าว (steps)</span>
                  <input type="number" formControlName="steps" class="w-full px-3 py-1.5 bg-[#0D1117] border border-[#30363D] rounded-md text-orange-400 text-xs focus:border-blue-500 outline-none">
                </div>
                <div class="space-y-1.5">
                  <span class="text-[10px] text-[#8B949E] font-bold lowercase">มาตราส่วน (cfgScale)</span>
                  <input type="number" formControlName="cfgScale" step="0.5" class="w-full px-3 py-1.5 bg-[#0D1117] border border-[#30363D] rounded-md text-orange-400 text-xs focus:border-blue-500 outline-none">
                </div>
                <div class="space-y-1.5">
                  <span class="text-[10px] text-[#8B949E] font-bold lowercase">เมล็ด (seed)</span>
                  <input type="text" formControlName="seed" class="w-full px-3 py-1.5 bg-[#0D1117] border border-[#30363D] rounded-md text-orange-400 text-xs focus:border-blue-500 outline-none">
                </div>
                <div class="space-y-1.5">
                  <span class="text-[10px] text-[#8B949E] font-bold lowercase">วันที่สร้าง (created_at)</span>
                  <input type="datetime-local" formControlName="createdAt" class="w-full px-3 py-1.5 bg-[#0D1117] border border-[#30363D] rounded-md text-[#8B949E] text-[10px] focus:border-blue-500 outline-none uppercase">
                </div>
                <div class="space-y-1.5 flex flex-col justify-end pb-1">
                  <label class="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" formControlName="isNsfw" class="hidden peer">
                    <div class="w-10 h-5 bg-[#0D1117] border border-[#30363D] rounded-full peer-checked:bg-red-500/20 peer-checked:border-red-500/50 transition-all relative">
                      <div class="absolute top-1 left-1 w-3 h-3 bg-[#30363D] rounded-full peer-checked:bg-red-500 peer-checked:translate-x-5 transition-all"></div>
                    </div>
                    <span class="text-[10px] font-bold uppercase transition-colors flex items-center gap-1.5" [class.text-red-500]="promptForm.get('isNsfw')?.value" [class.text-[#8B949E]]="!promptForm.get('isNsfw')?.value">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                      </svg>
                      NSFW (18+)
                    </span>
                  </label>
                </div>
             </div>
          </div>
        </div>

        <!-- Sidebar / Image Upload & Meta -->
        <div class="space-y-6">
          <div class="bg-[#161B22] border border-[#30363D] rounded-lg overflow-hidden p-6 shadow-xl">
             <div class="text-[10px] text-[#8B949E] font-bold mb-4 uppercase tracking-widest">>> ตัวจัดการรูปภาพ (IMAGE_BUFFER)</div>
             
             <div class="relative h-64 bg-[#0D1117] rounded-md border-2 border-dashed border-[#30363D] flex flex-col items-center justify-center group overflow-hidden transition-all hover:border-blue-500/50">
                <input type="file" (change)="onFileSelected($event)" accept="image/*"
                       class="absolute inset-0 opacity-0 cursor-pointer z-10">
                
                <div *ngIf="!imagePreview" class="text-center p-4">
                  <p class="text-[10px] text-[#484F58] mb-2 uppercase tracking-widest">ลากและวางรูปภาพที่นี่ (DRAG_AND_DROP)</p>
                  <p class="text-blue-500 text-xs">[ นำเข้า (Import) ]</p>
                </div>
                
                <img *ngIf="imagePreview" [src]="imagePreview" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
             </div>

             <!-- Image Metadata -->
             <div *ngIf="imageMeta" class="mt-6 space-y-3 font-mono text-[10px] border-t border-[#30363D] pt-4 animate-in fade-in slide-in-from-top-1">
                <div class="flex justify-between">
                  <span class="text-[#484F58]">ชื่อไฟล์ (FILENAME):</span>
                  <span class="text-[#8B949E] truncate ml-4">{{ imageMeta.name }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-[#484F58]">ความละเอียด (RESOLUTION):</span>
                  <span class="text-blue-400">{{ imageMeta.width }}x{{ imageMeta.height }} พิกเซล (PX)</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-[#484F58]">ขนาดไฟล์ (FILE_SIZE):</span>
                  <span class="text-orange-400">{{ imageMeta.size }}</span>
                </div>
             </div>
          </div>

          <button type="submit" [disabled]="promptForm.invalid || isSubmitting"
                  class="w-full py-4 bg-[#238636] hover:bg-[#2EA043] text-white rounded-md font-bold text-sm shadow-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed">
            {{ isSubmitting ? 'กำลังทำงาน (EXECUTING...)' : (isEditMode ? 'บันทึกการแก้ไข (SAVE_CHANGES)' : 'บันทึกข้อมูล (COMMIT_CHANGES)') }}
          </button>
        </div>
      </form>
    </div>
  `
})
export class PromptFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private promptService = inject(PromptService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private platformId = inject(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);

  promptForm: FormGroup = this.fb.group({
    title: ['', Validators.required],
    positivePrompt: ['', Validators.required],
    negativePrompt: [''],
    modelName: [''],
    sampler: ['Euler a'],
    steps: [20],
    cfgScale: [7.0],
    seed: [''],
    category: ['General'],
    isNsfw: [false],
    createdAt: [new Date().toISOString().slice(0, 16)] // Default to current time
  });

  suggestions: Suggestions = { models: [], samplers: [], categories: [] };
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  imageMeta: { name: string, width: number, height: number, size: string } | null = null;
  isSubmitting = false;
  isEditMode = false;
  promptId: number | null = null;
  existingImageUrl: string | null = null;
  nsfwKeywords: string[] = [];
  isDragging = false;
  private dragCounter = 0;

  ngOnInit(): void {
    this.promptService.getSuggestions().subscribe(data => this.suggestions = data);

    if (isPlatformBrowser(this.platformId)) {
      const savedKeywords = localStorage.getItem('nsfwKeywords');
      if (savedKeywords) {
        this.nsfwKeywords = savedKeywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k);
      }
    }

    // Subscribe to prompt changes for auto-NSFW flagging
    this.promptForm.get('positivePrompt')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(val => this.checkNsfwKeywords(val, this.promptForm.value.negativePrompt));
    this.promptForm.get('negativePrompt')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(val => this.checkNsfwKeywords(this.promptForm.value.positivePrompt, val));

    // Check for ID in route
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.promptId = +id;
      this.loadPrompt(this.promptId);
    }
  }

  selectOption(controlName: string, value: string): void {
    this.promptForm.get(controlName)?.setValue(value);
  }

  private checkNsfwKeywords(positive: string, negative: string): void {
    if (this.nsfwKeywords.length === 0 || this.promptForm.get('isNsfw')?.value === true) return;

    const combined = (positive + ' ' + negative).toLowerCase();
    const foundKeyword = this.nsfwKeywords.find(k => combined.includes(k));

    if (foundKeyword) {
      this.promptForm.patchValue({ isNsfw: true }, { emitEvent: false });
      this.toastService.show(`ตรวจพบคำที่เกี่ยวข้องกับ NSFW: "${foundKeyword}" (AUTO_FLAGGED)`, 'info');
    }
  }

  loadPrompt(id: number): void {
    this.promptService.getPrompt(id).subscribe({
      next: (prompt) => {
        this.promptForm.patchValue({
          title: prompt.title,
          positivePrompt: prompt.positivePrompt,
          negativePrompt: prompt.negativePrompt,
          modelName: prompt.modelName,
          sampler: prompt.sampler,
          steps: prompt.steps,
          cfgScale: prompt.cfgScale,
          seed: prompt.seed,
          category: prompt.category,
          isNsfw: prompt.isNsfw || false,
          createdAt: prompt.createdAt ? new Date(prompt.createdAt).toISOString().slice(0, 16) : null
        });

        if (prompt.images && prompt.images.length > 0) {
          this.existingImageUrl = prompt.images[0].imageUrl;
          this.imagePreview = 'http://localhost:5144' + this.existingImageUrl;
        }
      },
      error: (err) => console.error('Failed to load prompt', err)
    });
  }

  @HostListener('window:dragenter', ['$event'])
  onDragEnter(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragCounter++;
    this.isDragging = true;
  }

  @HostListener('window:dragover', ['$event'])
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  @HostListener('window:dragleave', ['$event'])
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragCounter--;
    if (this.dragCounter <= 0) {
      this.dragCounter = 0;
      this.isDragging = false;
    }
  }

  @HostListener('window:drop', ['$event'])
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    this.dragCounter = 0;

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        this.processFile(file);
      }
    }
  }

  onFileSelected(event: any): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const file = event.target.files[0] as File;
    if (file) {
      this.processFile(file);
    }
  }

  async processFile(file: File): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    this.selectedFile = file;
    
    // Auto-set title from filename (remove extension)
    if (!this.promptForm.get('title')?.value) {
      this.promptForm.patchValue({ title: file.name.replace(/\.[^/.]+$/, "") });
    }

    // Get preview
    const reader = new FileReader();
    reader.onload = () => this.imagePreview = reader.result as string;
    reader.readAsDataURL(file);

    // Get Metadata (Dimensions/Size)
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      this.imageMeta = {
        name: file.name,
        width: img.width,
        height: img.height,
        size: this.formatBytes(file.size)
      };
    };

    // Auto-Extract SD Metadata
    try {
      const exifr = (await import(/* @vite-ignore */ 'exifr')).default;
      const metadata = await exifr.parse(file, true);
      
      if (metadata) {
        const rawParams = metadata.parameters || metadata.UserComment;
        if (rawParams) {
          this.parseSDParameters(rawParams);
          this.toastService.show('ดึงข้อมูลจากรูปภาพสำเร็จ (METADATA_EXTRACTED)', 'success');
        }
      }
    } catch (err) {
      console.warn('Metadata parsing skipped or failed', err);
    }
  }

  private parseSDParameters(rawText: string): void {
    // 1. Positive Prompt (Everything before "Negative prompt:" or "Steps:")
    let positive = rawText.split('Negative prompt:')[0].split('Steps:')[0].trim();

    // 2. Negative Prompt (Everything between "Negative prompt:" and "Steps:")
    let negative = '';
    if (rawText.includes('Negative prompt:')) {
      negative = rawText.split('Negative prompt:')[1].split('Steps:')[0].trim();
    }

    // 3. Extract Settings (Steps, Sampler, CFG, Seed, Model)
    const settingsPart = rawText.includes('Steps:') ? 'Steps:' + rawText.split('Steps:')[1] : '';
    
    const getValue = (key: string) => {
      const regex = new RegExp(`${key}:\\s*([^,]+)`, 'i');
      const match = settingsPart.match(regex);
      return match ? match[1].trim() : null;
    };

    const steps = getValue('Steps');
    const sampler = getValue('Sampler');
    const cfg = getValue('CFG scale');
    const seed = getValue('Seed');
    const model = getValue('Model');

    this.promptForm.patchValue({
      positivePrompt: positive,
      negativePrompt: negative,
      steps: steps ? parseInt(steps) : this.promptForm.value.steps,
      sampler: sampler || this.promptForm.value.sampler,
      cfgScale: cfg ? parseFloat(cfg) : this.promptForm.value.cfgScale,
      seed: seed || this.promptForm.value.seed,
      modelName: model || this.promptForm.value.modelName
    });

    // Manually trigger NSFW check for extracted metadata
    this.checkNsfwKeywords(positive, negative);
  }

  private formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  onSubmit(): void {
    if (this.promptForm.invalid) return;
    this.isSubmitting = true;

    if (this.selectedFile) {
      this.promptService.uploadImage(this.selectedFile).subscribe({
        next: (res) => {
          this.saveOrUpdatePrompt(res.url);
        },
        error: (err) => {
          console.error('Upload failed', err);
          this.toastService.show('อัปโหลดรูปล้มเหลว (UPLOAD_FAILED)', 'error');
          this.isSubmitting = false;
        }
      });
    } else {
      this.saveOrUpdatePrompt(this.existingImageUrl || undefined);
    }
  }

  private saveOrUpdatePrompt(imageUrl?: string): void {
    const promptData: Prompt = {
      ...this.promptForm.value,
      images: imageUrl ? [{ imageUrl }] : []
    };

    if (this.isEditMode && this.promptId) {
      this.promptService.updatePrompt(this.promptId, promptData).subscribe({
        next: () => {
          this.toastService.show('อัปเดตข้อมูลสำเร็จ (RESOURCE_UPDATED)', 'success');
          this.router.navigate(['/']);
        },
        error: (err) => {
          console.error('Update failed', err);
          this.toastService.show('การอัปเดตล้มเหลว (UPDATE_FAILED)', 'error');
          this.isSubmitting = false;
        }
      });
    } else {
      this.promptService.createPrompt(promptData).subscribe({
        next: () => {
          this.toastService.show('บันทึกข้อมูลสำเร็จ (RESOURCE_CREATED)', 'success');
          this.router.navigate(['/']);
        },
        error: (err) => {
          console.error('Save failed', err);
          this.toastService.show('การบันทึกล้มเหลว (SAVE_FAILED)', 'error');
          this.isSubmitting = false;
        }
      });
    }
  }
}
