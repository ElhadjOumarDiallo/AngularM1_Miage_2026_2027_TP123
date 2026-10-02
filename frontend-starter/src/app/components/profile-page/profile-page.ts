import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  imports: [ReactiveFormsModule],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.css',
})
export class ProfilePageComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly success = signal('');

  readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
  });

  ngOnInit(): void {
    const current = this.auth.currentUser();
    if (current) {
      this.form.setValue({ name: current.name });
    }
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');

    this.auth.profile().subscribe({
      next: (user) => {
        console.debug('[ProfilePage] Profil chargé', user.id);
        this.loading.set(false);
        this.form.setValue({ name: user.name });
      },
      error: (error: { status?: number; error?: { message?: string } }) => {
        console.error('[ProfilePage] Chargement impossible', error);
        this.loading.set(false);
        if (error.status === 401) {
          this.auth.logout();
          void this.router.navigateByUrl('/login');
          return;
        }
        this.error.set(error.error?.message ?? 'Impossible de charger le profil');
      },
    });
  }

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set('');
    this.success.set('');

    const newName = this.form.getRawValue().name.trim();

    this.auth.update(newName).subscribe({
      next: (user) => {
        console.debug('[ProfilePage] Profil enregistré', user.id);
        this.saving.set(false);
        this.success.set('Profil mis à jour avec succès !');
        this.form.setValue({ name: user.name });
      },
      error: (error: { status?: number; error?: { message?: string } }) => {
        console.error('[ProfilePage] Enregistrement impossible', error);
        this.saving.set(false);
        if (error.status === 401) {
          this.auth.logout();
          void this.router.navigateByUrl('/login');
          return;
        }
        this.error.set(error.error?.message ?? 'Impossible de mettre à jour le profil');
      },
    });
  }
}
