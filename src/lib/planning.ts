// Générateur de semaine : fonctions pures (le hasard est injecté pour pouvoir le tester).
//
// Ordre de préférence des recettes, pour le mois en cours :
//   1. de saison (score ≥ 0,75), 2. en partie de saison, 3. jokers « toutes saisons ».
// Les recettes hors saison ne sont jamais placées d'office : elles sont proposées à part
// (propositionsHorsSaison) et c'est la personne qui choisit de s'en servir.
// Les repas pris dehors restent vides, et les limites par type (viande, poisson, féculents)
// écartent une recette qui ferait dépasser le nombre choisi pour la semaine.
// Dans chaque groupe, les recettes de la semaine précédente passent après les autres,
// puis on mélange les recettes de score proche (par tranches de 0,25) pour varier.
import { semaineIso } from './calendrier';
import { ajouter, compter, depasse, type TypeRepas } from './equilibre';
import { niveauSaison, type NiveauSaison } from './saison';
import type { Creneau, Moment, Planning, Recette, Reglages, Slot } from './types';

export type Aleatoire = () => number;

const RANG: Record<NiveauSaison, number> = { pleine: 0, partie: 1, toutes: 2, hors: 3 };
const ORDRE_MOMENTS: Moment[] = ['midi', 'soir'];

/** Créneaux attendus selon les réglages : lundi midi, lundi soir, mardi midi… */
export function creneaux(reglages: Pick<Reglages, 'jours' | 'moments'>): Creneau[] {
  const moments = ORDRE_MOMENTS.filter((m) => reglages.moments.includes(m));
  return Array.from({ length: reglages.jours }, (_, jour) => moments.map((moment) => ({ jour, moment }))).flat();
}

const memeCreneau = (a: Creneau, b: Creneau) => a.jour === b.jour && a.moment === b.moment;

/** Repas pris dehors : choix fait pour ce repas cette semaine, sinon l'habitude des réglages. */
export const estDehors = (slot: Creneau & { dehors?: boolean | null }, reglages: Pick<Reglages, 'dehors'>) =>
  slot.dehors ?? reglages.dehors.some((d) => memeCreneau(d, slot));

const sansTypes = (): TypeRepas[] => [];

/** Mélange de Fisher-Yates (copie). */
function melanger<T>(liste: T[], aleatoire: Aleatoire): T[] {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(aleatoire() * (i + 1));
    [copie[i], copie[j]] = [copie[j]!, copie[i]!];
  }
  return copie;
}

/** Recettes classées de la plus à la moins indiquée ce mois-ci. */
export function classer(recettes: Recette[], mois: number, dejaServies: Set<string>, aleatoire: Aleatoire): Recette[] {
  const cle = (r: Recette) => {
    const tranche = r.scoreParMois ? Math.round((r.scoreParMois[mois - 1] ?? 0) * 4) / 4 : 0;
    return [RANG[niveauSaison(r.scoreParMois, mois)], dejaServies.has(r.id) ? 1 : 0, -tranche] as const;
  };
  // Le mélange préalable départage au hasard les recettes de même clé (tri stable).
  return melanger(recettes, aleatoire).sort((a, b) => {
    const [ka, kb] = [cle(a), cle(b)];
    return ka[0] - kb[0] || ka[1] - kb[1] || ka[2] - kb[2];
  });
}

export interface ContexteGeneration {
  recettes: Recette[];
  reglages: Reglages;
  mois: number;
  semaine: string;
  /** Planning déjà enregistré pour cette semaine : ses repas gardés sont conservés. */
  actuel?: Planning;
  /** Planning de la semaine précédente, pour éviter de reproposer les mêmes recettes. */
  precedent?: Planning;
  /** Types d'une recette (viande, poisson…), pour les limites des réglages. Sans elle, pas de limite. */
  typesDe?: (id: string) => TypeRepas[];
  aleatoire?: Aleatoire;
}

export interface Generation {
  planning: Planning;
  /** Nombre de repas laissés vides faute de recettes de saison ou toutes saisons. */
  manquants: number;
  /** Recettes de saison restées de côté parce qu'elles feraient dépasser une limite. */
  ecartees: number;
}

const horsSaison = (r: Recette, mois: number) => niveauSaison(r.scoreParMois, mois) === 'hors';
const idsDe = (slots: Slot[]) => new Set(slots.flatMap((s) => (s.recetteId ? [s.recetteId] : [])));

export function genererSemaine({ recettes, reglages, mois, semaine, actuel, precedent, typesDe = sansTypes, aleatoire = Math.random }: ContexteGeneration): Generation {
  const existantes = new Set(recettes.map((r) => r.id));
  const avant = (c: Creneau) => actuel?.slots.find((s) => memeCreneau(s, c));
  const gardes = (actuel?.slots ?? []).filter((s) => s.verrouille && s.recetteId && existantes.has(s.recetteId) && !estDehors(s, reglages));
  const prises = new Set(gardes.map((s) => s.recetteId!));
  const dejaServies = idsDe(precedent?.slots ?? []);
  const disponibles = classer(recettes.filter((r) => !prises.has(r.id) && !horsSaison(r, mois)), mois, dejaServies, aleatoire);
  const compte = compter([...prises], typesDe);

  let manquants = 0;
  const slots: Slot[] = creneaux(reglages).map((c) => {
    const dehors = avant(c)?.dehors ?? null;
    if (estDehors({ ...c, dehors }, reglages)) return { ...c, recetteId: null, verrouille: false, dehors };
    const garde = gardes.find((g) => memeCreneau(g, c));
    if (garde) return { ...c, recetteId: garde.recetteId, verrouille: true, dehors };
    const i = disponibles.findIndex((r) => !depasse(compte, typesDe(r.id), reglages.limites));
    if (i < 0) {
      manquants++;
      return { ...c, recetteId: null, verrouille: false, dehors };
    }
    const [recette] = disponibles.splice(i, 1);
    ajouter(compte, typesDe(recette!.id));
    return { ...c, recetteId: recette!.id, verrouille: false, dehors };
  });
  const ecartees = manquants > 0 ? disponibles.filter((r) => depasse(compte, typesDe(r.id), reglages.limites)).length : 0;
  return { planning: { semaine, slots }, manquants, ecartees };
}

