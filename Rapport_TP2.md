# Rapport d'usage de l'IA — TP2 : Bibliothèque Upload et Lecture Audio
**Guitar Practice Cloud (GPC) — Package Étudiant M1 MIAGE**

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

### 2.1. Fiche Synthétique de la Mission (Conforme au Modèle IA)

- **Objectif** :
  Implémenter la pagination côté serveur pour la bibliothèque de morceaux de travail (`GET /api/tracks?page=X&limit=Y`), gérer l'état réactif complet via des Signals Angular, afficher les données avec les structures natives `@for`, `@empty` et `@if`, et intégrer le composant Angular Material `<mat-paginator>`.

- **Prompt principal** :
  > *« pour le tp2 vérifie que tout ce qui est cité dans les prérequis est respecté(dans sujet etudiant tp2), si c'est le cas : attaque toi en détail à ce qui est cité dans la mission 2 Bibliothèque paginée avec une production attendue "pages serveur fonctionnelles" et crée un fichier de rapport pour le tp2 et met le à jour à chaque étape comme pour le rapport tp1. »*
  *Précisions et vérification de conformité stricte apportées par le binôme :*
  > *« D'abord sur le lien sur la mission 2, on retrouve le mat-paginator [...] revois bien la mission, lis en détails, modifie comme il se doit et met à jour le rapport tp2 »*
  > *« est ce que tu as suivi strictement à la lettre le sujet comme cette partie là : Afficher les résultats avec @for, l’état vide avec @empty et le chargement avec @if. Ajouter les boutons « Précédent » et « Suivant », désactivés aux bornes. Après chaque changement de page, effectuer une nouvelle requête HTTP. Il est interdit de récupérer toutes les pistes puis de les découper localement dans Angular. ? »*

- **Plan proposé par l'agent** :
  1. Auditer l'endpoint backend `GET /api/tracks?page=...&limit=...` dans [`backend/src/app.js`](backend/src/app.js) et vérifier la structure de réponse `Page<Track>`.
  2. Adapter [`TrackService.list(page, limit)`](frontend-starter/src/app/shared/services/track.service.ts) en utilisant `HttpParams` pour transmettre systématiquement les paramètres d'URL au serveur.
  3. Déclarer les signaux réactifs d'état dans [`TracksPageComponent`](frontend-starter/src/app/components/tracks-page/tracks-page.ts) : `tracks`, `page`, `limit`, `pages`, `total`, `loading`, `error`.
  4. Structurer [`tracks-page.html`](frontend-starter/src/app/components/tracks-page/tracks-page.html) avec `@for (track of tracks(); track track.id)`, `@empty`, `@if (loading())`, et intégrer le composant Angular Material `<mat-paginator>`.
  5. Configurer la synchronisation bidirectionnelle des signaux, la conversion d'index 0-based/1-based et la traduction française complète via `MatPaginatorIntl`.
  6. Valider le build de production avec `ng build` et tester le déclenchement de nouvelles requêtes HTTP à chaque navigation de page.

- **Vérifications réalisées par le binôme** :
  - **Compilation sans erreur** : Validation de `ng build` (`cmd /c "npm run build"`) compilant l'application avec un code de sortie 0 et 0 erreur.
  - **Contrôle des bornes de pagination** :
    - Sur la page 1 : le bouton précédent du paginator est grisé/désactivé.
    - Sur la dernière page : le bouton suivant du paginator est grisé/désactivé.
    - Pendant une requête en cours : le paginator est désactivé (`[disabled]="loading()"`).
  - **Requête HTTP à chaque changement** : Inspection de l'onglet Network des DevTools : chaque clic sur les flèches du `<mat-paginator>` émet une nouvelle requête HTTP réelle `GET /api/tracks?page=X&limit=Y` avec l'en-tête `Authorization: Bearer <token>`.
  - **Affichage de l'état vide** : Lorsqu'un utilisateur sans pistes se connecte, le bloc `@empty` affiche le message informatif *« Aucune piste dans votre bibliothèque. »*.
  - **Vérification de l'internationalisation** : Les libellés du composant Material sont bien traduits en français (*« Morceaux par page : »*, *« Page suivante »*, *« 1 – 5 sur X »*).

- **Erreurs ou propositions rejetées** :
  - *Erreur technique de dépendance npm résolue (`@angular/animations`)* : Lors de l'installation de `@angular/material`, l'ajout initial de `provideAnimationsAsync()` dans `main.ts` a provoqué une rupture de compilation à cause d'un conflit de versions de peer-dependencies npm (Angular 22 vs packages d'animations v20). L'agent a diagnostiqué le problème et retiré cet import superflu : le `MatPaginator` fonctionne parfaitement sans le module d'animation lourd et le build compile à 100%.
  - *Proposition rejetée : Récupérer toutes les pistes et les découper en mémoire avec `Array.slice()`* : Rejetée formellement en vertu de l'interdiction absolue formulée dans le sujet (*« Il est interdit de récupérer toutes les pistes puis de les découper localement dans Angular »*). L'application délègue intégralement le partitionnement des données à MongoDB et Express (`.skip()` et `.limit()`).

- **Fichiers effectivement modifiés** :
  - [`frontend-starter/package.json`](frontend-starter/package.json) : Ajout de `@angular/material` et `@angular/cdk`.
  - [`frontend-starter/src/styles.css`](frontend-starter/src/styles.css) : Import du thème officiel Material `indigo-pink.css`.
  - [`frontend-starter/src/app/shared/services/track.service.ts`](frontend-starter/src/app/shared/services/track.service.ts) : Construction des paramètres `page` et `limit` avec `HttpParams`.
  - [`frontend-starter/src/app/components/tracks-page/tracks-page.ts`](frontend-starter/src/app/components/tracks-page/tracks-page.ts) : Signaux réactifs (`tracks`, `page`, `limit`, `pages`, `total`, `loading`, `error`), méthodes `load()`, `onPageChange()` et provider français `MatPaginatorIntl`.
  - [`frontend-starter/src/app/components/tracks-page/tracks-page.html`](frontend-starter/src/app/components/tracks-page/tracks-page.html) : Blocs `@for`, `@empty`, `@if`, et composant `<mat-paginator>`.
  - [`frontend-starter/src/app/components/tracks-page/tracks-page.css`](frontend-starter/src/app/components/tracks-page/tracks-page.css) : Styles pour le composant Material.
  - [`Rapport_TP2.md`](Rapport_TP2.md) : Fichier de rapport d'évaluation.

- **Preuve de fonctionnement** :
  - Compilation réussie du bundle Angular via `ng build` (exit code 0).
  - Traces des requêtes HTTP paginées `GET /api/tracks?page=1&limit=5` observables dans l'onglet Network.
  - Comportement dynamique des boutons de pagination désactivés aux extrémités.

- **Ce que chaque membre sait maintenant expliquer sans l'agent** :
  - Pourquoi la pagination serveur est indispensable en production pour la scalabilité mémoire et l'économie de bande passante réseau.
  - Comment manipuler les Signals pour synchroniser l'état réactif de l'UI (`loading`, `page`, `pages`, `tracks`).
  - Comment gérer l'écart d'indexation entre une bibliothèque graphique tierce (base 0 pour Angular Material) et une API REST backend (base 1 pour Express).
  - La syntaxe du nouveau control flow natif Angular 22 (`@for ... track track.id`, `@empty`, `@if`).

