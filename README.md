# Guitar Practice Cloud (GPC) — Projet Étudiant M1 MIAGE

**Étudiant :** Elhadj Oumar DIALLO  
**Formation :** Master 1 MIAGE (2026–2027)  
**Projet :** Guitar Practice Cloud (GPC) — Application Fullstack Angular & Node.js/Express

---

## 📌 Accès Rapide aux Rapports d'Évaluation (TP1, TP2, TP3)

Pour faciliter l'évaluation, chaque TP dispose de son rapport complet détaillant l'usage de l'IA (selon `RAPPORT_IA_MODELE.md`), les fiches synthétiques, les diagrammes de séquence Mermaid, les justifications techniques et les captures d'écran des preuves d'exécution :

| Rapport | Thématique & Missions | Livrables & Preuves Clés |
|---|---|---|
| [**Rapport_TP1.md**](Rapport_TP1.md) | **TP1 : Architecture, Authentification et Profil**<br>• Cartographie complète (routes, guards, intercepteurs)<br>• Flux JWT et gestion d'état réactive (Signals vs LocalStorage)<br>• Modification du profil (`PUT /api/users/me`) | • Traces `200 OK` (login, reload profil, modification du nom)<br>• Gestion `401 Unauthorized`<br>• 3 captures Network DevTools |
| [**Rapport_TP2.md**](Rapport_TP2.md) | **TP2 : Bibliothèque, Upload et Lecture Audio**<br>• Pagination serveur (`MatPaginator`, bornes, I18n)<br>• Upload multipart (`POST /api/tracks`) avec rafraîchissement réactif<br>• Suggestions de pochettes d'album (Web / local)<br>• Streaming audio authentifié (Blob, cache HTTP, libération mémoire) | • Navigation serveur dynamique (requêtes HTTP à chaque page)<br>• Upload sans rechargement de page<br>• 3 captures Network DevTools |
| [**Rapport_TP3.md**](Rapport_TP3.md) | **TP3 : Fiabilisation et Enrichissement du Frontend**<br>• Suppression sécurisée (`DELETE 204`, confirmation, `MatSnackBar`, 404)<br>• Progression d'upload en temps réel (événements RxJS, jauge, anti-double clic)<br>• Tests automatisés (11 tests Vitest frontend + 6 tests backend)<br>• Synthèse conceptuelle et justifications architecturales | • Captures intégrées dans chaque mission<br>• 11/11 tests passés sous Vitest (`ng test`)<br>• Build de production `ng build` validé |

---

## 📖 Présentation du Projet

**Guitar Practice Cloud (GPC)** est une application web conçue pour permettre aux musiciens de gérer et travailler leurs morceaux d'entraînement :
- **Frontend** : Angular 22 (architecture standalone, Angular Material, Signals réactifs, formulaires typés, RxJS, thème dynamique clair/sombre avec persistance).
- **Backend** : Node.js, Express, Mongoose, MongoDB Atlas, authentification par jeton JWT et téléversement Multer.

---

## 🚀 Démarrage Rapide

### Prérequis
- **Node.js** : version 22 ou plus récente ;
- **MongoDB Atlas** : instance configurée (voir [ATLAS_SETUP.md](ATLAS_SETUP.md)) ;
- Git et un navigateur récent.

### 1. Démarrer le Backend
```bash
cd backend
cp .env.example .env
```
Renseigner dans `.env` l'URI de connexion MongoDB Atlas et le secret JWT :
```bash
npm install
npm start
```
> Le serveur backend écoute normalement sur `http://localhost:3000`.

### 2. Démarrer le Frontend
Dans un second terminal :
```bash
cd frontend-starter
npm install
npm start
```
> L'application Angular est accessible sur `http://localhost:4200` (les appels `/api` sont redirigés vers le backend via `proxy.conf.json`).

### 3. Compte de Démonstration
- **Email** : `demo@example.com`
- **Mot de passe** : `Demo1234!`
*(Des fixtures audio d'essai sont disponibles dans `frontend-starter/fichiers-audio-de-test/`)*.

---

## 🧪 Exécution des Tests et Validation du Build

Conformément aux exigences du TP3, le projet intègre des suites de tests automatisés vérifiant les contrats d'API et l'isolation réseau :

### Tests Frontend (Angular / Vitest)
Exécute les 11 tests unitaires et d'isolation HTTP (`HttpTestingController`) sans dépendance à un backend actif :
```bash
cd frontend-starter
npm test
```

### Tests Backend (Node.js Test Runner)
Vérifie la santé de l'API, les modèles Mongoose, les rejets de sécurité `401` et les validations de payload `400` :
```bash
cd backend
npm test
```

### Compilation de Production
Vérifie la conformité TypeScript et l'intégrité globale du bundle :
```bash
cd frontend-starter
npm run build
```

---

## 📂 Documents et Références du Projet

- **Sujets pédagogiques** : [SUJET_ETUDIANT_TP1.md](SUJET_ETUDIANT_TP1.md), [SUJET_ETUDIANT_TP2.md](SUJET_ETUDIANT_TP2.md), [SUJET_ETUDIANT_TP3.md](SUJET_ETUDIANT_TP3.md)
- **Spécifications d'API** : [API_CONTRACT.md](API_CONTRACT.md) (contrats d'échange, endpoints, codes HTTP)
- **Base de données** : [ATLAS_SETUP.md](ATLAS_SETUP.md) (instructions de raccordement MongoDB Atlas)
- **Guide d'usage IA** : [RAPPORT_IA_MODELE.md](RAPPORT_IA_MODELE.md) et [CONSEILS_POUR_UTIISER_ASSISTANT_AI.md](CONSEILS_POUR_UTIISER_ASSISTANT_AI.md)
- **Consignes de dev backend** : [`backend/AGENTS.md`](backend/AGENTS.md), [`backend/CLAUDE.md`](backend/CLAUDE.md), [`backend/GEMINI.md`](backend/GEMINI.md) et [`backend/best-practices.md`](backend/best-practices.md)
- **Dossier des preuves** : [`screenshots/`](screenshots/) (captures d'écran réseau DevTools et résultats de tests pour les TP1, TP2 et TP3)
