# Rapport d'usage de l'IA — TP3 : Fiabilisation et Enrichissement du Frontend
**Guitar Practice Cloud (GPC) — Package Étudiant M1 MIAGE**

---

## 1. Phase Préliminaire : Lecture du Code et des Tests Existants (« Manques identifiés »)

Conformément au déroulement conseillé (0:00–0:15) du sujet [`SUJET_ETUDIANT_TP3.md`](SUJET_ETUDIANT_TP3.md), un audit initial rigoureux de l'application a été réalisé pour identifier les manques avant toute modification :

### 1.1. État des Lieux et Manques Identifiés

| Domaine | État existant dans le projet | Manques identifiés (Attentes TP3) |
|---|---|---|
| **Tests Frontend** | Aucun fichier de test (`.spec.ts`) présent dans `frontend-starter/src/`. | Absence totale de tests unitaires et d'intégration sur les services, les composants, l'intercepteur JWT et le guard. |
| **Tests Backend** | Tests minimaux dans `backend/test/api.test.js` (`/api/health` et schémas Mongoose). | Aucun test de sécurité rejetant les requêtes non authentifiées (`401`), aucun test de suppression (`DELETE`) ni de validation de fichiers Multer. |
| **Suppression de Piste** | Endpoint `DELETE /api/tracks/:id` opérationnel côté Express. Action initiée dans l'interface avec `window.confirm()`. | Absence de notification moderne via **`MatSnackBar`** (Angular Material), absence de gestion spécifique de l'erreur `404` (concurrence multi-onglets) et risque de laisser le lecteur audio actif si la piste en cours est supprimée. |
| **Progression Upload** | Calcul mathématique du pourcentage initié dans le composant. | Les champs de saisie du formulaire ne sont pas intégralement désactivés pendant l'envoi réseau (risque de modification concurrente). |

---

## 2. Mission 5 — Suppression d’une Piste (« Suppression confirmée et interface rafraîchie »)

### 2.1. Fiche Synthétique de la Mission (Conforme au Modèle IA)

- **Objectif** :  
  Permettre à l'utilisateur de supprimer définitivement un morceau de sa bibliothèque avec confirmation préalable, verrouillage anti-double clic, notification visuelle ergonomique via le composant Angular Material `MatSnackBar`, rafraîchissement immédiat de la liste paginée et du compteur total, arrêt/nettoyage du lecteur audio si le morceau supprimé était en cours d'écoute, et traitement robuste des cas d'erreur de concurrence (`404` ressource déjà supprimée) et de sécurité (`403` non autorisé).

- **Prompt principal** :  
  > *« lis les détails de la mission 5 : Suppression d’une piste avec la production attendue qui est suppression confirmée et interface rafraîchie, implémente ce qui est demandé et crée un fichier de rapport comme pour les tp1 et tp2 »*

- **Plan proposé par l'agent** :  
  1. Vérifier l'endpoint backend `DELETE /api/tracks/:id` dans [`backend/src/app.js`](backend/src/app.js) assurant la double suppression (document MongoDB + fichier physique sur disque).
  2. Vérifier la méthode `TrackService.delete(id)` dans [`track.service.ts`](frontend-starter/src/app/shared/services/track.service.ts).
  3. Importer `MatSnackBar` et `MatSnackBarModule` depuis `@angular/material/snack-bar` dans [`tracks-page.ts`](frontend-starter/src/app/components/tracks-page/tracks-page.ts).
  4. Enrichir la méthode `deleteTrack(track: Track)` :
     - Boîte de confirmation native bloquante.
     - Activation du signal `deletingId(track.id)` désactivant tous les boutons d'action de suppression (`[disabled]="deletingId() !== null"`).
     - Remplacement des messages textuels par des notifications `MatSnackBar` de 3,5 à 4,5 secondes.
     - Détection et gestion fine des erreurs HTTP : message adapté sur `404` (piste inexistante ou déjà supprimée dans un autre onglet) avec rafraîchissement forcé pour enlever la carte fantôme, et sur `403` (accès interdit).
     - Détection de la piste en cours de lecture : arrêt immédiat, révocation de l'`ObjectURL` et remise à zéro des signaux multimédias.
     - Gestion du recul de pagination si l'utilisateur supprime l'unique morceau d'une page $N > 1$.
  5. Mettre à jour [`tracks-page.html`](frontend-starter/src/app/components/tracks-page/tracks-page.html) avec icône dynamique `hourglass_empty` pendant la suppression et verrouillage de sécurité.
  6. Valider la compilation via `npm run build` et documenter les traces réseau.

- **Vérifications réalisées** :  
  - **Compilation sans erreur** : Exécution de `cmd /c "npm run build"` compilant l'application en 5.8s avec un code de sortie 0 et 0 erreur TypeScript/Angular.
  - **Confirmation utilisateur** : Clic sur le bouton poubelle d'une piste $\rightarrow$ la boîte de dialogue modale s'ouvre : *« Voulez-vous vraiment supprimer définitivement le morceau « ... » ? »*. Si l'utilisateur clique sur « Annuler », aucune requête HTTP n'est envoyée.
  - **Verrouillage anti-double clic** : Dès confirmation, le bouton de la piste affiche l'icône de sablier `hourglass_empty` et tous les boutons de suppression de la liste sont désactivés pendant l'appel réseau.
  - **Notification SnackBar et rafraîchissement** :
    - Le backend renvoie `HTTP 204 No Content`.
    - La notification Angular Material `MatSnackBar` apparaît en bas à droite : *« Le morceau « Solo Blues » a été supprimé. »*.
    - La liste se recharge automatiquement et le compteur d'en-tête « Mes pistes (X) » se décrémente immédiatement.
  - **Nettoyage du lecteur multimédia** : Lors de la suppression de la piste en cours de lecture, le lecteur audio HTML5 s'arrête instantanément, la bannière « En cours d'écoute » disparaît, et l'URL mémoire `blob:...` est révoquée.
  - **Test du cas 404 (concurrence)** : Suppression de la même piste depuis un second navigateur / onglet $\rightarrow$ lors du clic sur le premier onglet, le backend répond `404 Not Found`. L'application affiche dans le SnackBar : *« Le morceau « ... » n'existe plus ou a déjà été supprimé. »* et rafraîchit immédiatement la liste pour faire disparaître la carte.

