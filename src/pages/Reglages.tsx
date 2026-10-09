import { useEffect, useRef, useState } from 'preact/hooks';
import { AvecCatalogue, type Monde } from '../components/AvecCatalogue';
import { Dialogue } from '../components/Dialogue';
import { Icone } from '../components/Icone';
import { Vignette } from '../components/Vignette';
import { MOIS_ABREGES, NOMS_JOURS } from '../lib/calendrier';
import { NOMS_CATEGORIES } from '../lib/categories';
import { useApparence } from '../lib/apparence';
import { useDonnees } from '../lib/donnees';
import { useInstallation } from '../lib/installation';
import { plagesDeMois } from '../lib/saison';
import { analyserImport, contenuExport, fusionner, nomFichierExport, remplacer, supprimerLegumePerso, type AnalyseImport } from '../lib/sauvegarde';
import { pluriel } from '../lib/texte';
import type { Apparence } from '../lib/stockage';
import type { Legume, Moment } from '../lib/types';

const UN_JOUR = 24 * 3600 * 1000;

const dateLongue = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

function ilYa(iso: string): string {
  const jours = Math.floor((Date.now() - new Date(iso).getTime()) / UN_JOUR);
  if (jours <= 0) return 'aujourd’hui';
  if (jours === 1) return 'hier';
  return `il y a ${jours} jours`;
}

const resumeMois = (l: Legume) =>
  l.touteLannee
    ? 'toute l’année'
    : plagesDeMois(l.mois)
        .map(([a, b]) => (a === b ? MOIS_ABREGES[a - 1] : `${MOIS_ABREGES[a - 1]} à ${MOIS_ABREGES[b - 1]}`))
        .join(', ');

function Toast({ message, onFin }: { message: string | null; onFin: () => void }) {
  useEffect(() => {
    if (!message) return;
    const minuteur = setTimeout(onFin, 6000);
    return () => clearTimeout(minuteur);
  }, [message]);
  return (
    <div role="status" class="pointer-events-none fixed inset-x-4 bottom-[100px] z-30 flex justify-center md:bottom-8">
      {message && (
        <p class="apparait pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl bg-encre px-4 py-3.5 text-[15px] text-papier">
          <Icone nom="coche" taille={22} class="shrink-0" />
          {message}
        </p>
      )}
    </div>
  );
}

const APPARENCES: [Apparence, string][] = [
  ['auto', 'Automatique'],
  ['clair', 'Clair'],
  ['sombre', 'Sombre'],
];

function ChoixApparence() {
  const { apparence, choisir } = useApparence();
  return (
    <section aria-labelledby="r-apparence" class="flex flex-col gap-2.5">
      <h2 id="r-apparence" class="etiq">
        Apparence
      </h2>
      <div class="bloc flex flex-col gap-3">
        <fieldset class="flex flex-col gap-3">
          <legend class="sr-only">Mode d’affichage</legend>
          <div class="flex flex-wrap gap-2">
            {APPARENCES.map(([valeur, libelle]) => (
              <label key={valeur} class={`filtre ${apparence === valeur ? 'filtre-actif' : ''}`}>
                <input type="radio" name="apparence" class="sr-only" checked={apparence === valeur} onChange={() => choisir(valeur)} />
                {libelle}
              </label>
            ))}
          </div>
        </fieldset>
        <p class="text-sm text-encre-2">
          {apparence === 'auto' ? 'L’app suit le mode clair ou sombre de votre appareil.' : 'Ce choix vaut pour cet appareil.'}
        </p>
      </div>
    </section>
  );
}

