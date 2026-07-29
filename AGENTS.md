# BonjourArcade

Plateforme de jeux rétro en ligne avec émulateur EmulatorJS. Site stathe (HTML/CSS/JS) servi depuis `public/`, backend Firebase, déploiement GitLab Pages.

## Structure du projet

```
roms/<system>/          # ROMs (symlink public/roms -> ../roms)
public/games/<game_id>/ # Dossier metadata de chaque jeu (metadata.yaml + cover.png)
public/config/          # Config émulateur + contrôles par système
public/assets/js/       # JS frontend (vanilla, pas de framework)
public/assets/css/      # Styles
public/play/index.html  # Page de jeu avec EmulatorJS
public/shelf/index.html # Bibliothèque de jeux
public/featured/        # Page jeux en vedette (historique)
public/404.html         # Routing client-side (SPA-like, /b/<game_id>)
public/api/             # Endpoints statiques générés (current-game, previous-games.json, etc.)
public/upcoming/        # upcoming.yaml (liste des jeux pour le système Plinko)
scripts/                # Scripts Python + Bash (build, newsletter, metadata, etc.)
alloarcade-backend/     # Backend Firebase (Cloud Functions, Firestore, Auth)
```

## Stack

- **Frontend** : HTML/CSS/JS vanilla (modules ES6 via import maps)
- **Émulation** : EmulatorJS (chargé dynamiquement dans play/index.html)
- **Backend** : Firebase (Auth Google SSO, Firestore, Cloud Functions)
- **CI/CD** : GitLab CI (pages job), GitHub Actions secondaire
- **Build** : Bash + Python (yq + jq + Pillow)
- **Stockage ROMs** : Google Cloud Storage (production) ou local (dev)

## Commandes principales

- `./dev.sh` — Build parallèle + serveur local sur http://localhost:8000
- `./dev.sh --production` — Build avec URLs GCS au lieu de locales
- `./serve.sh [--with-firebase]` — Serveur local seulement (sans build)
- `bash scripts/build_parallel.sh` — Build parallèle (gamelist + thumbnails)
- `bash scripts/build_sequential.sh` — Build séquentiel (pour CI)

## Architecture du build

1. `scripts/generate_gamelist_parallel.sh` (ou `_sequential.sh`) :
   - Scanne `roms/` (ou lit un manifest ROMS_MANIFEST_URL/ROMS_MANIFEST_PATH)
   - Lit les metadata.yaml dans `public/games/<game_id>/`
   - Mappe les dossiers de système vers les cores EmulatorJS (via `get_core_from_dir()`)
   - Génère `public/gamelist.json` (format: `{games: [{id, title, core, romPath, coverArt, ...}]}`)
   - Génère les endpoints API (current-game, upcoming-games, previous-games)
2. `scripts/generate_thumbnails.sh` — Génère les vignettes depuis cover.png

## Système de jeu en vedette (Plinko)

- **Rotation** : 2 fois par mois (1er et 15), 24 périodes/an
- **Config** : `public/config/bonjourarcade.yaml` contient `rotation_settings.start_date`
- **Liste** : `public/upcoming/upcoming.yaml` — liste ordonnée des game IDs
- **Calcul** : `scripts/get_current_week_game.py` — détermine le jeu courant via `_get_period_number()`
- **API** : `public/api/current-game` contient l'ID du jeu en vedette

## Conventions metadata.yaml