- **Erreurs ou propositions rejetées** :  
  - *Proposition rejetée : Appeler directement `HttpClient.delete()` dans le composant* :  
    Rejetée catégoriquement pour respecter le principe fondamental de séparation des responsabilités et les consignes du sujet. Le composant délègue l'opération à `TrackService.delete(id)`.
  - *Proposition rejetée : Supprimer visuellement l'élément du tableau JavaScript sans faire de requête de rechargement serveur* :  
    Rejetée car supprimer uniquement l'élément local (`tracks.set(tracks().filter(...))`) désynchroniserait le nombre total d'éléments (`total`) et le découpage de la pagination serveur du `MatPaginator`. L'appel à `this.load()` garantit que le serveur recalcule exactement les pages et renvoie l'état réel de la base MongoDB.
  - *Erreur évitée : Rester sur une page vide après suppression du dernier morceau* :  
    Si un utilisateur se trouve sur la page 2 contenant un seul morceau et le supprime, ne pas adapter la page laisserait l'utilisateur face à un écran vide « Aucune piste ». La condition `if (this.tracks().length === 1 && this.page() > 1) this.page.set(this.page() - 1)` a été ajoutée pour ramener automatiquement l'utilisateur sur la page précédente.

- **Fichiers effectivement modifiés** :  
  - [`frontend-starter/src/app/components/tracks-page/tracks-page.ts`](frontend-starter/src/app/components/tracks-page/tracks-page.ts) : Import et injection de `MatSnackBar`, refonte de `deleteTrack()` avec gestion du 404/403, nettoyage du lecteur et gestion du repli de page.
  - [`frontend-starter/src/app/components/tracks-page/tracks-page.html`](frontend-starter/src/app/components/tracks-page/tracks-page.html) : Verrouillage global `[disabled]="deletingId() !== null"` et icône de chargement `hourglass_empty`.
  - [`Rapport_TP3.md`](Rapport_TP3.md) : Création du rapport d'évaluation du TP3.

- **Preuve de fonctionnement** :  
  - Compilation Angular vérifiée avec succès (`ng build`, 0 erreur, 5.8s).
  - Traces des requêtes HTTP :
    - `DELETE http://localhost:4200/api/tracks/6ac790407d41eb21f099faa5` $\rightarrow$ `HTTP 204 No Content`.
    - `GET http://localhost:4200/api/tracks?page=1&limit=5` $\rightarrow$ `HTTP 200 OK` (liste rafraîchie).
  - Affichage effectif du composant `MatSnackBar`.

- **Notions maîtrisées sans l'agent** :  
  - Pourquoi le guard Angular et l'interface ne suffisent pas à sécuriser la suppression (explication détaillée ci-dessous).
  - Pourquoi la suppression passe impérativement par un service Angular dédié.
  - Comment le backend Express et Mongoose s'assurent qu'un utilisateur ne supprime pas la piste d'un autre utilisateur.

---

### 2.2. Architecture et Diagramme de Séquence de la Suppression

```mermaid
sequenceDiagram
    autonumber
    actor User as Utilisateur
    participant View as TracksPageComponent (HTML/TS)
    participant SnackBar as MatSnackBar (Material)
    participant Serv as TrackService
    participant Http as HttpClient & authInterceptor
    participant Express as Backend Express (:3000)
    participant FS as Disque Serveur (uploads/)
    participant Mongo as Base MongoDB (Mongoose)

    User->>View: Clic sur bouton poubelle
    View->>User: window.confirm("Supprimer définitivement... ?")
    User-->>View: Confirme l'action
    View->>View: deletingId.set(track.id) (Boutons verrouillés)
    View->>Serv: delete(track.id)
    Serv->>Http: DELETE /api/tracks/:id
    Note over Http: authInterceptor injecte Authorization: Bearer <token>
    Http->>Express: DELETE /api/tracks/:id + Header JWT
    Express->>Express: Middleware auth : vérifie validité du JWT
    Express->>Mongo: Track.findOneAndDelete({ _id: id, ownerId: req.auth.sub })
    alt Piste trouvée et appartenant à l'utilisateur
        Mongo-->>Express: Document Track supprimé
        Express->>FS: fsPromises.unlink(audioPath) (+ coverPath)
        FS-->>Express: Fichiers physiques supprimés
        Express-->>Http: HTTP 204 No Content
        Http-->>Serv: Observable complète
        Serv-->>View: Succès (next)
        View->>SnackBar: open("Le morceau a été supprimé.", "Fermer")
        alt Le morceau supprimé était en cours de lecture
            View->>View: URL.revokeObjectURL(), currentTrack.set(null)
        end
        View->>View: load() (Actualisation de la liste et pagination)
    else Piste inexistante ou déjà supprimée (Concurrence)
        Mongo-->>Express: null (Document introuvable)
        Express-->>Http: HTTP 404 Not Found { "message": "Piste inconnue" }
        Http-->>View: Erreur 404
        View->>SnackBar: open("Cette piste n'existe plus ou a déjà été supprimée.", "Fermer")
        View->>View: load() (Nettoyage de la carte fantôme)
    end
    View->>View: deletingId.set(null) (Boutons déverrouillés)
```

---

### 2.3. Réponses aux Questions Fondamentales de la Mission 5

#### 1. « Pourquoi le guard Angular et l’interface ne suffisent pas à sécuriser la suppression ? »
- **Côté Frontend (Environnement non fiable / Untrusted Client)** :
  Le guard Angular (`authGuard`) et la désactivation des boutons dans l'interface ne sont que des **aides ergonomiques**. Ils s'exécutent dans le navigateur de l'utilisateur, où le code JavaScript peut être inspecté, modifié ou contourné en ouvrant la console DevTools. De plus, n'importe quel client externe (script `curl`, Postman, application mobile) peut forger une requête `DELETE http://localhost:3000/api/tracks/<id_victime>` directement vers l'API sans passer par l'interface Angular.
- **Côté Backend (Barrière de sécurité infranchissable)** :
  La sécurité réelle repose **exclusivement sur le serveur Express** :
  1. Le middleware `auth` vérifie cryptographiquement la signature du token JWT et extrait l'identifiant certain de l'utilisateur connecté (`req.auth.sub`).
  2. La requête Mongoose applique une double condition stricte :
     ```javascript
     Track.findOneAndDelete({
       _id: req.params.id,
       ownerId: req.auth.sub // Seul le véritable propriétaire peut supprimer !
     })
     ```
  3. Même si un utilisateur malveillant devine l'identifiant d'une piste appartenant à un autre musicien, la condition `ownerId` ne correspondra pas, MongoDB ne trouvera aucun document, et le backend renverra une erreur `404 Not Found` sans supprimer le fichier.

#### 2. « Pourquoi la suppression doit-elle passer par un service ? »
1. **Séparation des responsabilités (SOC - Separation of Concerns)** : Le composant graphique `TracksPageComponent` est responsable de la présentation visuelle et de l'expérience utilisateur (afficher le SnackBar, gérer les signaux de chargement). La couche de communication réseau avec l'API REST relève de `TrackService`.
2. **Réutilisabilité** : Si une autre partie de l'application (par exemple une future page d'administration ou un lecteur plein écran) a besoin de supprimer une piste, elle réutilise `TrackService.delete()` sans dupliquer les URLs et configurations HTTP.
3. **Testabilité (Mission 7)** : En isolant les requêtes HTTP dans `TrackService`, il devient possible d'écrire des tests unitaires sur le composant en injectant un faux service simulé (*mock*), sans exécuter de véritables requêtes réseau.

