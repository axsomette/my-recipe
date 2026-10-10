# Recettes de saison

Une web app pour noter ses recettes en cochant leurs légumes. Elle calcule à quels mois
chaque recette est de saison en France, puis compose les repas de la semaine en privilégiant
ce qui est de saison ce mois-ci.

Tout reste sur l'appareil : pas de compte, pas de serveur. Une sauvegarde s'exporte et
s'importe en fichier JSON. L'app s'installe sur l'écran d'accueil et fonctionne hors ligne.

## Ce que fait l'app

- **Ma semaine** : les repas de la semaine (jours et moments réglables), générés en privilégiant
  les recettes de saison ce mois-ci ; on garde un repas, on en change un seul, on régénère le reste.
  Une recette hors saison n'est jamais placée d'office : s'il en manque, une fenêtre propose des
  recettes hors saison à cocher, ou d'en ajouter une nouvelle qui va directement dans la semaine.
  Chaque recette a un type déduit de ses ingrédients (viande, poisson, féculents, végé) : la semaine
  affiche son bilan et respecte les limites choisies (« viande au plus 3 fois »). Les repas pris
  dehors, habituels ou pour une fois, restent libres.
- **Idées de saison** : quand des repas restent vides, ou dès le premier lancement, une fenêtre
  propose des idées de recettes pleinement de saison ce mois-ci, faites avec les produits de l'app.
  Celles qu'on coche rejoignent le carnet et remplissent les repas vides.
- **Mes recettes** : recherche par recette ou par ingrédient, filtre par mois de saison, fiche avec la
  frise des 12 mois.
- **Ajout d'une recette** : sélection rapide parmi 160 produits (légumes cités dans le nom, produits du
  mois, catégories, recherche) et légumes perso, avec la saison calculée en direct.
- **Calendrier des saisons** : ce qui est de saison, mois par mois, poissons et fruits de mer compris.
- **Réglages** : repas à générer, repas pris dehors, équilibre de la semaine, apparence (automatique, clair ou sombre), export et import de la sauvegarde, rappel d'installation.

### Calcul de saison

Pour chaque mois, le score d'une recette est la part de ses légumes saisonniers qui sont de saison
ce mois-là (`src/lib/saison.ts`). Les produits disponibles toute l'année n'entrent pas dans le calcul ;
une recette sans légume saisonnier est « toutes saisons » et sert de joker au planning. Le libellé
(« de septembre à décembre ») est déduit des mois où le score atteint 0,75. Le score est recalculé
à chaque enregistrement et stocké avec la recette.

### Générateur de semaine

`src/lib/planning.ts` classe les recettes pour le mois en cours : de saison, puis en partie de saison,
puis jokers, puis hors saison. Dans chaque groupe, les recettes de la semaine précédente passent
après les autres, et les recettes de score proche sont mélangées pour varier. Pas de doublon dans la
semaine ; s'il manque des recettes, l'écran le dit et propose des idées de saison, d'en ajouter ou de
prévoir moins de repas.

### Idées de saison

`src/lib/idees.ts` contient un carnet de 135 idées de plats, écrites avec les seuls ids du catalogue.
Pour le mois en cours, il ne garde que celles qui sont pleinement de saison (score ≥ 0,75), absentes
des recettes et compatibles avec les limites de la semaine. Celles dont un produit vit son dernier mois
passent d'abord ; le choix alterne viande, poisson et végé, et évite de montrer deux fois le même produit
de saison. « Autres idées » en propose de nouvelles. Chaque mois en compte au moins 35.

## Installation

Node.js 22 ou plus récent.

```bash
npm install
npm run dev
```

L'app s'ouvre sur http://localhost:5173/my-recipe/.

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Vérifie les types puis construit le site dans `dist/` |
| `npm run preview` | Sert le build de `dist/` en local |
| `npm run typecheck` | Vérifie les types TypeScript |
| `npm run verifier` | Vérifie les fonctions pures (saison, routage, stockage…) sans framework de test |
| `npm run sync:legumes` | Met à jour `public/legumes.json` et les illustrations |

## Stack

Vite, Preact, Tailwind CSS et TypeScript, sans autre dépendance. Pas de routeur ni de bibliothèque
d'état : le routage par hash (`#/semaine`, `#/recettes`…) tient dans `src/lib/routeur.ts`, car GitHub Pages
ne sait pas renvoyer `index.html` pour une URL inconnue.

| Dossier | Contenu |
|---|---|
| `src/lib/` | Logique pure et données : types, stockage, routage, calendrier, saison, planning, sauvegarde |
| `src/components/` | Composants réutilisables : carte recette, chip légume, frise 12 mois, badge saison, fenêtres, navigation |
| `src/pages/` | Écrans |
| `public/` | `legumes.json`, illustrations, icônes, manifeste, service worker, polices auto-hébergées |
| `scripts/` | Synchro des légumes, illustrations sources, vérifications |
| `design/` | Maquette de référence et charte des illustrations |

Les données de l'utilisateur passent toutes par `src/lib/stockage.ts`, seul module à toucher au
`localStorage` (lectures et écritures protégées). Elles sont versionnées
(`{ version, recettes, legumesPerso, reglages, plannings, dernierExport }`) ; une évolution du format
s'accompagne d'une migration dans ce même fichier. Des données illisibles sont mises de côté plutôt
qu'écrasées. L'export télécharge `recettes-de-saison-AAAA-MM-JJ.json` ; l'import valide le fichier à la
main (sans bibliothèque de schéma), puis fusionne (la version la plus récente de chaque recette gagne)
ou remplace.

## Hors connexion et installation

