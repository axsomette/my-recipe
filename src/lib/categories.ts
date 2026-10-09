import type { CategorieId } from './types';

/** Ordre d'affichage des catégories (sélecteur, calendrier, validation des sauvegardes). */
export const ORDRE_CATEGORIES: CategorieId[] = [
  'legumes', 'fruits', 'herbes', 'tubercules', 'fruits-a-coque', 'cereales',
  'viandes', 'poissons', 'cremerie', 'feculents', 'epicerie',
];

/** Garde-manger : disponible toute l'année, hors du calendrier des saisons (on n'y invente aucun mois). */
export const GARDE_MANGER: CategorieId[] = ['viandes', 'poissons', 'cremerie', 'feculents', 'epicerie'];
export const estDuGardeManger = (categorie: CategorieId) => GARDE_MANGER.includes(categorie);

export const NOMS_CATEGORIES: Record<CategorieId, string> = {
  legumes: 'Légumes',
  fruits: 'Fruits',
  herbes: 'Herbes et aromates',
  tubercules: 'Pommes de terre et tubercules',
  'fruits-a-coque': 'Fruits à coque',
  cereales: 'Céréales',
  viandes: 'Viandes',
  poissons: 'Poissons et fruits de mer',
  cremerie: 'Œufs et crèmerie',
  feculents: 'Pâtes, riz, pain et légumineuses',
  epicerie: 'Épicerie',
};

/** Libellés courts, pour les filtres. */
export const NOMS_COURTS_CATEGORIES: Record<CategorieId, string> = {
  legumes: 'Légumes',
  fruits: 'Fruits',
  herbes: 'Herbes',
  tubercules: 'Tubercules',
  'fruits-a-coque': 'Fruits à coque',
  cereales: 'Céréales',
  viandes: 'Viandes',
  poissons: 'Poissons',
  cremerie: 'Crèmerie',
  feculents: 'Féculents',
  epicerie: 'Épicerie',
};