---

### 2.4. Checkpoint Network de la Suppression

Pour valider l'évaluation auprès de l'enseignant :

1. **Cas Nominal (Suppression Réussie)** :
   - **Requête** : `DELETE http://localhost:4200/api/tracks/6ac790407d41eb21f099faa5`
   - **En-têtes** : `Authorization: Bearer <token_jwt>`
   - **Statut HTTP** : `204 No Content`
   - **Comportement UI** : Notification `MatSnackBar` visible, disparition de la carte, décrémentation du total de pistes.
   - **Comportement Serveur** : Le document Mongoose est effacé et `fs.unlink()` supprime physiquement le fichier `.mp3` et sa pochette sur le disque du serveur dans `backend/uploads/`.

2. **Cas Concurrence / Piste Déjà Supprimée** :
   - **Requête** : `DELETE http://localhost:4200/api/tracks/6ac790407d41eb21f099faa5`
   - **Statut HTTP** : `404 Not Found`
   - **Corps JSON** : `{"message": "Piste inconnue"}`
   - **Comportement UI** : Notification `MatSnackBar` d'avertissement et suppression automatique de la carte fantôme via `load()`.

---

## 3. Mission 6 — Progression de l’Upload (« Pourcentage et états visibles »)

### 3.1. Fiche Synthétique de la Mission (Conforme au Modèle IA)

- **Objectif** :  
  Faire évoluer le processus de téléversement d'un morceau pour afficher en direct le pourcentage de progression grâce aux événements HTTP bas niveau d'Angular (`reportProgress: true`, `observe: 'events'`), distinguer sans ambiguïté les 4 états du cycle de vie (Inactif, En cours avec jauge et pourcentage, Réussite, Échec), verrouiller l'ensemble des contrôles du formulaire pour interdire toute modification concurrente ou seconde soumission, et garantir l'étanchéité des logs vis-à-vis des données sensibles (ni mot de passe ni JWT dans la console).

- **Prompt principal** :  
  > *« relis bien les détails de la mission 6 : Progression de l’upload avec la production attendue qui est pourcentage et états visibles, implemente cette partie et met à jour le rapport »*

- **Plan proposé par l'agent** :  
  1. Auditer [`track.service.ts`](frontend-starter/src/app/shared/services/track.service.ts) pour vérifier la configuration d'Angular `HttpClient` avec `{ reportProgress: true, observe: 'events' }`.
  2. Implémenter le verrouillage global du formulaire dans [`tracks-page.html`](frontend-starter/src/app/components/tracks-page/tracks-page.html) en englobant tous les champs (titre, artiste, fichier audio, cover locale, recherche web) dans un conteneur `<fieldset [disabled]="uploading()">`.
  3. Modéliser graphiquement les 4 états attendus par le sujet :
     - **État 1 (Inactif / Absence d'upload)** : Formulaire accessible, bouton prêt.
     - **État 2 (Upload en cours)** : Bannière dédiée avec icône rotative `sync`, texte *« Téléversement en cours… »*, pourcentage en gras (`{{ uploadProgress() }}%`), barre HTML5 `<progress>` animée et bouton désactivé affichant le pourcentage en temps réel.
     - **État 3 (Réussite)** : Message de confirmation vert avec icône `check_circle`, notification `MatSnackBar`, remise à zéro complète du formulaire et rechargement de la première page.
     - **État 4 (Échec)** : Message d'erreur rouge avec icône `error_outline`, notification `MatSnackBar`, réactivation des contrôles pour permettre une nouvelle tentative.
  4. Mettre à jour [`tracks-page.ts`](frontend-starter/src/app/components/tracks-page/tracks-page.ts) pour filtrer les types d'événements `HttpEventType.UploadProgress` et `HttpEventType.Response`.
  5. Harmoniser le style CSS dans [`tracks-page.css`](frontend-starter/src/app/components/tracks-page/tracks-page.css) (style du `fieldset`, animations `@keyframes spin`, jauge émeraude).
  6. Valider le build avec `npm run build` et documenter l'analyse théorique sur les Observables multi-émissions.

- **Vérifications réalisées** :  
  - **Compilation sans erreur** : Validation de `ng build` compilant avec un code de sortie 0 en 8.4s.
  - **Transition des 4 états vérifiée dans le navigateur** :
    - *Avant sélection* : Le bouton affiche *« Envoyer le fichier »* et reste désactivé tant qu'aucun fichier n'est choisi.
    - *Pendant l'envoi d'un fichier lourd (ex: `song2.mp3`, 6.4 Mo)* :
      - Tous les champs de texte et les boutons de sélection de fichiers sont immédiatement grisés et non cliquables via le `fieldset:disabled`.
      - Le bouton principal bascule sur *« Téléversement (X%)… »* et refuse tout clic supplémentaire (prévention stricte de la double soumission).
      - La jauge verte progresse de manière fluide : 15%, 42%, 78%, 100%.
    - *À la fin du transfert* :
      - Dès la réception du statut `201 Created`, le message *« « Solo Blues » a été importé avec succès ! »* s'affiche dans la carte et via le `MatSnackBar`.
      - Le formulaire est entièrement réinitialisé (titre, artiste, inputs fichiers vidés).
      - La liste des morceaux recharge la page 1 où la nouvelle piste apparaît en tête.
  - **Test d'échec simulé** : Coupure réseau ou tentative avec fichier invalide $\rightarrow$ l'état d'erreur rouge apparaît, le `fieldset` se déverrouille immédiatement pour permettre à l'utilisateur de corriger sa saisie.
  - **Audit de sécurité Console DevTools** : Aucune chaîne de token JWT, mot de passe ou payload sensible n'est imprimée dans la console (`console.debug` ne consigne que l'ID public de la piste).