function RepasAGenerer() {
  const { donnees, modifier } = useDonnees();
  const { jours, moments } = donnees.reglages;
  const changer = (reglages: Partial<typeof donnees.reglages>) => modifier((d) => ({ ...d, reglages: { ...d.reglages, ...reglages } }));
  const basculer = (m: Moment) => changer({ moments: moments.includes(m) ? moments.filter((x) => x !== m) : [...moments, m] });

  return (
    <section aria-labelledby="r-repas" class="flex flex-col gap-2.5">
      <h2 id="r-repas" class="etiq">
        Repas à générer
      </h2>
      <div class="bloc px-4.5 py-1.5">
        <div class="flex min-h-13 items-center justify-between gap-3">
          <div>
            <p class="font-semibold" id="l-jours">
              Jours planifiés
            </p>
            <p class="text-sm text-encre-2">du lundi au {NOMS_JOURS[jours - 1]}</p>
          </div>
          <div class="flex items-center gap-1 rounded-3xl p-0.5 shadow-[inset_0_0_0_1.5px_var(--trait-fort)]" role="group" aria-labelledby="l-jours">
            <button type="button" class={`ico ${jours <= 1 ? 'opacity-35' : ''}`} aria-disabled={jours <= 1} aria-label="Un jour de moins" onClick={() => jours > 1 && changer({ jours: jours - 1 })}>
              <Icone nom="moins" taille={22} epaisseur={2} />
            </button>
            <output class="min-w-7 text-center text-[17px] font-bold" aria-live="polite">
              {jours}
            </output>
            <button type="button" class={`ico ${jours >= 7 ? 'opacity-35' : ''}`} aria-disabled={jours >= 7} aria-label="Un jour de plus" onClick={() => jours < 7 && changer({ jours: jours + 1 })}>
              <Icone nom="plus" taille={22} />
            </button>
          </div>
        </div>
        <hr class="border-trait" />
        <fieldset class="py-2">
          <legend class="pt-2 font-semibold">Moments</legend>
          {(['midi', 'soir'] as Moment[]).map((m) => {
            const coche = moments.includes(m);
            const dernier = coche && moments.length === 1;
            return (
              <label key={m} class="flex min-h-13 cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  class="size-6 accent-[var(--encre)]"
                  checked={coche}
                  aria-describedby={dernier ? 'aide-moments' : undefined}
                  onChange={(e) => {
                    // Le dernier moment coché ne se décoche pas : il faut au moins un repas par jour.
                    if (dernier) e.currentTarget.checked = true;
                    else basculer(m);
                  }}
                />
                {m === 'midi' ? 'Midi' : 'Soir'}
              </label>
            );
          })}
          {moments.length === 1 && (
            <p id="aide-moments" class="text-sm text-encre-2">
              Il faut au moins un moment par jour.
            </p>
          )}
        </fieldset>
      </div>
      <p class="text-sm text-encre-2">{jours * moments.length} repas par semaine.</p>
    </section>
  );
}

function Installer() {
  const { installee, ios, peutProposer, proposer } = useInstallation();
  if (installee) return null;
  return (
    <section aria-labelledby="r-installer" class="flex flex-col gap-3.5 rounded-[20px] bg-saison-pale p-4.5">
      <h2 id="r-installer" class="display text-[21px]">
        Ajoutez l’app à l’écran d’accueil
      </h2>
      <p class="text-sm">
        {ios
          ? 'Safari efface les données d’un site après 7 jours sans visite. Installée, l’app garde vos recettes et marche sans connexion.'
          : 'Installée, l’app s’ouvre comme les autres, garde vos recettes et marche sans connexion.'}
      </p>
      {peutProposer ? (
        <button type="button" class="btn btn-encre self-start" onClick={proposer}>
          Installer l’app
        </button>
      ) : (
        <ol class="flex flex-col gap-2.5">
          {(ios
            ? [<>Touchez <strong>Partager</strong> dans Safari</>, <>Choisissez <strong>Sur l’écran d’accueil</strong></>]
            : [<>Ouvrez le <strong>menu</strong> du navigateur</>, <>Choisissez <strong>Installer l’application</strong> ou <strong>Ajouter à l’écran d’accueil</strong></>]
          ).map((etape, i) => (
            <li key={i} class="flex items-center gap-3">
              <span class="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-encre font-etiq text-sm font-bold text-papier">{i + 1}</span>
              <span>{etape}</span>
            </li>
          ))}
        </ol>
      )}
      <p class="text-sm text-encre-2">Ce rappel disparaît une fois l’app installée.</p>
    </section>
  );
}

