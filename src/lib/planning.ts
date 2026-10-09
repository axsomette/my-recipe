// Générateur de semaine : fonctions pures (le hasard est injecté pour pouvoir le tester).
//
// Ordre de préférence des recettes, pour le mois en cours :
//   1. de saison (score ≥ 0,75), 2. en partie de saison, 3. jokers « toutes saisons ».
// Les recettes hors saison ne sont jamais placées d'office : elles sont proposées à part
// (propositionsHorsSaison) et c'est la personne qui choisit de s'en servir.
// Dans chaque groupe, les recettes de la semaine précédente passent après les autres,
// puis on mélange les recettes de score proche (par tranches de 0,25) pour varier.
import { semaineIso } from './calendrier';
import { niveauSaison, type NiveauSaison } from './saison';
import type { Moment, Planning, Recette, Reglages, Slot } from './types';

export type Aleatoire = () => number;

const RANG: Record<NiveauSaison, number> = { pleine: 0, partie: 1, toutes: 2, hors: 3 };
const ORDRE_MOMENTS: Moment[] = ['midi', 'soir'];

/** Créneaux attendus selon les réglages : lundi midi, lundi soir, mardi midi… */
export function creneaux(reglages: Reglages): Pick<Slot, 'jour' | 'moment'>[] {
  const moments = ORDRE_MOMENTS.filter((m) => reglages.moments.includes(m));
  return Array.from({ length: reglages.jours }, (_, jour) => moments.map((moment) => ({ jour, moment }))).flat();
}

const memeCreneau = (a: Pick<Slot, 'jour' | 'moment'>, b: Pick<Slot, 'jour' | 'moment'>) =>
  a.jour === b.jour && a.moment === b.moment;

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
  aleatoire?: Aleatoire;
}

export interface Generation {
  planning: Planning;
  /** Nombre de repas laissés vides faute de recettes de saison ou toutes saisons. */
  manquants: number;
}

const horsSaison = (r: Recette, mois: number) => niveauSaison(r.scoreParMois, mois) === 'hors';
const idsDe = (slots: Slot[]) => new Set(slots.flatMap((s) => (s.recetteId ? [s.recetteId] : [])));

export function genererSemaine({ recettes, reglages, mois, semaine, actuel, precedent, aleatoire = Math.random }: ContexteGeneration): Generation {
  const existantes = new Set(recettes.map((r) => r.id));
  const gardes = (actuel?.slots ?? []).filter((s) => s.verrouille && s.recetteId && existantes.has(s.recetteId));
  const prises = new Set(gardes.map((s) => s.recetteId!));
  const dejaServies = new Set((precedent?.slots ?? []).flatMap((s) => (s.recetteId ? [s.recetteId] : [])));
  const disponibles = classer(recettes.filter((r) => !prises.has(r.id) && !horsSaison(r, mois)), mois, dejaServies, aleatoire);

  let manquants = 0;
  const slots: Slot[] = creneaux(reglages).map((c) => {
    const garde = gardes.find((g) => memeCreneau(g, c));
    if (garde) return { ...c, recetteId: garde.recetteId, verrouille: true };
    const recette = disponibles.shift();
    if (!recette) manquants++;
    return { ...c, recetteId: recette?.id ?? null, verrouille: false };
  });
  return { planning: { semaine, slots }, manquants };
}

/** Recettes hors saison qui pourraient compléter la semaine, de la plus à la moins indiquée. */
export function propositionsHorsSaison(
  planning: Planning,
  { recettes, mois, precedent, aleatoire = Math.random }: Pick<ContexteGeneration, 'recettes' | 'mois' | 'precedent' | 'aleatoire'>,
): Recette[] {
  const dansLaSemaine = idsDe(planning.slots);
  const dejaServies = idsDe(precedent?.slots ?? []);
  return classer(recettes.filter((r) => !dansLaSemaine.has(r.id) && horsSaison(r, mois)), mois, dejaServies, aleatoire);
}

/** Place des recettes dans les repas vides de la semaine, dans l'ordre des créneaux. */
export function remplirVides(planning: Planning, ids: string[]): Planning {
  const file = ids.filter((id) => !idsDe(planning.slots).has(id));
  return { ...planning, slots: planning.slots.map((s) => (s.recetteId || !file.length ? s : { ...s, recetteId: file.shift()!, verrouille: false })) };
}

/**
 * Change la recette d'un seul repas : la mieux classée qui n'est pas déjà dans la semaine (hors saison exclues).
 * Renvoie null s'il n'existe aucune autre recette de saison ou toutes saisons.
 */
export function changerRecette(
  planning: Planning,
  creneau: Pick<Slot, 'jour' | 'moment'>,
  { recettes, mois, precedent, aleatoire = Math.random }: Pick<ContexteGeneration, 'recettes' | 'mois' | 'precedent' | 'aleatoire'>,
): Planning | null {
  const dansLaSemaine = idsDe(planning.slots);
  const dejaServies = idsDe(precedent?.slots ?? []);
  const [choix] = classer(recettes.filter((r) => !dansLaSemaine.has(r.id) && !horsSaison(r, mois)), mois, dejaServies, aleatoire);
  if (!choix) return null;
  return {
    ...planning,
    slots: planning.slots.map((s) => (memeCreneau(s, creneau) ? { ...s, recetteId: choix.id, verrouille: false } : s)),
  };
}

export function basculerGarde(planning: Planning, creneau: Pick<Slot, 'jour' | 'moment'>): Planning {
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
export function alignerPlanning(planning: Planning | undefined, reglages: Reglages, semaine: string): Planning {
  return {
    semaine,
    slots: creneaux(reglages).map(
      (c) => planning?.slots.find((s) => memeCreneau(s, c)) ?? { ...c, recetteId: null, verrouille: false },
    ),
  };
}
