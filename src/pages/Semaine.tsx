import { useEffect, useState } from 'preact/hooks';
import { AvecCatalogue, type Monde } from '../components/AvecCatalogue';
import { Icone } from '../components/Icone';
import { BadgeSaison } from '../components/Saison';
import { Vignette } from '../components/Vignette';
import { MOIS_ABREGES, NOMS_JOURS, NOMS_MOIS, NOMS_SAISONS, majuscule, moisCourant, saisonDuMois, semaineIso } from '../lib/calendrier';
import { deSaison } from '../lib/catalogue';
import { useDonnees } from '../lib/donnees';
import { alignerPlanning, basculerGarde, changerRecette, genererSemaine, rangerPlanning, semainePrecedente } from '../lib/planning';
import { lien } from '../lib/routeur';
import { niveauSaison } from '../lib/saison';
import type { Legume, Moment, Planning, Slot } from '../lib/types';
import { pluriel } from '../lib/texte';
import { useLarge } from '../lib/useLarge';
import { DetailRecette } from './RecetteDetail';

const MOMENTS: Record<Moment, string> = { midi: 'Midi', soir: 'Soir' };
const NB_A_LA_UNE = 7;

/** Produits mis en avant : saisons courtes d'abord (ce qu'on ne trouve pas longtemps), légumes en tête. */
function aLaUne(produits: Legume[]): Legume[] {
  const parRarete = (a: Legume, b: Legume) => a.mois.length - b.mois.length || a.nom.localeCompare(b.nom, 'fr');
  const legumes = produits.filter((p) => p.categorie === 'legumes').sort(parRarete);
  const autres = produits.filter((p) => p.categorie !== 'legumes').sort(parRarete);
  return [...legumes.slice(0, 5), ...autres.slice(0, 2)].slice(0, NB_A_LA_UNE);
}

