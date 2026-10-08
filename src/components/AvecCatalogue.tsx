import type { ComponentChildren } from 'preact';
import { useMemo } from 'preact/hooks';
import { tousLesLegumes, useCatalogue } from '../lib/catalogue';
import { useDonnees } from '../lib/donnees';
import { indexerLegumes } from '../lib/recettes';
import type { Catalogue, Legume } from '../lib/types';

export interface Monde {
  catalogue: Catalogue;
  /** Catalogue + légumes perso, triés par nom. */
  legumes: Legume[];
  index: Map<string, Legume>;
}

/** Affiche ses enfants une fois legumes.json chargé, avec les états de chargement et d'erreur. */
export function AvecCatalogue({ titre, children }: { titre: string; children: (monde: Monde) => ComponentChildren }) {
  const etat = useCatalogue();
  const { donnees } = useDonnees();
  const perso = donnees.legumesPerso;
  const monde = useMemo(
    () =>
      etat.etat === 'ok'
        ? { catalogue: etat.catalogue, legumes: tousLesLegumes(etat.catalogue, perso), index: indexerLegumes(etat.catalogue, perso) }
        : null,
    [etat, perso],
  );

  if (monde) return <>{children(monde)}</>;
  return (
    <div class="flex flex-col gap-4 pt-2">
      <h1 tabIndex={-1} class="display text-[30px] outline-none">
        {titre}
      </h1>
      {etat.etat === 'erreur' ? (
        <p role="alert" class="text-encre-2">
          Impossible de charger la liste des légumes. Vérifiez la connexion, puis{' '}
          <button type="button" class="min-h-11 font-semibold text-saison-texte underline" onClick={etat.reessayer}>
            réessayez
          </button>
          .
        </p>
      ) : (
        <p class="text-encre-2">Chargement…</p>
      )}
    </div>
  );
}
