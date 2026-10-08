import { useMemo, useState } from 'preact/hooks';
import { AvecCatalogue, type Monde } from '../components/AvecCatalogue';
import { CarteRecette } from '../components/CarteRecette';
import { Icone } from '../components/Icone';
import { NOMS_MOIS, moisCourant } from '../lib/calendrier';
import { useDonnees } from '../lib/donnees';
import { normaliser } from '../lib/recettes';
import { lien } from '../lib/routeur';
import { niveauSaison } from '../lib/saison';
import { pluriel } from '../lib/texte';
import type { Recette } from '../lib/types';
import { useLarge } from '../lib/useLarge';
import { DetailRecette } from './RecetteDetail';

type Filtre = { type: 'toutes' } | { type: 'mois'; mois: number };

// Une recette « toutes saisons » se range entre les pleinement et les partiellement de saison.
const scorePourTri = (r: Recette, mois: number) => (r.scoreParMois ? (r.scoreParMois[mois - 1] ?? 0) : 0.6);

function etatListe(nombre: number, recherche: string, mois: number): string {
  if (nombre > 0) return `Les plus de saison en ${NOMS_MOIS[mois - 1]} d’abord.`;
  if (recherche.trim()) return `Aucune recette ne correspond à « ${recherche.trim()} ».`;
  return `Aucune recette n’est de saison en ${NOMS_MOIS[mois - 1]}.`;
}

function ListeRecettes({ monde, idActif, large = false }: { monde: Monde; idActif?: string; large?: boolean }) {
  const { donnees } = useDonnees();
  const maintenant = moisCourant();
  const [recherche, setRecherche] = useState('');
  const [filtre, setFiltre] = useState<Filtre>({ type: 'toutes' });
  const moisTri = filtre.type === 'mois' ? filtre.mois : maintenant;

  const affichees = useMemo(() => {
    const terme = normaliser(recherche);
    return donnees.recettes
      .filter((r) => {
        if (filtre.type === 'mois' && niveauSaison(r.scoreParMois, filtre.mois) !== 'pleine') return false;
        if (!terme) return true;
        const noms = r.legumes.map((id) => monde.index.get(id)?.nom ?? '');
        return [r.nom, ...noms].some((texte) => normaliser(texte).includes(terme));
      })
      .sort((a, b) => scorePourTri(b, moisTri) - scorePourTri(a, moisTri) || a.nom.localeCompare(b.nom, 'fr'));
  }, [donnees.recettes, recherche, filtre, moisTri, monde.index]);

  const total = donnees.recettes.length;
  const autreMois = filtre.type === 'mois' && filtre.mois !== maintenant ? filtre.mois : null;

  return (
    <div class="flex flex-col gap-4">
      <header class="flex items-baseline justify-between gap-3 pt-2">
        <h1 tabIndex={-1} class="display text-[30px] outline-none">
          Mes recettes
        </h1>
        {large && total > 0 ? (
          <a class="btn btn-plein px-4" href={lien({ nom: 'nouvelle-recette' })}>
            <Icone nom="plus" taille={20} />
            Ajouter
          </a>
        ) : (
          total > 0 && (
            <span class="text-sm text-encre-2">
              {pluriel(total, 'recette')}
            </span>
          )
        )}
      </header>

      {total === 0 ? (
        <div class="bloc flex flex-col gap-4">
          <p class="display text-2xl leading-tight">Aucune recette pour l’instant</p>
          <p class="text-encre-2">Ajoutez une recette en cochant ses légumes : l’app calcule ses mois de saison.</p>
          <a class="btn btn-plein self-start" href={lien({ nom: 'nouvelle-recette' })}>
            <Icone nom="plus" taille={20} />
            Ajouter une recette
          </a>
        </div>
      ) : (
        <>
          <div class="relative">
            <Icone nom="recherche" taille={20} class="pointer-events-none absolute top-4 left-4 text-encre-2" />
            <label class="sr-only" for="recherche-recettes">
              Chercher une recette ou un légume
            </label>
            <input
              id="recherche-recettes"
              class="champ pl-12"
              type="search"
              placeholder="Recette ou légume…"
              value={recherche}
              onInput={(e) => setRecherche(e.currentTarget.value)}
            />
          </div>
          <div class="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]" role="group" aria-label="Filtrer par saison">
            <button type="button" class="filtre" aria-pressed={filtre.type === 'toutes'} onClick={() => setFiltre({ type: 'toutes' })}>
              Toutes
            </button>
            <button
              type="button"
              class="filtre"
              aria-pressed={filtre.type === 'mois' && filtre.mois === maintenant}
              onClick={() => setFiltre({ type: 'mois', mois: maintenant })}
            >
              De saison en {NOMS_MOIS[maintenant - 1]}
            </button>
            <label class="relative">
              <span class="sr-only">De saison en un autre mois</span>
              <select
                class={`filtre appearance-none pr-9 ${autreMois !== null ? 'filtre-actif' : ''}`}
                value={autreMois ?? ''}
                onChange={(e) => {
                  const m = Number(e.currentTarget.value);
                  setFiltre(m ? { type: 'mois', mois: m } : { type: 'toutes' });
                }}
              >
                <option value="">Autre mois</option>
                {NOMS_MOIS.map((nom, i) => (
                  <option key={nom} value={i + 1}>
                    De saison en {nom}
                  </option>
                ))}
              </select>
              <Icone nom="bas" taille={16} class="pointer-events-none absolute top-3.5 right-3.5" />
            </label>
          </div>
          <p class="text-sm text-encre-2" aria-live="polite">
            {etatListe(affichees.length, recherche, moisTri)}
          </p>
          <ul class="flex flex-col gap-2.5">
            {affichees.map((r) => (
              <li key={r.id}>
                <CarteRecette recette={r} index={monde.index} mois={moisTri} active={r.id === idActif} />
              </li>
            ))}
          </ul>
        </>
      )}
      {total > 0 && !large && (
        <a
          class="btn btn-plein fixed right-5 bottom-[100px] z-10 shadow-[0_6px_18px_rgb(34_26_32/0.22)] md:bottom-8"
          href={lien({ nom: 'nouvelle-recette' })}
        >
          <Icone nom="plus" taille={20} />
          Ajouter une recette
        </a>
      )}
    </div>
  );
}

/** Téléphone et tablette portrait : liste ou détail. Tablette paysage : liste + détail côte à côte. */
export function EcranRecettes({ id }: { id?: string }) {
  const large = useLarge();
  return (
    <AvecCatalogue titre={id ? 'Recette' : 'Mes recettes'}>
      {(monde) => {
        if (!large) return id ? <DetailRecette id={id} monde={monde} /> : <ListeRecettes monde={monde} />;
        return (
          <div class="grid grid-cols-[400px_minmax(0,1fr)] gap-10">
            <div class="pb-24">
              <ListeRecettes monde={monde} idActif={id} large />
            </div>
            <div class="sticky top-5 self-start">
              {id ? (
                <DetailRecette id={id} monde={monde} enColonne />
              ) : (
                <p class="pt-16 text-center text-encre-2">Choisissez une recette pour voir sa saison.</p>
              )}
            </div>
          </div>
        );
      }}
    </AvecCatalogue>
  );
}