function EnCeMoment({ monde, mois }: { monde: Monde; mois: number }) {
  const produits = deSaison(monde.legumes, mois);
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

function PremierLancement() {
  return (
    <section aria-labelledby="titre-carnet" class="bloc flex flex-col gap-4.5 px-5 py-5.5">
      <h2 id="titre-carnet" class="display text-2xl leading-tight">
        Votre carnet est encore vide
      </h2>
      <ol class="flex flex-col gap-3.5">
        {['Notez une recette et cochez ses légumes.', 'L’app calcule ses mois de saison.', 'Elle compose vos repas de la semaine, de saison d’abord.'].map(
          (etape, i) => (
            <li key={etape} class="grid grid-cols-[32px_minmax(0,1fr)] items-start gap-3">
              <span class="display text-2xl leading-none text-saison-texte" aria-hidden="true">
                {i + 1}
              </span>
              <p>{etape}</p>
            </li>
          ),
        )}
      </ol>
      <a class="btn btn-plein w-full" href={lien({ nom: 'nouvelle-recette' })}>
        <Icone nom="plus" taille={20} />
        Ajouter ma première recette
      </a>
      <a class="btn btn-texte self-center" href={lien({ nom: 'reglages' })}>
        Importer une sauvegarde
      </a>
      <p class="text-center text-sm text-encre-2">Pas de compte : tout reste sur cet appareil.</p>
    </section>
  );
}

interface PropsRepas {
  slot: Slot;
  mois: number;
  libelle: string;
  afficherMoment: boolean;
  delai: number;
  peutChanger: boolean;
  choisi: boolean;
  onGarder: () => void;
  onChanger: () => void;
  onChoisir?: () => void;
}

function Repas({ slot, mois, libelle, afficherMoment, delai, peutChanger, choisi, onGarder, onChanger, onChoisir }: PropsRepas) {
  const { donnees } = useDonnees();
  const recette = slot.recetteId ? donnees.recettes.find((r) => r.id === slot.recetteId) : undefined;
  if (!recette) {
    return (
      <div class="flex min-h-18 items-center rounded-2xl border-[1.5px] border-dashed border-trait-fort px-3.5 py-3">
        <p class="text-encre-2">
          {afficherMoment && <span class="etiq mr-2 text-xs">{MOMENTS[slot.moment]}</span>}
          Pas de recette disponible
        </p>
      </div>
    );
  }
  const changementImpossible = slot.verrouille || !peutChanger;
  return (
    <div
      class={`relative flex min-h-18 items-center gap-1.5 rounded-2xl bg-carte py-3 pr-1.5 pl-3.5 ${
        choisi ? 'border-[1.5px] border-saison bg-saison-pale' : slot.verrouille ? 'border-[1.5px] border-encre' : 'border border-trait'
      }`}
    >
      <div key={recette.id} class="apparait flex min-w-0 flex-1 flex-col gap-1" style={{ animationDelay: `${delai}ms` }}>
        {afficherMoment && <span class="etiq text-xs">{MOMENTS[slot.moment]}</span>}
        {onChoisir ? (
          <button type="button" class="display text-left text-lg leading-tight after:absolute after:inset-0" aria-pressed={choisi} onClick={onChoisir}>
            {recette.nom}
          </button>
        ) : (
          <a class="display text-lg leading-tight after:absolute after:inset-0" href={lien({ nom: 'recette', id: recette.id })}>
            {recette.nom}
          </a>
        )}
        <div class="flex flex-wrap items-center gap-2">
          <BadgeSaison niveau={niveauSaison(recette.scoreParMois, mois)} />
          {slot.verrouille && <span class="text-sm text-encre-2">Gardé</span>}
        </div>
      </div>
      <button
        type="button"
        class={`ico relative z-[1] ${slot.verrouille ? 'bg-encre text-papier' : ''}`}
        aria-pressed={slot.verrouille}
        aria-label={`Garder le repas de ${libelle}`}
        onClick={onGarder}
      >
        <Icone nom={slot.verrouille ? 'garde' : 'garder'} taille={22} />
      </button>
      <button
        type="button"
        class={`ico relative z-[1] ${changementImpossible ? 'cursor-not-allowed opacity-35' : ''}`}
        aria-disabled={changementImpossible}
        aria-label={`Changer la recette de ${libelle}${slot.verrouille ? ' (repas gardé)' : !peutChanger ? ' (aucune autre recette disponible)' : ''}`}
        onClick={() => !changementImpossible && onChanger()}
      >
        <Icone nom="changer" taille={22} />
      </button>
    </div>
  );
}

function MaSemaine({ monde, large }: { monde: Monde; large: boolean }) {
  const { donnees, modifier } = useDonnees();
  const mois = moisCourant();
  const { cle, lundi } = semaineIso();
  const precedente = semainePrecedente();
  const enregistre = donnees.plannings.find((p) => p.semaine === cle);
  const planning = alignerPlanning(enregistre, donnees.reglages, cle);
  const precedent = donnees.plannings.find((p) => p.semaine === precedente);
  const [annonce, setAnnonce] = useState('');
  const [cascade, setCascade] = useState(false);
  const [choisi, setChoisi] = useState<string | null>(null);

  useEffect(() => {
    if (!cascade) return;
    const fin = setTimeout(() => setCascade(false), 800);
    return () => clearTimeout(fin);
  }, [cascade]);

  const aujourdHui = (new Date().getDay() + 6) % 7;
  const deuxMoments = donnees.reglages.moments.length === 2;
  const nbRepas = planning.slots.length;
  const gardes = planning.slots.filter((s) => s.verrouille && s.recetteId).length;
  const vides = enregistre ? planning.slots.filter((s) => !s.recetteId).length : 0;
  const disponiblesPourChanger = donnees.recettes.length > planning.slots.filter((s) => s.recetteId).length;
  const dimanche = new Date(lundi);
  dimanche.setDate(lundi.getDate() + donnees.reglages.jours - 1);
  const libelleJour = (s: Slot) => `${NOMS_JOURS[s.jour]} ${s.moment}`;
  const enregistrer = (p: Planning) => modifier((d) => ({ ...d, plannings: rangerPlanning(d.plannings, p, precedente) }));

  const generer = () => {
    const { planning: nouveau, manquants } = genererSemaine({
      recettes: donnees.recettes,
      reglages: donnees.reglages,
      mois,
      semaine: cle,
      actuel: planning,
      precedent,
    });
    enregistrer(nouveau);
    setCascade(true);
    setAnnonce(manquants > 0 ? `Semaine générée, ${manquants} repas sans recette.` : `Semaine générée : ${nouveau.slots.length} repas.`);
  };

  const changer = (s: Slot) => {
    const nouveau = changerRecette(planning, s, { recettes: donnees.recettes, mois, precedent });
    if (!nouveau) return setAnnonce('Aucune autre recette disponible.');
    enregistrer(nouveau);
    const recette = donnees.recettes.find((r) => r.id === nouveau.slots.find((x) => x.jour === s.jour && x.moment === s.moment)?.recetteId);
    setAnnonce(`${majuscule(libelleJour(s))} : ${recette?.nom ?? ''}.`);
  };

  const garder = (s: Slot) => {
    enregistrer(basculerGarde(planning, s));
    setAnnonce(s.verrouille ? `Repas de ${libelleJour(s)} libéré.` : `Repas de ${libelleJour(s)} gardé.`);
  };

  const jours = Array.from({ length: donnees.reglages.jours }, (_, j) => j);
  const idChoisi = large ? (choisi ?? planning.slots.find((s) => s.jour >= aujourdHui && s.recetteId)?.recetteId ?? null) : null;

  const liste = (
    <section aria-labelledby="titre-semaine" class="flex flex-col gap-4">
      <div class="flex items-baseline justify-between gap-3">
        <h2 id="titre-semaine" class="display text-[21px]">
          Ma semaine
        </h2>
        <span class="text-sm text-encre-2">
          {lundi.getDate()} – {dimanche.getDate()} {MOIS_ABREGES[dimanche.getMonth()]} · {deuxMoments ? `midi et soir` : `${donnees.reglages.jours} ${donnees.reglages.moments[0]}s`}
        </span>
      </div>

      <div class="flex flex-col gap-2">
        <button type="button" class="btn btn-plein w-full" onClick={generer}>
          <Icone nom="changer" taille={22} />
          Générer ma semaine
        </button>
        {gardes > 0 && (
          <p class="text-center text-sm text-encre-2">
            {gardes === 1 ? 'Le repas gardé reste en place.' : `Les ${gardes} repas gardés restent en place.`}
          </p>
        )}
      </div>
      <p class="sr-only" aria-live="polite">
        {annonce}
      </p>

      {!enregistre && <p class="text-encre-2">Votre semaine n’est pas encore prévue : générez-la pour remplir vos {nbRepas} repas.</p>}

      {vides > 0 && (
        <div class="alerte bg-saison-pale" role="status">
          <Icone nom="info" taille={22} class="mt-px shrink-0" />
          <div class="flex flex-col gap-1">
            <p>
              <strong>Il manque {pluriel(vides, 'recette')} pour remplir la semaine.</strong>{' '}
              Vous en avez {donnees.recettes.length} pour {nbRepas} repas, et une recette ne revient pas deux fois.
            </p>
            <div class="-ml-3 flex flex-wrap">
              <a class="btn btn-texte" href={lien({ nom: 'nouvelle-recette' })}>
                Ajouter une recette
              </a>
              <a class="btn btn-texte" href={lien({ nom: 'reglages' })}>
                Prévoir moins de repas
              </a>
            </div>
          </div>
        </div>
      )}

      {enregistre && (
        <ol class={`flex flex-col gap-2.5 ${deuxMoments ? 'md:gap-2' : ''}`}>
          {jours.map((j) => {
            const date = new Date(lundi);
            date.setDate(lundi.getDate() + j);
            const passe = j < aujourdHui;
            const slots = planning.slots.filter((s) => s.jour === j);
            return (
              <li key={j} class={`flex flex-col gap-1.5 ${deuxMoments ? 'md:grid md:grid-cols-[60px_repeat(2,minmax(0,1fr))] md:items-stretch md:gap-2.5' : ''}`}>
                <p class={`flex items-baseline gap-2 px-1 ${deuxMoments ? 'md:flex-col md:items-center md:justify-center md:gap-0.5 md:px-0' : ''}`}>
                  <span class={`display text-[22px] leading-none ${j === aujourdHui ? 'text-saison-texte' : passe ? 'text-encre-2' : ''}`}>
                    {date.getDate()}
                  </span>
                  <span class="etiq">{NOMS_JOURS[j]}</span>
                  {j === aujourdHui && (
                    <span class="self-center rounded-[5px] bg-saison px-1.5 pt-1 pb-[3px] font-etiq text-[11px] leading-none font-bold tracking-[0.08em] text-sur-saison uppercase">
                      aujourd’hui
                    </span>
                  )}
                </p>
                {slots.map((s, i) => (
                  <Repas
                    key={`${s.jour}-${s.moment}`}
                    slot={s}
                    mois={mois}
                    libelle={libelleJour(s)}
                    afficherMoment={deuxMoments}
                    delai={cascade ? (j * slots.length + i) * 40 : 0}
                    peutChanger={disponiblesPourChanger}
                    choisi={large && s.recetteId !== null && s.recetteId === idChoisi}
                    onGarder={() => garder(s)}
                    onChanger={() => changer(s)}
                    onChoisir={large ? () => setChoisi(s.recetteId) : undefined}
                  />
                ))}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );

  if (!large) return liste;
  return (
    <div class="grid grid-cols-[minmax(0,470px)_minmax(0,1fr)] gap-10">
      {liste}
      <div class="sticky top-5 self-start">
        {idChoisi ? <DetailRecette id={idChoisi} monde={monde} enColonne /> : null}
      </div>
    </div>
  );
}

export function Semaine() {
  const mois = moisCourant();
  const { numero } = semaineIso();
  const { donnees } = useDonnees();
  const large = useLarge();
  return (
    <AvecCatalogue titre={majuscule(NOMS_MOIS[mois - 1] ?? '')}>
      {(monde) => (
        <div class="flex flex-col gap-6">
          <header class="flex flex-col gap-2.5 pt-2">
            <p class="etiq">
              {NOMS_SAISONS[saisonDuMois(mois)]} · semaine {numero}
            </p>
            <h1 tabIndex={-1} class="display text-[56px] outline-none">
              {majuscule(NOMS_MOIS[mois - 1] ?? '')}
            </h1>
            <EnCeMoment monde={monde} mois={mois} />
          </header>
          {donnees.recettes.length === 0 ? <PremierLancement /> : <MaSemaine monde={monde} large={large} />}
        </div>
      )}
    </AvecCatalogue>
  );
}
