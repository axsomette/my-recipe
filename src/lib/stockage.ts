// Seul module à toucher au localStorage. Les données sont versionnées :
// toute évolution du format passe par une migration ci-dessous.
import type { Donnees, Legume, Moment, Planning, Recette, Reglages, Slot } from './types';

const CLE = 'recettes-de-saison';
const CLE_SECOURS = `${CLE}:illisible`;
export const VERSION = 1;

export const reglagesParDefaut = (): Reglages => ({ jours: 7, moments: ['soir'] });

export const donneesVides = (): Donnees => ({
  version: VERSION,
  recettes: [],
  legumesPerso: [],
  reglages: reglagesParDefaut(),
  plannings: [],
  dernierExport: null,
});

// Migrations : MIGRATIONS[n] transforme des données en version n vers la version n + 1.
// Exemple pour une future version 2 : { 1: (d) => ({ ...d, version: 2, nouveauChamp: … }) }
const MIGRATIONS: Record<number, (d: Record<string, unknown>) => Record<string, unknown>> = {};

// --- Validation manuelle (pas de bibliothèque de schéma) ---

const estObjet = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const estTexte = (v: unknown): v is string => typeof v === 'string';
const estMois = (v: unknown) => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 12;
const estMoment = (v: unknown): v is Moment => v === 'midi' || v === 'soir';
const CATEGORIES = ['legumes', 'fruits', 'herbes', 'tubercules', 'fruits-a-coque', 'cereales'];

function estRecette(v: unknown): v is Recette {
  if (!estObjet(v)) return false;
  const { id, nom, legumes, notes, createdAt, updatedAt, scoreParMois } = v;
  return (
    estTexte(id) && id.length > 0 && estTexte(nom) &&
    Array.isArray(legumes) && legumes.every(estTexte) &&
    estTexte(notes) && estTexte(createdAt) && estTexte(updatedAt) &&
    (scoreParMois === null ||
      (Array.isArray(scoreParMois) && scoreParMois.length === 12 &&
        scoreParMois.every((s) => typeof s === 'number' && s >= 0 && s <= 1)))
  );
}

function estLegumePerso(v: unknown): v is Legume {
  if (!estObjet(v)) return false;
  const { id, nom, categorie, mois, source, touteLannee, icone } = v;
  return (
    estTexte(id) && id.length > 0 && estTexte(nom) && CATEGORIES.includes(categorie as string) &&
    Array.isArray(mois) && mois.every(estMois) && source === 'perso' &&
    typeof touteLannee === 'boolean' && estTexte(icone)
  );
}

function estReglages(v: unknown): v is Reglages {
  if (!estObjet(v)) return false;
  return (
    Number.isInteger(v.jours) && (v.jours as number) >= 1 && (v.jours as number) <= 7 &&
    Array.isArray(v.moments) && v.moments.length > 0 && v.moments.every(estMoment)
  );
}

function estSlot(v: unknown): v is Slot {
  if (!estObjet(v)) return false;
  return (
    Number.isInteger(v.jour) && (v.jour as number) >= 0 && (v.jour as number) <= 6 &&
    estMoment(v.moment) && (v.recetteId === null || estTexte(v.recetteId)) && typeof v.verrouille === 'boolean'
  );
}

function estPlanning(v: unknown): v is Planning {
  return estObjet(v) && estTexte(v.semaine) && /^\d{4}-W\d{2}$/.test(v.semaine) &&
    Array.isArray(v.slots) && v.slots.every(estSlot);
}

/**
 * Valide et migre des données brutes (localStorage ou fichier importé).
 * Renvoie null si le contenu n'est pas une sauvegarde utilisable.
 */
export function lireDonnees(brut: unknown): Donnees | null {
  if (!estObjet(brut) || !Number.isInteger(brut.version)) return null;
  let d: Record<string, unknown> = brut;
  let version = d.version as number;
  if (version > VERSION) return null; // sauvegarde d'une version plus récente de l'app
  while (version < VERSION) {
    const migrer = MIGRATIONS[version];
    if (!migrer) return null;
    d = migrer(d);
    version = d.version as number;
  }
  const valide =
    Array.isArray(d.recettes) && d.recettes.every(estRecette) &&
    Array.isArray(d.legumesPerso) && d.legumesPerso.every(estLegumePerso) &&
    estReglages(d.reglages) &&
    Array.isArray(d.plannings) && d.plannings.every(estPlanning) &&
    (d.dernierExport === null || estTexte(d.dernierExport));
  return valide ? (d as unknown as Donnees) : null;
}

export type ResultatChargement =
  | { etat: 'ok'; donnees: Donnees }
  | { etat: 'vide'; donnees: Donnees }
  | { etat: 'illisible'; donnees: Donnees }
  | { etat: 'indisponible'; donnees: Donnees };

/** Charge les données enregistrées. Ne lève jamais d'exception. */
export function charger(): ResultatChargement {
  let texte: string | null;
  try {
    texte = localStorage.getItem(CLE);
  } catch {
    return { etat: 'indisponible', donnees: donneesVides() }; // navigation privée, stockage bloqué…
  }
  if (texte === null) return { etat: 'vide', donnees: donneesVides() };

  let donnees: Donnees | null = null;
  try {
    donnees = lireDonnees(JSON.parse(texte));
  } catch {
    donnees = null;
  }
  if (donnees) return { etat: 'ok', donnees };

  // Données illisibles : on les met de côté au lieu de les écraser à la prochaine sauvegarde.
  try {
    localStorage.setItem(CLE_SECOURS, texte);
  } catch {
    /* rien de plus à faire */
  }
  return { etat: 'illisible', donnees: donneesVides() };
}

/** Enregistre les données. Renvoie false si le stockage est plein ou indisponible. */
export function sauvegarder(donnees: Donnees): boolean {
  try {
    localStorage.setItem(CLE, JSON.stringify(donnees));
    return true;
  } catch {
    return false;
  }
}