function messageImport(mode: 'fusionner' | 'remplacer', { ajoutees, misesAJour }: { ajoutees: number; misesAJour: number }): string {
  if (mode === 'remplacer') return `Import terminé : ${pluriel(ajoutees, 'recette')}.`;
  if (ajoutees + misesAJour === 0) return 'Import terminé : rien de nouveau dans ce fichier.';
  return `Import terminé : ${pluriel(ajoutees, 'recette')} ${ajoutees > 1 ? 'ajoutées' : 'ajoutée'}, ${misesAJour} ${misesAJour > 1 ? 'mises' : 'mise'} à jour.`;
}

type EtatImport = { fichier: string; analyse: Extract<AnalyseImport, { ok: true }> } | null;

function Sauvegarde({ monde, onSucces }: { monde: Monde; onSucces: (m: string) => void }) {
  const { donnees, modifier } = useDonnees();
  const champ = useRef<HTMLInputElement>(null);
  const [erreur, setErreur] = useState<{ fichier: string; raison: 'illisible' | 'format' | 'version' } | null>(null);
  const [aImporter, setAImporter] = useState<EtatImport>(null);
  const [mode, setMode] = useState<'fusionner' | 'remplacer'>('fusionner');
  const ancien = !donnees.dernierExport || Date.now() - new Date(donnees.dernierExport).getTime() > 30 * UN_JOUR;

  const exporter = () => {
    const url = URL.createObjectURL(new Blob([contenuExport(donnees)], { type: 'application/json' }));
    const lienTelechargement = document.createElement('a');
    lienTelechargement.href = url;
    lienTelechargement.download = nomFichierExport();
    lienTelechargement.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    modifier((d) => ({ ...d, dernierExport: new Date().toISOString() }));
    onSucces('Sauvegarde exportée.');
  };

  const lire = async (fichier: File) => {
    setErreur(null);
    const analyse = analyserImport(await fichier.text());
    if (!analyse.ok) return setErreur({ fichier: fichier.name, raison: analyse.raison });
    setMode('fusionner');
    setAImporter({ fichier: fichier.name, analyse });
  };

  const importer = () => {
    if (!aImporter) return;
    const { donnees: importees } = aImporter.analyse;
    let bilan = { ajoutees: 0, misesAJour: 0 };
    modifier((d) => {
      const resultat = mode === 'fusionner' ? fusionner(d, importees, monde.catalogue) : remplacer(importees, monde.catalogue);
      bilan = resultat;
      return resultat.donnees;
    });
    setAImporter(null);
    onSucces(messageImport(mode, bilan));
  };

  const nb = donnees.recettes.length;
  const resume = aImporter?.analyse.resume;

  return (
    <section aria-labelledby="r-sauvegarde" class="flex flex-col gap-2.5">
      <h2 id="r-sauvegarde" class="etiq">
        Sauvegarde
      </h2>
      <div class="bloc flex flex-col gap-3.5">
        {erreur && (
          <div role="alert" class="alerte bg-danger-pale">
            <Icone nom="alerte" taille={22} class="mt-px shrink-0 text-danger" />
            <div class="flex flex-col gap-1.5">
              <p class="font-semibold">
                {erreur.raison === 'version' ? `« ${erreur.fichier} » vient d’une version plus récente de l’app.` : `« ${erreur.fichier} » n’est pas une sauvegarde de l’app.`}
              </p>
              <p class="text-sm">
                {erreur.raison === 'version'
                  ? 'Rechargez la page pour mettre l’app à jour, puis réessayez. Vos recettes n’ont pas été modifiées.'
                  : 'Choisissez un fichier créé avec « Exporter mes données ». Vos recettes n’ont pas été modifiées.'}
              </p>
            </div>
          </div>
        )}
        <p class="text-sm">Vos recettes restent sur cet appareil. Exportez-les régulièrement pour ne rien perdre.</p>
        <p class="text-sm">
          {donnees.dernierExport ? (
            <>
              <strong>Dernier export : {dateLongue(donnees.dernierExport)}</strong> <span class="text-encre-2">({ilYa(donnees.dernierExport)})</span>
            </>
          ) : (
            <strong>Aucun export pour l’instant.</strong>
          )}
          {nb > 0 && ancien && <span class="text-encre-2"> Pensez à exporter : une sauvegarde par mois suffit.</span>}
        </p>
        <button type="button" class="btn btn-encre w-full" onClick={exporter}>
          <Icone nom="exporter" taille={20} />
          Exporter mes données
        </button>
        <button type="button" class="btn btn-ligne w-full" onClick={() => champ.current?.click()}>
          <Icone nom="importer" taille={20} />
          {erreur ? 'Choisir un autre fichier' : 'Importer une sauvegarde'}
        </button>
        <input
          ref={champ}
          type="file"
          accept=".json,application/json"
          class="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            const fichier = e.currentTarget.files?.[0];
            e.currentTarget.value = '';
            if (fichier) void lire(fichier);
          }}
        />
      </div>

      <Dialogue ouvert={aImporter !== null} onFermer={() => setAImporter(null)} titreId="titre-import">
        <div class="flex flex-col gap-4.5">
          <h2 id="titre-import" class="display text-2xl">
            Importer cette sauvegarde ?
          </h2>
          <div class="flex items-start gap-3 rounded-2xl border border-trait bg-papier px-4 py-3.5">
            <Icone nom="fichier" taille={24} class="shrink-0 text-encre-2" />
            <div class="min-w-0">
              <p class="font-semibold [overflow-wrap:anywhere]">{aImporter?.fichier}</p>
              {resume && (
                <p class="text-sm text-encre-2">
                  {pluriel(resume.recettes, 'recette')} · {pluriel(resume.legumesPerso, 'légume')} perso · {pluriel(resume.semaines, 'semaine')}
                </p>
              )}
            </div>
          </div>
          <fieldset class="flex flex-col gap-2">
            <legend class="mb-2 font-semibold">Que faire de vos données actuelles ?</legend>
            {(
              [
                ['fusionner', 'Fusionner', 'Ajoute ce qui manque. Si une recette existe des deux côtés, la plus récente est gardée.'],
                ['remplacer', 'Remplacer', nb > 0 ? `Vos ${nb} recettes actuelles sont effacées et remplacées par celles du fichier.` : 'Les données du fichier remplacent celles de l’appareil.'],
              ] as const
            ).map(([valeur, titre, aide]) => (
              <label key={valeur} class={`flex cursor-pointer items-start gap-3.5 rounded-2xl px-4 py-3.5 ${mode === valeur ? 'shadow-[inset_0_0_0_2.5px_var(--encre)]' : 'shadow-[inset_0_0_0_1.5px_var(--trait-fort)]'}`}>
                <input type="radio" name="mode-import" class="mt-0.5 size-5 shrink-0 accent-[var(--encre)]" checked={mode === valeur} onChange={() => setMode(valeur)} />
                <span>
                  <strong>{titre}</strong>
                  <br />
                  <span class="text-sm text-encre-2">{aide}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <div class="flex gap-2">
            <button type="button" class="btn btn-ligne flex-1" onClick={() => setAImporter(null)}>
              Annuler
            </button>
            <button type="button" class={`btn flex-[2] ${mode === 'remplacer' ? 'btn-danger' : 'btn-plein'}`} onClick={importer}>
              {mode === 'fusionner' ? 'Fusionner' : 'Remplacer'}
            </button>
          </div>
        </div>
      </Dialogue>
    </section>
  );
}

function LegumesPerso({ monde, onSucces }: { monde: Monde; onSucces: (m: string) => void }) {
  const { donnees, modifier } = useDonnees();
  const [aSupprimer, setASupprimer] = useState<Legume | null>(null);
  if (donnees.legumesPerso.length === 0) return null;
  const utilisations = (id: string) => donnees.recettes.filter((r) => r.legumes.includes(id)).length;
  const n = aSupprimer ? utilisations(aSupprimer.id) : 0;

  return (
    <section aria-labelledby="r-perso" class="flex flex-col gap-2.5">
      <h2 id="r-perso" class="etiq">
        Légumes perso · {donnees.legumesPerso.length}
      </h2>
      <ul class="bloc py-1 pr-1.5 pl-4.5">
        {donnees.legumesPerso.map((l, i) => {
          const u = utilisations(l.id);
          return (
            <li key={l.id} class={`flex min-h-16 items-center justify-between gap-3 ${i > 0 ? 'border-t border-trait' : ''}`}>
              <span class="flex items-center gap-3">
                <Vignette icone={l.icone} />
                <span>
                  <span class="block font-semibold">{l.nom}</span>
                  <span class="text-sm text-encre-2">
                    {NOMS_CATEGORIES[l.categorie]} · {resumeMois(l)} · {pluriel(u, 'recette')}
                  </span>
                </span>
              </span>
              <button type="button" class="ico" aria-label={`Supprimer le légume ${l.nom}`} onClick={() => setASupprimer(l)}>
                <Icone nom="poubelle" taille={22} />
              </button>
            </li>
          );
        })}
      </ul>
      <Dialogue ouvert={aSupprimer !== null} onFermer={() => setASupprimer(null)} titreId="titre-suppr-legume" alerte>
        <div class="flex flex-col gap-4">
          <h2 id="titre-suppr-legume" class="display text-[22px] leading-tight">
            Supprimer « {aSupprimer?.nom} » ?
          </h2>
          <p>
            {n > 0 ? `Il sera retiré de ${pluriel(n, 'recette')}, dont la saison sera recalculée. ` : ''}
            La suppression est définitive.
          </p>
          <div class="flex flex-col gap-2">
            <button
              type="button"
              class="btn btn-danger w-full"
              onClick={() => {
                const nom = aSupprimer!.nom;
                modifier((d) => supprimerLegumePerso(d, aSupprimer!.id, monde.catalogue));
                setASupprimer(null);
                onSucces(`« ${nom} » supprimé.`);
              }}
            >
              Supprimer le légume
            </button>
            <button type="button" class="btn btn-ligne w-full" autofocus onClick={() => setASupprimer(null)}>
              Garder le légume
            </button>
          </div>
        </div>
      </Dialogue>
    </section>
  );
}

export function Reglages() {
  const [message, setMessage] = useState<string | null>(null);
  return (
    <AvecCatalogue titre="Réglages">
      {(monde) => (
        <div class="flex flex-col gap-7">
          <h1 tabIndex={-1} class="display pt-2 text-[30px] outline-none">
            Réglages
          </h1>
          {/* Téléphone : ordre de la maquette. Tablette : deux colonnes (repas et légumes | sauvegarde et installation). */}
          <div class="grid items-start gap-7 md:grid-cols-2 md:gap-6">
            <div class="flex flex-col gap-7 md:col-start-1 md:row-start-1 md:gap-6">
              <RepasAGenerer />
              <ChoixApparence />
            </div>
            <div class="md:col-start-2 md:row-start-2">
              <Installer />
            </div>
            <div class="md:col-start-2 md:row-start-1">
              <Sauvegarde monde={monde} onSucces={setMessage} />
            </div>
            <div class="md:col-start-1 md:row-start-2">
              <LegumesPerso monde={monde} onSucces={setMessage} />
            </div>
          </div>
          <p class="text-sm text-encre-2">
            Saisons : ADEME (Impact CO₂) et Agenda des Chefs METRO (Licence Ouverte), mis à jour le {dateLongue(monde.catalogue.majLe)}.
            Illustrations dessinées pour l’app.
          </p>
          <Toast message={message} onFin={() => setMessage(null)} />
        </div>
      )}
    </AvecCatalogue>
  );
}
