import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { HealthService } from './core/services/health.service';
import { ToastComponent } from './shared/toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  protected readonly health = inject(HealthService);

  title = 'RePrompt';

  protected readonly statusLabel = computed(() => {
    switch (this.health.status()) {
      case 'online':
        return 'พร้อมใช้งาน (Ready)';
      case 'offline':
        return 'ไม่ได้เชื่อมต่อ (Offline)';
      default:
        return 'กำลังตรวจสอบ... (Checking)';
    }
  });

  protected readonly statusColour = computed(() => {
    switch (this.health.status()) {
      case 'online':
        return 'text-[#3FB950]';
      case 'offline':
        return 'text-[#F85149]';
      default:
        return 'text-[#8B949E]';
    }
  });

  protected readonly statusDotClass = computed(() => {
    switch (this.health.status()) {
      case 'online':
        return 'bg-[#3FB950]';
      case 'offline':
        return 'bg-[#F85149]';
      default:
        return 'bg-[#8B949E]';
    }
  });
}
