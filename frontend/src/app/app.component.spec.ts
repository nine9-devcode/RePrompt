import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      // The shell injects HealthService, which polls the API for the footer status.
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // The health poll fires on construction; drain it so no test leaks a pending request.
    httpMock
      .match(req => req.url.endsWith('/health'))
      .forEach(req => req.flush(null, { status: 0, statusText: '' }));
    httpMock.verify();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it(`should have the 'RePrompt' title`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance.title).toEqual('RePrompt');
  });

  it('should render the router outlet shell', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeTruthy();
  });
});
