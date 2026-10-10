// Export et import du fichier de sauvegarde : fonctions pures.
import { indexerLegumes } from './recettes';
import { calculerScores } from './saison';
import { VERSION, lireDonnees } from './stockage';
import type { Catalogue, Donnees, Planning } from './types';

export const nomFichierExport = (date = new Date()) => {
  const jour = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return `recettes-de-saison-${jour}.json`;
};

export const contenuExport = (donnees: Donnees) => `${JSON.stringify(donnees, null, 2)}\n`;

export type AnalyseImport =
  | { ok: true; donnees: Donnees; resume: { recettes: number; legumesPerso: number; semaines: number } }
  | { ok: false; raison: 'illisible' | 'format' | 'version' };

/** Valide un fichier importé (texte brut). Ne lève jamais d'exception. */
export function analyserImport(texte: string): AnalyseImport {
  let brut: unknown;
  try {
    brut = JSON.parse(texte);
  } catch {
    return { ok: false, raison: 'illisible' };
  }
  const version = (brut as { version?: unknown } | null)?.version;
  if (typeof version === 'number' && version > VERSION) return { ok: false, raison: 'version' };
  const donnees = lireDonnees(brut);
  if (!donnees) return { ok: false, raison: 'format' };
  return {
    ok: true,
    donnees,
    resume: { recettes: donnees.recettes.length, legumesPerso: donnees.legumesPerso.length, semaines: donnees.plannings.length },
  };
}

/** Recalcule le score de saison de toutes les recettes (après un import ou la suppression d'un légume). */
export function recalculerScores(donnees: Donnees, catalogue: Catalogue): Donnees {
  const index = indexerLegumes(catalogue, donnees.legumesPerso);
  return {
    ...donnees,
    recettes: donnees.recettes.map((r) => {
      const legumes = r.legumes.filter((id) => index.has(id));
      return { ...r, legumes, scoreParMois: calculerScores(legumes, index) };
    }),
  };
}

export interface BilanImport {
  donnees: Donnees;
  ajoutees: number;
  misesAJour: number;
}

/**
 * Fusionne une sauvegarde avec les données actuelles : ajoute ce qui manque ;
 * pour une recette présente des deux côtés, garde la version modifiée le plus récemment.
 * Les réglages de l'appareil sont conservés.
 */
export function fusionner(actuelles: Donnees, importees: Donnees, catalogue: Catalogue): BilanImport {
  let ajoutees = 0;
  let misesAJour = 0;
  const recettes = new Map(actuelles.recettes.map((r) => [r.id, r]));
  for (const r of importees.recettes) {
    const locale = recettes.get(r.id);
    if (!locale) {
      recettes.set(r.id, r);
      ajoutees++;
    } else if (r.updatedAt > locale.updatedAt) {
      recettes.set(r.id, r);
      misesAJour++;
    }
  }
  const legumesPerso = new Map(actuelles.legumesPerso.map((l) => [l.id, l]));
  for (const l of importees.legumesPerso) if (!legumesPerso.has(l.id)) legumesPerso.set(l.id, l);

  const plannings = new Map<string, Planning>(importees.plannings.map((p) => [p.semaine, p]));
  for (const p of actuelles.plannings) plannings.set(p.semaine, p); // l'appareil prime
  const deuxDernieres = [...plannings.values()].sort((a, b) => a.semaine.localeCompare(b.semaine)).slice(-2);

  const donnees = recalculerScores(
    { ...actuelles, recettes: [...recettes.values()], legumesPerso: [...legumesPerso.values()], plannings: deuxDernieres },
    catalogue,
  );
  return { donnees, ajoutees, misesAJour };
}

/** Remplace toutes les données par la sauvegarde ; les nouveautés déjà vues sur l'appareil le restent. */
export function remplacer(actuelles: Donnees, importees: Donnees, catalogue: Catalogue): BilanImport {
  return {
    donnees: recalculerScores({ ...importees, nouveautesVue: actuelles.nouveautesVue }, catalogue),
    ajoutees: importees.recettes.length,
    misesAJour: 0,
  };
}

/** Supprime un légume perso et le retire des recettes qui l'utilisaient. */
export function supprimerLegumePerso(donnees: Donnees, id: string, catalogue: Catalogue): Donnees {
  return recalculerScores(
    {
      ...donnees,
      legumesPerso: donnees.legumesPerso.filter((l) => l.id !== id),
      recettes: donnees.recettes.map((r) => (r.legumes.includes(id) ? { ...r, legumes: r.legumes.filter((x) => x !== id) } : r)),
    },
    catalogue,
  );
}