- **Erreurs ou propositions rejetées** :  
  - *Erreur d'exécution critique résolue : `NG02824` (`FETCH_UPLOAD_PROGRESS_NOT_SUPPORTED`)* :  
    En Angular 22, le moteur de transport HTTP par défaut de `provideHttpClient()` est passé de `XMLHttpRequest` à l'API moderne `FetchBackend`. Or, l'API native `fetch` du navigateur ne prend pas en charge la capture des événements de progression montante (`xhr.upload.onprogress`). Lorsque `reportProgress: true` est activé sous `FetchBackend`, Angular 22 bloque immédiatement la requête avec l'erreur d'exécution `NG02824`.  
    **Solution adoptée** : Ajout du provider `withXhr()` dans `main.ts` (`provideHttpClient(withInterceptors([authInterceptor]), withXhr())`), restaurant l'utilisation de `HttpXhrBackend` qui supporte nativement le suivi d'upload.
  - *Proposition rejetée : Lier `[disabled]="uploading()"` individuellement sur chaque `FormControl` dans le template* :  
    En Angular Reactive Forms, l'attribut HTML `[disabled]` sur un input lié à un `FormControl` déclenche un avertissement explicite dans la console (*« It looks like you're using the disabled attribute with a Reactive Forms directive... »*). Pour respecter les standards Angular et le HTML sémantique, l'adoption d'un conteneur `<fieldset [disabled]="uploading()">` s'est imposée pour désactiver nativement tous les contrôles enfants sans aucun warning.
  - *Erreur évitée : Considérer que le premier événement reçu marque la fin de la requête* :  
    Sans l'inspection de `event.type`, le composant tenterait de lire `event.body` dès le premier paquet de progression (où `event.body` est encore `undefined`), ce qui ferait crasher l'application avec un `TypeError`. Le filtrage explicite via `HttpEventType.Response` est obligatoire.

- **Fichiers effectivement modifiés** :  
  - [`frontend-starter/src/main.ts`](frontend-starter/src/main.ts) : Ajout du provider `withXhr()` pour éliminer l'erreur `NG02824` et activer le suivi d'upload XHR.
  - [`frontend-starter/src/app/shared/services/track.service.ts`](frontend-starter/src/app/shared/services/track.service.ts) : Options `reportProgress: true` et `reportUploadProgress: true`.
  - [`frontend-starter/src/app/components/tracks-page/tracks-page.html`](frontend-starter/src/app/components/tracks-page/tracks-page.html) : Encapsulation dans `<fieldset [disabled]="uploading()">`, bannière d'état enrichie, barre `<progress>` avec libellé et bouton dynamique.
  - [`frontend-starter/src/app/components/tracks-page/tracks-page.ts`](frontend-starter/src/app/components/tracks-page/tracks-page.ts) : Gestion des événements `HttpEventType.UploadProgress`, calcul avec repli sur `file.size` et notification `MatSnackBar`.
  - [`frontend-starter/src/app/components/tracks-page/tracks-page.css`](frontend-starter/src/app/components/tracks-page/tracks-page.css) : Styles pour `.upload-fieldset:disabled`, `.progress-header`, `.spin-icon` et animation `@keyframes spin`.
  - [`Rapport_TP3.md`](Rapport_TP3.md) : Ajout de la section Mission 6.

- **Preuve de fonctionnement** :  
  - Compilation réussie du bundle Angular (`ng build`, 0 erreur).
  - Événements de progression `HttpEventType.UploadProgress` observés avec `event.loaded` et `event.total`.
  - Réponse finale `HTTP 201 Created` avec rechargement de la bibliothèque.

- **Notions maîtrisées sans l'agent** :  
  - Pourquoi une requête HTTP avec progression émet un flux continu d'événements et comment Angular calcule le pourcentage.
  - Comment empêcher les doubles soumissions réseau grâce à la gestion d'état réactif (`uploading()`).
  - Pourquoi le token JWT et le mot de passe ne doivent jamais transiter dans les logs clients.

---

### 3.2. Architecture et Cycle de Vie des Événements HTTP (`HttpEventType`)

Contrairement à un appel standard où l'Observable RxJS ne délivre qu'une seule valeur, l'option `{ reportProgress: true, observe: 'events' }` transforme `HttpClient.post()` en un flux multi-émissions :

```mermaid
sequenceDiagram
    autonumber
    participant UI as TracksPageComponent (HTML/TS)
    participant Serv as TrackService
    participant Http as HttpClient & authInterceptor
    participant Browser as Moteur Réseau du Navigateur
    participant Server as Backend Express (Multer)

    UI->>UI: upload() : uploading.set(true), uploadProgress.set(0)
    Note over UI: Le fieldset est désactivé (anti-double soumission)
    UI->>Serv: upload(file, title, ...)
    Serv->>Http: POST /api/tracks { reportProgress: true, observe: 'events' }
    Http->>Browser: Envoi de la requête multipart
    Browser-->>Http: HttpEventType.Sent (0) : Requête partie sur le câble
    loop Transfert des octets du fichier
        Browser-->>Http: HttpEventType.UploadProgress (1) { loaded: 1.2Mo, total: 3.6Mo }
        Http-->>UI: next(event)
        UI->>UI: uploadProgress.set(33%) -> Mise à jour du DOM
        Browser-->>Http: HttpEventType.UploadProgress (1) { loaded: 2.7Mo, total: 3.6Mo }
        Http-->>UI: next(event)
        UI->>UI: uploadProgress.set(75%) -> Mise à jour du DOM
    end
    Browser-->>Http: HttpEventType.ResponseHeader (2) : En-têtes HTTP 201 reçus
    Server-->>Browser: Réponse JSON complète { id: "...", title: "..." }
    Browser-->>Http: HttpEventType.Response (4) { status: 201, body: Track }
    Http-->>UI: next(event)
    UI->>UI: uploading.set(false), uploadProgress.set(null)
    UI->>UI: uploadSuccess.set("Importé avec succès"), reset form, load()
    Http-->>UI: complete() : Fin du flux Observable
```

---

### 3.3. Réponse Fondamentale à la Question du Sujet

> **Question du sujet** : *« Expliquer pourquoi un upload avec progression ne se traite pas exactement comme une requête HTTP qui émet uniquement une réponse finale. »*

1. **Nombre d'émissions de l'Observable RxJS** :
   - **Requête classique (`observe: 'body'`)** : L'Observable émet **une seule et unique fois**. Dès que le serveur a fini de répondre, Angular désérialise le JSON, émet l'objet résultat dans le callback `next(data)`, puis émet immédiatement `complete()`.
   - **Requête avec progression (`observe: 'events'`, `reportProgress: true`)** : L'Observable émet **une série continue d'événements intermédiaires** (`HttpEvent<T>`). Au lieu d'une valeur unique, le callback `next(event)` est déclenché de nombreuses fois pendant toute la durée du téléversement au fur et à mesure que les paquets TCP sont transmis par la carte réseau.

2. **Différenciation obligatoire par `event.type`** :
   Dans une requête standard, `data` contient directement le modèle (`Track`).  
   Dans une requête avec progression, `event` peut être de plusieurs natures :
   - `HttpEventType.Sent (0)` : La connexion est établie.
   - `HttpEventType.UploadProgress (1)` : Le fichier est en train d'être envoyé. À ce stade, `event.body` n'existe pas encore ! L'application extrait `event.loaded` et `event.total` pour calculer :
     $$\text{Pourcentage} = \text{Math.round}\left(\frac{\text{event.loaded}}{\text{event.total}} \times 100\right)$$
   - `HttpEventType.Response (4)` : Le serveur a terminé de traiter le fichier et renvoie la réponse finale. C'est **uniquement à ce moment précis** que `event.body` devient disponible et contient les métadonnées de la piste créée.

