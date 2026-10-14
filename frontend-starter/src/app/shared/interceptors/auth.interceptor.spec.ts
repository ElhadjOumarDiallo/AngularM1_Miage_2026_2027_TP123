import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let authService: AuthService;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('doit ajouter le header Authorization lorsqu’un token existe', () => {
    authService.token.set('valid-test-jwt-token');

    http.get('/api/tracks').subscribe();

    const req = httpTesting.expectOne('/api/tracks');
    expect(req.request.headers.has('Authorization')).toBe(true);
    expect(req.request.headers.get('Authorization')).toBe('Bearer valid-test-jwt-token');
    req.flush([]);
  });

  it('ne doit pas ajouter de header Authorization lorsqu’aucun token n’existe', () => {
    authService.token.set(null);

    http.get('/api/health').subscribe();

    const req = httpTesting.expectOne('/api/health');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ status: 'ok' });
  });

  it('doit déconnecter l’utilisateur et naviguer vers /login sur une erreur 401', () => {
    authService.token.set('expired-jwt-token');
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockReturnValue(Promise.resolve(true));
    const logoutSpy = vi.spyOn(authService, 'logout');

    http.get('/api/tracks').subscribe({
      error: () => {},
    });

    const req = httpTesting.expectOne('/api/tracks');
    req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(logoutSpy).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith('/login');
  });
});