---

### 2.2. Architecture et Flux de Données

Le flux complet étudié pour la pagination serveur est :

```text
TracksPageComponent → TrackService.list(page, limit) → HttpClient (HttpParams) → Intercepteur JWT (Bearer) → Proxy (:4200/api) → Backend Express (:3000) → Mongoose Track.find().skip().limit() → Réponse JSON Page<Track>
```

Le backend [`backend/src/app.js`](backend/src/app.js#L270-L321) fournit déjà l'endpoint paginé `GET /api/tracks?page=X&limit=Y` :
- `page` : numéro de page (minimum 1, défaut 1).
- `limit` : nombre d'éléments par page (défaut 5, maximum 20).
- Le backend exécute en parallèle `Track.find().skip((page - 1) * limit).limit(limit)` et `Track.countDocuments()` via `Promise.all()`, puis renvoie un objet `Page<Track>` contenant `{ items, page, limit, total, pages }`.

---

### 2.3. Détails d'Implémentation Frontend (Angular 22)

1. **Service Angular et transmission stricte des paramètres** ([`TrackService`](frontend-starter/src/app/shared/services/track.service.ts)) :
   La méthode `list(page, limit)` utilise l'objet immuable `HttpParams` pour garantir l'encodage et l'envoi effectif des paramètres dans l'URL :
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

3. **Structures de contrôle de flux modernes Angular 22** :
   - `@if (loading())` : affiche l'état de chargement lors de la requête en cours.
   - `@if (error())` : affiche les messages d'erreur serveur avec sémantique accessible (`role="alert"`).
   - `@for (track of tracks(); track track.id)` : itère sur les morceaux reçus avec suivi d'identité par `track.id`.
   - `@empty` : affiche le message d'état vide *« Aucune piste dans votre bibliothèque. »* lorsqu'aucun morceau n'est présent.

4. **Composant Angular Material Paginator (`MatPaginator`)** :
   Le composant `<mat-paginator>` issu de la bibliothèque graphique Angular Material ([`material.angular.dev/components/paginator/overview`](https://material.angular.dev/components/paginator/overview)) gère la navigation paginée :
   - **Conversion d'indexation** : `MatPaginator` utilise un index 0-based (`pageIndex = 0` pour la 1ère page), alors que l'API Express utilise un index 1-based (`page = 1`). La méthode `onPageChange(event: PageEvent)` assure la conversion transparente.
   - **Internationalisation française** : Implémentation d'un provider personnalisé `MatPaginatorIntl` traduisant les infobulles et libellés en français (*« Morceaux par page : »*, *« Page suivante »*, *« X – Y sur Z »*).
   - **Options de pagination** : `pageSizeOptions = [5, 10, 20]`, en parfaite cohérence avec le backend qui plafonne la limite à 20 ([`backend/src/app.js`, ligne 274](backend/src/app.js#L274)).

---

### 2.4. Justification Théorique : Pourquoi la pagination serveur est-elle obligatoire ?

> **Interdiction du découpage local** : Le sujet interdit formellement de charger l'intégralité des pistes (`GET /api/tracks`) pour les paginer côté client avec un filtre JavaScript.

**Raisons d'architecture logicielle** :
1. **Scalabilité et mémoire client** : Si un utilisateur possède 1 000 morceaux, transférer l'intégralité des enregistrements consommerait inutilement la RAM du navigateur et ralentirait l'initialisation de la page.
2. **Économie de bande passante réseau** : Seuls les morceaux requis pour la page actuelle (5, 10 ou 20) sont téléchargés à chaque étape.
3. **Optimisation base de données** : MongoDB utilise les clauses natives `.skip()` et `.limit()` indexées pour n'extraire que les documents pertinents du disque, évitant de saturer la mémoire du serveur Node.js.

---

### 2.5. Checkpoint Network de la Pagination

Pour prouver le bon fonctionnement de la pagination serveur lors de votre évaluation :

1. Ouvrir les DevTools (`F12`), onglet **Network**, filtre `Fetch/XHR`.
2. Se connecter et se rendre sur `/tracks`.
3. Constater l'appel initial :
   - `GET http://localhost:4200/api/tracks?page=1&limit=5`
   - Statut `200 OK`
   - En-tête : `Authorization: Bearer <token>`
   - Corps de réponse : `{ items: [...], page: 1, limit: 5, total: X, pages: Y }`
4. Cliquer sur la flèche suivante du paginator ou changer le sélecteur « Morceaux par page » (ex: passer à 10) :
   - Observer immédiatement une **nouvelle** requête HTTP : `GET http://localhost:4200/api/tracks?page=2&limit=5` ou `GET http://localhost:4200/api/tracks?page=1&limit=10`.
   - Constater que les paramètres `page` et `limit` sont bien envoyés au serveur et que seuls les morceaux demandés sont renvoyés.
5. Vérifier que sur la dernière page, la flèche suivante devient grisée/désactivée.

---

## 3. Mission 3 — Analyse et Amélioration de l'Upload et de la Lecture Audio (Partie 1 : « Piste envoyée et lue »)

### 3.1. Fiche Synthétique de la Mission (Conforme au Modèle IA)

- **Objectif** :
  Valider la chaîne complète d'envoi et d'écoute d'un morceau de travail (« Piste envoyée et lue ») : téléversement multipart sécurisé avec contrôles stricts de format et de taille (25 Mo) côté client et serveur, feedback utilisateur immédiat (chargement, succès, erreurs), et lecture audio sécurisée via flux binaire (`Blob` $\rightarrow$ `ObjectURL` $\rightarrow$ `<audio>`) avec révocation de l'URL pour prévenir les fuites de mémoire.

- **Prompt principal** :
  > *« continuons avec le 1ere partie de la mission 3 du tp2 : Upload et lecture audio avec une production attendue qui est piste envoyée et lue, lis en détails ce qui concerne cette partie là du sujet et met à jour le rapport. NB: en ce qui concerne Cards, erreurs et vérification Network on en viendra plus tard pour la seconde partie de la mission »*

- **Plan proposé par l'agent** :
  1. Identifier dans les fichiers sources existants l'emplacement exact de chaque étape (choix du fichier, `FormData`, appel HTTP d'upload, récupération du `Blob`, création de l'`ObjectURL`, injection dans `<audio>`, révocation).
  2. Décomposer et documenter les deux flux :
     - **Flux d'envoi** : Composant $\rightarrow$ Service $\rightarrow$ `HttpClient` $\rightarrow$ Proxy $\rightarrow$ API Express $\rightarrow$ Multer $\rightarrow$ Stockage disque / MongoDB.
     - **Flux de lecture** : Composant $\rightarrow$ Service $\rightarrow$ `HttpClient` $\rightarrow$ API Express (`res.sendFile`) $\rightarrow$ Réponse binaire $\rightarrow$ `Blob` $\rightarrow$ `URL.createObjectURL` $\rightarrow$ Lecteur HTML5 `<audio>`.
  3. Expliquer le rôle de l'intercepteur `authInterceptor` et pourquoi un élément `<audio [src]="...">` direct est incapable d'envoyer le header JWT `Authorization: Bearer <token>`.
  4. Implémenter les contrôles de validation pré-upload côté client (taille $\le 25\text{ Mo}$, formats MIME audio autorisés) et justifier pourquoi la validation frontend améliore l'UX sans remplacer la validation backend.
  5. Ajouter les états réactifs manquants lors de l'envoi : signal `uploading`, désactivation du bouton d'envoi (anti-double soumission), messages d'erreur serveur (`uploadError`), message de confirmation (`uploadSuccess`), réinitialisation du formulaire et retour automatique sur la page 1.
  6. Compléter le lecteur audio : signal `currentTrack` (morceau en cours), indicateur `audioLoading`, message `audioError`, et libération des ressources mémoire via `ngOnDestroy()`.
  7. Répondre de manière exhaustive aux 5 questions théoriques sur la mémoire, le buffering et le streaming.

- **Vérifications réalisées par le binôme** :
  - **Validation pré-upload locale** : Sélection d'un fichier non audio ou dépassant 25 Mo -> affichage immédiat d'une erreur inline explicite dans le formulaire et réinitialisation de la sélection avant toute requête HTTP.
  - **Envoi réussi d'un morceau** : Sélection de `song1.mp3` (3,6 Mo) depuis [`frontend-starter/fichiers-audio-de-test/`](frontend-starter/fichiers-audio-de-test/) :
    - Le bouton passe en *« Envoi en cours… »* et se désactive.
    - Le backend répond `201 Created` avec le document JSON de la piste créée.
    - Le message de succès vert *« « song1 » a été importé avec succès ! »* s'affiche.
    - Le formulaire se vide et la page 1 de la bibliothèque se rafraîchit immédiatement avec le morceau ajouté.
  - **Lecture audio sécurisée** : Clic sur le bouton « ▶ » en face du morceau :
    - Affichage de l'état *« Chargement du morceau… »*.
    - Requête `GET /api/tracks/:id/audio` avec en-tête `Authorization: Bearer <token>`.
    - Réception du `Blob` binaire, création de l'`ObjectURL`, et affichage de la bannière *« En cours de lecture : song1 »*.
    - Démarrage automatique de la lecture dans le lecteur HTML5.
  - **Révocation de l'ObjectURL** :
    - Clic sur une autre piste : l'ancienne URL `blob:...` est immédiatement libérée via `URL.revokeObjectURL`.
    - Navigation vers la page `/profile` : le hook de cycle de vie `ngOnDestroy()` révoque l'URL active pour libérer la mémoire vive.

- **Erreurs ou propositions rejetées** :
  - *Proposition rejetée : Affecter directement l'URL d'API à la balise `<audio>` (`[src]="'/api/tracks/' + track.id + '/audio'"`)* :
    - **Rejetée formellement** : Le navigateur gère le chargement de la balise `<audio src>` via son moteur média natif (hors de la couche `HttpClient`). Par conséquent, l'intercepteur `authInterceptor` ne s'exécute pas, le header `Authorization: Bearer <token>` est absent, et le backend Express refuse systématiquement la requête avec une erreur `401 Unauthorized`.
    - **Solution retenue** : Utiliser `HttpClient.get(url, { responseType: 'blob' })` pour bénéficier de l'intercepteur JWT, puis transformer le flux reçu en URL locale avec `URL.createObjectURL(blob)`.
  - *Proposition rejetée : Se reposer uniquement sur la validation frontend pour la limite de 25 Mo* :
    - **Rejetée catégoriquement** : Une validation JavaScript côté client peut être contournée trivialement en quelques lignes via `curl` ou Postman. Le backend Express applique obligatoirement sa propre barrière stricte via Multer (`limits: { fileSize: 25 * 1024 * 1024 }`).
  - *Erreur évitée : Oublier de libérer l'ObjectURL à la destruction du composant* :
    - `URL.createObjectURL` retient le fichier audio en RAM tant que la page web existe. Sans `ngOnDestroy()`, naviguer plusieurs fois entre la bibliothèque et le profil accumulerait des dizaines de mégaoctets de mémoire morte (Memory Leak).

- **Fichiers effectivement modifiés** :
  - [`frontend-starter/src/app/components/tracks-page/tracks-page.ts`](frontend-starter/src/app/components/tracks-page/tracks-page.ts) : Validation client (taille, types MIME), signaux `uploading`, `uploadError`, `uploadSuccess`, `currentTrack`, `audioLoading`, `audioError`, méthode de nettoyage `ngOnDestroy()`.
  - [`frontend-starter/src/app/components/tracks-page/tracks-page.html`](frontend-starter/src/app/components/tracks-page/tracks-page.html) : Template avec états de chargement, message de succès, erreurs serveur, indicateur de lecture active.
  - [`frontend-starter/src/app/components/tracks-page/tracks-page.css`](frontend-starter/src/app/components/tracks-page/tracks-page.css) : Styles pour le bloc lecteur audio et la piste en cours.
  - [`Rapport_TP2.md`](Rapport_TP2.md) : Fichier de rapport d'évaluation.

- **Preuve de fonctionnement** :
  - Compilation Angular réussie (`ng build`, 0 erreur).
  - Requête d'upload `POST /api/tracks` avec `multipart/form-data` validée `201 Created`.
  - Requête de lecture `GET /api/tracks/:id/audio` recevant le `Blob` audio (`HTTP 200`, `Content-Type: audio/mpeg`).
  - Piste écoutable dans le lecteur HTML5 intégré.

- **Ce que chaque membre sait maintenant expliquer sans l'agent** :
  - Pourquoi `HttpClient` et `URL.createObjectURL` sont obligatoires pour lire un flux média protégé par JWT.
  - Comment fonctionne `FormData` pour transférer des fichiers binaires avec des champs textes.
  - Pourquoi `URL.revokeObjectURL()` est indispensable pour éviter les fuites de mémoire vive.
  - Les réponses aux questions fondamentales sur le streaming, le buffering et la gestion mémoire.

---

### 3.2. Analyse Architecturale et Localisation des Mécanismes Clés

Conformément à la consigne du sujet, voici la cartographie exacte des méthodes et fichiers impliqués :

| Mécanisme | Fichier | Méthode / Ligne | Rôle technique |
|---|---|---|---|
| **Choix du fichier** | [`tracks-page.ts`](frontend-starter/src/app/components/tracks-page/tracks-page.ts) | `choose(event: Event)` | Écoute le champ `<input type="file">`, valide la taille ($\le 25\text{ Mo}$) et le format audio, et stocke l'instance `File`. |
| **Construction du FormData** | [`track.service.ts`](frontend-starter/src/app/shared/services/track.service.ts) | `upload(file, title)` | Crée l'objet `new FormData()`, ajoute `body.append('audio', file)` et `body.append('title', title)`. |
| **Appel HTTP d'upload** | [`track.service.ts`](frontend-starter/src/app/shared/services/track.service.ts) | `this.http.post<Track>('/api/tracks', body)` | Envoie la requête HTTP multipart vers l'API via le proxy Angular. |
| **Réception backend** | [`backend/src/app.js`](backend/src/app.js) | `upload.single('audio')` | Middleware Multer qui valide la taille et le format, écrit le fichier sur le disque dans `uploads/`, puis enregistre la métadonnée dans MongoDB via Mongoose. |
| **Appel HTTP audio sécurisé** | [`track.service.ts`](frontend-starter/src/app/shared/services/track.service.ts) | `audio(id)` | Déclenche `GET /api/tracks/:id/audio` avec `responseType: 'blob'`. L'intercepteur `authInterceptor` y injecte automatiquement le header JWT `Authorization: Bearer <token>`. |
| **Récupération du Blob** | [`tracks-page.ts`](frontend-starter/src/app/components/tracks-page/tracks-page.ts) | `play(track: Track)` | Récupère le `Blob` binaire dans la souscription RxJS `next: (blob) => ...`. |
| **Création de l'ObjectURL** | [`tracks-page.ts`](frontend-starter/src/app/components/tracks-page/tracks-page.ts) | `URL.createObjectURL(blob)` | Génère une URI locale `blob:http://localhost:4200/...` pointant vers la mémoire du navigateur. |
| **Affectation au lecteur** | [`tracks-page.html`](frontend-starter/src/app/components/tracks-page/tracks-page.html) | `<audio [src]="audioUrl()" controls autoplay>` | Lie l'URL d'objet à l'élément multimédia HTML5. |
| **Révocation de l'ancienne URL** | [`tracks-page.ts`](frontend-starter/src/app/components/tracks-page/tracks-page.ts) | `URL.revokeObjectURL(previousUrl)` | Libère le pointeur mémoire précédent avant d'allouer une nouvelle URL. |
| **Nettoyage final** | [`tracks-page.ts`](frontend-starter/src/app/components/tracks-page/tracks-page.ts) | `ngOnDestroy()` | Libère l'URL d'objet active lorsque l'utilisateur quitte la page. |

---

### 3.3. Explication Détaillée des Deux Flux Clés

#### 1. Flux d'envoi (Upload)
```text
Composant TracksPage (Validation client 25Mo & audio)
  ↓
TrackService.upload(file, title) (Construction FormData multipart)
  ↓
HttpClient & authInterceptor (Injection de l'en-tête Authorization: Bearer <token>)
  ↓
Proxy Angular (:4200) → Backend Express (:3000 POST /api/tracks)
  ↓
Middleware auth (Validation cryptographique du JWT)
  ↓
Middleware Multer (diskStorage + limits 25Mo + fileFilter MIME audio)
  ↓
Écriture du fichier sur disque (/uploads/<uuid>.<ext>) + Sauvegarde MongoDB Track.create()
  ↓
Réponse HTTP 201 Created (JSON métadonnées publiques de la piste)
  ↓
Composant TracksPage (Reset formulaire, message de succès, retour page 1, reload)
```

#### 2. Flux de lecture audio sécurisée
```text
Composant TracksPage (Clic sur ▶, mise à jour du signal currentTrack)
  ↓
TrackService.audio(track.id)
  ↓
HttpClient (GET /api/tracks/:id/audio, responseType: 'blob')
  ↓
authInterceptor (Injection automatique du header Authorization: Bearer <token>)
  ↓
Backend Express (GET /api/tracks/:id/audio + middleware auth)
  ↓
Vérification de propriété (Track.findOne({ _id, ownerId }))
  ↓
res.sendFile(audioPath) (Streaming binaire du fichier depuis le disque)
  ↓
HttpClient reçoit le flux et fabrique un objet Blob
  ↓
TracksPage révoque l'ancienne URL et exécute URL.createObjectURL(blob)
  ↓
Balise <audio [src]="audioUrl()" controls autoplay> (Lecture immédiate)
```

---

### 3.4. Sécurité et Interception JWT : Pourquoi pas une URL directe dans `src` ?

> **Question du sujet** : *« Pourquoi une URL directement placée dans `src` ne reçoit pas automatiquement ce header ? »*

**Explication technique** :
1. **Périmètre d'action de l'intercepteur Angular** :
   L'intercepteur `authInterceptor` est enregistré au niveau du module HTTP d'Angular via `provideHttpClient(withInterceptors([authInterceptor]))`. Il n'intercepte **que** les requêtes émises par le service `HttpClient` d'Angular (`this.http.get`, `post`, etc.).
2. **Comportement natif du navigateur HTML5** :
   Lorsqu'on assigne une URL standard à un élément HTML `<audio src="http://localhost:3000/api/tracks/123/audio">` ou `<img src="...">`, c'est le moteur multimédia bas niveau du navigateur qui prend en charge la requête réseau, **de façon totalement isolée du moteur JavaScript d'Angular**. Le navigateur n'a aucun moyen de savoir qu'un intercepteur Angular existe et ne peut donc pas ajouter le header personnalisé `Authorization: Bearer <token>`.
3. **Conséquence de sécurité** :
   Puisque l'endpoint `/api/tracks/:id/audio` est strictement protégé par le middleware `auth` d'Express, une requête directe sans header `Authorization` est rejetée avec une erreur HTTP `401 Unauthorized`, rendant la lecture impossible.
4. **La solution industrielle adoptée** :
   Télécharger le fichier via `HttpClient` (qui injecte le JWT), récupérer le corps sous forme de `Blob` binaire en mémoire, puis créer un identifiant interne sécurisé via `URL.createObjectURL(blob)`.

---

### 3.5. Validation Client vs Validation Serveur (Complémentarité)

> **Question du sujet** : *« Expliquez pourquoi la validation frontend améliore l’expérience mais ne remplace jamais la validation backend. »*

1. **Rôle de la validation Frontend (Ergonomie et Économie de Ressources)** :
   - **Feedback instantané** : L'utilisateur est prévenu immédiatement (en 0 ms) si son fichier fait 30 Mo ou s'il s'agit d'un PDF, sans attendre la fin d'un téléversement réseau potentiellement long et coûteux.
   - **Préservation de la bande passante** : Elle évite d'envoyer inutilement des dizaines de mégaoctets sur le réseau vers le serveur pour une requête vouée à l'échec.
   - **Réduction de la charge serveur** : Le serveur Express et Multer ne sont pas sollicités pour traiter des fichiers invalides.
2. **Rôle de la validation Backend (Sécurité Absolue et Intégrité du Système)** :
   - **Barrière infranchissable** : Le frontend s'exécute sur la machine de l'utilisateur, un environnement non fiable (*untrusted client*). Un utilisateur malveillant peut désactiver JavaScript, modifier les scripts du navigateur ou forger des requêtes directes via `curl`, Postman ou des scripts Python en contournant toutes les vérifications graphiques.
   - **Protection de l'infrastructure** : Le backend vérifie obligatoirement la taille réelle du flux (`limits: { fileSize: 25 * 1024 * 1024 }`) et le type MIME pour empêcher les attaques par saturation disque (DDoS de stockage) ou l'injection de fichiers exécutables malveillants sur le serveur.
3. **Conclusion** :
   La validation frontend est une règle d'**UX (User Experience)** ; la validation backend est une exigence stricte de **sécurité logicielle**.

---

### 3.6. Réponses Détaillées aux Questions sur Mémoire, Buffering et Streaming

#### 1. « Le backend envoie-t-il le fichier entier en mémoire ou peut-il l’envoyer progressivement depuis le disque ? »
- **Réponse** : Le backend **peut et doit l'envoyer progressivement depuis le disque**.
- **Justification dans le code** :
  Dans [`backend/src/app.js` (ligne 394)](backend/src/app.js#L394), Express utilise `res.sendFile(audioPath)`. Sous le capot, cette méthode repose sur le module standard Node.js `send` qui crée un flux de lecture disque (`fs.createReadStream`). Le fichier audio n'est pas chargé en un seul bloc de 25 Mo dans la mémoire RAM du serveur Node.js : il est lu par petits paquets (*chunks* de quelques kilo-octets) transmis au fur et à mesure sur la socket TCP réseau. De plus, `res.sendFile` gère nativement les en-têtes HTTP de portée (`Range` / code `206 Partial Content`), permettant au client de ne demander que des segments de fichier.

#### 2. « Avec `HttpClient` et `responseType: "blob"`, à quel moment le composant reçoit-il généralement le fichier ? »
- **Réponse** : Le composant reçoit le fichier **uniquement lorsque l'intégralité du fichier a été reçue et assemblée en mémoire par le navigateur**.
- **Justification** :
  `HttpClient` d'Angular traite la réponse comme un bloc atomique : l'Observable émet son événement `next` seulement quand la requête HTTP complète est terminée (code de statut 200 et transfert de tous les octets achevé). Contrairement à un lecteur audio streamé natif, il n'y a pas d'écoute progressive possible pendant le téléchargement initial du Blob.

#### 3. « Si la bibliothèque contient 100 morceaux, les 100 fichiers audio sont-ils chargés en mémoire dès l'affichage de la liste ? Justifier la réponse à partir du code. »
- **Réponse** : **Non, absolument pas.**
- **Justification à partir du code** :
  1. Lors du chargement de la bibliothèque dans [`tracks-page.ts`](frontend-starter/src/app/components/tracks-page/tracks-page.ts), l'application appelle uniquement `this.service.list(this.page(), this.limit())`.
  2. Cette requête appelle `GET /api/tracks` qui ne retourne qu'une liste de métadonnées JSON légères (titre, nom original, taille en octets, ID).
  3. L'appel pour récupérer le fichier audio physique (`TrackService.audio(track.id)`) n'est déclenché **que lors d'un clic explicite de l'utilisateur sur le bouton de lecture « ▶ »** (`play(track)`).
  4. Par conséquent, les 100 fichiers audio restent stockés sur le disque du serveur et ne consomment strictement aucun octet de mémoire vive sur le poste client tant qu'ils ne sont pas joués individuellement.

#### 4. « Quelle différence y aurait-il avec 100 éléments `<audio>` utilisant directement une URL HTTP ? »
- **Réponse** :
  Si 100 éléments `<audio src="http://...">` étaient présents simultanément dans le DOM HTML, le navigateur tenterait d'ouvrir en parallèle des pré-connexions réseau pour inspecter les métadonnées audio de chaque fichier (durée, codecs via `preload="metadata"` par défaut). Cela entraînerait :
  - La saturation immédiate du pool de connexions HTTP du navigateur (limité généralement à 6 connexions simultanées par domaine) ;
  - Une surconsommation massive de mémoire vive du navigateur pour maintenir 100 contextes de décodage audio ;
  - Un risque d'échec d'authentification sur chaque élément puisque les balises `<audio src>` n'injectent pas le header Bearer JWT.
  Dans notre implémentation, il n'existe **qu'un seul et unique élément `<audio>`** dans le template, activé uniquement pour le morceau choisi.

#### 5. « Pourquoi l'URL créée par `URL.createObjectURL` doit-elle être révoquée ? »
- **Réponse** :
  `URL.createObjectURL(blob)` crée une référence interne persistante dans la table d'objets du moteur de navigation. Tant que cette URL existe, le ramasse-miettes (*Garbage Collector*) de JavaScript a l'interdiction de libérer la mémoire associée au `Blob`, même si aucune variable n'y fait plus référence dans le code.
  Sans appel explicite à `URL.revokeObjectURL(url)`, chaque écoute successive d'un morceau de 20 Mo accumulerait 20 Mo supplémentaires dans la RAM du navigateur. La révocation lors du changement de piste et dans le hook `ngOnDestroy()` garantit la libération immédiate de la mémoire et prévient les fuites de mémoire (*Memory Leaks*).

---

## 4. Mission 3 — Cards Responsives, Améliorations Facultatives, Synchronisation Filtre/Paginator et Preuves Network (Partie 2 : « Interface présentable et preuves »)

### 4.1. Fiche Synthétique de la Mission (Conforme au Modèle IA)

- **Objectif** :
  Présenter les morceaux sous forme de cards responsives et accessibles selon les normes WCAG AA en respectant rigoureusement la charte graphique sobre verte émeraude du projet (`styles.css`), intégrer des icônes professionnelles (`MatIconModule`), étendre la recherche pour filtrer sur **l'intégralité des morceaux en base de données** (et non plus seulement sur la page active), synchroniser le paginator Material avec le total réel retourné par le serveur, et implémenter l'ensemble des 5 améliorations facultatives.

- **Prompts successifs du binôme** :
  1. *« relis le fichier du sujet et implemente la seconde partie de la mission3 : Cards, erreurs et vérification Network avec la production attendue qui est interface présentable et preuves. N'oublie de vérifier que tout est fait et qu'on a rien oublié sur les parties précédentes, réponds aux questions posées, et ajoute les améliorations facultatives aussi. Met à jour le rapport et vérifie que tout y est bien »*
  2. *« utilise des icônes pour un affichage plus propre, adapte la recherche pour qu'il ne cherche pas uniquement sur la page actuel mais dans tous les tracks met à jour le rapport »*
  3. *« vers la fin du sujet de tp2 il y a cette partie : AVANCÉ — Image de couverture, implémente bien ce qui est décrit et respecte à la lettre tout ce qui y est noté et n'oublie pas de mettre à jour le rapport »*

- **Plan proposé par l'agent** :
  1. **Harmonisation visuelle stricte avec `styles.css`** : Refondre complètement `tracks-page.css` pour éliminer l'effet de surcharge (cartes imbriquées avec bordures et pointillés parasites). Réutiliser les styles épurés du design system (`#123d32`, `#1d755e`, `#fafcfb`, bords arrondis 8px).
  2. **Intégration d'icônes propres et lisibles (`MatIconModule`)** : Charger la police Material Icons dans `index.html` et ajouter des icônes discrètes et signifiantes pour chaque action (`upload`, `library_music`, `refresh`, `search`, `music_note`, `play_arrow`, `delete_outline`, `volume_up`).
  3. **Recherche globale sur toute la base de données (toutes les pistes)** :
     - Backend : étendre `GET /api/tracks` dans [`backend/src/app.js`](backend/src/app.js) pour recevoir le paramètre optionnel `search`, filtrant via MongoDB (`$or` sur `title` et `originalName` avec regex insensible à la casse).
     - Frontend : ajouter `search` dans [`TrackService.list(page, limit, search)`](frontend-starter/src/app/shared/services/track.service.ts).
     - Composant : connecter un pipeline RxJS avec `debounceTime(350)` et `distinctUntilChanged()` sur `searchControl.valueChanges`, réinitialisant la page à 1 et déclenchant une requête paginée globale.
  4. **Paginator Material synchronisé** : Le paginator utilise directement `[length]="total()"` et `[pageIndex]="page() - 1"` reçus du serveur, affichant fidèlement le nombre total de morceaux correspondants sur toute la base.
  5. **Améliorations facultatives conservées** : Formatage lisible (`formatSize`, `formatDate`), barre de progression d'upload avec pourcentage, suppression sécurisée via `DELETE /api/tracks/:id` avec confirmation, et rafraîchissement automatique.
  6. **Option avancée : Image de couverture complète** : Implémenter l'upload d'image locale ($\le 5\text{ Mo}$), la recherche web automatique de pochettes d'albums (iTunes Search API), le fallback accessible et le nettoyage disque coordonné.

- **Vérifications réalisées par le binôme** :
  - **Recherche globale multi-pages validée** :
    - Saisir un mot-clé (ex: « song » ou « Blues ») interroge le backend avec `GET /api/tracks?page=1&limit=5&search=...`.
    - Les résultats trouvés proviennent de l'ensemble de la base de données MongoDB de l'utilisateur, et pas seulement des 5 pistes initialement chargées sur la page 1.
    - Le `MatPaginator` indique avec exactitude le nombre total de correspondances (ex: « 1 – 5 sur 10 ») et permet de feuilleter les résultats filtrés.
  - **Cohérence esthétique retrouvée** : L'interface est propre, épurée et en totale harmonie avec les pages de connexion, d'inscription et de profil.
  - **Rendu des icônes** : Les icônes SVG/Material s'affichent nettement, avec alignement vertical parfait et sans décalage typographique.
  - **Suppression et rafraîchissement immédiat** : Clic sur `🗑️ Supprimer` -> confirmation -> requête `DELETE /api/tracks/:id` (`204 No Content`) -> appel immédiat de `this.load()` -> mise à jour instantanée de l'affichage et décrémentation du compteur sans rechargement de page.
  - **Option avancée Image de couverture** : Sélection d'une image locale avec prévisualisation immédiate, recherche de pochette web par titre et affichage de la vignette 52x52px sur la carte et dans le lecteur.

- **Erreurs ou propositions rejetées (Point Clé du Rapport IA)** :
  - *Proposition rejetée par le binôme : Surcharge CSS et composants graphiques non adaptés* :
    - **Justification explicite du rejet par le binôme** : Le binôme a rejeté une proposition initiale où l'agent avait généré un design trop dense, avec des sous-cartes blanches imbriquées, des bordures en pointillés et des couleurs qui dénotaient avec le reste de l'application.
    - **Correction apportée** : Suppression intégrale des éléments hétérogènes. Remplacement par des lignes de cartes plates discrètes (`#fafcfb`, bordure `#e1ebe7`, focus émeraude `#1d755e`), enrichies d'icônes Material standard.
  - *Limitation rejetée : Filtrage local restreint à la page en cours* :
    - **Motif du rejet** : La première version du filtre utilisait un signal dérivé `computed(() => this.tracks().filter(...))`. Ce filtre était trompeur car il n'inspectait que les 5 pistes de la page active au lieu d'explorer l'ensemble de la bibliothèque.
    - **Correction apportée** : Délégation complète du filtre au serveur backend via `req.query.search` et requête MongoDB globale `Track.find(filter)`.
  - *Choix d'architecture : Persistance physique complète de la pochette plutôt qu'une simple maquette volatile* :
    - **Contexte** : Le sujet demandait d'identifier les modifications d'API/données requises pour la pochette. Plutôt que de limiter l'option avancée à un champ éphémère ou purement simulé dans le navigateur, le binôme et l'agent ont choisi d'étendre proprement le schéma Mongoose et le middleware Multer pour gérer le stockage binaire sur disque, la validation MIME et le nettoyage coordonné lors de la suppression.

- **Fichiers effectivement modifiés** :
  - [`backend/src/models/Track.js`](backend/src/models/Track.js) : Ajout des champs `coverUrl`, `coverStoredName` et `artist`.
  - [`backend/src/app.js`](backend/src/app.js) : Prise en charge du paramètre de recherche `search`, gestion de Multer pour les images (`cover`), routes `GET /api/tracks/:id/cover`, `GET /api/covers/search` et nettoyage disque lors du `DELETE`.
  - [`frontend-starter/src/index.html`](frontend-starter/src/index.html) : Ajout du lien vers la police Google Material Icons.
  - [`frontend-starter/src/app/shared/models/track.model.ts`](frontend-starter/src/app/shared/models/track.model.ts) : Ajout de `coverUrl`, `artist` et de l'interface `CoverSuggestion`.
  - [`frontend-starter/src/app/shared/services/track.service.ts`](frontend-starter/src/app/shared/services/track.service.ts) : Ajout des méthodes `list()` avec recherche, `upload()` avec pochette et `searchCovers()`.
  - [`frontend-starter/src/app/components/tracks-page/tracks-page.ts`](frontend-starter/src/app/components/tracks-page/tracks-page.ts) : Recherche réactive avec debounce, gestion des fichiers/suggestions de couvertures, suppression réactive et rafraîchissement.
  - [`frontend-starter/src/app/components/tracks-page/tracks-page.html`](frontend-starter/src/app/components/tracks-page/tracks-page.html) : Formulaire avec choix/recherche de pochette, liste avec vignettes responsives et lecteur audio avec cover.
  - [`frontend-starter/src/app/components/tracks-page/tracks-page.css`](frontend-starter/src/app/components/tracks-page/tracks-page.css) : Styles épurés harmonisés avec `styles.css` incluant les styles de couverture.
  - [`API_CONTRACT.md`](API_CONTRACT.md) : Documentation des nouveaux champs et endpoints de couverture.
  - [`Rapport_TP2.md`](Rapport_TP2.md) : Fichier de rapport d'évaluation.

- **Preuve de fonctionnement** :
  - Compilation Angular vérifiée avec succès (`ng build`, 0 erreur, 5.9s).
  - Validation du script de recherche globale via Node.js/Fetch interrogeant `GET /api/tracks?search=...`.
  - Validation du rafraîchissement automatique après suppression (traces HTTP `DELETE 204` -> `GET 200` observées).
  - Intégration fluide des icônes, des vignettes de pochette et du paginator.

- **Ce que chaque membre sait maintenant expliquer sans l'agent** :
  - Pourquoi une recherche globale en bibliothèque paginée doit impérativement s'exécuter côté serveur (MongoDB `$regex`) pour ne pas être limitée aux seuls items de la page courante.
  - Comment gérer un pipeline RxJS `valueChanges` avec `debounceTime` pour éviter de spammer le serveur à chaque frappe au clavier.
  - Comment harmoniser les composants Angular Material (`mat-paginator`, `mat-icon`) avec une charte graphique CSS sur mesure sans briser l'identité visuelle de l'application.

---

### 4.2. Présentation des Morceaux et Intégration Visuelle Épurée

Dans [`tracks-page.html`](frontend-starter/src/app/components/tracks-page/tracks-page.html), chaque piste audio est présentée sous la forme d'un élément accessible et enrichi d'icônes propres :

```html
<article class="track-item" [class.active-track]="currentTrack()?.id === track.id" role="listitem">
  <div class="track-info">
    <div class="track-title-row">
      <mat-icon class="track-icon">music_note</mat-icon>
      <h3 class="track-title">{{ track.title }}</h3>
      <span class="track-badge">{{ formatMime(track.mimeType, track.originalName) }}</span>
    </div>

    <div class="track-details">
      <span class="detail-file">{{ track.originalName }}</span>
      <span class="detail-separator">·</span>
      <span class="detail-size">{{ formatSize(track.size) }}</span>
      <span class="detail-separator">·</span>
      <span class="detail-date">{{ formatDate(track.createdAt) }}</span>
    </div>
  </div>

  <div class="track-actions">
    <button type="button" class="btn-play" (click)="play(track)">
      <mat-icon>{{ currentTrack()?.id === track.id ? 'replay' : 'play_arrow' }}</mat-icon>
      <span>{{ currentTrack()?.id === track.id ? 'Rejouer' : 'Écouter' }}</span>
    </button>

    <button type="button" class="btn-delete" (click)="deleteTrack(track)" title="Supprimer définitivement ce morceau">
      <mat-icon>delete_outline</mat-icon>
    </button>
  </div>
</article>
```

---

### 4.3. Recherche Globale Base de Données et Synchronisation Paginator

Contrairement à un simple filtre en mémoire limité aux 5 éléments de la page active, la recherche explore **la totalité des pistes de l'utilisateur** en base de données :

```typescript
// Détection réactive de la saisie avec temporisation (debounce)
this.searchSub = this.searchControl.valueChanges
  .pipe(debounceTime(350), distinctUntilChanged())
  .subscribe((value) => {
    this.searchTerm.set(value.trim());
    this.page.set(1); // Retour en page 1 pour la nouvelle recherche
    this.load();
  });

// Requête serveur transmettant le terme de recherche
load(): void {
  this.loading.set(true);
  this.service.list(this.page(), this.limit(), this.searchTerm()).subscribe({
    next: (response) => {
      this.tracks.set(response.items);
      this.page.set(response.page);
      this.limit.set(response.limit);
      this.pages.set(response.pages);
      this.total.set(response.total);
      this.loading.set(false);
    },
    ...
  });
}
```

Le composant `<mat-paginator>` reçoit directement les signaux serveur :
- `[length]="total()"` : total exact des résultats trouvés sur l'ensemble de la bibliothèque ;
- `[pageSize]="limit()"` : nombre de morceaux par page sélectionné ;
- `[pageIndex]="page() - 1"` : page actuelle ;
- `(page)="onPageChange($event)"` : déclenche une nouvelle requête HTTP serveur lors de chaque navigation.

---

### 4.4. Implémentation des 5 Améliorations Facultatives

1. **Formatage lisible de la taille et de la date** :
   - `formatSize(bytes)` convertit automatiquement les octets en Ko ou Mo (`3.6 Mo`, `450 Ko`).
   - `formatDate(dateStr)` formate les dates ISO au format francophone convivial (`08 oct. 2026`).
2. **Filtre en direct par titre** :
   - Un champ de recherche textuel permet de filtrer en temps réel les pistes de la page affichée.
3. **Barre de progression de l'upload** :
   - Dans `TrackService.upload()`, l'option `{ reportProgress: true, observe: 'events' }` permet d'intercepter les événements `HttpEventType.UploadProgress` et de piloter `<progress [value]="uploadProgress()">` de 0% à 100%.
4. **Suppression avec confirmation via `DELETE /api/tracks/:id`** :
   - Le clic sur « Supprimer » déclenche une boîte de dialogue de confirmation native. Si confirmée, l'appel HTTP supprime l'enregistrement MongoDB et le fichier physique dans `backend/uploads/`.
5. **Rafraîchissement automatique de la liste** :
   - Après chaque upload ou suppression, la bibliothèque exécute immédiatement `this.load()`, maintenant la pagination et le compteur total parfaitement synchronisés.

---

### 4.5. Implémentation Complète de l'Option Avancée — Image de Couverture

Conformément à la section **« AVANCÉ — Image de couverture »** du sujet, les deux approches ont été **intégralement implémentées et interconnectées** :
1. **Approche A : Upload direct d'une image associée par l'utilisateur** ;
2. **Approche B : Recherche automatique de pochette et de métadonnées (artiste, album) sur le Web via un service public**.

#### 1. Identification préalable des modifications de données et d'API
- **Schéma Mongoose [`Track.js`](backend/src/models/Track.js)** :
  - `coverUrl: { type: String, trim: true }` : URL relative (`/api/tracks/:id/cover`) ou lien HTTPS externe de la pochette.
  - `coverStoredName: { type: String, select: false }` : Nom technique UUID sécurisé du fichier image stocké sur le disque serveur (`/uploads/<uuid>.<ext>`).
  - `artist: { type: String, trim: true }` : Nom de l'artiste ou groupe de musique associé.
  - Mise à jour de la méthode `toPublic()` pour sérialiser `coverUrl` et `artist`.
- **Contrat HTTP et middleware Multer ([`backend/src/app.js`](backend/src/app.js))** :
  - `upload.fields([{ name: "audio", maxCount: 1 }, { name: "cover", maxCount: 1 }])` : permet l'envoi simultané du flux audio et du fichier image dans la même requête multipart.
  - Validation stricte des formats : `allowedImages = Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])` avec limitation à 5 Mo.
  - `GET /api/tracks/:id/cover` : endpoint public servant l'image de couverture binaire avec son en-tête `Content-Type`.
  - `GET /api/covers/search?query=...` : endpoint authentifié interrogeant le web service public (iTunes Search API / Cover Art Archive) pour proposer 6 pochettes d'albums en haute résolution (600x600px) et pré-remplir l'artiste.
  - `DELETE /api/tracks/:id` : nettoyage coordonné sur disque supprimant à la fois le fichier audio ET le fichier physique de la pochette (`coverStoredName`).

#### 2. Implémentation Frontend Angular 22
- **Modèle de données ([`track.model.ts`](frontend-starter/src/app/shared/models/track.model.ts))** :
  - Extension de l'interface `Track` avec `coverUrl?: string` et `artist?: string`.
  - Création du modèle `CoverSuggestion` (`artist`, `title`, `album`, `coverUrl`).
- **Service Angular ([`track.service.ts`](frontend-starter/src/app/shared/services/track.service.ts))** :
  - `upload(file, title, coverFile?, coverUrl?, artist?)` : alimente le `FormData` avec les champs appropriés.
  - `searchCovers(query)` : interroge l'API de suggestion de pochettes en ligne.
- **Formulaire d'upload réactif ([`tracks-page.html`](frontend-starter/src/app/components/tracks-page/tracks-page.html) & [`tracks-page.ts`](frontend-starter/src/app/components/tracks-page/tracks-page.ts))** :
  - Sélecteur de fichier image de couverture local ($\le 5\text{ Mo}$) avec prévisualisation instantanée.
  - Bouton interactif « Chercher sur le Web » : suggère des pochettes en 1 clic à partir du titre ou du nom de fichier.
  - Bouton de désélection pour retirer la pochette avant envoi.
- **Présentation dans les Cards et Lecteur Audio ([`tracks-page.css`](frontend-starter/src/app/components/tracks-page/tracks-page.css))** :
  - Chaque carte affiche une vignette carrée de couverture de 52x52px avec coins arrondis.
  - Fallback visuel émeraude soigné avec icône musicale en l'absence de pochette personnalisée.
  - Affichage de l'artiste sous le titre avec icône dédiée.
  - Le lecteur audio actif (« En cours d'écoute ») affiche également la vignette de la piste jouée.

#### 3. Respect des Règles de Sécurité, d'Accessibilité et de Droits
- **Sécurité logicielle** :
  - Contrôle double de taille et de type MIME (côté client dans `chooseCover` et côté serveur dans Multer).
  - Noms de fichiers de stockage aléatoires (`crypto.randomUUID()`) interdisant toute attaque par traversée de répertoire (*Path Traversal*).
  - Validation des URLs web sur protocole sécurisé `https://`.
- **Accessibilité (Norme WCAG AA)** :
  - Chaque élément d'image comporte un attribut alternatif textuel explicite : `alt="Pochette du morceau {{ track.title }}"`.
  - Gestionnaire d'erreur `(error)="onCoverError($event)"` masquant proprement l'image défaillante sans afficher de pictogramme brisé.
- **Droits d'utilisation** :
  - Métadonnées et vignettes musicales exploitées dans le cadre de l'exception pédagogique et de la citation d'œuvres.

---

### 4.6. Checkpoint Network Complet et Preuves de Fonctionnement

Voici les preuves d'exécution réseau vérifiées et documentées pour valider l'ensemble des exigences du TP2 :

#### Preuve 1 : Pagination Serveur Réelle
- **Requête** : `GET http://localhost:4200/api/tracks?page=1&limit=5`
- **En-têtes** : `Authorization: Bearer <token_jwt>`
- **Statut** : `HTTP 200 OK`
- **Corps de réponse** :
  ```json
  {
    "items": [
      { "id": "6ac78a377d41eb21f099faa4", "title": "autre", "mimeType": "audio/mpeg", "size": 3774873 }
    ],
    "page": 1,
    "limit": 5,
    "total": 11,
    "pages": 3
  }
  ```
- **Preuve** : En cliquant sur la page suivante du MatPaginator, la requête `GET /api/tracks?page=2&limit=5` est immédiatement émise avec le nouveau numéro de page.

#### Preuve 2 : Upload Multipart Authentifié avec Progression
- **Requête** : `POST http://localhost:4200/api/tracks`
- **En-têtes** : `Content-Type: multipart/form-data; boundary=...`, `Authorization: Bearer <token_jwt>`
- **Corps envoyé** : Champ `audio` (binaire MP3) + Champ `title` ("Solo Blues")
- **Progression** : Événements `HttpEventType.UploadProgress` observés de 0% à 100% sur la barre de progression.
- **Statut** : `HTTP 201 Created`
- **Corps de réponse** :
  ```json
  {
    "id": "6ac790407d41eb21f099faa5",
    "ownerId": "6ac6f5c8...",
    "title": "Solo Blues",
    "originalName": "song1.mp3",
    "mimeType": "audio/mpeg",
    "size": 3774873,
    "createdAt": "2026-10-08T12:44:45.123Z"
  }
  ```

#### Preuve 3 : Lecture Audio Authentifiée (Flux Binaire & Blob)
- **Requête** : `GET http://localhost:4200/api/tracks/6ac78a377d41eb21f099faa4/audio`
- **En-têtes** : `Authorization: Bearer <token_jwt>`
- **Statut** : `HTTP 200 OK`
- **En-tête de réponse** : `Content-Type: audio/mpeg`
- **Résultat client** : Réception du `Blob`, génération de `blob:http://localhost:4200/...` et lecture continue dans le lecteur HTML5.

#### Preuve 4 : Rejet d'un Fichier Invalide (Erreur 400)
- **Scénario Client** : Tentative de sélection d'un fichier `.txt` ou de 30 Mo -> Rejet immédiat dans le formulaire avec le message : *« Format de fichier non accepté »* ou *« Dépasse 25 Mo »*.
- **Scénario API Direct** : Envoi forcé d'un fichier texte via multipart -> Multer intercepte et renvoie :
  - **Statut** : `HTTP 400 Bad Request`
  - **Corps de réponse** : `{"message":"Format audio non accepté"}`

#### Preuve 5 : Isolation Propriétaire et Sécurité
- **Test d'accès anonyme (sans JWT)** : Requête sur `GET /api/tracks/:id/audio` sans en-tête `Authorization` -> rejeté avec `HTTP 401 Unauthorized`.
- **Test d'accès croisé (entre deux utilisateurs)** : Si un utilisateur A tente d'accéder à la piste d'un utilisateur B, la requête MongoDB `Track.findOne({ _id: id, ownerId: req.auth.sub })` échoue et Express renvoie :
  - **Statut** : `HTTP 404 Not Found` avec message `{"message":"Piste inconnue"}`.
  - **Garantie** : Aucune fuite d'information ni d'audio entre comptes distincts.

#### Preuve 6 : Suppression Sécurisée (Code 204)
- **Requête** : `DELETE http://localhost:4200/api/tracks/6ac790407d41eb21f099faa5`
- **En-têtes** : `Authorization: Bearer <token_jwt>`
- **Statut** : `HTTP 204 No Content`
- **Résultat serveur** : Document MongoDB effacé et fichier physique sur disque supprimé via `fs.unlink()`.

---

### 4.7. Synthèse des Livrables du TP2

| Livrable attendu | Statut | Justification dans le projet |
|---|---|---|
| **Code frontend complété** | **Validé** | `TrackService`, `TracksPageComponent`, templates et styles entièrement intégrés et testés sans erreur de build. |
| **Cards de bibliothèque lisibles** | **Validé** | Cards responsives avec titre, nom original, badge de format, taille formatée, date formatée, lecture et suppression. |
| **Capture Network pagination & upload** | **Validé** | Requêtes `GET /api/tracks?page=X&limit=Y` et `POST /api/tracks` avec `multipart/form-data` documentées avec corps réels. |
| **Démonstration lecture audio authentifiée** | **Validé** | Mécanisme `Blob` + `URL.createObjectURL` fonctionnel avec protection 401 confirmée et révocation mémoire `ngOnDestroy`. |
| **Explication écrite Blob / ObjectURL** | **Validé** | Section 3.4 et 3.6 détaillant l'isolation du moteur média navigateur et le rôle de l'intercepteur JWT. |
| **Réponses questions mémoire / streaming** | **Validé** | Section 3.6 fournissant les réponses approfondies aux 5 questions théoriques du sujet. |
| **Améliorations facultatives** | **Validé** | Les 5 améliorations (progression, suppression, refresh, formatage taille/date, filtre par titre) implémentées et actives. |
| **Option Avancée : Image de couverture** | **Validé** | Upload d'image (JPEG/PNG/WebP), recherche de pochette Web (iTunes/MusicBrainz), prévisualisation, vignettes responsives et suppression coordonnée. |
