// Modèle de données de l'app (voir le brief et public/legumes.json).

/** Mois de 1 (janvier) à 12 (décembre). */
export type Mois = number;

export type CategorieId = 'legumes' | 'fruits' | 'herbes' | 'tubercules' | 'fruits-a-coque' | 'cereales';

export interface Legume {
  id: string;
  nom: string;
  categorie: CategorieId;
  mois: Mois[];
  source: 'ademe' | 'base' | 'perso';
  /** Disponible toute l'année : exclu du calcul de saison. */
  touteLannee: boolean;
  /** Chemin relatif à la base du site, ex. `legumes/icones/potiron.svg`. */
  icone: string;
}

/** Produit connu de l'Agenda des Chefs METRO, proposé à l'ajout d'un légume perso. */
export interface Suggestion {
  id: string;
  nom: string;
  categorie: CategorieId;
  mois: Mois[];
  icone: string;
}

export interface Catalogue {
  majLe: string;
  version: number;
  sources: { id: string; nom: string; url: string; licence?: string; usage: string }[];
  legumes: Legume[];
  suggestions: Suggestion[];
  /** Nom (sans accent) → id de l'illustration à reprendre, ex. potimarron → potiron. */
  correspondances: Record<string, string>;
}

export interface Recette {
  id: string;
  nom: string;
  /** Ids des légumes (catalogue ou perso). */
  legumes: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
  /** 12 scores entre 0 et 1, ou null si aucun légume saisonnier (recette « toutes saisons »). */
  scoreParMois: number[] | null;
}

export type Moment = 'midi' | 'soir';

export interface Reglages {
  /** Nombre de jours planifiés, à partir du lundi (1 à 7). */
  jours: number;
  moments: Moment[];
}

export interface Slot {
  /** 0 = lundi … 6 = dimanche. */
  jour: number;
  moment: Moment;
  recetteId: string | null;
  verrouille: boolean;
}

export interface Planning {
  /** Semaine ISO, ex. `2026-W41`. */
  semaine: string;
  slots: Slot[];
}

export interface Donnees {
  version: number;
  recettes: Recette[];
  legumesPerso: Legume[];
  reglages: Reglages;
  /** Semaine en cours et précédente (pour éviter de reproposer les mêmes recettes). */
  plannings: Planning[];
  /** Date ISO du dernier export, pour le rappel dans les réglages. */
  dernierExport: string | null;
}
