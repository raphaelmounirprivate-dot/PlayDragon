# AGENTS.md — PlayDragon

Consignes pour tout agent (Codex, Claude Code…) qui travaille sur ce dépôt.

## Projet

Jeu 3D : un dragon survole une vallée au coucher du soleil. Au bout du chemin apparaît un château qu'il faut
détruire. Le jeu est livré en `.exe` Windows portable.

## Stack technique

- **Langage :** TypeScript partout
- **Rendu :** Three.js (WebGL), post-traitement avec bloom, étalonnage chaud et vignettage
- **Build :** Vite. **Tests :** Vitest. **Bureau / exe :** Electron + electron-builder (cible `portable`)
- Pas de serveur ni de base de données : rien n'est persisté. Voir `ANALYSE_PROMPT.md` pour la raison.

## Commandes

| Commande | Effet |
|---|---|
| `npm install` | Installe les dépendances |
| `npm run dev` | Lance le jeu sur **http://localhost:5173** |
| `npm test` | Lance les tests unitaires (Vitest) |
| `npm run build` | Vérifie les types et construit `dist/` |
| `npm run start:desktop` | Build, puis ouvre le jeu dans une fenêtre Electron |
| `npm run dist` | Build, puis produit **`release/PlayDragon.exe`** (portable, non signé) |

### Pièges connus de l'environnement

- npm 11 bloque les scripts d'installation. Les autorisations d'`electron` et d'`esbuild` sont déjà dans
  `package.json` (`allowScripts`).
- Avec Node 26, le script d'installation d'Electron peut s'arrêter sans erreur et laisser
  `node_modules/electron/dist` presque vide. Solution : télécharger
  `electron-v33.3.1-win32-x64.zip` depuis les releases GitHub d'Electron, vérifier son SHA-256 dans
  `node_modules/electron/checksums.json`, l'extraire dans `node_modules/electron/dist`, puis écrire
  `electron.exe` dans `node_modules/electron/path.txt`.
- Un terminal VS Code peut définir `ELECTRON_RUN_AS_NODE=1`. Retire cette variable avant de lancer
  `electron`.

## Règles de développement

À appliquer systématiquement :

- **Méthode KISS :** la solution la plus simple qui répond au besoin, sans sur-ingénierie.
- **Séparation des responsabilités :** un module, une classe ou une fonction n'a qu'un seul rôle.
- **Clean code :** noms explicites, fonctions courtes, pas de duplication, pas de code mort, commentaires
  uniquement quand ils apportent du sens.
- **Architecture MVC,** adaptée à un jeu :
  - **Model :** règles et données pures, sans rendu. `src/logic/gameState.ts` (phases, vie, score, dégâts
    du château) et `src/world/flightPath.ts` (rivière, relief, trajectoire).
  - **View :** tout ce qui s'affiche. `src/world/` (ciel, terrain, nuages, château…), `src/entities/`
    (dragon, ailes, projectiles), `src/fx/` (textures procédurales, particules), `src/render/`
    (renderer et post-traitement), `src/ui/` (HUD et écrans).
  - **Controller :** `src/game/` (`game.ts` orchestre, `flight.ts` pilote le vol et la caméra, `combat.ts`
    gère tirs et collisions) et `src/core/input.ts`.
  - La logique métier reste dans le Model, testée sans WebGL. Les controllers ne font que relier les
    morceaux.
- **Tests :** toute règle de jeu ajoutée dans `GameState` ou dans le parcours doit avoir un test Vitest.
- **Constantes de gameplay :** dans `src/config.ts`, pas en dur dans le code.

## Direction artistique (à respecter)

Le jeu suit un dessin de référence : un dragon sombre au-dessus d'une mer de nuages, au coucher du soleil.

- Palette : orange brûlé, or, brun profond. Ombres légèrement pourpres. Aucun bleu, sauf les projectiles
  ennemis, pour qu'ils restent lisibles.
- Grand soleil bas sur l'horizon, devant le dragon. Le dragon est vu de trois quarts arrière, en
  contre-jour.
- Nuages volumineux, sombres au cœur et bordés d'or. Brume atmosphérique sur les montagnes.
- Toute modification visuelle doit être vérifiée par une capture d'écran du jeu, pas seulement par le code.

## Contrôles

Ils sont lus par caractère (`event.key`), donc l'**AZERTY** fonctionne directement :

- **Z Q S D** ou les **flèches** : diriger (W et A sont aussi acceptés pour les claviers QWERTY)
- **Clic** ou **Espace** : cracher le feu
- **Échap** : pause
- **F11** : plein écran (dans l'exe)

## Git

- Ne jamais versionner `node_modules/`, `dist/` ni `release/` (l'exe fait environ 75 Mo).
- Avant chaque push : `npm test` et `npm run build` doivent passer, et aucun secret ne doit être présent.

## Skills installés

Aucun. Les 7 skills Codex demandés par le prompt d'origine (UI UX Pro Max, Design Taste Frontend, GPT
Taste, Humanizer, Impeccable, Stop Design Slop, Graphify) n'ont pas été installés. Ce projet a été développé
avec Claude Code, et leurs sources officielles n'ont pas été vérifiées. Voir `ANALYSE_PROMPT.md`.
