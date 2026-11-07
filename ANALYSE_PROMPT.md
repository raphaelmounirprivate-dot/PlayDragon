# Analyse du prompt Codex (« projet Math ») appliqué à PlayDragon

## Verdict

**Le prompt n'est pas adapté tel quel à PlayDragon.** Il a été écrit pour un autre projet : une application
web d'apprentissage des maths (leçons, exercices, corrections, progression en base) déployée sur Vercel sous
le nom « Math ». PlayDragon est un jeu 3D hors ligne, livré sous forme de `.exe` Windows.

Ses **règles de développement** (KISS, séparation des responsabilités, clean code, MVC, tests, hygiène Git)
restent pertinentes et ont été appliquées. La **stack serveur**, le **déploiement Vercel** et les **tests
post-déploiement** ne le sont pas pour ce jeu.

## Analyse section par section

| § | Exigence du prompt | Pertinence pour PlayDragon | Décision |
|---|---|---|---|
| 1 | TypeScript partout | ✅ Pertinent | Appliqué : 100 % TypeScript (jeu, tests, config). |
| 1 | Serveur NestJS | ❌ Aucun besoin de serveur : le jeu tourne hors ligne dans l'exe | Non utilisé. En ajouter un violerait la règle KISS du même prompt. |
| 1 | PostgreSQL | ❌ Rien à persister (ni comptes, ni progression) | Non utilisé. À reconsidérer seulement pour un classement en ligne (voir plus bas). |
| 1 | Visible sur `http://localhost:<port>` | ✅ Utile pour développer | `npm run dev` → **http://localhost:5173**. Le `<port>` du prompt n'était pas rempli. |
| 2 | KISS, responsabilités, clean code | ✅ Pertinent | Appliqué (un fichier = un rôle, pas de code mort, commentaires utiles seulement). |
| 2 | MVC (Controllers NestJS, services) | ⚠️ Partiellement : pas de NestJS dans un jeu | Adapté : Model = `src/logic` + `src/world/flightPath.ts` ; View = `src/world`, `src/entities`, `src/fx`, `src/render`, `src/ui` ; Controller = `src/game`, `src/core/input.ts`. |
| 3 | 7 skills Codex (UI UX Pro Max, Design Taste Frontend, GPT Taste, Humanizer, Impeccable, Stop Design Slop, Graphify) | ⚠️ Spécifique à l'outil Codex, pas au projet | **Non installés.** Ce travail a été fait avec Claude Code, pas Codex. Les sources n'ont pas été recherchées ni vérifiées ; aucun lien n'est inventé. Plusieurs noms sont ambigus (« GPT Taste »), et 5 des 7 couvrent le même sujet (goût visuel / anti-« slop »). |
| 4 | Tests unitaires des services | ✅ Pertinent | 10 tests Vitest : règles du jeu (`GameState`) et géométrie du parcours. |
| 4 | Tests e2e des endpoints | ❌ Pas d'endpoint | Remplacé par des parties complètes jouées automatiquement dans Electron, avec captures d'écran (voyage → siège → victoire / défaite). |
| 5 | Dépôt GitHub privé, pas de secrets, `.env` ignoré | ✅ Pertinent | Dépôt `PlayDragon`. `.env` est dans `.gitignore`. Pas de `.env.example` : le projet n'a aucune variable d'environnement. |
| 6 | Projet Vercel « Math », NestJS serverless, Neon/Supabase | ❌ Un `.exe` ne se déploie pas sur Vercel | Non fait. Possible plus tard : publier la version web (build Vite statique) sur Vercel gratuitement. Cela demande ton autorisation sur ton compte. |
| 7 | Tester leçons, exercices, corrections, progression | ❌ Concerne l'app Math | Sans objet. |
| 8 | Livrables (liens GitHub, Vercel, localhost, skills) | ⚠️ À adapter | Livré : dépôt GitHub, `release/PlayDragon.exe`, http://localhost:5173. |

## Défauts du prompt d'origine

1. **Mauvais projet.** Le prompt décrit un site de maths. Il ne dit rien du jeu : le dragon, la vallée, le
   château à détruire, l'ambiance du dessin de référence ni le livrable `.exe`.
2. **Variables non remplies.** `<port>` et `<NOM_DU_DEPOT>` sont restés tels quels.
3. **Stack imposée sans besoin.** Imposer NestJS et PostgreSQL à un projet qui n'a pas de backend contredit
   la règle KISS du même document.
4. **Skills redondants ou mal identifiés.** Sept skills de design et d'écriture, dont plusieurs font la même
   chose, et certains noms sont introuvables sans ambiguïté.
5. **Aucun critère de qualité visuelle.** Pour un jeu, le cahier des charges important est la direction
   artistique et le gameplay, pas les endpoints.

## Prompt adapté proposé pour PlayDragon

> Tu es mon agent de développement. Mets à jour `AGENTS.md`, puis applique-le.
>
> **Projet :** PlayDragon, un jeu 3D en TypeScript (Three.js + Vite), packagé en `.exe` Windows portable
> (Electron). Un dragon survole une vallée au coucher du soleil, au-dessus d'une mer de nuages. Au bout du
> chemin apparaît un château qu'il faut détruire en crachant du feu.
>
> **Direction artistique :** respecter la qualité du dessin de référence : ciel orange et or, grand soleil
> bas sur l'horizon, nuages volumineux bordés d'or, montagnes dans la brume, rivière lumineuse, dragon
> sombre aux ailes membraneuses en contre-jour.
>
> **Contrôles :** clavier AZERTY (Z Q S D) et flèches ; souris ou Espace pour le feu ; Échap pour la pause.
>
> **Règles :** KISS, séparation des responsabilités, clean code, logique de jeu pure et testée (Vitest).
>
> **Local :** `npm run dev` sur http://localhost:5173. **Exe :** `npm run dist` → `release/PlayDragon.exe`.
>
> **GitHub :** dépôt `PlayDragon`. Avant chaque push : tests verts, aucun secret, pas de binaire versionné.
>
> **Hors périmètre :** serveur, base de données, Vercel (sauf demande explicite, par exemple pour un
> classement en ligne).

## Si un backend devient utile un jour

La stack du prompt (NestJS + PostgreSQL) se justifierait pour un **classement en ligne des meilleurs
scores**. Dans ce cas : une API NestJS (`POST /scores`, `GET /scores/top`), PostgreSQL gratuit (Neon), le
jeu qui envoie le score en fin de partie, et les tests e2e du prompt qui redeviennent pertinents.
