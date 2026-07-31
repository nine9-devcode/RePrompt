import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { PromptService } from './prompt.service';

describe('PromptService', () => {
  let service: PromptService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PromptService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('always sends limit and offset', () => {
    service.getPrompts().subscribe();

    const request = httpMock.expectOne(req => req.url === `${environment.apiUrl}/prompts`);
    expect(request.request.params.get('limit')).toBe('20');
    expect(request.request.params.get('offset')).toBe('0');
    request.flush({ totalCount: 0, prompts: [] });
  });

  it('omits empty filters instead of sending blank values', () => {
    service.getPrompts({ search: '', category: '', model: '' }).subscribe();

    const request = httpMock.expectOne(req => req.url === `${environment.apiUrl}/prompts`);
    expect(request.request.params.has('search')).toBeFalse();
    expect(request.request.params.has('category')).toBeFalse();
    expect(request.request.params.has('model')).toBeFalse();
    request.flush({ totalCount: 0, prompts: [] });
  });

  it('sends includeNsfw only when strict mode is on', () => {
    service.getPrompts({ includeNsfw: true }).subscribe();
    const included = httpMock.expectOne(req => req.url === `${environment.apiUrl}/prompts`);
    expect(included.request.params.has('includeNsfw')).toBeFalse();
    included.flush({ totalCount: 0, prompts: [] });

    service.getPrompts({ includeNsfw: false }).subscribe();
    const excluded = httpMock.expectOne(req => req.url === `${environment.apiUrl}/prompts`);
    expect(excluded.request.params.get('includeNsfw')).toBe('false');
    excluded.flush({ totalCount: 0, prompts: [] });
  });

  it('posts the upload as multipart form data', () => {
    const file = new File(['x'], 'sample.png', { type: 'image/png' });
    service.uploadImage(file).subscribe();

    const request = httpMock.expectOne(`${environment.apiUrl}/upload`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body instanceof FormData).toBeTrue();
    expect((request.request.body as FormData).get('file')).toBe(file);
    request.flush({ url: '/uploads/abc.png' });
  });

  describe('absoluteImageUrl', () => {
    it('prefixes stored paths with the assets origin', () => {
      expect(service.absoluteImageUrl('/uploads/abc.png')).toBe(`${environment.assetsUrl}/uploads/abc.png`);
    });

    it('returns an empty string for a missing path rather than "undefined"', () => {
      expect(service.absoluteImageUrl(null)).toBe('');
      expect(service.absoluteImageUrl(undefined)).toBe('');
    });
  });
});
