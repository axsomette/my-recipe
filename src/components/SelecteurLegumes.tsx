import { useMemo, useState } from 'preact/hooks';
import { NOMS_MOIS, moisCourant } from '../lib/calendrier';
import { NOMS_CATEGORIES, ORDRE_CATEGORIES } from '../lib/categories';
import { cleRecherche, legumeExistant, legumesDansLeNom } from '../lib/recettes';
import { calculerScores, libelleSaison } from '../lib/saison';
import type { Legume } from '../lib/types';
import type { Monde } from './AvecCatalogue';
import { Icone } from './Icone';
import { Frise, decrireScores } from './Saison';
import { Vignette } from './Vignette';

const NB_SAISON_VISIBLES = 9;

interface Props {
  monde: Monde;
  /** Nom de la recette : les légumes qu'il cite sont proposés en premier. */
  nomRecette: string;
  choisis: string[];
  onChange: (ids: string[]) => void;
  /** Ouvre la création d'un légume perso, avec le texte cherché. */
  onCreer: (nom: string) => void;
}

function ChipChoix({ legume, choisi, saison, onBasculer }: { legume: Legume; choisi: boolean; saison: boolean; onBasculer: () => void }) {
  return (
    <button type="button" class={`chip ${saison ? 'chip-saison' : ''}`} aria-pressed={choisi} onClick={onBasculer}>
      <Vignette icone={legume.icone} taille={28} />
      {legume.nom}
    </button>
  );
}