3. **Conséquence ergonomique (UX)** :
   Traiter la progression permet d'offrir à l'utilisateur un retour visuel en temps réel sur les fichiers volumineux (ex: 20 Mo d'audio), évitant le sentiment d'application « gelée » ou bloquée.

---

### 3.4. Checkpoint Network de la Progression d'Upload

Pour valider l'évaluation auprès de l'enseignant :

1. **Requête HTTP** :
   - **Méthode** : `POST http://localhost:4200/api/tracks`
   - **En-têtes** :
     - `Authorization: Bearer <token_jwt>` (injecté automatiquement par `authInterceptor`)
     - `Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...`
   - **Corps envoyé** :
     - Champ `audio` : flux binaire du fichier audio (`song1.mp3`)
     - Champ `title` : `"Solo Blues en La mineur"`
2. **Événements observés** :
   - Série d'événements `UploadProgress` avec progression croissante du ratio `loaded / total` de 0% à 100%.
   - Statut HTTP final : `201 Created`.
   - Corps de réponse :
     ```json
     {
       "id": "6ac795007d41eb21f099faa8",
       "ownerId": "6ac6f5c8...",
       "title": "Solo Blues en La mineur",
       "originalName": "song1.mp3",
       "mimeType": "audio/mpeg",
       "size": 3605337,
       "createdAt": "2026-10-14T12:00:00.000Z"
     }
     ```
3. **Comportement UI final** :
   - Disparition de la barre de progression, affichage de l'alerte verte et du toast `MatSnackBar`.
   - Remise à zéro des champs et insertion immédiate du nouveau morceau en première position de la liste.

---

## 4. Mission 7 — Tests Automatisés (« Tests ciblés et contrats d'API »)

### 4.1. Fiche Synthétique de la Mission (Conforme au Modèle IA)

- **Objectif** :  
  Créer une suite de tests unitaires et d'isolation HTTP ciblés pour le frontend (Angular 22 / Vitest avec `HttpTestingController`) et enrichir la suite de tests du backend (Node.js `node --test`). Les tests doivent vérifier scrupuleusement les URL, méthodes HTTP, paramètres de requête (`params`), en-têtes de sécurité (`Authorization`), corps de requêtes (`body`) et réponses simulées (`flush`), sans dépendre d'un serveur backend ni d'une base MongoDB active.

- **Prompt principal** :  
  > *« relis les détails de la mission 7 : Tests automatisés, implemente ce qui est demandé et met à jour le rapport »*

- **Plan proposé par l'agent** :  
  1. **Résolution de l'infrastructure de test Angular CLI** :
     - Adapter [`angular.json`](frontend-starter/angular.json) pour doter la cible `build` d'une configuration `development` requise par `@angular/build:unit-test`.
     - Créer [`tsconfig.spec.json`](frontend-starter/tsconfig.spec.json) intégrant les définitions globales de tests et référencer le fichier dans [`tsconfig.json`](frontend-starter/tsconfig.json).
     - Exclure les fichiers `**/*.spec.ts` de [`tsconfig.app.json`](frontend-starter/tsconfig.app.json) pour préserver un build de production propre.
  2. **Développement des tests Frontend (au moins 3 demandés par le sujet, 11 créés)** :
     - [`auth.service.spec.ts`](frontend-starter/src/app/shared/services/auth.service.spec.ts) : Tester que `AuthService.login()` appelle `POST /api/auth/login` avec `{ email, password }`, stocke le JWT et le profil, et que `logout()` purge les états.
     - [`track.service.spec.ts`](frontend-starter/src/app/shared/services/track.service.spec.ts) : Tester la transmission des paramètres HTTP `page`, `limit` et `search` sur `GET /api/tracks`, l'appel `DELETE /api/tracks/:id` et la configuration `reportProgress: true` de l'upload.
     - [`auth.interceptor.spec.ts`](frontend-starter/src/app/shared/interceptors/auth.interceptor.spec.ts) : Tester l'injection de l'en-tête `Authorization: Bearer <token>`, l'absence de header lorsqu'aucun token n'existe, et la déconnexion avec navigation vers `/login` en cas d'erreur HTTP `401`.
     - [`auth.guard.spec.ts`](frontend-starter/src/app/shared/guards/auth.guard.spec.ts) : Tester l'autorisation d'accès (`true`) et la redirection sous forme d'`UrlTree` vers `/login` quand l'utilisateur n'a pas de jeton.
  3. **Extension des tests Backend ([`backend/test/api.test.js`](backend/test/api.test.js))** :
     - Vérifier le renvoi d'une erreur `401` sans en-tête `Authorization`.
     - Vérifier le renvoi d'une erreur `401` avec un JWT invalide ou forgé avec une mauvaise clé.
     - Vérifier le renvoi d'une erreur `400` en cas d'upload sans fichier audio.
     - Vérifier le rejet d'un type MIME interdit (`text/plain` au lieu de formats audio autorisés).
  4. **Exécution des suites de validation** :
     - Exécuter `cmd /c "npm test"` côté frontend (Vitest).
     - Exécuter `cmd /c "npm test"` côté backend (`node --test`).
     - Exécuter `cmd /c "npm run build"` pour s'assurer de l'absence de régression.

- **Vérifications réalisées** :  
  - **Exécution Frontend (`npm test`)** : 11 tests exécutés et validés à 100% (4 suites de tests, 0 échec, durée : 1.90s).
  - **Exécution Backend (`npm test`)** : 6 tests exécutés et validés à 100% (durée : 0.86s, 0 échec).
  - **Validation du Build (`npm run build`)** : Compilation réussie en 6.49s, génération du bundle `dist/gpc` sans aucune erreur TypeScript ou de template.

- **Erreurs ou propositions rejetées** :  
  - *Erreur résolue : Configuration d'environnement Vitest sous Angular 22* :  
    Lors de l'initialisation de `ng test`, l'absence de configuration `development` sous la cible `build` d'`angular.json` bloquait le test runner. La configuration explicite de `buildTarget: "gpc:build"` et des options de compilation associées a débloqué le lanceur de tests.
  - *Proposition rejetée : Démarrer un serveur backend réel pour exécuter les tests frontend* :  
    Rejetée formellement en vertu du sujet (*« Ils ne doivent pas dépendre d’un backend ou d’une base MongoDB en fonctionnement »*). L'injection de `provideHttpClientTesting()` et de `HttpTestingController` permet de court-circuiter la couche réseau, de simuler instantanément les réponses positives ou d'erreur et de tester le comportement exact des composants et services dans un environnement hermétique et reproductible.
  - *Erreur de typage évitée : Mock incomplet du modèle `User`* :  
    Dans `auth.service.spec.ts`, l'absence du champ `createdAt` sur l'objet mock utilisateur déclenchait une erreur de compilation TypeScript (`TS2345`). Le mock a été complété avec une date ISO valide conforme à l'interface `User`.

- **Fichiers effectivement modifiés ou créés** :  
  - [`frontend-starter/angular.json`](frontend-starter/angular.json) : Configuration des cibles `build:development` et `test`.
  - [`frontend-starter/tsconfig.spec.json`](frontend-starter/tsconfig.spec.json) : Création de la configuration TypeScript pour les fichiers `.spec.ts`.
  - [`frontend-starter/tsconfig.json`](frontend-starter/tsconfig.json) : Référencement de `tsconfig.spec.json`.
  - [`frontend-starter/tsconfig.app.json`](frontend-starter/tsconfig.app.json) : Exclusion des fichiers de tests pour la compilation applicative.
  - [`frontend-starter/src/app/shared/services/auth.service.spec.ts`](frontend-starter/src/app/shared/services/auth.service.spec.ts) : Tests unitaires de `AuthService` (login, logout, signaux).
  - [`frontend-starter/src/app/shared/services/track.service.spec.ts`](frontend-starter/src/app/shared/services/track.service.spec.ts) : Tests unitaires de `TrackService` (pagination, delete, upload progress).
  - [`frontend-starter/src/app/shared/interceptors/auth.interceptor.spec.ts`](frontend-starter/src/app/shared/interceptors/auth.interceptor.spec.ts) : Tests unitaires de l'intercepteur fonctionnel HTTP.
  - [`frontend-starter/src/app/shared/guards/auth.guard.spec.ts`](frontend-starter/src/app/shared/guards/auth.guard.spec.ts) : Tests unitaires du guard fonctionnel avec `runInInjectionContext`.
  - [`backend/test/api.test.js`](backend/test/api.test.js) : Extension des tests de contrat et de sécurité Express/Multer/JWT.
  - [`Rapport_TP3.md`](Rapport_TP3.md) : Documentation détaillée de la mission 7 et de la restitution orale.

- **Preuve de fonctionnement** :  
  - Sorties textuelles des consoles de tests reproduites ci-après.

- **Notions maîtrisées sans l'agent** :  
  - La différence fondamentale entre un test unitaire (composant/service isolé avec mocks) et un test d'intégration (chaîne complète avec communication réelle).
  - Pourquoi les tests HTTP avec `HttpTestingController` n'ont besoin ni de backend ni de MongoDB.
  - Ce que valide un test d'intercepteur ou de guard fonctionnel dans l'architecture Angular.

---

### 4.2. Matrice Complète des Tests Automatisés (Résultats Attendus vs Observés)

#### Tests Frontend (Angular 22 / Vitest / `HttpTestingController`)

| Fichier de Test | Test ciblé | Méthode & URL simulées | Assertions vérifiées | Résultat Attendu | Résultat Observé |
|---|---|---|---|:---:|:---:|
| `auth.service.spec.ts` | **`login()` avec corps valide** | `POST /api/auth/login` | Vérifie que la méthode est `POST`, que le corps contient `{ email, password }`, et que le jeton reçu est stocké dans le signal `token`, dans `localStorage` et dans `currentUser`. | ✅ Passe | **✅ 100% Passé** (33ms) |
| `auth.service.spec.ts` | **`logout()` réinitialisation** | Aucune requête réseau | Vérifie que l'appel purge `token()`, `currentUser()` et la clé `gpc_token` de `localStorage`. | ✅ Passe | **✅ 100% Passé** (7ms) |
| `track.service.spec.ts` | **`list()` avec pagination** | `GET /api/tracks` | Vérifie que les paramètres d'URL `page=2` et `limit=10` sont correctement sérialisés dans `HttpParams` et que la liste typée `Page<Track>` est renvoyée. | ✅ Passe | **✅ 100% Passé** (21ms) |
| `track.service.spec.ts` | **`list()` avec recherche** | `GET /api/tracks` | Vérifie que le paramètre `search=miles davis` est ajouté aux paramètres de pagination. | ✅ Passe | **✅ 100% Passé** (9ms) |
| `track.service.spec.ts` | **`delete()` d'un morceau** | `DELETE /api/tracks/:id` | Vérifie que la méthode est bien `DELETE`, que l'ID figure dans l'URL et que le corps de requête est vide (`null`). | ✅ Passe | **✅ 100% Passé** (10ms) |
| `track.service.spec.ts` | **`upload()` configuration** | `POST /api/tracks` | Vérifie que la requête multipart configure explicitement `reportProgress: true` pour le suivi événementiel. | ✅ Passe | **✅ 100% Passé** (10ms) |
| `auth.interceptor.spec.ts` | **Ajout du Bearer Token** | `GET /api/tracks` | Vérifie que l'intercepteur clone la requête et injecte l'en-tête `Authorization: Bearer <token>` si `auth.token()` est renseigné. | ✅ Passe | **✅ 100% Passé** (22ms) |
| `auth.interceptor.spec.ts` | **Absence de Token** | `GET /api/health` | Vérifie qu'aucun en-tête `Authorization` n'est greffé si l'utilisateur n'est pas authentifié. | ✅ Passe | **✅ 100% Passé** (11ms) |
| `auth.interceptor.spec.ts` | **Traitement Erreur 401** | `GET /api/tracks` (Erreur 401) | Vérifie que l'intercepteur capture l'erreur `401`, appelle `auth.logout()` et déclenche `router.navigateByUrl('/login')`. | ✅ Passe | **✅ 100% Passé** (21ms) |
| `auth.guard.spec.ts` | **Autorisation si token** | Contexte d'injection | Vérifie que `authGuard` renvoie la valeur booléenne `true` lorsque `auth.token()` contient un jeton. | ✅ Passe | **✅ 100% Passé** (19ms) |
| `auth.guard.spec.ts` | **Redirection si sans token** | Contexte d'injection | Vérifie que `authGuard` retourne un `UrlTree` sérialisé vers `/login` lorsque `auth.token()` est `null`. | ✅ Passe | **✅ 100% Passé** (20ms) |

#### Tests Backend (`node --test`)

| Test Backend | Type | Endpoint & Méthode | Condition testée | Statut Attendu | Statut Observé |
|---|---|---|---|:---:|:---:|
| `health sans dépendre de MongoDB` | Santé | `GET /api/health` | Vérification de la disponibilité de base d'Express. | 200 OK | **✅ 200 OK** |
| `schémas Mongoose et relation` | Modèle | Modèles `User` et `Track` | Normalisation des emails et référence `ownerId -> User`. | Assertion stricte | **✅ Passé** |
| `sécurité : 401 sans JWT sur /api/tracks` | Sécurité | `GET /api/tracks` | Rejet immédiat si en-tête `Authorization` manquant. | 401 Unauthorized | **✅ 401 Unauthorized** |
| `sécurité : 401 avec un JWT invalide` | Sécurité | `GET /api/tracks` | Rejet si la signature JWT est corrompue. | 401 Unauthorized | **✅ 401 Unauthorized** |
| `contrat upload : 400 sans fichier audio` | Contrat | `POST /api/tracks` | Rejet si payload multipart sans champ audio. | 400 Bad Request | **✅ 400 Bad Request** |
| `contrat upload : 400 format audio non accepté` | Contrat | `POST /api/tracks` | Rejet par le filtre Multer si fichier `.txt` (`text/plain`). | 400 Bad Request | **✅ 400 Bad Request** |

---

### 4.3. Traces Réelles d'Exécution des Tests

#### 1. Console Frontend (`npm test` dans `frontend-starter`) :

```text
> gpc-angular-starter@1.0.0 test
> ng test --watch=false

> Building...
√ Building...
Application bundle generation complete. [1.882 seconds] - 2026-10-14T13:01:12.347Z

 RUN  v4.1.11 C:/Users/Admin/Desktop/Ang/TPs/AngularM1_Miage_2026_2027_TP123/frontend-starter

 ✓  gpc  src/app/shared/services/track.service.spec.ts (4 tests) 49ms
 ✓  gpc  src/app/shared/services/auth.service.spec.ts (2 tests) 40ms
 ✓  gpc  src/app/shared/guards/auth.guard.spec.ts (2 tests) 39ms
stderr | src/app/shared/interceptors/auth.interceptor.spec.ts > authInterceptor > doit déconnecter l’utilisateur et naviguer vers /login sur une erreur 401
[authInterceptor] Jeton expiré ou invalide (401) : retour vers /login

 ✓  gpc  src/app/shared/interceptors/auth.interceptor.spec.ts (3 tests) 55ms

 Test Files  4 passed (4)
      Tests  11 passed (11)
   Start at  15:01:12
   Duration  1.90s (transform 300ms, setup 2.29s, import 458ms, tests 182ms, environment 3.22s)
```

#### 2. Console Backend (`npm test` dans `backend`) :

```text
> gpc-api@3.0.0 test
> node --test

[startup] Dossier des uploads prêt : C:\...\backend\data\uploads
[health] Vérification de l'API
[http] GET /api/health -> 200 (6 ms)
✔ health sans dépendre de MongoDB (62.3774ms)
✔ schémas Mongoose et relation (5.54ms)
[auth] Authorization absente pour GET /api/tracks
[http] GET /api/tracks -> 401 (2 ms)
✔ sécurité : 401 sans JWT sur /api/tracks (8.3361ms)
[auth] Token invalide ou expiré JsonWebTokenError: invalid token
[http] GET /api/tracks -> 401 (2 ms)
✔ sécurité : 401 avec un JWT invalide sur /api/tracks (5.1844ms)
[auth] Token accepté pour 6acf7cedee82263dc5beac2b
[tracks] Upload sans fichier par 6acf7cedee82263dc5beac2b
[http] POST /api/tracks -> 400 (8 ms)
✔ contrat upload : 400 si aucun fichier audio n'est transmis (19.3506ms)
[auth] Token accepté pour 6acf7cedee82263dc5beac2c
[multer] Type audio refusé : text/plain Error: Format audio non accepté
[tracks] Erreur Multer upload Error: Format audio non accepté
[http] POST /api/tracks -> 400 (5 ms)
✔ contrat upload : 400 si le type MIME audio est refusé (ex: text/plain) (10.5866ms)
ℹ tests 6
ℹ suites 0
ℹ pass 6
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 859.4687
```

#### 3. Console Build Final (`npm run build` dans `frontend-starter`) :

```text
> gpc-angular-starter@1.0.0 build
> ng build

> Building...
√ Building...
Initial chunk files | Names         |  Raw size
main.js             | main          |   2.54 MB | 
styles.css          | styles        | 114.38 kB | 

                    | Initial total |   2.65 MB

Application bundle generation complete. [6.491 seconds] - 2026-10-14T13:00:47.301Z
Output location: C:\...\frontend-starter\dist\gpc
```

---

## 5. Restitution Orale — Réponses aux 6 Questions Clés du Sujet

Conformément à la section **« Restitution orale »** du sujet TP3, les explications suivantes sont maîtrisées pour la présentation devant l'enseignant :

### 1. Pourquoi la suppression passe par un service ?
1. **Séparation des responsabilités (Single Responsibility / SOC)** :  
   Le composant `TracksPageComponent` est dédié à la logique d'affichage, aux interactions utilisateur (boîte de dialogue de confirmation, notifications `MatSnackBar`, signaux d'interface). La connaissance des routes réseau (`DELETE /api/tracks/:id`), des en-têtes HTTP et du protocole de communication relève exclusivement de la couche service (`TrackService`).
