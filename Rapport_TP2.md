# Rapport TP2 — Bibliothèque Upload et Lecture Audio
**Guitar Practice Cloud — Package Étudiant M1 MIAGE**

---

## 1. Vérification Exhaustive des Prérequis du TP2

Conformément à la section **Prérequis** de [`SUJET_ETUDIANT_TP2.md`](SUJET_ETUDIANT_TP2.md), les points suivants ont été rigoureusement contrôlés :

1. **TP1 fonctionnel** :
   - Authentification opérationnelle (inscription, connexion, déconnexion).
   - Formulaires réactifs validés avec retours d'erreurs inline clairs.
   - Profil utilisateur réactif chargé automatiquement (`/api/users/me`), modification du nom (`PUT /api/users/me`), et interception globale du code `401` pour redirection automatique vers `/login`.
2. **Backend opérationnel** :
   - Le backend Node.js / Express écoute sur `http://localhost:3000`.
   - Endpoint de santé fonctionnel (`GET /api/health` -> `{ status: "ok" }`).
   - Base de données MongoDB Atlas connectée et collections initialisées.
3. **Cible du proxy frontend** :
   - Le fichier [`proxy.conf.json`](frontend-starter/proxy.conf.json) redirige bien le préfixe `/api` vers `http://localhost:3000` sans validation SSL restrictive (`secure: false`).
4. **Compte de démonstration** :
   - Connexion validée avec `demo@example.com` / `Demo1234!`.
5. **Fixtures audio disponibles** :
   - Le dossier [`frontend-starter/fichiers-audio-de-test/`](frontend-starter/fichiers-audio-de-test/) contient deux morceaux de test prêts à l'emploi et respectant la limite de 25 Mo :
     - `song1.mp3` (3,6 Mo) ;
     - `song2.mp3` (6,4 Mo).

---

## 2. Mission 2 — Bibliothèque Paginée (« Pages serveur fonctionnelles »)

### 2.1. Contexte et Prompt Utilisateur
- **Prompt envoyé par le binôme** :
  > *« pour le tp2 vérifie que tout ce qui est cité dans les prérequis est respecté(dans sujet etudiant tp2), si c'est le cas : attaque toi en détail à ce qui est cité dans la mission 2 Bibliothèque paginée avec une production attendue "pages serveur fonctionnelles" et crée un fichier de rapport pour le tp2 et met le à jour à chaque étape comme pour le rapport tp1. »*

### 2.2. Architecture et Flux de Données

Le flux complet étudié pour la pagination serveur est :

```text
TracksPageComponent → TrackService.list(page, limit) → HttpClient (HttpParams) → Intercepteur JWT (Bearer) → Proxy (:4200/api) → Backend Express (:3000) → Mongoose Track.find().skip().limit() → Réponse JSON Page<Track>
```

