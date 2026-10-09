import { typesRecette } from '../lib/equilibre';
import { lien } from '../lib/routeur';
import { libelleSaison, niveauSaison } from '../lib/saison';
import type { Legume, Recette } from '../lib/types';
import { PictosTypes } from './Equilibre';
import { BadgeSaison, Frise } from './Saison';
import { Vignette } from './Vignette';

/** « Poireau, ail, pomme de terre » : seule la première lettre de la liste reste en capitale. */
const enPhrase = (noms: string[]) =>
  noms.map((n, i) => (i === 0 ? n : n.charAt(0).toLowerCase() + n.slice(1))).join(', ');

export function CarteRecette({ recette, index, mois, active = false }: { recette: Recette; index: Map<string, Legume>; mois: number; active?: boolean }) {
  const legumes = recette.legumes.map((id) => index.get(id)).filter((l): l is Legume => l !== undefined);
  return (
    <a class="carte" href={lien({ nom: 'recette', id: recette.id })} aria-current={active ? 'page' : undefined}>
      <h2 class="display text-xl leading-tight">{recette.nom}</h2>
      {legumes.length > 0 && (
        <div class="flex flex-col gap-1">
          <span class="flex gap-0.5" aria-hidden="true">
            {legumes.slice(0, 4).map((l) => (
              <Vignette key={l.id} icone={l.icone} taille={32} />
            ))}
          </span>
          <p class="text-sm text-encre-2">{enPhrase(legumes.map((l) => l.nom))}</p>
        </div>
      )}
      <div class="flex items-center gap-3.5">
        <BadgeSaison niveau={niveauSaison(recette.scoreParMois, mois)} />
        <PictosTypes types={typesRecette(recette, index)} />
        {recette.scoreParMois && (
          <Frise
            class="flex-1"
            variante="mini"
            valeurs={recette.scoreParMois}
            mois={mois}
            description={`Saison : ${libelleSaison(recette.scoreParMois)}`}
          />
        )}
      </div>
    </a>
  );
}
