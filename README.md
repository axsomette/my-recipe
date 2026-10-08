# Recettes de saison

Une web app pour noter ses recettes en cochant leurs légumes. Elle calcule à quels mois
chaque recette est de saison en France, puis compose les repas de la semaine en privilégiant
ce qui est de saison ce mois-ci.

Tout reste sur l'appareil : pas de compte, pas de serveur. Une sauvegarde s'exporte et
s'importe en fichier JSON. L'app s'installe sur l'écran d'accueil et fonctionne hors ligne.

> Projet en cours de développement — étapes suivies : maquette ✓, synchro des légumes ✓, squelette ✓,
> écrans recettes ✓, semaine et calendrier, PWA et accessibilité.

En ligne : https://axsomette.github.io/my-recipe/

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
| `src/lib/` | Logique pure et données : types, stockage, routage, calendrier, catalogue |
| `src/components/` | Composants réutilisables (navigation, vignette, icônes) |
| `src/pages/` | Écrans |
| `public/` | `legumes.json`, illustrations, polices auto-hébergées |

Les données de l'utilisateur passent toutes par `src/lib/stockage.ts`, seul module à toucher au
`localStorage`. Elles sont versionnées (`{ version, recettes, legumesPerso, reglages, plannings }`) ;
une évolution du format s'accompagne d'une migration dans ce même fichier.

## Déploiement

Chaque push sur `main` lance `.github/workflows/deploy.yml` : build, puis publication sur GitHub Pages
(source « GitHub Actions » dans *Settings → Pages*). La `base` de Vite vaut `/my-recipe/`, le nom du dépôt.

## Les données de saison

`public/legumes.json` est la seule source de l'app : elle ne contacte aucune API.
Le script `scripts/fetch-legumes.mjs` le régénère à partir de :

- **ADEME — Impact CO₂** : les mois de saison de 76 fruits et légumes
  (`https://impactco2.fr/api/v1/fruitsetlegumes?month=1…12`) ;
- **une liste de base** de 12 produits courants absents de l'ADEME (pomme de terre, aromates…),
  disponibles toute l'année : ils n'entrent pas dans le calcul de saison ;
- **l'Agenda des Chefs METRO** (data.gouv.fr, Licence Ouverte) : 58 autres produits dont les mois
  phares servent seulement de suggestion quand on ajoute un légume perso.

Le fichier n'est réécrit que si les données changent. Si une source répond anormalement,
le script s'arrête sans rien modifier.

### Synchro automatique

L'Action `.github/workflows/sync-legumes.yml` lance le script le 1er de chaque mois
(et à la demande depuis l'onglet Actions), commite le JSON s'il a changé et relance le déploiement.

Clé d'API facultative : l'API ADEME répond sans clé, mais peut couper l'accès anonyme.
Une clé gratuite s'obtient auprès de impactco2@ademe.fr ; l'ajouter dans
*Settings → Secrets and variables → Actions* sous le nom `IMPACTCO2_API_KEY`.

Pièges de l'API vérifiés : le filtre de catégories s'appelle `categories` (le paramètre
`category` de la documentation est ignoré), et il n'existe pas d'appel « tout le catalogue ».

## Illustrations

Les 91 illustrations sont dessinées pour le projet (`scripts/icones-maison/`). Un nouveau produit
sans dessin reçoit le panier générique et la synchro le signale : il faut alors le dessiner en suivant
la [charte des illustrations](design/ILLUSTRATIONS.md).

## Maquette

La maquette validée est la référence visuelle : ouvrir `design/index.html` avec un petit serveur
statique (par exemple `python3 -m http.server --directory design`).

## Licence

Tous droits réservés — voir [LICENSE](LICENSE). Les données de saison restent sous les conditions
de leurs producteurs (ADEME, METRO / Licence Ouverte).
