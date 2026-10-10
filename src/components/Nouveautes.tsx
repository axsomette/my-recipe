import { urlPublique } from '../lib/catalogue';
import { cheminIllustration as chemin, dateDeVersion, type Illustration, type Nouveaute, type Version } from '../lib/nouveautes';
import { Dialogue } from './Dialogue';
import { Icone } from './Icone';

const LIBELLES_LIENS: Record<NonNullable<Nouveaute['lien']>, string> = { calendrier: 'Voir le calendrier', idees: 'Voir les idées' };

/** Médaillon : l'illustration principale sur fond de saison, la seconde posée en bas à droite. */
function Medaillon({ illustrations }: { illustrations: Illustration[] }) {
  const [principale, seconde] = illustrations;
  return (
    <span class="relative flex size-15 shrink-0 items-center justify-center rounded-full bg-saison-pale" aria-hidden="true">
      {principale && <img class="vignette size-10.5" src={urlPublique(chemin(principale))} alt="" width="42" height="42" />}
      {seconde && (
        <img class="vignette absolute -right-1.5 -bottom-1 size-7.5 rounded-full bg-carte p-0.5 ring-2 ring-carte" src={urlPublique(chemin(seconde))} alt="" width="30" height="30" />
      )}
    </span>
  );
}

interface Props {
  version: Version | null;
  onFermer: () => void;
  /** Lien d'une nouveauté : la fenêtre se ferme, puis on va voir. */
  onLien: (lien: NonNullable<Nouveaute['lien']>) => void;
}

/** Fenêtre « Quoi de neuf » : les nouveautés d'une version, en trois points au plus. */
export function FenetreNouveautes({ version, onFermer, onLien }: Props) {
  return (
    <Dialogue ouvert={version !== null} onFermer={onFermer} titreId="titre-nouveautes">
      {version && (
        <div class="flex flex-col gap-4.5">
          <p class="flex items-center gap-2.5">
            <span class="rounded-md bg-saison px-[7px] pt-[5px] pb-1 font-etiq text-xs leading-none font-bold tracking-[0.08em] text-sur-saison uppercase">Nouveau</span>
            <span class="text-sm text-encre-2">{dateDeVersion(version.id)}</span>
          </p>
          <div class="-mt-1.5 flex flex-col gap-1.5">
            {/* Le focus va au titre, lu en premier, plutôt qu'au premier lien. */}
            <h2 id="titre-nouveautes" class="display text-[30px] leading-[1.1] outline-none" tabIndex={-1} autofocus>
              Quoi de neuf
            </h2>
            <p class="text-encre-2">
              {version.nouveautes.length === 1 ? 'Une nouveauté' : `${['', '', 'Deux', 'Trois'][version.nouveautes.length] ?? version.nouveautes.length} nouveautés`} pour cuisiner encore plus de saison.
            </p>
          </div>
          <ul class="flex flex-col gap-4.5">
            {version.nouveautes.map((n) => (
              <li key={n.titre} class="grid grid-cols-[60px_minmax(0,1fr)] items-start gap-3.5">
                <Medaillon illustrations={n.illustrations} />
                <div>
                  <h3 class="mt-0.5 mb-1 text-[17px] leading-tight font-semibold">{n.titre}</h3>
                  <p class="text-sm leading-snug text-encre-2">{n.texte}</p>
                  {n.lien && (
                    <button type="button" class="-mb-2.5 inline-flex min-h-11 items-center gap-1 text-[15px] font-semibold text-saison-texte" onClick={() => onLien(n.lien!)}>
                      {LIBELLES_LIENS[n.lien]}
                      <Icone nom="fleche" taille={18} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div class="mt-1 flex flex-col gap-2.5">
            <button type="button" class="btn btn-plein w-full" onClick={onFermer}>
              C’est noté
            </button>
            <p class="text-center text-sm text-encre-2">À relire dans Réglages › Quoi de neuf.</p>
          </div>
        </div>
      )}
    </Dialogue>
  );
}
