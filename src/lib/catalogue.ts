// Catalogue des légumes : public/legumes.json, seule source de l'app (aucun appel d'API).
import { useEffect, useState } from 'preact/hooks';
import type { Catalogue, Legume } from './types';

/** URL d'un fichier de public/, en tenant compte de la base du site (/my-recipe/). */
export const urlPublique = (chemin: string) => `${import.meta.env.BASE_URL}${chemin}`;

let enCours: Promise<Catalogue> | null = null;

export function chargerCatalogue(): Promise<Catalogue> {
  enCours ??= fetch(urlPublique('legumes.json'))
    .then((reponse) => {
      if (!reponse.ok) throw new Error(`legumes.json : HTTP ${reponse.status}`);
      return reponse.json() as Promise<Catalogue>;
    })
    .catch((erreur) => {
      enCours = null; // un nouvel essai sera possible
      throw erreur;
    });
  return enCours;
}

export type EtatCatalogue =
  | { etat: 'chargement' }
  | { etat: 'ok'; catalogue: Catalogue }
  | { etat: 'erreur'; reessayer: () => void };

export function useCatalogue(): EtatCatalogue {
  const [essai, setEssai] = useState(0);
  const [etat, setEtat] = useState<EtatCatalogue>({ etat: 'chargement' });
  useEffect(() => {
    let actif = true;
    chargerCatalogue().then(
      (catalogue) => actif && setEtat({ etat: 'ok', catalogue }),
      () => actif && setEtat({ etat: 'erreur', reessayer: () => setEssai((n) => n + 1) }),
    );
    return () => {
      actif = false;
    };
  }, [essai]);
  return etat;
}

/** Légumes du catalogue et légumes perso, triés par nom. */
export function tousLesLegumes(catalogue: Catalogue, perso: Legume[]): Legume[] {
  return [...catalogue.legumes, ...perso].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

/** Produits de saison ce mois-ci (hors produits disponibles toute l'année). */
export const deSaison = (legumes: Legume[], mois: number) =>
  legumes.filter((l) => !l.touteLannee && l.mois.includes(mois));
