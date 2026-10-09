// Équilibre de la semaine : type de chaque recette (déduit de ses ingrédients) et limites par type.
import type { CategorieId, Legume, Recette, Reglages, TypeLimite } from './types';

export type TypeRepas = TypeLimite | 'vege';

/** Ordre et libellés d'affichage. */
export const TYPES_REPAS: TypeRepas[] = ['viande', 'poisson', 'feculents', 'vege'];
export const NOMS_TYPES: Record<TypeRepas, string> = { viande: 'Viande', poisson: 'Poisson', feculents: 'Féculents', vege: 'Végé' };
/** Illustrations maison qui représentent chaque type. */
export const ICONES_TYPES: Record<TypeRepas, string> = {
  viande: 'legumes/icones/boeuf.svg',
  poisson: 'legumes/icones/cabillaud.svg',
  feculents: 'legumes/icones/pates.svg',
  vege: 'legumes/icones/laitue.svg',
};

// Les pommes de terre et autres tubercules comptent comme féculents.
const CATEGORIES: Partial<Record<CategorieId, TypeLimite>> = { viandes: 'viande', poissons: 'poisson', feculents: 'feculents', tubercules: 'feculents' };

/** Types d'une recette : viande, poisson, féculents, et « végé » quand il n'y a ni viande ni poisson. */
export function typesRecette(recette: Recette, index: Map<string, Legume>): TypeRepas[] {
  const types = new Set<TypeRepas>();
  for (const id of recette.legumes) {
    const type = CATEGORIES[index.get(id)?.categorie as CategorieId];
    if (type) types.add(type);
  }
  if (!types.has('viande') && !types.has('poisson')) types.add('vege');
  return TYPES_REPAS.filter((t) => types.has(t));
}

export type Compte = Record<TypeRepas, number>;
export const compteVide = (): Compte => ({ viande: 0, poisson: 0, feculents: 0, vege: 0 });

/** Nombre de repas de chaque type parmi des recettes (une recette peut compter pour plusieurs types). */
export function compter(ids: (string | null)[], typesDe: (id: string) => TypeRepas[]): Compte {
  const compte = compteVide();
  for (const id of ids) if (id) for (const t of typesDe(id)) compte[t]++;
  return compte;
}

/** Vrai si ajouter cette recette ferait dépasser une limite. */
export function depasse(compte: Compte, types: TypeRepas[], limites: Reglages['limites']): boolean {
  return types.some((t) => t !== 'vege' && limites[t] !== null && compte[t] + 1 > limites[t]!);
}

export const ajouter = (compte: Compte, types: TypeRepas[]) => {
  for (const t of types) compte[t]++;
};
