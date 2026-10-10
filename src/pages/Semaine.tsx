import { useEffect, useState } from 'preact/hooks';
import { AvecCatalogue, type Monde } from '../components/AvecCatalogue';
import { Dialogue } from '../components/Dialogue';
import { BilanSemaine, PictosTypes } from '../components/Equilibre';
import { Icone } from '../components/Icone';
import { FenetreNouveautes } from '../components/Nouveautes';
import { BadgeSaison } from '../components/Saison';
import { Vignette } from '../components/Vignette';
import { MOIS_ABREGES, NOMS_JOURS, NOMS_MOIS, NOMS_SAISONS, deMois, majuscule, moisCourant, saisonDuMois, semaineIso } from '../lib/calendrier';
import { deSaison } from '../lib/catalogue';
import { useDonnees } from '../lib/donnees';
import { compter, typesRecette, type TypeRepas } from '../lib/equilibre';
import { ideesDeSaison, type IdeeProposee } from '../lib/idees';
import { prendreDemandeIdees, prendreMessage, reserverPourLaSemaine } from '../lib/intention';
import { finLancement } from '../lib/lancement';
import { VERSION_ACTUELLE, versionAPresenter, type Nouveaute, type Version } from '../lib/nouveautes';
import { alignerPlanning, basculerDehors, basculerGarde, changerRecette, estDehors, genererSemaine, propositionsHorsSaison, rangerPlanning, remplirVides, semainePrecedente } from '../lib/planning';
import { enregistrerRecette } from '../lib/recettes';
import { lien, naviguer } from '../lib/routeur';
import { libelleSaison, niveauSaison } from '../lib/saison';
import type { Legume, Moment, Planning, Slot } from '../lib/types';
import { listeNaturelle, pluriel } from '../lib/texte';
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