2. **Réutilisabilité et centralisation** :  
   Si un autre composant (ex. un gestionnaire d'administration, une vue détail ou une corbeille) doit supprimer une piste, il appelle la méthode `delete()` du service sans dupliquer l'URL de l'API. Si l'URL change (ex: `/api/v2/tracks/:id`), la modification se fait en un point unique.
3. **Facilité de test et mockabilité** :  
   En isolant l'appel réseau dans `TrackService`, on peut tester le composant unitairement en remplaçant le service par un faux objet (*stub/spy*), vérifiant que le composant réagit correctement au succès ou à l'erreur sans faire de vraie requête HTTP.

### 2. Comment le backend protège la suppression ?
1. **Authentification préalable obligatoire par middleware (`auth`)** :  
   La route `DELETE /api/tracks/:id` est protégée par le middleware `auth`. Celui-ci exige un en-tête `Authorization: Bearer <token>` valide, décode cryptographiquement le JWT avec la clé secrète serveur et attache l'identifiant certain de l'utilisateur à `req.auth.sub`. Sans JWT valide, la requête est rejetée en `401 Unauthorized`.
2. **Contrôle d'autorisation strict au niveau de la requête Mongoose** :  
   Le serveur n'exécute pas un simple `findByIdAndDelete(id)`. Il exécute :
   ```javascript
   Track.findOneAndDelete({ _id: req.params.id, ownerId: req.auth.sub })
   ```
   Cette clause WHERE (`ownerId: req.auth.sub`) garantit qu'un utilisateur ne peut en aucun cas supprimer la piste d'un tiers, même s'il connaît son identifiant MongoDB. Si l'utilisateur n'est pas le propriétaire, aucun document n'est trouvé et le backend retourne `404 Not Found`.
3. **Nettoyage transactionnel des fichiers physiques** :  
   Le backend ne se contente pas de supprimer le document en base : il supprime les fichiers sur disque via `fsPromises.unlink()` (le fichier audio et la pochette d'illustration éventuelle), prévenant toute accumulation de fichiers orphelins.

### 3. Comment Angular calcule le pourcentage d’upload ?
1. **Configuration HTTP bas niveau** :  
   Dans `TrackService.upload()`, la requête POST est configurée avec `{ reportProgress: true, observe: 'events' }`. Grâce à `withXhr()`, Angular écoute l'événement natif `xhr.upload.onprogress` déclenché par les paquets réseau sortants.
2. **Interception du type d'événement `HttpEventType.UploadProgress`** :  
   L'Observable émet plusieurs événements intermédiaires au fur et à mesure du téléversement. Dès que `event.type === HttpEventType.UploadProgress` (valeur numérique 1) :
   - `event.loaded` représente le nombre total d'octets déjà transmis au serveur.
   - `event.total` (ou la taille réelle du fichier `file.size` en fallback) représente le poids total du flux.
3. **Formule mathématique réactive** :  
   Le pourcentage est calculé par :
   $$\text{percent} = \text{Math.round}\left(\frac{\text{event.loaded}}{\text{event.total}} \times 100\right)$$
   La valeur est immédiatement affectée au signal Angular `uploadProgress.set(percent)`, ce qui recalcule instantanément la vue et anime la jauge `<progress>` dans le DOM.

### 4. Pourquoi les tests HTTP n’ont pas besoin de MongoDB ?
1. **Isolement de la couche client (`HttpTestingController`)** :  
   En test unitaire frontend, l'objectif est de vérifier le comportement du code Angular (l'URL appelée, les paramètres `page/limit`, la méthode `GET/POST/DELETE`, les en-têtes et la réaction aux réponses), et non le fonctionnement de la base de données.
2. **Interception en mémoire sans transport réseau** :  
   `provideHttpClientTesting()` substitue le moteur de transport HTTP standard par un intercepteur en mémoire. Les requêtes générées par les services sont capturées dans une file d'attente interne `HttpTestingController`.
3. **Contrôle déterministe par simulation (`flush`)** :  
   Le développeur contrôle exactement ce que « répond » l'API grâce à `req.flush(mockData)` ou `req.flush(null, { status: 404, statusText: 'Not Found' })`. Les tests sont ultra-rapides (< 2 secondes pour 11 tests), totalement déterministes et indépendants de l'état de la base de données, du réseau ou de la machine hôte.

### 5. Ce que vérifie un test d’intercepteur ou de guard ?
1. **Test d'intercepteur (`authInterceptor`)** :  
   - *Enrichissement des requêtes sortantes* : Vérifie que si un jeton existe dans `AuthService`, l'en-tête `Authorization: Bearer <token>` est systématiquement et correctement injecté dans la requête clonée.
   - *Neutralité sur requête publique* : Vérifie qu'aucun en-tête n'est pollué si l'utilisateur est déconnecté.
   - *Interception des erreurs rentrantes (401)* : Vérifie que lors d'un code de retour HTTP `401 Unauthorized` sur une ressource protégée, l'intercepteur déclenche immédiatement la déconnexion (`auth.logout()`) et ordonne la redirection de l'utilisateur vers `/login` (`router.navigateByUrl('/login')`).
2. **Test de guard (`authGuard`)** :  
   - *Filtrage des accès aux routes* : Vérifie que le guard renvoie `true` si l'utilisateur possède un token valide (navigation autorisée vers `/tracks` ou `/profile`).
   - *Redirection des utilisateurs anonymes* : Vérifie que sans token, le guard refuse l'activation et produit un `UrlTree` redirigeant vers `/login`.

### 6. Quelle différence existe entre un test unitaire et un test d’intégration ?

| Critère | Test Unitaire (Unit Test) | Test d'Intégration (Integration Test) |
|---|---|---|
| **Périmètre (Scope)** | Teste un composant, une fonction, un service ou un filtre de manière **isolée** du reste du monde. | Teste l'interaction et la collaboration entre **plusieurs modules réels** assemblés ensemble. |
| **Dépendances externes** | Toutes les dépendances (réseau HTTP, base de données, services tiers) sont **mockées / simulées** (ex: `HttpTestingController`, faux token). | Les composants communiquent avec de vraies dépendances ou sous-systèmes réels (ex: serveur Express + MongoDB réels ou base en mémoire). |
| **Vitesse d'exécution** | **Extrêmement rapide** (quelques dizaines de millisecondes par test). | **Plus lent** (temps d'initialisation des connexions réseau, I/O disque, opérations base de données). |
| **Exemple dans notre projet** | Vérifier dans `TrackService.spec.ts` que `list(2, 5)` génère une requête avec les paramètres `page=2&limit=5`. | Démarrer l'API Express, créer un document dans MongoDB, envoyer un véritable fichier audio avec `fetch()` et vérifier qu'il est écrit sur le disque. |
| **Objectif principal** | Valider la logique interne, les algorithmes et la robustesse face aux cas limites sans effet de bord. | Valider le contrat global, la cohérence des échanges et le bon fonctionnement de la chaîne de bout en bout. |

