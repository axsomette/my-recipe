// Calcul de saison des recettes : fonctions pures.
//
// Pour chaque mois : score = légumes de la recette de saison ce mois-là / légumes saisonniers de la recette.
// Les légumes disponibles toute l'année sont exclus. Sans légume saisonnier, la recette est
// « toutes saisons » (score null) : c'est un joker pour le planning.
import { MOIS_ABREGES, NOMS_MOIS } from './calendrier';
import type { Legume } from './types';

export const SEUIL_PLEINE_SAISON = 0.75;
export const SEUIL_EN_PARTIE = 0.25;

export function calculerScores(idsLegumes: string[], index: Map<string, Legume>): number[] | null {
  const saisonniers = [...new Set(idsLegumes)]
    .map((id) => index.get(id))
    .filter((l): l is Legume => l !== undefined && !l.touteLannee);
  if (saisonniers.length === 0) return null;
  return Array.from({ length: 12 }, (_, i) => {
    const mois = i + 1;
    const deSaison = saisonniers.filter((l) => l.mois.includes(mois)).length;
    return Math.round((deSaison / saisonniers.length) * 100) / 100;
  });
}

export type NiveauSaison = 'pleine' | 'partie' | 'hors' | 'toutes';

export function niveauSaison(scores: number[] | null, mois: number): NiveauSaison {
  if (scores === null) return 'toutes';
  const score = scores[mois - 1] ?? 0;
  if (score >= SEUIL_PLEINE_SAISON) return 'pleine';
  if (score >= SEUIL_EN_PARTIE) return 'partie';
  return 'hors';
}

export const LIBELLES_NIVEAU: Record<NiveauSaison, string> = {
  pleine: 'De saison',
  partie: 'En partie de saison',
  hors: 'Hors saison',
  toutes: 'Toutes saisons',
};

/** Plages de mois consécutifs (en bouclant décembre → janvier), ex. [[9, 12], [1, 1]] fusionnés en [[9, 1]]. */
export function plagesDeMois(mois: number[]): [number, number][] {
  const ensemble = new Set(mois);
  if (ensemble.size === 0) return [];
  if (ensemble.size === 12) return [[1, 12]];
  const plages: [number, number][] = [];
  for (let m = 1; m <= 12; m++) {
    const precedent = m === 1 ? 12 : m - 1;
    if (!ensemble.has(m) || ensemble.has(precedent)) continue; // m n'ouvre pas une plage
    let fin = m;
    while (ensemble.has(fin === 12 ? 1 : fin + 1)) fin = fin === 12 ? 1 : fin + 1;
    plages.push([m, fin]);
  }
  return plages;
}

const moisDeSaison = (scores: number[]) =>
  scores.flatMap((s, i) => (s >= SEUIL_PLEINE_SAISON ? [i + 1] : []));

/**
 * Libellé de saison pour l'affichage, déduit des mois où le score atteint 0,75.
 * Long : « de septembre à décembre », court : « sept. – déc. ».
 */
export function libelleSaison(scores: number[] | null, format: 'long' | 'court' = 'long'): string {
  if (scores === null) return 'toutes saisons';
  const plages = plagesDeMois(moisDeSaison(scores));
  if (plages.length === 0) return format === 'long' ? 'aucun mois vraiment de saison' : 'aucun mois idéal';
  if (plages.length === 1 && plages[0]![0] === 1 && plages[0]![1] === 12) return 'toute l’année';
  const noms = format === 'long' ? NOMS_MOIS : MOIS_ABREGES;
  const texte = plages.map(([debut, fin]) => {
    if (debut === fin) return format === 'long' ? `en ${noms[debut - 1]}` : noms[debut - 1];
    return format === 'long' ? `de ${noms[debut - 1]} à ${noms[fin - 1]}` : `${noms[debut - 1]} – ${noms[fin - 1]}`;
  });
  return texte.join(format === 'long' ? ' et ' : ', ');
}
