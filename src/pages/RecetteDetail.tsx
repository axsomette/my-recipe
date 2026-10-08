import { useState } from 'preact/hooks';
import type { Monde } from '../components/AvecCatalogue';
import { Dialogue } from '../components/Dialogue';
import { Icone } from '../components/Icone';
import { BadgeSaison, Frise, PictoToutelAnnee, decrireScores } from '../components/Saison';
import { Vignette } from '../components/Vignette';
import { NOMS_MOIS, moisCourant } from '../lib/calendrier';
import { useDonnees } from '../lib/donnees';
import { supprimerRecette } from '../lib/recettes';
import { lien, naviguer } from '../lib/routeur';
import { libelleSaison, niveauSaison } from '../lib/saison';
import { listeNaturelle, pluriel } from '../lib/texte';
import type { Legume } from '../lib/types';

const dateCourte = (iso: string) => {
  const date = new Date(iso);
  const memeAnnee = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', ...(memeAnnee ? {} : { year: 'numeric' }) });
};

/** Ce que la pastille ou le symbole « ∞ » disent visuellement, pour les lecteurs d'écran. */
function precisionSaison(l: Legume, maintenant: boolean, mois: number): string {
  if (maintenant) return ` (de saison en ${NOMS_MOIS[mois - 1]})`;
  if (l.touteLannee) return ' (toute l’année)';
  return ' (hors saison ce mois-ci)';
}