- `title`, `developer`, `year`, `genre`, `added` (YYYY-MM-DD)
- `hide: yes` par défaut (les jeux sont cachés jusqu'à ce qu'on mette `hide: ""`)
- `enable_score: true` pour activer les scores sur un jeu
- `controls: [...]` — liste de strings pour l'affichage des contrôles
- `to_start` — instruction pour démarrer (ex: "Espace, puis Enter")
- `problem` — signaler un problème connu
- `game_type: external` + `external_url` — jeux externes (pas d'émulation)

## Conventions jeux

- Chaque jeu a un dossier `public/games/<game_id>/` contenant :
  - `metadata.yaml` — métadonnées
  - `cover.png` — image de couverture (utilisée pour thumbnails)
  - `save.state` (optionnel) — état de sauvegarde chargé automatiquement
- Game ID = nom du fichier ROM sans extension, en minuscules (ex: `smb` pour `smb.nes`)
- Les thumbnails sont générés automatiquement pendant le build

## Frontend

- `main.js` (2677 lignes) — logique principale : tooltips, rendu des jeux, thème sombre/clair
- `shelf.js` — bibliothèque interactive (filtres, tri, grouping par système/développeur)
- `scores-service.js` — communication avec Firebase Cloud Functions pour les scores
- `firebase-setup.js` — init Firebase Auth, Firestore, Functions avec support émulateur local
- `play/index.html` — page de jeu EmulatorJS avec gestion des contrôles, scores, fullscreen
- Routing SPA-like via `404.html` : `/b/<game_id>` → lance le jeu, `/scores/<game_id>` → scores
- Styles dans `style.css`, `shelf.css`, `scores.css`, `ratings.css`, `profil.css`

## Backend (alloarcade-backend/)

- Firebase Cloud Functions : `listGameScores`, `getLatestScores`, `submitScore`, etc.
- Firebase Auth : Google SSO
- Firestore : collections scores, ratings, users
- Service account dans `alloarcade-backend/service-account.json`
- Émulateurs Firebase disponibles en local (`npm run dev:all`)

## Favoris

- Collection Firestore : `favorites/{userId}:{gameId}` (doc ID composé = pas de doublon)
- Module partagé : `public/assets/js/favorites.js` — exporte `window.__favorites = { toggle, getAll, isFav, listen }`
- `listen(userId, callback)` utilise `onSnapshot` pour temps réel
- Pages avec bouton favori : `/play` (header)
- Page `/profil` : section « Mes jeux favoris » avec grille de couvertures
- Auth requise (popup Google SSO si non connecté, pattern identique aux ratings)

## Tests

- `scripts/test_webhook.sh` — test webhooks newsletter
- `scripts/test_automated_newsletter.sh` — test newsletter automatisée
- `scripts/test_progress_tracking.sh` — test suivi progression
- `scripts/check_metadata_syntax.sh` — vérifie la syntaxe des metadata.yaml

## Tournois

- Cloud Functions : `startTournament`, `joinTournament`, `endRound`, `advanceToNextRound`, `finalizeTournament`, etc.
- Code dans `alloarcade-backend/firebase/functions/src/tournaments/`
- Formule de cutoff (nombre de joueurs qui survivent par round) :
  ```
  roundsLeft = totalRounds - currentRound
  if remaining <= roundsLeft → tous survivent
  else → cutoff = ceil(remaining × (roundsLeft-1) / roundsLeft)
  ```
  Le cutoff est **recalculé à chaque advancement** (dans `computeCutoff()` dans `advance.ts`) en fonction du nombre réel de joueurs actifs, pas pré-calculé au start.
- Cas spécial : avant-dernier round → minimum 3 survivants si > 3 joueurs
- Le « danger » affiché dans le scoreboard est un preview de l'élimination (même formule côté frontend dans `computeRoundCutoff` dans `tournament-utils.js`)
- Types principaux : `Participant { eliminated, eliminatedRound, scores[], scoresVerified[] }`, `Tournament { status, cutoffs[], currentRoundIndex, games[], roundDurationSec }`

## Déploiement

- GitLab CI déclenché sur push à `main` modifiant `public/**/*` ou les scripts de build
- Pipeline parallèle : déploiement Pages + newsletter hebdomadaire (via schedule)
- Production : Google Cloud Storage pour les ROMs (`gs://bonjourarcade`), GitLab Pages pour le site
- **Cloud Functions** à déployer manuellement avec `firebase deploy --only functions` depuis `alloarcade-backend/firebase/`
