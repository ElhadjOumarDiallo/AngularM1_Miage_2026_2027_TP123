import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
      ],
    });
    service = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('login() doit appeler POST /api/auth/login avec le bon corps et stocker le jeton', () => {
    const mockResponse = {
      token: 'fake-jwt-token-xyz',
      user: { id: 'u1', name: 'Alice', email: 'alice@example.com', createdAt: '2026-01-01T00:00:00.000Z' },
    };

    service.login('alice@example.com', 'password123').subscribe((res) => {
      expect(res).toEqual(mockResponse);
      expect(service.token()).toBe('fake-jwt-token-xyz');
      expect(service.currentUser()?.email).toBe('alice@example.com');
      expect(localStorage.getItem('gpc_token')).toBe('fake-jwt-token-xyz');
    });

    const req = httpTesting.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      email: 'alice@example.com',
      password: 'password123',
    });

    req.flush(mockResponse);
  });

  it('logout() doit réinitialiser le jeton, le profil et purger le localStorage', () => {
    localStorage.setItem('gpc_token', 'temp-token');
    service.token.set('temp-token');
    service.currentUser.set({ id: 'u1', name: 'Alice', email: 'alice@example.com', createdAt: '2026-01-01T00:00:00.000Z' });

    service.logout();

    expect(service.token()).toBeNull();
    expect(service.currentUser()).toBeNull();
    expect(localStorage.getItem('gpc_token')).toBeNull();
  });
});