export function SelecteurLegumes({ monde, nomRecette, choisis, onChange, onCreer }: Props) {
  const mois = moisCourant();
  const [recherche, setRecherche] = useState('');
  const [toutesSaison, setToutesSaison] = useState(false);
  const [ouvertes, setOuvertes] = useState<Set<string>>(new Set());

  const basculer = (id: string) => onChange(choisis.includes(id) ? choisis.filter((c) => c !== id) : [...choisis, id]);
  const enSaison = (l: Legume) => !l.touteLannee && l.mois.includes(mois);
  const chip = (l: Legume) => (
    <ChipChoix key={l.id} legume={l} choisi={choisis.includes(l.id)} saison={enSaison(l)} onBasculer={() => basculer(l.id)} />
  );

  const selection = choisis.map((id) => monde.index.get(id)).filter((l): l is Legume => l !== undefined);
  const scores = calculerScores(choisis, monde.index);
  const terme = cleRecherche(recherche);
  const resultats = useMemo(
    () => {
      if (!terme) return [];
      // Mots courants qui renvoient à un produit de la liste : « spaghetti » → pâtes, « potimarron » → potiron.
      const proches = new Set(
        Object.entries(monde.catalogue.correspondances)
          .filter(([mot]) => terme.length >= 3 && (mot.includes(terme) || terme.includes(mot)))
          .map(([, id]) => id),
      );
      return monde.legumes.filter((l) => cleRecherche(l.nom).includes(terme) || proches.has(l.id));
    },
    [terme, monde.legumes, monde.catalogue],
  );
  const deSaison = monde.legumes.filter(enSaison);
  const dansLeNom = useMemo(() => legumesDansLeNom(nomRecette, monde.legumes), [nomRecette, monde.legumes]);
  const groupes: { id: string; titre: string; legumes: Legume[] }[] = [
    ...ORDRE_CATEGORIES.map((c) => ({
      id: c,
      titre: NOMS_CATEGORIES[c],
      legumes: monde.legumes.filter((l) => l.categorie === c && l.source !== 'perso'),
    })),
    { id: 'perso', titre: 'Mes ingrédients perso', legumes: monde.legumes.filter((l) => l.source === 'perso') },
  ].filter((g) => g.legumes.length > 0);

  return (
    <div class="flex flex-col gap-3.5">
      {selection.length > 0 && (
        <ul class="flex flex-wrap gap-2" aria-label="Ingrédients choisis">
          {selection.map((l) => (
            <li key={l.id}>
              <button type="button" class="chip chip-retirer" aria-label={`Retirer ${l.nom}`} onClick={() => basculer(l.id)}>
                <Vignette icone={l.icone} taille={28} />
                {l.nom}
                <span class="x">
                  <Icone nom="fermer" taille={18} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div class="bloc flex flex-col gap-2.5 bg-transparent px-4 py-3.5" aria-live="polite">
        {scores ? (
          <>
            <Frise variante="mini" valeurs={scores} mois={mois} description={decrireScores(scores)} />
            <p class="text-sm">
              De saison <strong>{libelleSaison(scores)}</strong>.
            </p>
          </>
        ) : (
          <p class="text-sm text-encre-2">
            {selection.length === 0
              ? 'Cochez les ingrédients de la recette : sa saison se calcule au fur et à mesure.'
              : 'Aucun légume saisonnier pour l’instant : la recette ira en toute saison.'}
          </p>
        )}
      </div>

      <div class="relative">
        <Icone nom="recherche" taille={20} class="pointer-events-none absolute top-4 left-4 text-encre-2" />
        <label class="sr-only" for="recherche-legumes">
          Chercher un ingrédient
        </label>
        <input
          id="recherche-legumes"
          class="champ pl-12"
          type="search"
          placeholder="Légume, viande, pâtes…"
          autocomplete="off"
          value={recherche}
          onInput={(e) => setRecherche(e.currentTarget.value)}
        />
      </div>

      {terme ? (
        <div class="flex flex-col gap-3" aria-live="polite">
          {resultats.length > 0 ? (
            <div class="flex flex-wrap gap-2" role="group" aria-label="Résultats">
              {resultats.map(chip)}
            </div>
          ) : (
            <p class="text-encre-2">Aucun ingrédient « {recherche.trim()} » dans la liste.</p>
          )}
          {!legumeExistant(recherche, monde.legumes) && (
            <button type="button" class="chip chip-ajout self-start" onClick={() => onCreer(recherche.trim())}>
              <Icone nom="plus" taille={18} />
              Ajouter « {recherche.trim()} » comme ingrédient perso
            </button>
          )}
        </div>
      ) : (
        <>
          {dansLeNom.length > 0 && (
            <div class="flex flex-col gap-2.5">
              <h3 class="etiq">Repérés dans le nom</h3>
              <div class="flex flex-wrap gap-2" role="group" aria-label="Repérés dans le nom de la recette">
                {dansLeNom.map(chip)}
              </div>
            </div>
          )}
          <div class="flex flex-col gap-2.5">
            <div class="flex items-center justify-between">
              <h3 class="etiq text-saison-texte">De saison en {NOMS_MOIS[mois - 1]}</h3>
              <span class="etiq">{deSaison.length}</span>
            </div>
            <div class="flex flex-wrap gap-2" role="group" aria-label={`De saison en ${NOMS_MOIS[mois - 1]}`}>
              {(toutesSaison ? deSaison : deSaison.slice(0, NB_SAISON_VISIBLES)).map(chip)}
              {deSaison.length > NB_SAISON_VISIBLES && (
                <button type="button" class="chip border-dashed" onClick={() => setToutesSaison(!toutesSaison)}>
                  {toutesSaison ? 'Voir moins' : `Voir les ${deSaison.length}`}
                </button>
              )}
            </div>
          </div>

          <div class="flex flex-col">
            {groupes.map((g) => {
              const ouvert = ouvertes.has(g.id);
              return (
                <div key={g.id} class="border-t border-trait last:border-b">
                  <h3>
                    <button
                      type="button"
                      class="flex min-h-12 w-full items-center justify-between font-semibold"
                      aria-expanded={ouvert}
                      aria-controls={`groupe-${g.id}`}
                      onClick={() => {
                        const suivantes = new Set(ouvertes);
                        if (ouvert) suivantes.delete(g.id);
                        else suivantes.add(g.id);
                        setOuvertes(suivantes);
                      }}
                    >
                      {g.titre}
                      <span class="flex items-center gap-2.5">
                        <span class="etiq">{g.legumes.length}</span>
                        <Icone nom={ouvert ? 'haut' : 'bas'} taille={20} />
                      </span>
                    </button>
                  </h3>
                  <div id={`groupe-${g.id}`} hidden={!ouvert} class="flex flex-wrap gap-2 pt-1 pb-4" role="group" aria-label={g.titre}>
                    {ouvert && g.legumes.map(chip)}
                  </div>
                </div>
              );
            })}
          </div>
          <button type="button" class="chip chip-ajout self-start" onClick={() => onCreer('')}>
            <Icone nom="plus" taille={18} />
            Ajouter un ingrédient perso
          </button>
        </>
      )}
    </div>
  );
}
