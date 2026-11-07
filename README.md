# PlayDragon

Un dragon survole une vallée au coucher du soleil, au-dessus d'une mer de nuages. Traverse les anneaux de
lumière et évite les rochers flottants. Au bout du chemin, un château t'attend : réduis-le en cendres avant
que ses tours ne t'abattent.

## Jouer

**Windows :** lance `PlayDragon.exe` (portable, aucune installation). Comme l'exe n'est pas signé, Windows
SmartScreen peut afficher un avertissement : clique sur « Informations complémentaires », puis
« Exécuter quand même ».

| Touche | Action |
|---|---|
| **Z Q S D** ou flèches | Diriger le dragon (clavier AZERTY ; W/A acceptés en QWERTY) |
| **Clic** ou **Espace** | Cracher une boule de feu (vise avec la souris) |
| **Échap** | Pause |
| **F11** | Plein écran |

### Déroulement

1. **Le voyage** (environ 1 minute) : le dragon suit la rivière. Chaque anneau traversé rapporte
   100 points. Les rochers enlèvent 20 points de vie ; tu peux aussi les détruire en tirant dessus.
2. **Le siège** : le château apparaît. **Q / D** pour en faire le tour (le dragon reste face à lui),
   **Z / S** pour monter ou descendre. Ses 6 tours et son donjon tirent des carreaux bleus : esquive-les en
   tournant. Chaque partie du château détruite rapporte 500 points.
3. **La victoire :** quand tout est détruit, les remparts s'effondrent.

## Développer

Il faut Node.js 20 ou plus récent.

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # tests unitaires
npm run dist         # produit release/PlayDragon.exe
```

Les règles du projet, son architecture et les pièges d'installation sont décrits dans
[AGENTS.md](AGENTS.md).

## Technique

- **Three.js**, tout est procédural : aucune image ni aucun modèle 3D externe.
- Ciel en shader, avec soleil et bandes de nuages. Relief en bruit fractal, avec une vallée creusée le long
  de la rivière.
- Nuages peints par bruit, avec ombrage et liseré doré. Dragon généré par tubes à rayon variable. Ailes
  membraneuses déformées à chaque battement.
- Post-traitement : bloom, étalonnage chaud, vignettage, tone mapping ACES.
- **Electron** pour l'exe Windows.
