import { Component, inject, OnDestroy, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpEventType } from '@angular/common/http';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { debounceTime, distinctUntilChanged, Subscription } from 'rxjs';
import { CoverSuggestion, Track } from '../../shared/models/track.model';
import { TrackService } from '../../shared/services/track.service';

/** Contraintes d'upload côté client calquées sur le backend Express (Multer). */
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 Mo audio
const MAX_COVER_SIZE = 5 * 1024 * 1024; // 5 Mo image
const ALLOWED_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/mp4',
  'audio/x-m4a',
]);
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

/** Traduction en français des libellés du MatPaginator. */
export function getFrenchPaginatorIntl(): MatPaginatorIntl {
  const intl = new MatPaginatorIntl();
  intl.itemsPerPageLabel = 'Morceaux par page :';
  intl.nextPageLabel = 'Page suivante';
  intl.previousPageLabel = 'Page précédente';
  intl.firstPageLabel = 'Première page';
  intl.lastPageLabel = 'Dernière page';
  intl.getRangeLabel = (page: number, pageSize: number, length: number) => {
    if (length === 0 || pageSize === 0) {
      return `0 sur ${length}`;
    }
    const startIndex = page * pageSize;
    const endIndex = Math.min(startIndex + pageSize, length);
    return `${startIndex + 1} – ${endIndex} sur ${length}`;
  };
  return intl;
}

@Component({
  imports: [ReactiveFormsModule, MatPaginatorModule, MatIconModule],
  providers: [{ provide: MatPaginatorIntl, useFactory: getFrenchPaginatorIntl }],
  templateUrl: './tracks-page.html',
  styleUrl: './tracks-page.css',
})
export class TracksPageComponent implements OnDestroy {
  private readonly service = inject(TrackService);
  private readonly searchSub: Subscription;

  // Pagination et bibliothèque
  readonly tracks = signal<Track[]>([]);
  readonly page = signal(1); // 1-indexé pour l'API Express
  readonly limit = signal(5);
  readonly pages = signal(1);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly error = signal('');

  // Recherche globale sur toute la base de données
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly searchTerm = signal('');

  // Formulaire d'upload et progression
  readonly title = new FormControl('', { nonNullable: true });
  readonly artist = new FormControl('', { nonNullable: true });
  readonly coverUrl = new FormControl('', { nonNullable: true });
  readonly uploading = signal(false);
  readonly uploadProgress = signal<number | null>(null);
  readonly uploadError = signal('');
  readonly uploadSuccess = signal('');
  file?: File;

  // Image de couverture (upload physique ou recherche Web)
  coverFile?: File;
  readonly coverPreview = signal('');
  readonly coverSuggestions = signal<CoverSuggestion[]>([]);
  readonly searchingCovers = signal(false);

  // Lecture audio sécurisée
  readonly currentTrack = signal<Track | null>(null);
  readonly audioLoading = signal(false);
  readonly audioError = signal('');
  readonly audioUrl = signal('');

  // Suppression
  readonly deletingId = signal<string | null>(null);

  constructor() {
    this.load();

    // Recherche réactive globale avec debounce
    this.searchSub = this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe((value) => {
        this.searchTerm.set(value.trim());
        this.page.set(1);
        this.load();
      });
  }

  ngOnDestroy(): void {
    this.searchSub.unsubscribe();
    const current = this.audioUrl();
    if (current) {
      URL.revokeObjectURL(current);
    }
  }

  choose(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selected = input.files?.[0];
    this.uploadError.set('');
    this.uploadSuccess.set('');
    this.uploadProgress.set(null);

    if (!selected) {
      this.file = undefined;
      return;
    }

    // 1. Contrôle client de la taille maximale (25 Mo)
    if (selected.size > MAX_FILE_SIZE) {
      this.uploadError.set('Le fichier dépasse la taille maximale autorisée de 25 Mo.');
      this.file = undefined;
      input.value = '';
      return;
    }

    // 2. Contrôle client du type MIME audio
    if (!ALLOWED_MIME_TYPES.has(selected.type) && !selected.type.startsWith('audio/')) {
      this.uploadError.set('Format de fichier non accepté. Veuillez sélectionner un fichier audio (MP3, WAV, OGG, M4A).');
      this.file = undefined;
      input.value = '';
      return;
    }

    this.file = selected;

    // Pré-remplir le titre avec le nom du fichier sans extension si vide
    if (!this.title.value.trim()) {
      const baseName = selected.name.replace(/\.[^/.]+$/, '');
      this.title.setValue(baseName);
    }
    console.debug('[TracksPage] Fichier valide sélectionné :', this.file.name, `${(this.file.size / 1024 / 1024).toFixed(2)} Mo`);
  }

