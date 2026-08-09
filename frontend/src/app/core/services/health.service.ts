import { DestroyRef, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { catchError, of, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';

export type HealthStatus = 'checking' | 'online' | 'offline';

interface HealthResponse {
  status: string;
  database: string;
  databaseReachable: boolean;
}

/** How often the footer re-checks. Long enough to stay quiet, short enough to notice. */
const POLL_INTERVAL_MS = 30_000;
const REQUEST_TIMEOUT_MS = 5_000;

/**
 * Polls the API so the footer can report what is actually true. The status used to be a
 * hardcoded "Ready" that stayed green even with the backend stopped.
 */
@Injectable({ providedIn: 'root' })
export class HealthService {
  private readonly http = inject(HttpClient);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly status = signal<HealthStatus>('checking');
  /** Database engine reported by the API; null until a check succeeds. */
  readonly database = signal<string | null>(null);
  readonly lastCheckedAt = signal<Date | null>(null);

  constructor() {
    if (!this.isBrowser) return;

    this.check();
    const handle = setInterval(() => this.check(), POLL_INTERVAL_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(handle));
  }

  check(): void {
    if (!this.isBrowser) return;

    this.http
      .get<HealthResponse>(`${environment.apiUrl}/health`)
      .pipe(
        timeout(REQUEST_TIMEOUT_MS),
        catchError(() => of(null))
      )
      .subscribe(response => {
        this.status.set(response?.databaseReachable ? 'online' : 'offline');
        if (response?.database) this.database.set(response.database);
        this.lastCheckedAt.set(new Date());
      });
  }
}
