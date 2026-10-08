// Opérations sur les recettes et les légumes perso : fonctions pures qui renvoient de nouvelles données.
import { calculerScores } from './saison';
import type { Catalogue, CategorieId, Donnees, Legume, Recette, Suggestion } from './types';

export const nouvelId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** Texte sans accent ni ponctuation, pour comparer et chercher (« Céleri-rave » → « celerirave »). */
export const normaliser = (texte: string) =>
  texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Forme normalisée au singulier approximatif (« Poireaux » → « poireau », « Cèpes » → « cepe »). */
const singulier = (texte: string) => normaliser(texte).replace(/[sx]$/, '');

const mots = (texte: string) =>
  texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean)
    .map((m) => m.replace(/[sx]$/, ''));

/** Légumes cités dans un nom de recette (« Risotto de courge et sauge » → courge, sauge). */
export function legumesDansLeNom(nom: string, legumes: Legume[]): Legume[] {
  const motsNom = mots(nom);
  return legumes.filter((l) => {
    const motsLegume = mots(l.nom.replace(/\(.*\)/, ''));
    if (motsLegume.length === 0) return false;
    return motsNom.some((_, i) => motsLegume.every((m, j) => motsNom[i + j] === m));
  });
}

export function indexerLegumes(catalogue: Catalogue, perso: Legume[]): Map<string, Legume> {
  return new Map([...catalogue.legumes, ...perso].map((l) => [l.id, l]));
}

export interface Brouillon {
  id?: string;
  nom: string;
  legumes: string[];
  notes: string;
}

/** Crée ou met à jour une recette ; le score de saison est recalculé à chaque enregistrement. */
export function enregistrerRecette(
  donnees: Donnees,
  brouillon: Brouillon,
  index: Map<string, Legume>,
  maintenant = new Date().toISOString(),
): { donnees: Donnees; recette: Recette } {
  const existante = brouillon.id ? donnees.recettes.find((r) => r.id === brouillon.id) : undefined;
  const legumes = [...new Set(brouillon.legumes)].filter((id) => index.has(id));
  const recette: Recette = {
    id: existante?.id ?? nouvelId(),
    nom: brouillon.nom.trim(),
    legumes,
    notes: brouillon.notes.trim(),
    createdAt: existante?.createdAt ?? maintenant,
    updatedAt: maintenant,
    scoreParMois: calculerScores(legumes, index),
  };
  const recettes = existante
    ? donnees.recettes.map((r) => (r.id === recette.id ? recette : r))
    : [...donnees.recettes, recette];
  return { donnees: { ...donnees, recettes }, recette };
}

/** Supprime une recette et libère les repas où elle était prévue. */
export function supprimerRecette(donnees: Donnees, id: string): Donnees {
  return {
    ...donnees,
    recettes: donnees.recettes.filter((r) => r.id !== id),
    plannings: donnees.plannings.map((p) => ({
      ...p,
      slots: p.slots.map((s) => (s.recetteId === id ? { ...s, recetteId: null, verrouille: false } : s)),
    })),
  };
}

export function ajouterLegumePerso(donnees: Donnees, legume: Legume): Donnees {
  return { ...donnees, legumesPerso: [...donnees.legumesPerso.filter((l) => l.id !== legume.id), legume] };
}

/** Produit du catalogue portant déjà ce nom (« Poireaux » retrouve « Poireau »). */
export function legumeExistant(nom: string, legumes: Legume[]): Legume | undefined {
  const cle = singulier(nom);
  if (!cle) return undefined;
  return legumes.find((l) => singulier(l.nom) === cle);
}

/** Suggestion METRO correspondant au nom saisi (« cèpe » → « Champignon cèpe »). */
export function trouverSuggestion(nom: string, suggestions: Suggestion[]): Suggestion | undefined {
  const cle = singulier(nom);
  if (cle.length < 3) return undefined;
  return (
    suggestions.find((s) => s.id === cle) ??
    suggestions.find((s) => s.id.includes(cle)) ??
    suggestions.find((s) => cle.includes(s.id))
  );
}

const GENERIQUE: Partial<Record<CategorieId, string>> = { herbes: 'herbe' };
export const ICONES_GENERIQUES = ['panier', 'herbe', 'champignon'];
const cheminIcone = (id: string) => `legumes/icones/${id}.svg`;

/** Illustration la plus proche d'un nom libre : correspondance connue, nom contenu, sinon générique. */
export function iconeProche(nom: string, categorie: CategorieId, catalogue: Catalogue): string {
  const cle = normaliser(nom);
  const alias = Object.keys(catalogue.correspondances).find((c) => cle.includes(c));
  if (alias) return cheminIcone(catalogue.correspondances[alias]!);
  // Le nom principal vient en premier en français : « tomate cerise » → tomate, pas cerise.
  const contenu = catalogue.legumes
    .filter((l) => cle.includes(l.id))
    .sort((a, b) => cle.indexOf(a.id) - cle.indexOf(b.id) || b.id.length - a.id.length)[0];
  if (contenu) return contenu.icone;
  return cheminIcone(GENERIQUE[categorie] ?? 'panier');
}

/** Toutes les illustrations disponibles, pour le choix manuel. */
export function toutesLesIcones(catalogue: Catalogue): string[] {
  return [...new Set([...catalogue.legumes.map((l) => l.icone), ...ICONES_GENERIQUES.map(cheminIcone)])];
}

export function nouvelIdPerso(nom: string, existants: Legume[]): string {
  const base = `perso-${normaliser(nom) || 'legume'}`;
  let id = base;
  for (let n = 2; existants.some((l) => l.id === id); n++) id = `${base}-${n}`;
  return id;
}