/** Recettes hors saison qui pourraient compléter la semaine sans dépasser les limites, de la plus à la moins indiquée. */
export function propositionsHorsSaison(
  planning: Planning,
  { recettes, reglages, mois, precedent, typesDe = sansTypes, aleatoire = Math.random }: Pick<ContexteGeneration, 'recettes' | 'reglages' | 'mois' | 'precedent' | 'typesDe' | 'aleatoire'>,
): Recette[] {
  const dansLaSemaine = idsDe(planning.slots);
  const compte = compter([...dansLaSemaine], typesDe);
  const candidates = classer(recettes.filter((r) => !dansLaSemaine.has(r.id) && horsSaison(r, mois)), mois, idsDe(precedent?.slots ?? []), aleatoire);
  return candidates.filter((r) => {
    if (depasse(compte, typesDe(r.id), reglages.limites)) return false;
    ajouter(compte, typesDe(r.id));
    return true;
  });
}

/** Place des recettes dans les repas vides de la semaine (pas ceux pris dehors), dans l'ordre des créneaux. */
export function remplirVides(planning: Planning, ids: string[], reglages: Pick<Reglages, 'dehors'>): Planning {
  const file = ids.filter((id) => !idsDe(planning.slots).has(id));
  return {
    ...planning,
    slots: planning.slots.map((s) => (s.recetteId || !file.length || estDehors(s, reglages) ? s : { ...s, recetteId: file.shift()!, verrouille: false })),
  };
}

/** Marque un repas comme pris dehors (il se vide) ou le rend à la maison. */
export function basculerDehors(planning: Planning, creneau: Creneau, reglages: Pick<Reglages, 'dehors'>): Planning {
  return {
    ...planning,
    slots: planning.slots.map((s) => {
      if (!memeCreneau(s, creneau)) return s;
      const dehors = !estDehors(s, reglages);
      return dehors ? { ...s, dehors, recetteId: null, verrouille: false } : { ...s, dehors };
    }),
  };
}

/**
 * Change la recette d'un seul repas : la mieux classée qui n'est pas déjà dans la semaine (hors saison exclues).
 * Renvoie null s'il n'existe aucune autre recette de saison ou toutes saisons.
 */
export function changerRecette(
  planning: Planning,
  creneau: Creneau,
  { recettes, reglages, mois, precedent, typesDe = sansTypes, aleatoire = Math.random }: Pick<ContexteGeneration, 'recettes' | 'reglages' | 'mois' | 'precedent' | 'typesDe' | 'aleatoire'>,
): Planning | null {
  const dansLaSemaine = idsDe(planning.slots);
  // Le repas qu'on change ne compte plus dans les limites.
  const compte = compter(planning.slots.filter((s) => !memeCreneau(s, creneau)).map((s) => s.recetteId), typesDe);
  const [choix] = classer(
    recettes.filter((r) => !dansLaSemaine.has(r.id) && !horsSaison(r, mois) && !depasse(compte, typesDe(r.id), reglages.limites)),
    mois,
    idsDe(precedent?.slots ?? []),
    aleatoire,
  );
  if (!choix) return null;
  return {
    ...planning,
    slots: planning.slots.map((s) => (memeCreneau(s, creneau) ? { ...s, recetteId: choix.id, verrouille: false } : s)),
  };
}

export function basculerGarde(planning: Planning, creneau: Creneau): Planning {
  return {
    ...planning,
    slots: planning.slots.map((s) => (memeCreneau(s, creneau) && s.recetteId ? { ...s, verrouille: !s.verrouille } : s)),
  };
}

/** Clé ISO de la semaine précédant celle de `date`. */
export function semainePrecedente(date = new Date()): string {
  const { lundi } = semaineIso(date);
  const avant = new Date(lundi);
  avant.setDate(lundi.getDate() - 7);
  return semaineIso(avant).cle;
}

/** Enregistre le planning de la semaine et ne garde que la semaine précédente en plus. */
export function rangerPlanning(plannings: Planning[], planning: Planning, precedente: string): Planning[] {
  const ancien = plannings.find((p) => p.semaine === precedente);
  return [...(ancien ? [ancien] : []), planning];
}

/**
 * Planning de la semaine aligné sur les réglages actuels : les créneaux ajoutés
 * depuis la dernière génération sont vides, ceux retirés disparaissent.
 */
export function alignerPlanning(planning: Planning | undefined, reglages: Pick<Reglages, 'jours' | 'moments'>, semaine: string): Planning {
  return {
    semaine,
    slots: creneaux(reglages).map(
      (c) => planning?.slots.find((s) => memeCreneau(s, c)) ?? { ...c, recetteId: null, verrouille: false, dehors: null },
    ),
  };
}
