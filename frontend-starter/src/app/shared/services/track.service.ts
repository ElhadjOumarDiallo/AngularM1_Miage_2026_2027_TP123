import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Page } from '../models/page.model';
import { CoverSuggestion, Track } from '../models/track.model';

/** Encapsule l'ensemble des opérations HTTP pour les morceaux de travail et leurs couvertures. */
@Injectable({ providedIn: 'root' })
export class TrackService {
  private readonly http = inject(HttpClient);

  /** Récupère la liste paginée des morceaux depuis le backend avec recherche globale optionnelle. */
  list(page = 1, limit = 5, search = ''): Observable<Page<Track>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }

    return this.http.get<Page<Track>>('/api/tracks', { params });
  }

  /**
   * Téléverse un morceau avec suivi de la progression et optionnellement une pochette d'illustration.
   * Accepte soit un fichier image physique (`coverFile`), soit une URL d'image web (`coverUrl`).
   */
  upload(
    file: File,
    title: string,
    coverFile?: File,
    coverUrl?: string,
    artist?: string,
  ): Observable<HttpEvent<Track>> {
    const body = new FormData();
    body.append('audio', file);
    body.append('title', title);
    if (coverFile) {
      body.append('cover', coverFile);
    } else if (coverUrl && coverUrl.trim()) {
      body.append('coverUrl', coverUrl.trim());
    }
    if (artist && artist.trim()) {
      body.append('artist', artist.trim());
    }
    return this.http.post<Track>('/api/tracks', body, {
      reportProgress: true,
      observe: 'events',
    });
  }

  /** Recherche des pochettes et métadonnées d'albums sur le Web via l'API publique. */
  searchCovers(query: string): Observable<{ results: CoverSuggestion[] }> {
    const params = new HttpParams().set('query', query.trim());
    return this.http.get<{ results: CoverSuggestion[] }>('/api/covers/search', { params });
  }

  /** Télécharge le flux audio binaire sécurisé d'un morceau sous forme de Blob. */
  audio(id: string): Observable<Blob> {
    return this.http.get(`/api/tracks/${id}/audio`, {
      responseType: 'blob',
    });
  }

  /** Supprime un morceau, son fichier audio et sa pochette physique via DELETE /api/tracks/:id. */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`/api/tracks/${id}`);
  }
}
