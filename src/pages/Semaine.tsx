import { Icone } from '../components/Icone';
import { Vignette } from '../components/Vignette';
import { NOMS_MOIS, NOMS_SAISONS, majuscule, moisCourant, saisonDuMois, semaineIso } from '../lib/calendrier';
import { deSaison, useCatalogue } from '../lib/catalogue';
import { lien } from '../lib/routeur';
import type { Legume } from '../lib/types';

const NB_A_LA_UNE = 7;

/** Produits mis en avant : saisons courtes d'abord (ce qu'on ne trouve pas longtemps), légumes en tête. */
function aLaUne(produits: Legume[]): Legume[] {
  const parRarete = (a: Legume, b: Legume) => a.mois.length - b.mois.length || a.nom.localeCompare(b.nom, 'fr');
  const legumes = produits.filter((p) => p.categorie === 'legumes').sort(parRarete);
  const autres = produits.filter((p) => p.categorie !== 'legumes').sort(parRarete);
  return [...legumes.slice(0, 5), ...autres.slice(0, 2)].slice(0, NB_A_LA_UNE);
}

function EnCeMoment({ mois }: { mois: number }) {
  const catalogue = useCatalogue();
  if (catalogue.etat === 'chargement') return <p class="text-encre-2">Chargement des produits de saison…</p>;
  if (catalogue.etat === 'erreur') {
    return (
      <p class="text-encre-2">
        Impossible de charger la liste des produits de saison.{' '}
        <button type="button" class="min-h-11 font-semibold text-saison-texte underline" onClick={catalogue.reessayer}>
          Réessayer
        </button>
      </p>
    );
  }
  const produits = deSaison(catalogue.catalogue.legumes, mois);
  const une = aLaUne(produits);
  const reste = produits.length - une.length;
  return (
    <>
      <div class="flex flex-wrap gap-1" aria-hidden="true">
        {une.map((p) => (
          <Vignette key={p.id} icone={p.icone} />
        ))}
      </div>
      <p class="display text-[22px] leading-snug">
        {majuscule(une.map((p) => p.nom.toLowerCase()).join(', '))}
        {reste > 0 && <span class="text-encre-2"> et {reste} autres.</span>}
      </p>
      <a href={lien({ nom: 'saisons' })} class="-ml-3 inline-flex min-h-12 items-center gap-2 self-start px-3 font-semibold text-saison-texte">
        Voir tout ce qui est de saison
        <Icone nom="fleche" taille={20} />
      </a>
    </>
  );
}

export function Semaine() {
  const mois = moisCourant();
  const { numero } = semaineIso();
  return (
    <div class="flex flex-col gap-6">
      <header class="flex flex-col gap-2.5 pt-2">
        <p class="etiq">
          {NOMS_SAISONS[saisonDuMois(mois)]} · semaine {numero}
        </p>
        <h1 tabIndex={-1} class="display text-[56px] outline-none">
          {majuscule(NOMS_MOIS[mois - 1] ?? '')}
        </h1>
        <EnCeMoment mois={mois} />
      </header>
      <section aria-labelledby="titre-semaine" class="flex flex-col gap-3">
        <h2 id="titre-semaine" class="display text-[21px]">
          Ma semaine
        </h2>
        <p class="text-encre-2">Le planning des repas arrive bientôt.</p>
      </section>
    </div>
  );
}
