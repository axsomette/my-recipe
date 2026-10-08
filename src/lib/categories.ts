import type { CategorieId } from './types';

/** Ordre d'affichage des catégories (sélecteur, calendrier, validation des sauvegardes). */
export const ORDRE_CATEGORIES: CategorieId[] = ['legumes', 'fruits', 'herbes', 'tubercules', 'fruits-a-coque', 'cereales'];

export const NOMS_CATEGORIES: Record<CategorieId, string> = {
  legumes: 'Légumes',
  fruits: 'Fruits',
  herbes: 'Herbes et aromates',
  tubercules: 'Pommes de terre et tubercules',
  'fruits-a-coque': 'Fruits à coque',
  cereales: 'Céréales',
};

/** Libellés courts, pour les filtres. */
export const NOMS_COURTS_CATEGORIES: Record<CategorieId, string> = {
  legumes: 'Légumes',
  fruits: 'Fruits',
  herbes: 'Herbes',
  tubercules: 'Tubercules',
  'fruits-a-coque': 'Fruits à coque',
  cereales: 'Céréales',
};
