import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TrackService } from './track.service';
import { Page } from '../models/page.model';
import { Track } from '../models/track.model';

describe('TrackService', () => {
  let service: TrackService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        TrackService,
      ],
    });
    service = TestBed.inject(TrackService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('list() doit transmettre page et limit sous forme de paramètres HTTP', () => {
    const mockPage: Page<Track> = {
      items: [
        {
          id: 'track-1',
          title: 'Autumn Leaves',
          originalName: 'autumn.mp3',
          mimeType: 'audio/mpeg',
          size: 1024,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      page: 2,
      limit: 10,
      total: 1,
      pages: 1,
    };

    service.list(2, 10).subscribe((result) => {
      expect(result).toEqual(mockPage);
      expect(result.items.length).toBe(1);
      expect(result.items[0].title).toBe('Autumn Leaves');
    });

    const req = httpTesting.expectOne((r) => r.url === '/api/tracks');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('limit')).toBe('10');
    expect(req.request.params.has('search')).toBe(false);

    req.flush(mockPage);
  });

  it('list() doit inclure le paramètre search si une recherche est spécifiée', () => {
    service.list(1, 5, 'miles davis').subscribe();

    const req = httpTesting.expectOne((r) => r.url === '/api/tracks');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('limit')).toBe('5');
    expect(req.request.params.get('search')).toBe('miles davis');

    req.flush({ items: [], page: 1, limit: 5, total: 0, pages: 0 });
  });

  it('delete() doit appeler DELETE /api/tracks/:id', () => {
    const trackId = '660e8400-e29b-41d4-a716-446655440000';

    service.delete(trackId).subscribe();

    const req = httpTesting.expectOne(`/api/tracks/${trackId}`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toBeNull();

    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('upload() doit configurer reportProgress à true pour suivre la progression', () => {
    const dummyBlob = new Blob(['dummy audio content'], { type: 'audio/mpeg' });
    const dummyFile = new File([dummyBlob], 'test.mp3', { type: 'audio/mpeg' });

    service.upload(dummyFile, 'My Song', undefined, undefined, 'Artist X').subscribe();

    const req = httpTesting.expectOne('/api/tracks');
    expect(req.request.method).toBe('POST');
    expect(req.request.reportProgress).toBe(true);

    req.flush({ id: 'new-id', title: 'My Song' } as Track);
  });
});