function PremierLancement({ onIdees }: { onIdees: (() => void) | null }) {
  return (
    <section aria-labelledby="titre-carnet" class="bloc flex flex-col gap-4.5 px-5 py-5.5">
      <h2 id="titre-carnet" class="display text-2xl leading-tight">
        Votre carnet est encore vide
      </h2>
      <ol class="flex flex-col gap-3.5">
        {['Notez une recette et cochez ses ingrédients.', 'L’app calcule ses mois de saison.', 'Elle compose vos repas de la semaine, de saison d’abord.'].map(
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
      {onIdees && (
        <button type="button" class="btn btn-plein w-full" onClick={onIdees}>
          <Icone nom="changer" taille={22} />
          Partir d’idées de saison
        </button>
      )}
      <a class={`btn w-full ${onIdees ? 'btn-ligne' : 'btn-plein'}`} href={lien({ nom: 'nouvelle-recette' })}>
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

/** « Courge » → « courge », mais « Saint-Jacques » reste un nom propre. */
const enMinuscule = (nom: string) => (/^Saint-/.test(nom) ? nom : nom.charAt(0).toLowerCase() + nom.slice(1));

/** Une idée de saison à cocher : son nom, ses produits du moment et ses types. */
function LigneIdee({ proposee, coche, onBasculer }: { proposee: IdeeProposee; coche: boolean; onBasculer: () => void }) {
  const { idee, vedettes, types } = proposee;
  return (
    <label class="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-trait bg-carte px-3.5 py-2.5">
      <input type="checkbox" class="size-5 shrink-0 accent-[var(--encre)]" checked={coche} onChange={onBasculer} />
      <span class="flex min-w-0 flex-1 flex-col gap-1">
        <span class="font-semibold leading-snug">{idee.nom}</span>
        <span class="flex items-center gap-2 text-sm text-encre-2">
          <span class="flex shrink-0" aria-hidden="true">
            {vedettes.slice(0, 3).map((l) => (
              <Vignette key={l.id} icone={l.icone} taille={24} />
            ))}
          </span>
          <span>{majuscule(listeNaturelle(vedettes.map((l) => enMinuscule(l.nom.replace(/ \(.*\)$/, '')))))}</span>
        </span>
      </span>
      <PictosTypes types={types} />
    </label>
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
  dehors: boolean;
  types: TypeRepas[];
  onGarder: () => void;
  onChanger: () => void;
  onDehors: () => void;
  onChoisir?: () => void;
}

function BoutonDehors({ libelle, onDehors }: { libelle: string; onDehors: () => void }) {
  return (
    <button type="button" class="ico relative z-[1]" aria-label={`Je mange dehors ${libelle}`} onClick={onDehors}>
      <Icone nom="dehors" taille={22} />
    </button>
  );
}

function Repas({ slot, mois, libelle, afficherMoment, delai, peutChanger, choisi, dehors, types, onGarder, onChanger, onDehors, onChoisir }: PropsRepas) {
  const { donnees } = useDonnees();
  const recette = slot.recetteId ? donnees.recettes.find((r) => r.id === slot.recetteId) : undefined;
  // Chaque repas s'adapte à sa propre largeur (requête de conteneur) : étroit, comme dans les deux
  // colonnes midi et soir sur ordinateur, les boutons passent sous le nom au lieu de l'écraser.
  if (dehors) {
    return (
      <div class="apparait @container rounded-2xl bg-creux">
        <div class="flex h-full min-h-14 flex-col justify-center gap-0.5 py-2 pr-1.5 pl-3.5 @xs:flex-row @xs:items-center @xs:gap-2">
          <p class="flex flex-wrap items-center gap-x-2 text-encre-2 @xs:flex-1">
            {afficherMoment && <span class="etiq text-xs">{MOMENTS[slot.moment]}</span>}
            <span class="inline-flex items-center gap-1.5">
              <Icone nom="dehors" taille={20} class="shrink-0" />
              Repas dehors
            </span>
          </p>
          <button type="button" class="btn btn-texte -ml-3 min-h-11 self-start px-3 text-[15px] @xs:ml-0 @xs:self-auto" aria-label={`Je mange à la maison ${libelle}`} onClick={onDehors}>
            À la maison
          </button>
        </div>
      </div>
    );
  }
  if (!recette) {
    return (
      <div class="@container rounded-2xl border-[1.5px] border-dashed border-trait-fort">
        <div class="flex h-full min-h-18 flex-col justify-center gap-0.5 py-2.5 pr-1.5 pl-3.5 @xs:flex-row @xs:items-center @xs:gap-1.5">
          <p class="text-encre-2 @xs:flex-1">
            {afficherMoment && <span class="etiq mr-2 text-xs">{MOMENTS[slot.moment]}</span>}
            Pas de recette disponible
          </p>
          <div class="-ml-2.5 @xs:ml-0">
            <BoutonDehors libelle={libelle} onDehors={onDehors} />
          </div>
        </div>
      </div>
    );
  }
  const changementImpossible = slot.verrouille || !peutChanger;
  return (
    <div
      class={`@container relative rounded-2xl bg-carte ${
        choisi ? 'border-[1.5px] border-saison bg-saison-pale' : slot.verrouille ? 'border-[1.5px] border-encre' : 'border border-trait'
      }`}
    >
      <div class="flex h-full min-h-18 flex-col gap-1 py-3 pr-1.5 pl-3.5 @xs:flex-row @xs:items-center @xs:gap-1.5">
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
            <PictosTypes types={types} />
            {slot.verrouille && <span class="text-sm text-encre-2">Gardé</span>}
          </div>
        </div>
        <div class="mt-auto -ml-2.5 flex shrink-0 @xs:mt-0 @xs:ml-0">
          <BoutonDehors libelle={libelle} onDehors={onDehors} />
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
      </div>
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
  // Fenêtre « compléter la semaine » : idées de saison du carnet intégré, recettes hors saison, et celles cochées.
  const [manque, setManque] = useState<{
    repas: number;
    idees: IdeeProposee[];
    ideesCochees: string[];
    /** Idées déjà montrées, pour que « Autres idées » en propose de nouvelles. */
    vues: string[];
    ids: string[];
    coches: string[];
    ecartees: number;
  } | null>(null);
  // Retour d'une recette créée depuis cette fenêtre.
  const [message] = useState(prendreMessage);
  // « Quoi de neuf » : présenté une fois par version, quand l'écran de lancement est parti.
  const [nouveautes, setNouveautes] = useState<Version | null>(null);

  useEffect(() => {
    if (!cascade) return;
    const fin = setTimeout(() => setCascade(false), 800);
    return () => clearTimeout(fin);
  }, [cascade]);

  const aujourdHui = (new Date().getDay() + 6) % 7;
  const deuxMoments = donnees.reglages.moments.length === 2;
  const nbRepas = planning.slots.length;
  const gardes = planning.slots.filter((s) => s.verrouille && s.recetteId).length;
  const vides = enregistre ? planning.slots.filter((s) => !s.recetteId && !estDehors(s, donnees.reglages)).length : 0;
  const disponiblesPourChanger = donnees.recettes.length > planning.slots.filter((s) => s.recetteId).length;
  const dimanche = new Date(lundi);
  dimanche.setDate(lundi.getDate() + donnees.reglages.jours - 1);
  const libelleJour = (s: Slot) => `${NOMS_JOURS[s.jour]} ${s.moment}`;
  const enregistrer = (p: Planning) => modifier((d) => ({ ...d, plannings: rangerPlanning(d.plannings, p, precedente) }));

  const typesParId = new Map(donnees.recettes.map((r) => [r.id, typesRecette(r, monde.index)]));
  const typesDe = (id: string) => typesParId.get(id) ?? [];
  const contexte = { recettes: donnees.recettes, reglages: donnees.reglages, mois, precedent, typesDe };
  const limitesActives = Object.values(donnees.reglages.limites).some((l) => l !== null);
  // Idées de saison : jamais plus que de quoi remplir les repas vides, plus deux pour choisir.
  const chercherIdees = (p: Planning, nombre: number, vues: string[] = []) =>
    ideesDeSaison({ mois, index: monde.index, recettes: donnees.recettes, compte: compter(p.slots.map((s) => s.recetteId), typesDe), limites: donnees.reglages.limites, nombre, dejaVues: vues });
  // Sans repas vide (« Voir les idées » d'une semaine complète), on parcourt simplement six idées.
  const proposer = (p: Planning, repas: number, ecartees = 0) => {
    const idees = chercherIdees(p, repas > 0 ? Math.min(repas + 2, 16) : 6);
    const ideesCochees = idees.slice(0, repas).map((x) => x.idee.nom);
    const ids = propositionsHorsSaison(p, contexte).slice(0, repas).map((r) => r.id);
    // Les idées de saison passent avant les recettes hors saison.
    setManque({ repas, idees, ideesCochees, vues: [], ids, coches: ids.slice(0, Math.max(0, repas - ideesCochees.length)), ecartees });
  };
  const autresIdees = () => {
    if (!manque) return;
    const vues = [...manque.vues, ...manque.idees.map((x) => x.idee.nom)];
    const idees = chercherIdees(planning, manque.idees.length, vues);
    setManque({ ...manque, idees, vues, ideesCochees: idees.slice(0, Math.max(0, manque.repas - manque.coches.length)).map((x) => x.idee.nom) });
    setAnnonce('Nouvelles idées de saison proposées.');
  };
  const horsSaisonDisponibles = propositionsHorsSaison(planning, contexte).length;
  const ideesDisponibles = chercherIdees(planning, 1).length > 0;
  const repasALaMaison = planning.slots.filter((s) => !estDehors(s, donnees.reglages)).length;
  const ouvrirIdees = () => proposer(planning, planning.slots.filter((s) => !s.recetteId && !estDehors(s, donnees.reglages)).length);

  useEffect(() => {
    // Arrivée depuis « Voir les idées » des réglages.
    if (prendreDemandeIdees()) return void ouvrirIdees();
    const version = versionAPresenter(donnees);
    if (!version) return;
    let actif = true;
    finLancement.then(() => actif && setNouveautes(version));
    return () => {
      actif = false;
    };
  }, []);

  const fermerNouveautes = () => {
    setNouveautes(null);
    modifier((d) => ({ ...d, nouveautesVue: VERSION_ACTUELLE }));
  };
  const suivreNouveaute = (lien: NonNullable<Nouveaute['lien']>) => {
    fermerNouveautes();
    if (lien === 'calendrier') naviguer({ nom: 'saisons' });
    else ouvrirIdees();
  };

  /** Les idées cochées deviennent des recettes ; elles et les recettes hors saison cochées vont dans les repas vides. */
  const completer = () => {
    if (!manque) return;
    const choisies = manque.idees.filter((x) => manque.ideesCochees.includes(x.idee.nom));
    modifier((d) => {
      let suite = d;
      const nouvelles: string[] = [];
      for (const { idee } of choisies) {
        const { donnees: apres, recette } = enregistrerRecette(suite, { nom: idee.nom, legumes: idee.ingredients, notes: '' }, monde.index);
        suite = apres;
        nouvelles.push(recette.id);
      }
      const actuel = alignerPlanning(suite.plannings.find((x) => x.semaine === cle), suite.reglages, cle);
      return { ...suite, plannings: rangerPlanning(suite.plannings, remplirVides(actuel, [...nouvelles, ...manque.coches], suite.reglages), precedente) };
    });
    const places = Math.min(choisies.length + manque.coches.length, manque.repas);
    const carnet = `${pluriel(choisies.length, 'nouvelle recette', 'nouvelles recettes')} dans le carnet.`;
    setAnnonce(places === 0 ? majuscule(carnet) : `${pluriel(places, 'repas')} ${places > 1 ? 'ajoutés' : 'ajouté'} à la semaine` + (choisies.length > 0 ? `, ${carnet}` : '.'));
    setManque(null);
  };

  const ajouterRecette = () => {
    reserverPourLaSemaine(cle);
    setManque(null);
    naviguer({ nom: 'nouvelle-recette' });
  };

  const generer = () => {
    const { planning: nouveau, manquants, ecartees } = genererSemaine({ ...contexte, semaine: cle, actuel: planning });
    enregistrer(nouveau);
    setCascade(true);
    setAnnonce(manquants > 0 ? `Semaine générée, ${manquants} repas sans recette de saison.` : `Semaine générée : ${nouveau.slots.length} repas.`);
    if (manquants > 0) proposer(nouveau, manquants, ecartees);
  };

  const changer = (s: Slot) => {
    const nouveau = changerRecette(planning, s, contexte);
    if (!nouveau) return setAnnonce(limitesActives ? 'Aucune autre recette de saison disponible dans vos limites.' : 'Aucune autre recette de saison disponible.');
    enregistrer(nouveau);
    const recette = donnees.recettes.find((r) => r.id === nouveau.slots.find((x) => x.jour === s.jour && x.moment === s.moment)?.recetteId);
    setAnnonce(`${majuscule(libelleJour(s))} : ${recette?.nom ?? ''}.`);
  };

  const mangerDehors = (s: Slot) => {
    const dehors = !estDehors(s, donnees.reglages);
    enregistrer(basculerDehors(planning, s, donnees.reglages));
    setAnnonce(dehors ? `${majuscule(libelleJour(s))} : repas dehors.` : `${majuscule(libelleJour(s))} : repas à la maison.`);
  };

  const garder = (s: Slot) => {
    enregistrer(basculerGarde(planning, s));
    setAnnonce(s.verrouille ? `Repas de ${libelleJour(s)} libéré.` : `Repas de ${libelleJour(s)} gardé.`);
  };

  const jours = Array.from({ length: donnees.reglages.jours }, (_, j) => j);
  // Sur ordinateur, la colonne de droite montre toujours une recette : celle choisie, sinon la prochaine de la semaine.
  const idChoisi = large
    ? (choisi ?? (planning.slots.find((s) => s.jour >= aujourdHui && s.recetteId) ?? planning.slots.find((s) => s.recetteId))?.recetteId ?? null)
    : null;

  const nbCoches = manque ? manque.ideesCochees.length + manque.coches.length : 0;
  const fenetre = (
    <Dialogue ouvert={manque !== null} onFermer={() => setManque(null)} titreId="titre-manque">
      {manque && (
        <div class="flex flex-col gap-4">
          <h2 id="titre-manque" class="display text-2xl leading-tight">
            {manque.repas === 0 ? 'Des idées de saison' : manque.idees.length > 0 ? 'Des idées de saison pour compléter' : 'Pas assez de recettes de saison'}
          </h2>
          <p class="text-encre-2">
            {manque.repas > 0 && `${manque.repas === 1 ? 'Un repas reste' : `${manque.repas} repas restent`} sans recette de saison. `}
            {manque.idees.length > 0
              ? `Voici des idées ${deMois(NOMS_MOIS[mois - 1] ?? '')}, avec les produits du moment : celles que vous cochez rejoignent vos recettes.`
              : manque.ids.length > 0
                ? 'Vous pouvez compléter avec des recettes hors saison, ou en ajouter une nouvelle.'
                : 'Toutes vos autres recettes sont déjà dans la semaine : ajoutez-en une pour compléter.'}
          </p>
          {manque.ecartees > 0 && (
            <p class="alerte bg-creux">
              <Icone nom="info" taille={22} class="mt-px shrink-0" />
              <span>
                {manque.ecartees === 1 ? 'Une recette de saison est écartée' : `${manque.ecartees} recettes de saison sont écartées`} par vos limites de la semaine.{' '}
                <a href={lien({ nom: 'reglages' })} onClick={() => setManque(null)}>
                  Ajuster les limites
                </a>
              </span>
            </p>
          )}
          {manque.idees.length > 0 && (
            <fieldset class="flex flex-col gap-2">
              <legend class="etiq mb-2">Idées {deMois(NOMS_MOIS[mois - 1] ?? '')}</legend>
              {manque.idees.map((x) => {
                const coche = manque.ideesCochees.includes(x.idee.nom);
                return (
                  <LigneIdee
                    key={x.idee.nom}
                    proposee={x}
                    coche={coche}
                    onBasculer={() =>
                      setManque({ ...manque, ideesCochees: coche ? manque.ideesCochees.filter((n) => n !== x.idee.nom) : [...manque.ideesCochees, x.idee.nom] })
                    }
                  />
                );
              })}
              <button type="button" class="btn btn-texte -ml-3 self-start" onClick={autresIdees}>
                <Icone nom="changer" taille={20} />
                Autres idées
              </button>
            </fieldset>
          )}
          {manque.ids.length > 0 && (
            <fieldset class="flex flex-col gap-2">
              <legend class="etiq mb-2">{manque.idees.length > 0 ? 'Vos recettes hors saison' : 'Proposées hors saison'}</legend>
              {manque.ids.map((id) => {
                const recette = donnees.recettes.find((r) => r.id === id);
                if (!recette) return null;
                const coche = manque.coches.includes(id);
                return (
                  <label key={id} class="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-trait bg-carte px-3.5 py-2.5">
                    <input
                      type="checkbox"
                      class="size-5 shrink-0 accent-[var(--encre)]"
                      checked={coche}
                      onChange={() => setManque({ ...manque, coches: coche ? manque.coches.filter((c) => c !== id) : [...manque.coches, id] })}
                    />
                    <span class="flex min-w-0 flex-1 flex-col">
                      <span class="font-semibold">{recette.nom}</span>
                      <span class="text-sm text-encre-2">Saison : {libelleSaison(recette.scoreParMois)}</span>
                    </span>
                    <BadgeSaison niveau="hors" />
                  </label>
                );
              })}
            </fieldset>
          )}
          <div class="flex flex-col gap-2 pt-1">
            {manque.repas > 0 && nbCoches > manque.repas && (
              <p class="text-center text-sm text-encre-2">
                {pluriel(nbCoches - manque.repas, 'recette cochée', 'recettes cochées')} en trop : les idées en trop rejoignent seulement vos recettes.
              </p>
            )}
            {(manque.idees.length > 0 || manque.ids.length > 0) && (
              <button type="button" class="btn btn-plein w-full" aria-disabled={nbCoches === 0} onClick={() => nbCoches > 0 && completer()}>
                {nbCoches === 0
                  ? 'Cochez au moins une recette'
                  : manque.repas === 0
                    ? nbCoches === 1
                      ? 'Ajouter cette idée à mes recettes'
                      : `Ajouter ces ${nbCoches} idées à mes recettes`
                    : Math.min(nbCoches, manque.repas) === 1
                    ? 'Ajouter ce repas à la semaine'
                    : `Ajouter ces ${Math.min(nbCoches, manque.repas)} repas à la semaine`}
              </button>
            )}
            <button type="button" class={`btn w-full ${manque.idees.length > 0 || manque.ids.length > 0 ? 'btn-ligne' : 'btn-plein'}`} onClick={ajouterRecette}>
              <Icone nom="plus" taille={20} />
              Ajouter une recette
            </button>
            <button type="button" class="btn btn-texte self-center" onClick={() => setManque(null)}>
              {manque.repas === 0 ? 'Fermer' : manque.repas === 1 ? 'Laisser ce repas vide' : 'Laisser ces repas vides'}
            </button>
          </div>
        </div>
      )}
    </Dialogue>
  );

  // Carnet vide : on part d'idées de saison ou d'une première recette.
  if (donnees.recettes.length === 0) {
    return (
      <>
        <PremierLancement onIdees={ideesDisponibles ? () => proposer(planning, repasALaMaison) : null} />
        <p class="sr-only" aria-live="polite">
          {annonce}
        </p>
        {fenetre}
      </>
    );
  }

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
      {enregistre && planning.slots.some((x) => x.recetteId) && (
        <BilanSemaine compte={compter(planning.slots.map((x) => x.recetteId), typesDe)} limites={donnees.reglages.limites} />
      )}
      <p class="sr-only" aria-live="polite">
        {annonce}
      </p>

      {!enregistre && <p class="text-encre-2">Votre semaine n’est pas encore prévue : générez-la pour remplir vos {nbRepas} repas.</p>}

      {message && (
        <p class="alerte apparait bg-ok-pale" role="status">
          <Icone nom="coche" taille={22} class="mt-px shrink-0" />
          {message}
        </p>
      )}

      {vides > 0 && (
        <div class="alerte bg-saison-pale" role="status">
          <Icone nom="info" taille={22} class="mt-px shrink-0" />
          <div class="flex flex-col gap-1">
            <p>
              <strong>Il manque {pluriel(vides, 'recette')} de saison pour remplir la semaine.</strong>{' '}
              {ideesDisponibles
                ? 'Des idées de saison, faites avec les produits du moment, peuvent compléter les repas vides.'
                : horsSaisonDisponibles > 0
                  ? 'Les recettes hors saison ne sont ajoutées que si vous le choisissez.'
                  : 'Une recette ne revient pas deux fois dans la semaine.'}
            </p>
            <div class="-ml-3 flex flex-wrap">
              {(ideesDisponibles || horsSaisonDisponibles > 0) && (
                <button type="button" class="btn btn-texte" onClick={() => proposer(planning, vides)}>
                  {ideesDisponibles ? 'Voir les idées de saison' : 'Compléter hors saison'}
                </button>
              )}
              <button type="button" class="btn btn-texte" onClick={ajouterRecette}>
                Ajouter une recette
              </button>
              <a class="btn btn-texte" href={lien({ nom: 'reglages' })}>
                Prévoir moins de repas
              </a>
            </div>
          </div>
        </div>
      )}

      {fenetre}
      <FenetreNouveautes version={nouveautes} onFermer={fermerNouveautes} onLien={suivreNouveaute} />

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
                    dehors={estDehors(s, donnees.reglages)}
                    types={s.recetteId ? typesDe(s.recetteId) : []}
                    onDehors={() => mangerDehors(s)}
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
    <div class={`grid gap-10 ${deuxMoments ? 'grid-cols-[minmax(0,520px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,600px)_minmax(0,1fr)]' : 'grid-cols-[minmax(0,470px)_minmax(0,1fr)]'}`}>
      {liste}
      <div class="sticky top-5 self-start">
        {idChoisi ? (
          <DetailRecette id={idChoisi} monde={monde} enColonne />
        ) : (
          <p class="bloc text-encre-2">Générez la semaine : la recette du prochain repas s’affichera ici.</p>
        )}
      </div>
    </div>
  );
}

export function Semaine() {
  const mois = moisCourant();
  const { numero } = semaineIso();
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
          <MaSemaine monde={monde} large={large} />
        </div>
      )}
    </AvecCatalogue>
  );
}
