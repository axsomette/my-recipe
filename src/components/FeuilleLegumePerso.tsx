import { useMemo, useState } from 'preact/hooks';
import { MOIS_ABREGES, NOMS_MOIS } from '../lib/calendrier';
import { NOMS_CATEGORIES, estDuGardeManger } from '../lib/categories';
import { iconeProche, legumeExistant, nouvelIdPerso, toutesLesIcones, trouverSuggestion } from '../lib/recettes';
import type { CategorieId, Legume } from '../lib/types';
import type { Monde } from './AvecCatalogue';
import { Dialogue } from './Dialogue';
import { Icone } from './Icone';
import { Vignette } from './Vignette';


const TOUS_LES_MOIS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function titreReconnaissance(nom: string, suggestion: string | undefined): string {
  if (suggestion) return `Reconnu : ${suggestion}`;
  if (nom.trim()) return 'Produit inconnu de nos calendriers';
  return 'Nouveau produit';
}

interface Props {
  monde: Monde;
  nomInitial: string;
  onFermer: () => void;
  /** Légume créé, ou légume existant choisi à la place. */
  onChoisir: (legume: Legume, nouveau: boolean) => void;
}

function Formulaire({ monde, nomInitial, onFermer, onChoisir }: Props) {
  const [nom, setNom] = useState(nomInitial);
  const [categorie, setCategorie] = useState<CategorieId | null>(null);
  const [touteLannee, setTouteLannee] = useState(false);
  const [mois, setMois] = useState<number[]>([]);
  const [moisTouches, setMoisTouches] = useState(false);
  const [iconeChoisie, setIconeChoisie] = useState<string | null>(null);
  const [choixIcone, setChoixIcone] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const existant = legumeExistant(nom, monde.legumes);
  const suggestion = existant ? undefined : trouverSuggestion(nom, monde.catalogue.suggestions);
  // Tant que l'utilisateur n'a rien coché, on reprend la suggestion METRO.
  const moisAffiches = !moisTouches && suggestion && !touteLannee ? suggestion.mois : mois;
  const categorieAffichee = categorie ?? suggestion?.categorie ?? 'legumes';
  const icone = iconeChoisie ?? suggestion?.icone ?? iconeProche(nom, categorieAffichee, monde.catalogue);

  const nomsIcones = useMemo(() => {
    const noms = new Map(monde.catalogue.legumes.map((l) => [l.icone, l.nom]));
    noms.set('legumes/icones/panier.svg', 'Panier');
    noms.set('legumes/icones/herbe.svg', 'Brin d’herbe');
    noms.set('legumes/icones/champignon.svg', 'Champignon');
    return noms;
  }, [monde.catalogue]);

  const basculerMois = (m: number) => {
    setMoisTouches(true);
    const base = moisAffiches;
    setMois(base.includes(m) ? base.filter((x) => x !== m) : [...base, m].sort((a, b) => a - b));
  };

  const enregistrer = (e: Event) => {
    e.preventDefault();
    const propre = nom.trim();
    if (!propre) return setErreur('Donnez un nom à l’ingrédient.');
    if (!touteLannee && moisAffiches.length === 0) return setErreur('Cochez au moins un mois, ou choisissez « Toute l’année ».');
    onChoisir(
      {
        id: nouvelIdPerso(propre, monde.legumes),
        nom: propre.charAt(0).toUpperCase() + propre.slice(1),
        categorie: categorieAffichee,
        mois: touteLannee ? TOUS_LES_MOIS : moisAffiches,
        source: 'perso',
        touteLannee,
        icone,
      },
      true,
    );
  };

  if (choixIcone) {
    return (
      <div class="flex flex-col gap-4">
        <h2 id="titre-legume-perso" class="display text-2xl">
          Choisir une illustration
        </h2>
        <ul class="grid max-h-[55dvh] grid-cols-5 gap-1.5 overflow-y-auto sm:grid-cols-7">
          {toutesLesIcones(monde.catalogue).map((chemin) => (
            <li key={chemin}>
              <button
                type="button"
                class={`flex size-14 items-center justify-center rounded-2xl ${chemin === icone ? 'bg-saison-pale ring-2 ring-encre' : 'hover:bg-creux'}`}
                aria-pressed={chemin === icone}
                aria-label={nomsIcones.get(chemin) ?? chemin}
                onClick={() => {
                  setIconeChoisie(chemin);
                  setChoixIcone(false);
                }}
              >
                <Vignette icone={chemin} />
              </button>
            </li>
          ))}
        </ul>
        <button type="button" class="btn btn-ligne" onClick={() => setChoixIcone(false)}>
          Retour
        </button>
      </div>
    );
  }

  return (
    <form class="flex flex-col gap-4" onSubmit={enregistrer} noValidate>
      <h2 id="titre-legume-perso" class="display text-2xl">
        Nouvel ingrédient perso
      </h2>

      <div class="flex items-center gap-3.5 rounded-2xl border border-trait bg-papier px-3.5 py-3" aria-live="polite">
        <Vignette icone={icone} taille={64} />
        <div class="flex min-w-0 flex-col gap-1">
          {existant ? (
            <>
              <p class="font-semibold">« {existant.nom} » est déjà dans la liste.</p>
              <button type="button" class="btn btn-texte -ml-3 self-start" onClick={() => onChoisir(existant, false)}>
                Choisir {existant.nom}
              </button>
            </>
          ) : (
            <>
              <p class="font-semibold">{titreReconnaissance(nom, suggestion?.nom)}</p>
              <p class="text-sm text-encre-2">
                {suggestion
                  ? 'Trouvé dans l’Agenda des Chefs METRO : illustration et mois proposés.'
                  : 'Indiquez vous-même quand il est de saison.'}
              </p>
              <button type="button" class="btn btn-texte -ml-3 min-h-11 self-start" onClick={() => setChoixIcone(true)}>
                Changer l’illustration
              </button>
            </>
          )}
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <label for="nom-legume" class="font-semibold">
          Nom
        </label>
        <input
          id="nom-legume"
          class="champ"
          type="text"
          value={nom}
          autocomplete="off"
          onInput={(e) => {
            setNom(e.currentTarget.value);
            setErreur(null);
          }}
        />
      </div>

      <div class="flex flex-col gap-2">
        <label for="categorie-legume" class="font-semibold">
          Catégorie
        </label>
        <div class="relative">
          <select
            id="categorie-legume"
            class="champ"
            value={categorieAffichee}
            onChange={(e) => {
              const choix = e.currentTarget.value as CategorieId;
              setCategorie(choix);
              if (estDuGardeManger(choix)) setTouteLannee(true); // viande, poisson, épicerie : pas de saison
            }}
          >
            {Object.entries(NOMS_CATEGORIES).map(([id, libelle]) => (
              <option key={id} value={id}>
                {libelle}
              </option>
            ))}
          </select>
          <Icone nom="bas" taille={20} class="pointer-events-none absolute top-4 right-4" />
        </div>
      </div>

      <fieldset class="flex flex-col gap-2">
        <legend class="mb-2 font-semibold">Quand est-il de saison ?</legend>
        <div class="flex gap-2">
          {([[true, 'Toute l’année'], [false, 'Certains mois']] as const).map(([valeur, libelle]) => (
            <label key={libelle} class={`filtre ${touteLannee === valeur ? 'filtre-actif' : ''}`}>
              <input type="radio" name="disponibilite" class="sr-only" checked={touteLannee === valeur} onChange={() => setTouteLannee(valeur)} />
              {libelle}
            </label>
          ))}
        </div>
        {!touteLannee && (
          <div class="grid grid-cols-6 gap-1.5" role="group" aria-label="Mois de saison">
            {TOUS_LES_MOIS.map((m) => (
              <button
                key={m}
                type="button"
                class="filtre justify-center px-0"
                aria-pressed={moisAffiches.includes(m)}
                aria-label={NOMS_MOIS[m - 1]}
                onClick={() => basculerMois(m)}
              >
                {MOIS_ABREGES[m - 1]}
              </button>
            ))}
          </div>
        )}
        {!touteLannee && suggestion && !moisTouches && (
          <p class="flex items-start gap-2 text-sm">
            <span class="etiq shrink-0 rounded-md bg-saison-pale px-2 py-1 text-xs text-saison-texte">Suggestion</span>
            <span class="text-encre-2">
              D’après l’Agenda des Chefs METRO, qui ne cite que les mois phares. Ajoutez les autres mois si besoin.
            </span>
          </p>
        )}
        {touteLannee && (
          <p class="text-sm text-encre-2">Un produit disponible toute l’année (importé, de conserve…) ne compte pas dans la saison des recettes.</p>
        )}
      </fieldset>

      {erreur && (
        <p role="alert" class="rounded-2xl bg-danger-pale px-4 py-3 text-[15px]">
          {erreur}
        </p>
      )}

      <div class="flex gap-2">
        <button type="button" class="btn btn-ligne flex-1" onClick={onFermer}>
          Annuler
        </button>
        <button type="submit" class="btn btn-plein flex-[2]">
          Ajouter l’ingrédient
        </button>
      </div>
    </form>
  );
}

export function FeuilleLegumePerso(props: Props & { ouvert: boolean }) {
  return (
    <Dialogue ouvert={props.ouvert} onFermer={props.onFermer} titreId="titre-legume-perso">
      <Formulaire {...props} />
    </Dialogue>
  );
}