  chooseCover(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selected = input.files?.[0];
    if (!selected) {
      return;
    }

    if (selected.size > MAX_COVER_SIZE) {
      this.uploadError.set("L'image de couverture dépasse la taille maximale de 5 Mo.");
      input.value = '';
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.has(selected.type)) {
      this.uploadError.set("Format d'image non accepté (JPEG, PNG, WebP).");
      input.value = '';
      return;
    }

    this.coverFile = selected;
    this.coverUrl.setValue('');
    const reader = new FileReader();
    reader.onload = () => this.coverPreview.set(reader.result as string);
    reader.readAsDataURL(selected);
  }

  removeCover(coverInput?: HTMLInputElement): void {
    this.coverFile = undefined;
    this.coverUrl.setValue('');
    this.coverPreview.set('');
    if (coverInput) coverInput.value = '';
  }

  searchWebCover(): void {
    const query = this.title.value.trim() || (this.file?.name ?? '');
    if (!query) {
      this.uploadError.set('Veuillez renseigner un titre ou choisir un fichier pour rechercher une pochette.');
      return;
    }

    this.searchingCovers.set(true);
    this.uploadError.set('');
    this.service.searchCovers(query).subscribe({
      next: (res) => {
        this.coverSuggestions.set(res.results || []);
        this.searchingCovers.set(false);
        if (!res.results || res.results.length === 0) {
          this.uploadError.set('Aucune pochette trouvée sur le Web pour ce morceau.');
        }
      },
      error: () => {
        this.searchingCovers.set(false);
        this.uploadError.set('Recherche de pochette en ligne indisponible.');
      },
    });
  }

  selectSuggestion(suggestion: CoverSuggestion, coverInput?: HTMLInputElement): void {
    this.coverFile = undefined;
    if (coverInput) coverInput.value = '';
    this.coverUrl.setValue(suggestion.coverUrl);
    this.coverPreview.set(suggestion.coverUrl);
    if (!this.artist.value.trim() && suggestion.artist) {
      this.artist.setValue(suggestion.artist);
    }
    this.coverSuggestions.set([]);
  }

  onCoverError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');

