# Charte des illustrations

Toutes les illustrations de fruits, légumes et aromates sont dessinées pour l'app.
Un nouveau dessin doit suivre ces règles pour rester cohérent avec les 91 existants
(voir `planche-illustrations.png`).

## Règles

- **Format** : SVG, `viewBox="0 0 112 112"`, une illustration par fichier, nommée par l'id du produit
  (`scripts/icones-maison/<id>.svg`, id = nom sans accent ni espace : `chou de Bruxelles` → `choudebruxelles`).
- **Contour** : `#1E3B36`, 4 px, bouts et angles arrondis (`stroke-linecap="round"`, `stroke-linejoin="round"`).
  Détails internes (nervures, rainures) : 2,5 à 3 px, même couleur.
- **Aplats** : couleurs franches, aucun dégradé, aucune ombre portée.
- **Reflet** : un seul trait ou point blanc par volume, en haut à gauche.
- **Cadrage** : le sujet occupe la grille avec une marge de 4 à 8 px ; lisible à 28 px.
- **Composition** : le produit entier, éventuellement avec une tranche ou une feuille ; pas de décor, pas de texte.

## Palette

| Rôle | Couleurs |
|---|---|
| Contour | `#1E3B36` |
| Verts (feuilles, tiges) | `#3F7D4E` `#579660` `#8CC56F` `#AAD681` `#6CC07A` `#9BD47F` |
| Crème, chair claire | `#F4ECE4` `#E8DCB0` `#EFE2B8` |
| Oranges | `#F08A24` `#EF7D3A` `#F39A2B` `#F6A03A` |
| Rouges | `#E5443F` `#E5543F` `#C8243A` `#D6455A` |
| Jaunes | `#F5D547` `#F2B33D` `#F2CF4A` |
| Violets | `#7B4B8F` `#5B2D6B` `#9A6AA8` `#6B3A6B` |
| Bruns, coques | `#8A4B2A` `#B5763A` `#C9A46A` `#E3B779` |
| Lien, ficelle | `#E07B53` |

## Illustrations génériques

- `panier` : produit inconnu (légume ou fruit) ;
- `herbe` : aromate inconnu ;
- `champignon` : champignons (cèpe, girolle, truffe).

Un produit sans dessin dédié reçoit l'illustration la plus proche (table `CORRESPONDANCES`
du script de synchro, puis id contenu dans le nom), sinon la générique de sa catégorie.
