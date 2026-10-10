# Mémoire du projet « Recettes de saison »

Lu au début de chaque session. Le fonctionnement détaillé de l'app est dans `README.md` ;
ce fichier garde ce que le README ne dit pas : nos règles de travail, où sont les choses, et l'historique.

## Règles de travail (demandées par Lucas)

1. **Maquette d'abord.** Pour toute nouvelle fonctionnalité ou tout changement visible : proposer une
   maquette dans le canvas Claude Design (et dans `design/`), puis **attendre la validation**.
2. **Ensuite seulement** : coder, vérifier, puis pousser sur `main` (ce qui met en ligne).
3. Pendant la proposition, le travail vit sur une branche `claude/<sujet>` poussée sur GitHub ;
   après validation, fusion en avance rapide dans `main` et push.
4. Après chaque mise en ligne, vérifier le déploiement (Actions › « Déploiement GitHub Pages »).
5. Chaque mise à jour visible s'annonce dans « Quoi de neuf » : ajouter une entrée **en tête** de
   `VERSIONS` dans `src/lib/nouveautes.ts` (date, résumé, une à trois nouveautés). Préparer ce texte
   avec la maquette, pour qu'il soit validé en même temps.
6. Tout est écrit en français : code, commentaires, commits et interface.

## Où sont les choses

- **App en ligne** : GitHub Pages, base `/my-recipe/` (dépôt `axsomette/my-recipe`).
- **Maquette Claude Design** (canvas, référence visuelle) : https://claude.ai/artifact/Uwq2ADAMtLRsKewZpvBgpR
  - Ses fichiers sont sous `project/` : `canvas.json` (index des planches) et une planche `.dc.html` par écran,
    plus `rs.css`, `icons/` et `icones/`. Le dossier `design/` du dépôt en est une copie identique :
    modifier les deux ensemble.
  - Rangées : Design system / Identité, Téléphone (6 écrans), États et sombre, Tablette, Nouveautés.
- **Illustrations** : `scripts/icones-maison/<id>.svg` (sources), copiées dans `public/legumes/icones/` et
  `design/icons/`. Charte : `design/ILLUSTRATIONS.md`. 163 illustrations ; planche : `design/planche-illustrations.png`.
- **Catalogue** : `public/legumes.json`, régénéré par `npm run sync:legumes` (`scripts/fetch-legumes.mjs`),
  et chaque 1er du mois par l'Action « Synchro des légumes » (lançable à la main).
- **Vérifications** : `npm run verifier` (113 contrôles), `npm run typecheck`, `npm run build`.

## Pièges connus

- **Environnement cloud** : le proxy bloque `data.gouv.fr` et `static.data.gouv.fr` (pas `raw.githubusercontent.com`).
  La synchro ne peut donc pas tourner en entier ici : lire METRO avec le connecteur data.gouv (MCP), ou lancer
  l'Action « Synchro des légumes » sur GitHub et lire son journal. Node a besoin de `NODE_USE_ENV_PROXY=1`
  et `NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt` pour passer par le proxy.
- **METRO** : version JSON pour les suggestions de fruits et légumes, version CSV pour les poissons
  (colonnes `category_fr`, `product_fr`, `month_count`, `jan`…`dec`). Si le CSV devient illisible,
  la synchro garde les poissons déjà connus et l'écrit en avertissement dans l'Action.
- `pkill -f <motif>` dans une commande qui contient elle-même le motif tue le shell : l'éviter.
- Sauvegarde utilisateur versionnée (version 3) : tout nouveau champ = migration dans `src/lib/stockage.ts`
  et vérification dans `scripts/verifier/index.mts`.

## Historique

- **8 oct. 2026** : maquette validée et charte ; squelette Vite + Preact + Tailwind ; recettes et calcul de saison ;
  semaine, calendrier, réglages ; hors connexion et accessibilité ; données ADEME lues dans leur dépôt ;
  logo « la feuille du mois » et écran de lancement animé.
- **9 oct. 2026** : choix de l'apparence ; garde-manger illustré (viandes, poissons, crèmerie, féculents) ;
  jamais de recette hors saison d'office ; équilibre de la semaine (types, limites) et repas pris dehors ;
  sauvegarde v2 ; semaine en deux colonnes sur grand écran.
- **10 oct. 2026** :
  - 41 nouveaux produits dessinés : 9 viandes (dinde, canard, veau, lapin, pintade, steak haché, merguez,
    chorizo, boudin noir) et 32 poissons et fruits de mer. 26 poissons ont leurs mois de saison (Agenda METRO,
    CSV) et comptent dans le calcul et le calendrier ; Saint-Jacques : pêche fermée du 15 mai au 30 sept.
    Catalogue : 160 produits.
  - Idées de saison : carnet de 135 plats (`src/lib/idees.ts`) ; fenêtre qui complète les repas vides
    (ou dès le premier lancement), choisie selon la saison, les limites et la variété.
  - Fenêtre « Quoi de neuf » après une mise à jour + Réglages › L'app (historique) ; sauvegarde v3 (`nouveautesVue`).
  - Synchro METRO vérifiée sur GitHub : CSV bien lu, données identiques.

## Pistes proposées, pas encore faites

- Liste de courses générée depuis la semaine (regroupée par rayon, à cocher).
- Recettes plus complètes : quantités et nombre de personnes, étapes, temps, lien vers la source.
- Partage entre appareils ou dans le foyer (aujourd'hui : export et import JSON).
- Favoris, « déjà cuisiné le… ».
