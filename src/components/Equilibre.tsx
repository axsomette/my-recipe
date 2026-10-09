import { ICONES_TYPES, NOMS_TYPES, TYPES_REPAS, type Compte, type TypeRepas } from '../lib/equilibre';
import type { Reglages } from '../lib/types';
import { Vignette } from './Vignette';

const enListe = (types: TypeRepas[]) => types.map((t, i) => (i === 0 ? NOMS_TYPES[t] : NOMS_TYPES[t].toLowerCase())).join(', ');

/** Pictos des types d'une recette, pour les cartes et les repas (le nom est lu par les lecteurs d'écran). */
export function PictosTypes({ types }: { types: TypeRepas[] }) {
  if (types.length === 0) return null;
  return (
    <span class="inline-flex items-center gap-0.5" role="img" aria-label={enListe(types)} title={enListe(types)}>
      {types.map((t) => (
        <Vignette key={t} icone={ICONES_TYPES[t]} taille={24} />
      ))}
    </span>
  );
}

/** Types d'une recette en toutes lettres, pour la fiche. */
export function EtiquettesTypes({ types }: { types: TypeRepas[] }) {
  return (
    <ul class="flex flex-wrap gap-2" aria-label="Type de repas">
      {types.map((t) => (
        <li key={t} class="chip chip-lecture min-h-9 gap-1.5 pr-3 pl-1.5 text-sm">
          <Vignette icone={ICONES_TYPES[t]} taille={24} />
          {NOMS_TYPES[t]}
        </li>
      ))}
    </ul>
  );
}

/** Bilan de la semaine : combien de repas de chaque type, et la limite choisie s'il y en a une. */
export function BilanSemaine({ compte, limites }: { compte: Compte; limites: Reglages['limites'] }) {
  return (
    <ul class="flex flex-wrap gap-2" aria-label="Équilibre de la semaine">
      {TYPES_REPAS.map((t) => {
        const limite = t === 'vege' ? null : limites[t];
        const atteinte = limite !== null && compte[t] >= limite;
        return (
          <li
            key={t}
            class={`inline-flex min-h-9 items-center gap-1.5 rounded-full py-1 pr-3 pl-1.5 text-sm font-semibold ${atteinte ? 'bg-saison-pale text-saison-texte' : 'bg-creux text-encre'}`}
          >
            <Vignette icone={ICONES_TYPES[t]} taille={24} />
            <span>
              {NOMS_TYPES[t]} {compte[t]}
              {limite !== null && <span class="font-normal text-encre-2"> / {limite}</span>}
            </span>
            {atteinte && <span class="sr-only">(limite atteinte)</span>}
          </li>
        );
      })}
    </ul>
  );
}