export function DetailRecette({ id, monde, enColonne = false }: { id: string; monde: Monde; enColonne?: boolean }) {
  const { donnees, modifier } = useDonnees();
  const [confirmer, setConfirmer] = useState(false);
  const mois = moisCourant();
  const recette = donnees.recettes.find((r) => r.id === id);
  const Titre = enColonne ? 'h2' : 'h1';
  const Section = enColonne ? 'h3' : 'h2';

  if (!recette) {
    return (
      <div class="flex flex-col gap-4 pt-2">
        <Titre tabIndex={-1} data-focus-ecran class="display text-[30px] outline-none">
          Recette introuvable
        </Titre>
        <p class="text-encre-2">Elle a peut-être été supprimée.</p>
        <a href={lien({ nom: 'recettes' })} class="min-h-11 self-start font-semibold text-saison-texte underline">
          Voir mes recettes
        </a>
      </div>
    );
  }

  const legumes = recette.legumes.map((l) => monde.index.get(l)).filter((l): l is Legume => l !== undefined);
  const saisonniers = legumes.filter((l) => !l.touteLannee);
  const toutelannee = legumes.filter((l) => l.touteLannee);
  const deSaisonMaintenant = saisonniers.filter((l) => l.mois.includes(mois));
  const scores = recette.scoreParMois;
  const prevue = donnees.plannings.some((p) => p.slots.some((s) => s.recetteId === recette.id));

  return (
    <article class="flex flex-col gap-7" aria-labelledby="titre-recette">
      {!enColonne && (
        <a href={lien({ nom: 'recettes' })} class="-ml-2 inline-flex min-h-11 items-center gap-1 self-start pr-2 font-semibold">
          <Icone nom="retour" taille={22} />
          Mes recettes
        </a>
      )}

      <header class={`flex flex-col gap-3.5 ${enColonne ? '' : '-mt-3'}`}>
        {enColonne && (
          <div class="-mb-2 flex justify-end gap-2">
            <a class="btn btn-ligne" href={lien({ nom: 'modifier-recette', id: recette.id })}>
              <Icone nom="crayon" taille={20} />
              Modifier
            </a>
            <button type="button" class="btn btn-danger-texte" onClick={() => setConfirmer(true)}>
              <Icone nom="poubelle" taille={20} />
              Supprimer
            </button>
          </div>
        )}
        <Titre id="titre-recette" tabIndex={-1} data-focus-ecran class="display text-[34px] leading-[1.08] outline-none lg:text-[40px]">
          {recette.nom}
        </Titre>
        <div class="flex flex-wrap items-center gap-2.5">
          <BadgeSaison niveau={niveauSaison(scores, mois)} />
          {scores && <span class="text-sm text-encre-2">{libelleSaison(scores)}</span>}
        </div>
      </header>

      <section aria-labelledby="titre-saison" class="flex flex-col gap-3.5">
        <Section id="titre-saison" class="etiq">
          Saison, mois par mois
        </Section>
        {scores ? (
          <>
            <Frise variante="grande" valeurs={scores} mois={mois} description={decrireScores(scores)} />
            <p class="text-sm">
              <strong>
                En {NOMS_MOIS[mois - 1]} : {pluriel(deSaisonMaintenant.length, 'légume')} de saison sur {saisonniers.length}.
              </strong>{' '}
              {toutelannee.length > 0 && (
                <span class="text-encre-2">
                  {`${listeNaturelle(toutelannee.map((l) => l.nom))}, disponible${toutelannee.length > 1 ? 's' : ''} toute l’année, n’${
                    toutelannee.length > 1 ? 'entrent' : 'entre'
                  } pas dans le calcul.`}
                </span>
              )}
            </p>
          </>
        ) : (
          <p class="text-encre-2">
            Aucun légume saisonnier : cette recette va en toute saison. Le planning s’en sert pour compléter la semaine.
          </p>
        )}
      </section>

      {legumes.length > 0 && (
        <section aria-labelledby="titre-legumes" class="flex flex-col gap-3">
          <Section id="titre-legumes" class="etiq">
            Légumes · {legumes.length}
          </Section>
          <ul class="flex flex-wrap gap-2">
            {legumes.map((l) => {
              const maintenant = !l.touteLannee && l.mois.includes(mois);
              return (
                <li key={l.id} class="chip chip-lecture">
                  <Vignette icone={l.icone} taille={28} />
                  {l.nom}
                  {maintenant && <span class="ml-0.5 size-[7px] rounded-full bg-saison" aria-hidden="true" />}
                  {l.touteLannee && <PictoToutelAnnee />}
                  <span class="sr-only">{precisionSaison(l, maintenant, mois)}</span>
                </li>
              );
            })}
          </ul>
          <p class="flex flex-wrap gap-3.5 text-sm text-encre-2" aria-hidden="true">
            <span class="inline-flex items-center gap-1.5">
              <span class="size-[7px] rounded-full bg-saison" />
              de saison en {NOMS_MOIS[mois - 1]}
            </span>
            <span class="inline-flex items-center gap-1.5">
              <PictoToutelAnnee />
              toute l’année
            </span>
          </p>
        </section>
      )}

      {recette.notes && (
        <section aria-labelledby="titre-notes" class="flex flex-col gap-2.5">
          <Section id="titre-notes" class="etiq">
            Notes
          </Section>
          <p class="whitespace-pre-line">{recette.notes}</p>
        </section>
      )}

      {!enColonne && (
        <div class="flex flex-col gap-2">
          <a class="btn btn-ligne w-full" href={lien({ nom: 'modifier-recette', id: recette.id })}>
            <Icone nom="crayon" taille={20} />
            Modifier la recette
          </a>
          <button type="button" class="btn btn-danger-texte self-center" onClick={() => setConfirmer(true)}>
            <Icone nom="poubelle" taille={20} />
            Supprimer
          </button>
        </div>
      )}
      <p class={`text-sm text-encre-2 ${enColonne ? '' : 'text-center'}`}>
        Ajoutée le {dateCourte(recette.createdAt)}
        {recette.updatedAt !== recette.createdAt && ` · modifiée le ${dateCourte(recette.updatedAt)}`}
      </p>

      <Dialogue ouvert={confirmer} onFermer={() => setConfirmer(false)} titreId="titre-suppression" alerte>
        <div class="flex flex-col gap-4">
          <h2 id="titre-suppression" class="display text-[22px] leading-tight">
            Supprimer « {recette.nom} » ?
          </h2>
          <p>{prevue ? 'Elle sera aussi retirée de votre semaine. ' : ''}La suppression est définitive.</p>
          <div class="mt-1 flex flex-col gap-2">
            <button
              type="button"
              class="btn btn-danger w-full"
              onClick={() => {
                modifier((d) => supprimerRecette(d, recette.id));
                setConfirmer(false);
                naviguer({ nom: 'recettes' }, { remplacer: true });
              }}
            >
              <Icone nom="poubelle" taille={20} />
              Supprimer la recette
            </button>
            <button type="button" class="btn btn-ligne w-full" autofocus onClick={() => setConfirmer(false)}>
              Garder la recette
            </button>
          </div>
        </div>
      </Dialogue>
    </article>
  );
}