Le backend [`backend/src/app.js`](backend/src/app.js#L270-L321) fournit déjà l'endpoint paginé `GET /api/tracks?page=X&limit=Y` :
- `page` : numéro de page (minimum 1, défaut 1).
- `limit` : nombre d'éléments par page (défaut 5, maximum 20).
- Le backend exécute en parallèle `Track.find().skip((page - 1) * limit).limit(limit)` et `Track.countDocuments()` via `Promise.all()`, puis renvoie un objet `Page<Track>` contenant `{ items, page, limit, total, pages }`.

### 2.3. Réalisations Frontend (Angular 22)

1. **Service Angular et transmission stricte des paramètres** ([`TrackService`](frontend-starter/src/app/shared/services/track.service.ts)) :
   - La méthode `list(page, limit)` utilise l'objet immuable `HttpParams` pour garantir l'encodage et l'envoi effectif des paramètres dans l'URL :
     ```typescript
     list(page = 1, limit = 5) {
       const params = new HttpParams()
         .set('page', page.toString())
         .set('limit', limit.toString());

       return this.http.get<Page<Track>>('/api/tracks', { params });
     }
     ```

2. **Représentation complète de l'état par des Signals** ([`TracksPageComponent`](frontend-starter/src/app/components/tracks-page/tracks-page.ts)) :
   - `readonly tracks = signal<Track[]>([]);` : tableau des morceaux de la page courante.
   - `readonly page = signal(1);` : numéro de la page active (1-indexé pour l'API Express).
   - `readonly limit = signal(5);` : nombre d'éléments par page sélectionné par l'utilisateur (5, 10 ou 20).
   - `readonly pages = signal(1);` : nombre total de pages calculé par le serveur.
   - `readonly total = signal(0);` : nombre total de morceaux de l'utilisateur.
   - `readonly loading = signal(false);` : indicateur d'attente d'une requête HTTP en cours.
   - `readonly error = signal('');` : message d'erreur serveur en cas d'échec réseau ou HTTP.

3. **Boutons « Précédent » et « Suivant » désactivés aux bornes (exigence stricte du sujet)** :
   - Conformément aux consignes mot à mot du sujet (*« Ajouter les boutons « Précédent » et « Suivant », désactivés aux bornes »*), la méthode `go(page)` contrôle rigoureusement les bornes et pilote ces deux boutons dans [`tracks-page.html`](frontend-starter/src/app/components/tracks-page/tracks-page.html) :
     - Bouton **« Précédent »** : désactivé si `page() <= 1` ou si `loading()`.
     - Bouton **« Suivant »** : désactivé si `page() >= pages()` ou si `loading()`.
   - Code TypeScript associé dans [`TracksPageComponent`](frontend-starter/src/app/components/tracks-page/tracks-page.ts) :
     ```typescript
     go(page: number): void {
       if (page < 1 || page > this.pages() || page === this.page() || this.loading()) {
         return;
       }
       this.page.set(page);
       this.load();
     }
     ```
   - **Nouvelle requête HTTP à chaque changement** : L'appel à `this.load()` déclenche systématiquement `TrackService.list(this.page(), this.limit())`. Il est strictement garanti qu'aucun découpage local en mémoire n'est effectué : seul le flux paginé du serveur est exploité.

4. **Structures de contrôle de flux modernes Angular 22** :
   - `@if (loading())` : affiche l'état de chargement lors de la requête en cours.
   - `@if (error())` : affiche les messages d'erreur serveur avec sémantique accessible (`role="alert"`).
   - `@for (track of tracks(); track track.id)` : itère sur les morceaux reçus avec suivi d'identité par `track.id`.
   - `@empty` : affiche le message d'état vide *« Aucune piste dans votre bibliothèque. »* lorsqu'aucun morceau n'est présent.

5. **Option avancée : Angular Material Paginator (`MatPaginator`)** :
   - En complément des boutons standards demandés dans le corps du sujet, le composant `<mat-paginator>` issu de la section optionnelle avancée ([`material.angular.dev/components/paginator/overview`](https://material.angular.dev/components/paginator/overview)) a été intégré pour enrichir l'ergonomie :
     - **Installation des dépendances** : `@angular/material` et `@angular/cdk`.
     - **Thème visuel** : Import du thème officiel `@angular/material/prebuilt-themes/indigo-pink.css` dans [`styles.css`](frontend-starter/src/styles.css).
     - **Conversion d'indexation** : `MatPaginator` utilise un index 0-based (`pageIndex = 0` pour la 1ère page), alors que l'API Express utilise un index 1-based (`page = 1`). La méthode `onPageChange(event: PageEvent)` assure la conversion transparente :
       ```typescript
       onPageChange(event: PageEvent): void {
         this.limit.set(event.pageSize);
         this.page.set(event.pageIndex + 1);
         this.load();
       }
       ```
     - **Internationalisation française** : Implémentation d'un provider personnalisé `MatPaginatorIntl` traduisant les infobulles et libellés en français (*« Morceaux par page : »*, *« Page suivante »*, *« X – Y sur Z »*).
     - **Options de pagination** : `pageSizeOptions = [5, 10, 20]`, en parfaite cohérence avec le backend qui plafonne la limite à 20 ([`backend/src/app.js`, ligne 274](backend/src/app.js#L274)).
     - **Désactivation pendant le chargement** : L'attribut `[disabled]="loading()"` empêche les clics concurrents.

### 2.4. Justification Théorique : Pourquoi la pagination serveur est-elle obligatoire ?

> **Interdiction du découpage local** : Le sujet interdit formellement de charger l'intégralité des pistes (`GET /api/tracks`) pour les paginer côté client avec un filtre JavaScript.

**Raisons d'architecture logicielle** :
1. **Scalabilité et mémoire client** : Si un utilisateur possède 1 000 morceaux, transférer l'intégralité des enregistrements consommerait inutilement la RAM du navigateur et ralentirait l'initialisation de la page.
2. **Économie de bande passante réseau** : Seuls les morceaux requis pour la page actuelle (5, 10 ou 20) sont téléchargés à chaque étape.
3. **Optimisation base de données** : MongoDB utilise les clauses natives `.skip()` et `.limit()` indexées pour n'extraire que les documents pertinents du disque, évitant de saturer la mémoire du serveur Node.js.

### 2.5. Fichiers Modifiés pour la Mission 2

- [`frontend-starter/package.json`](frontend-starter/package.json) : Ajout des dépendances `@angular/material` et `@angular/cdk`.
- [`frontend-starter/src/styles.css`](frontend-starter/src/styles.css) : Import du thème Angular Material (`indigo-pink.css`).
- [`frontend-starter/src/app/shared/services/track.service.ts`](frontend-starter/src/app/shared/services/track.service.ts) : Construction explicite des query params `page` et `limit` via `HttpParams`.
- [`frontend-starter/src/app/components/tracks-page/tracks-page.ts`](frontend-starter/src/app/components/tracks-page/tracks-page.ts) : Intégration de `MatPaginatorModule`, `PageEvent`, provider `MatPaginatorIntl` (FR), gestion réactive de `page`, `limit`, `total`, `loading` et `error`.
- [`frontend-starter/src/app/components/tracks-page/tracks-page.html`](frontend-starter/src/app/components/tracks-page/tracks-page.html) : Remplacement du pager basique par `<mat-paginator>`.
- [`frontend-starter/src/app/components/tracks-page/tracks-page.css`](frontend-starter/src/app/components/tracks-page/tracks-page.css) : Styles d'intégration pour le composant Material.

---

### 2.6. Checkpoint Network de la Pagination

Pour prouver le bon fonctionnement de la pagination serveur lors de votre évaluation :

1. Ouvrir les DevTools (`F12`), onglet **Network**, filtre `Fetch/XHR`.
2. Se connecter et se rendre sur `/tracks`.
3. Constater l'appel initial :
   - `GET http://localhost:4200/api/tracks?page=1&limit=5`
   - Statut `200 OK`
   - En-tête : `Authorization: Bearer <token>`
   - Corps de réponse : `{ items: [...], page: 1, limit: 5, total: X, pages: Y }`
4. Cliquer sur la flèche suivante ou changer le sélecteur « Morceaux par page » (ex: passer à 10) :
   - Observer immédiatement une **nouvelle** requête HTTP : `GET http://localhost:4200/api/tracks?page=2&limit=5` ou `GET http://localhost:4200/api/tracks?page=1&limit=10`.
   - Constater que les paramètres `page` et `limit` sont bien envoyés au serveur et que seuls les morceaux demandés sont renvoyés.
5. Vérifier que sur la dernière page, la flèche suivante devient grisée/désactivée.