`public/sw.js` est un service worker écrit à la main. À l'installation, il lit `index.html` pour
retrouver les fichiers du build, puis met en cache ces fichiers, `legumes.json`, les illustrations,
les polices et les icônes. Les pages passent par le réseau puis le cache ; `legumes.json` est servi depuis
le cache et rafraîchi en arrière-plan. `vite.config.ts` donne au service worker une version unique à
chaque build : un déploiement remplace l'ancien cache. Le manifeste (`public/manifest.webmanifest`)
et les icônes rendent l'app installable sur iPhone (Partager › Sur l'écran d'accueil) et Android.
Installée, l'app échappe à l'effacement des données de Safari après 7 jours sans visite.

## Qualité

- Lighthouse mobile (build de production) : performance 98 à 100, accessibilité 100,
  bonnes pratiques 100 sur les quatre écrans principaux.
- Non référencé : la page demande aux moteurs de recherche de ne pas l'indexer (`noindex`).
- Accessibilité : contrastes AA en clair et en sombre pour les quatre saisons, cibles tactiles de 44 px,
  navigation au clavier, focus visible et replacé à chaque écran, fenêtres en `<dialog>` natif,
  graphiques décrits pour les lecteurs d'écran, animations coupées si l'appareil le demande,
  mise en page sans défilement horizontal à 320 px.
- `npm run verifier` : 102 vérifications des fonctions pures, du catalogue et du carnet d'idées.

## Déploiement

Chaque push sur `main` lance `.github/workflows/deploy.yml` : build, puis publication sur GitHub Pages
(source « GitHub Actions » dans *Settings → Pages*). La `base` de Vite vaut `/my-recipe/`, le nom du dépôt.

## Les données de saison

`public/legumes.json` est la seule source de l'app : elle ne contacte aucune API.
Le script `scripts/fetch-legumes.mjs` le régénère à partir de :

- **ADEME — Impact CO₂** : les mois de saison de 76 fruits et légumes, lus directement dans le dépôt
  open source de l'ADEME ([incubateur-ademe/impactco2](https://github.com/incubateur-ademe/impactco2),
  licence MIT) — la source même de leur API, sans clé, sans compte, sans demande à faire ;
- **l'Agenda des Chefs METRO** (data.gouv.fr, Licence Ouverte) : les mois de saison de 26 poissons et
  fruits de mer (sardine, bar, sole, langoustine…), lus dans la version CSV ; ceux qui ne sont pas
  disponibles toute l'année entrent dans le calcul de saison et le calendrier. Si cette ressource
  devient illisible, la synchro garde les poissons déjà connus et le signale. Le même jeu de données
  (version JSON) donne aussi les mois phares de 58 autres fruits et légumes, qui servent seulement de
  suggestion quand on ajoute un légume perso ;
- **une liste de base** de 58 produits absents des deux sources, disponibles toute l'année et donc hors
  du calcul de saison : pomme de terre et aromates, et le garde-manger (viandes, poissons courants
  comme le saumon ou le maquereau, œufs et crèmerie, pâtes, riz, pain et légumineuses, épicerie), qui
  n'apparaît pas dans le calendrier des saisons. Seule exception : la Saint-Jacques, dont la pêche est
  fermée du 15 mai au 30 septembre.

Le fichier n'est réécrit que si les données changent. Si une source répond anormalement,
le script s'arrête sans rien modifier.

### Synchro automatique

L'Action `.github/workflows/sync-legumes.yml` lance le script le 1er de chaque mois
(et à la demande depuis l'onglet Actions), commite le JSON s'il a changé et relance le déploiement.

Aucune clé ni aucun secret n'est nécessaire : toutes les sources sont publiques et ouvertes.

## Illustrations

Les 163 illustrations sont dessinées pour le projet (`scripts/icones-maison/`). Un nouveau produit
sans dessin reçoit le panier générique et la synchro le signale : il faut alors le dessiner en suivant
la [charte des illustrations](design/ILLUSTRATIONS.md).

## Icône et écran de lancement

L'emblème est « la feuille du mois » : une page d'éphéméride dont le bandeau prend la couleur de la
saison, avec le produit de saison servi dans un bol (poireau, asperge, tomate, potiron). L'icône
d'écran d'accueil garde la tomate d'été, la plus lisible en petit ; dans l'app, la feuille suit la
saison (rail sur tablette, écran de lancement).

Tout sort de `scripts/dessiner-logo.mjs`, à partir des illustrations de `scripts/icones-maison/` :
les SVG de `public/icones/` et le bloc de l'écran de lancement dans `index.html` (entre les repères
`logo:debut` et `logo:fin`). Après une modification, régénérer puis rendre les PNG depuis `app.svg`
et `app-adaptable.svg` (512 px, puis 192 et 180 px pour Android et iPhone) :

```bash
node scripts/dessiner-logo.mjs
```

L'écran de lancement, écrit dans `index.html` pour s'afficher avant le JavaScript, empile les quatre
pages de l'année : les trois autres saisons se tournent sur leurs anneaux, trois produits de la saison
en cours tombent dans le bol, puis le titre arrive lettre par lettre avec un rebond. Il couvre le
chargement des légumes et des polices (1,6 s au plus tôt, 4 s au plus tard) et reste immobile si
l'appareil demande de réduire les animations, comme toutes les animations de l'app. La même
chronologie, générée par le script, tourne en boucle dans la maquette (`design/Lancement.dc.html`).

## Maquette

La maquette validée est la référence visuelle : ouvrir `design/index.html` avec un petit serveur
statique (par exemple `python3 -m http.server --directory design`).

## Licence

Tous droits réservés — voir [LICENSE](LICENSE). Les données de saison restent sous les conditions
de leurs producteurs (ADEME, METRO / Licence Ouverte).
