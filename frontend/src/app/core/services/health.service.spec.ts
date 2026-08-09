import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(HealthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  interface HealthBody {
    status: string;
    database: string;
    databaseReachable: boolean;
  }

  function respondWith(body: HealthBody): void {
    httpMock.expectOne(`${environment.apiUrl}/health`).flush(body);
  }

  it('starts in the checking state and probes immediately', () => {
    // The request raised on construction is still open at this point.
    const request = httpMock.expectOne(`${environment.apiUrl}/health`);
    expect(service.status()).toBe('checking');
    request.flush({ status: 'healthy', database: 'Sqlite', databaseReachable: true });
  });

  it('reports online and records the database when the api is reachable', () => {
    respondWith({ status: 'healthy', database: 'Sqlite', databaseReachable: true });

    expect(service.status()).toBe('online');
    expect(service.database()).toBe('Sqlite');
    expect(service.lastCheckedAt()).not.toBeNull();
  });

  it('reports offline when the request fails', () => {
    httpMock
      .expectOne(`${environment.apiUrl}/health`)
      .error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

    expect(service.status()).toBe('offline');
  });

  it('reports offline when the api answers but the database is unreachable', () => {
    respondWith({ status: 'degraded', database: 'Sqlite', databaseReachable: false });

    expect(service.status()).toBe('offline');
  });

  it('recovers to online on a later successful check', () => {
    httpMock.expectOne(`${environment.apiUrl}/health`).error(new ProgressEvent('error'));
    expect(service.status()).toBe('offline');

    service.check();
    respondWith({ status: 'healthy', database: 'Sqlite', databaseReachable: true });

    expect(service.status()).toBe('online');
  });

  it('keeps the last known database name after going offline', () => {
    respondWith({ status: 'healthy', database: 'Sqlite', databaseReachable: true });

    service.check();
    httpMock.expectOne(`${environment.apiUrl}/health`).error(new ProgressEvent('error'));

    expect(service.status()).toBe('offline');
    expect(service.database()).toBe('Sqlite');
  });
});