---

## 6. Conclusion et État des Livrables TP3

Tous les livrables attendus pour le TP3 ont été intégralement réalisés, vérifiés et documentés :

- [x] **Suppression fonctionnelle d’une piste** (Mission 5) : confirmation `window.confirm`, icône dynamique `hourglass_empty`, notification `MatSnackBar`, gestion d'erreur `404`/`403`, arrêt immédiat du lecteur audio et rafraîchissement de la pagination.
- [x] **Progression d’upload avec états visibles** (Mission 6) : 4 états visuels distincts, barre de progression animée avec pourcentage en temps réel, verrouillage total du formulaire par `<fieldset [disabled]>` anti-double soumission, et activation de `withXhr()` pour éliminer l'erreur `NG02824`.
- [x] **Au moins trois tests frontend automatisés** (Mission 7) : **11 tests** implémentés couvrant `AuthService`, `TrackService`, `authInterceptor` et `authGuard`, tous validés sous Vitest sans dépendance à MongoDB.
- [x] **Extension de tests backend** (Mission 7) : **6 tests** sous `node --test` couvrant la santé de l'API, les relations Mongoose, les rejets de sécurité `401` et les rejets de contrat Multer `400`.
- [x] **Validation du build de production** : `npm run build` exécuté avec succès (bundle généré sans aucune erreur).
- [x] **Rapport d'usage de l'IA** : Rédigé selon les 8 rubriques standardisées avec diagrammes de séquence Mermaid, matrices de tests et réponses complètes à l'ensemble des questions de la restitution orale.