    this.service.list(this.page(), this.limit(), this.searchTerm()).subscribe({
      next: (response) => {
        console.debug('[TracksPage] Pistes chargées :', response.items.length, 'sur', response.total);
        const term = this.searchTerm().toLowerCase();
        let items = response.items;
        let total = response.total;
        let pages = response.pages;

        // Filtrage de cohérence si le backend n'a pas encore été redémarré avec la recherche
        if (term && items.some((t) => !t.title.toLowerCase().includes(term) && !t.originalName.toLowerCase().includes(term))) {
          items = items.filter((t) => t.title.toLowerCase().includes(term) || t.originalName.toLowerCase().includes(term));
          total = items.length;
          pages = Math.max(1, Math.ceil(total / this.limit()));
        }

        this.tracks.set(items);
        this.page.set(response.page);
        this.limit.set(response.limit);
        this.pages.set(pages);
        this.total.set(total);
        this.loading.set(false);
      },
      error: (error: { error?: { message?: string } }) => {
        console.error('[TracksPage] Chargement impossible', error);
        this.loading.set(false);
        this.error.set(error.error?.message ?? 'Impossible de charger la bibliothèque audio');
      },
    });
  }

  onPageChange(event: PageEvent): void {
    this.page.set(event.pageIndex + 1);
    this.limit.set(event.pageSize);
    this.load();
  }

  clearSearch(): void {
    this.searchControl.setValue('');
  }

  upload(fileInput?: HTMLInputElement, coverInput?: HTMLInputElement): void {
    if (!this.file || this.uploading()) return;

    this.uploading.set(true);
    this.uploadProgress.set(0);
    this.uploadError.set('');
    this.uploadSuccess.set('');

    const titleToSend = this.title.value.trim() || this.file.name;
    const coverUrlToSend = this.coverUrl.value.trim();
    const artistToSend = this.artist.value.trim();

    this.service.upload(this.file, titleToSend, this.coverFile, coverUrlToSend, artistToSend).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          const percent = Math.round((100 * event.loaded) / event.total);
          this.uploadProgress.set(percent);
        } else if (event.type === HttpEventType.Response) {
          const track = event.body;
          console.debug('[TracksPage] Piste envoyée avec succès :', track?.id);
          this.uploading.set(false);
          this.uploadProgress.set(null);
          this.uploadSuccess.set(`« ${track?.title ?? titleToSend} » a été importé avec succès !`);
          this.title.setValue('');
          this.artist.setValue('');
          this.coverUrl.setValue('');
          this.coverPreview.set('');
          this.coverSuggestions.set([]);
          this.file = undefined;
          this.coverFile = undefined;
          if (fileInput) fileInput.value = '';
          if (coverInput) coverInput.value = '';
          this.searchControl.setValue('');
          this.page.set(1);
          this.load();
        }
      },
      error: (error: { error?: { message?: string } }) => {
        console.error('[TracksPage] Envoi impossible', error);
        this.uploading.set(false);
        this.uploadProgress.set(null);
        this.uploadError.set(error.error?.message ?? "Une erreur est survenue lors de l'envoi du fichier.");
      },
    });
  }

  play(track: Track): void {
    this.audioLoading.set(true);
    this.audioError.set('');
    this.currentTrack.set(track);

    this.service.audio(track.id).subscribe({
      next: (blob) => {
        console.debug('[TracksPage] Audio chargé avec succès :', track.id);
        this.audioLoading.set(false);
        const previousUrl = this.audioUrl();
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        this.audioUrl.set(URL.createObjectURL(blob));
      },
      error: (error: { error?: { message?: string } }) => {
        console.error('[TracksPage] Lecture impossible', error);
        this.audioLoading.set(false);
        this.audioError.set(error.error?.message ?? `Impossible de lire le morceau « ${track.title} »`);
      },
    });
  }

  deleteTrack(track: Track): void {
    const confirmed = window.confirm(`Voulez-vous vraiment supprimer le morceau « ${track.title} » ?`);
    if (!confirmed) return;

    this.deletingId.set(track.id);
    this.error.set('');

    this.service.delete(track.id).subscribe({
      next: () => {
        console.debug('[TracksPage] Morceau supprimé avec succès :', track.id);
        this.deletingId.set(null);
        if (this.currentTrack()?.id === track.id) {
          const prev = this.audioUrl();
          if (prev) URL.revokeObjectURL(prev);
          this.audioUrl.set('');
          this.currentTrack.set(null);
        }
        this.load();
      },
      error: (error: { error?: { message?: string } }) => {
        console.error('[TracksPage] Suppression impossible', error);
        this.deletingId.set(null);
        this.error.set(error.error?.message ?? `Impossible de supprimer « ${track.title} »`);
      },
    });
  }

  /** Formatage lisible de la taille en octets (Ko / Mo). */
  formatSize(bytes: number): string {
    if (!bytes || bytes <= 0) return '0 Ko';
    const k = 1024;
    const sizes = ['octets', 'Ko', 'Mo', 'Go'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const val = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
    return `${val} ${sizes[i]}`;
  }

  /** Formatage lisible de la date en français. */
  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(date);
    } catch {
      return dateStr.slice(0, 10);
    }
  }

  /** Formatage lisible du format audio (MP3, WAV, etc.). */
  formatMime(mimeType: string, filename?: string): string {
    if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'MP3';
    if (mimeType.includes('wav')) return 'WAV';
    if (mimeType.includes('ogg')) return 'OGG';
    if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'M4A';
    if (filename) {
      const ext = filename.split('.').pop()?.toUpperCase();
      if (ext) return ext;
    }
    return mimeType.replace('audio/', '').toUpperCase();
  }
}
