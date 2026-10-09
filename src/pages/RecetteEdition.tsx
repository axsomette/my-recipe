import { useRef, useState } from 'preact/hooks';
import { AvecCatalogue, type Monde } from '../components/AvecCatalogue';
import { FeuilleLegumePerso } from '../components/FeuilleLegumePerso';
import { Icone } from '../components/Icone';
import { SelecteurLegumes } from '../components/SelecteurLegumes';
import { NOMS_JOURS } from '../lib/calendrier';
import { useDonnees } from '../lib/donnees';
import { laisserMessage, prendreSemaineEnAttente } from '../lib/intention';
import { alignerPlanning, rangerPlanning, remplirVides, semainePrecedente } from '../lib/planning';
import { ajouterLegumePerso, enregistrerRecette, indexerLegumes } from '../lib/recettes';
import { lien, naviguer, type Route } from '../lib/routeur';
import { pluriel } from '../lib/texte';
import type { Recette } from '../lib/types';

function Formulaire({ monde, existante }: { monde: Monde; existante?: Recette }) {
  const { modifier } = useDonnees();
  const [nom, setNom] = useState(existante?.nom ?? '');
  const [legumes, setLegumes] = useState<string[]>(existante?.legumes ?? []);
  const [notes, setNotes] = useState(existante?.notes ?? '');
  const [erreurNom, setErreurNom] = useState(false);
  const [perso, setPerso] = useState<{ nom: string } | null>(null);
  const champNom = useRef<HTMLInputElement>(null);
  // Création lancée depuis la semaine : la recette ira dans le premier repas vide.
  const [pourLaSemaine] = useState(() => (existante ? null : prendreSemaineEnAttente()));

  const retour: Route = existante ? { nom: 'recette', id: existante.id } : pourLaSemaine ? { nom: 'semaine' } : { nom: 'recettes' };
  const modifie =
    nom !== (existante?.nom ?? '') || notes !== (existante?.notes ?? '') || legumes.join() !== (existante?.legumes ?? []).join();

  const annuler = (e: Event) => {
    if (modifie && !window.confirm('Abandonner les modifications de cette recette ?')) e.preventDefault();
  };

  const enregistrer = (e: Event) => {
    e.preventDefault();
    if (!nom.trim()) {
      setErreurNom(true);
      champNom.current?.focus();
      return;
    }
    let id = '';
    modifier((d) => {
      // Index recalculé ici : il inclut un légume perso ajouté pendant la saisie.
      const resultat = enregistrerRecette(d, { id: existante?.id, nom, legumes, notes }, indexerLegumes(monde.catalogue, d.legumesPerso));
      id = resultat.recette.id;
      if (!pourLaSemaine) return resultat.donnees;
      const avant = alignerPlanning(resultat.donnees.plannings.find((p) => p.semaine === pourLaSemaine), resultat.donnees.reglages, pourLaSemaine);
      const apres = remplirVides(avant, [id]);
      const place = apres.slots.find((s, i) => s.recetteId === id && avant.slots[i]!.recetteId !== id);
      laisserMessage(place ? `« ${nom.trim()} » ajoutée à votre semaine : ${NOMS_JOURS[place.jour]} ${place.moment}.` : `« ${nom.trim()} » enregistrée. La semaine n’a plus de repas vide.`);
      return { ...resultat.donnees, plannings: rangerPlanning(resultat.donnees.plannings, apres, semainePrecedente()) };
    });
    naviguer(pourLaSemaine ? { nom: 'semaine' } : { nom: 'recette', id }, { remplacer: true });
  };

  const titre = existante ? 'Modifier la recette' : 'Nouvelle recette';

  return (
    <form class="flex flex-col gap-6" onSubmit={enregistrer} noValidate>
      <header class="flex items-center gap-2 pt-1">
        <a class="ico -ml-2 md:hidden" href={lien(retour)} onClick={annuler} aria-label="Annuler et revenir">
          <Icone nom="fermer" taille={22} />
        </a>
        <h1 tabIndex={-1} class="display flex-1 text-xl outline-none md:text-[30px]">
          {titre}
        </h1>
        <div class="hidden gap-2 md:flex">
          <a class="btn btn-ligne" href={lien(retour)} onClick={annuler}>
            Annuler
          </a>
          <button type="submit" class="btn btn-plein">
            Enregistrer
          </button>
        </div>
      </header>

      {pourLaSemaine && (
        <p class="alerte bg-saison-pale">
          <Icone nom="info" taille={22} class="mt-px shrink-0" />
          Une fois enregistrée, elle ira dans le premier repas libre de votre semaine.
        </p>
      )}

      <div class="flex flex-col gap-2">
        <label for="nom-recette" class="font-semibold">
          Nom
        </label>
        <input
          ref={champNom}
          id="nom-recette"
          class="champ"
          type="text"
          value={nom}
          autocomplete="off"
          placeholder="Ex. : Gratin de poireaux"
          aria-invalid={erreurNom}
          aria-describedby={erreurNom ? 'erreur-nom' : undefined}
          onInput={(e) => {
            setNom(e.currentTarget.value);
            setErreurNom(false);
          }}
        />
        {erreurNom && (
          <p id="erreur-nom" class="text-sm font-semibold text-danger">
            Donnez un nom à la recette.
          </p>
        )}
      </div>

      <section aria-labelledby="titre-choix-legumes" class="flex flex-col gap-3.5">
        <div class="flex items-center justify-between">
          <h2 id="titre-choix-legumes" class="font-semibold">
            Ingrédients
          </h2>
          <span class="etiq">{legumes.length > 0 ? pluriel(legumes.length, 'choisi') : ''}</span>
        </div>
        <SelecteurLegumes monde={monde} nomRecette={nom} choisis={legumes} onChange={setLegumes} onCreer={(n) => setPerso({ nom: n })} />
      </section>

      <div class="flex flex-col gap-2">
        <label for="notes-recette" class="font-semibold">
          Notes <span class="font-normal text-encre-2">(facultatif)</span>
        </label>
        <textarea
          id="notes-recette"
          class="champ"
          placeholder="Temps de cuisson, astuces, variantes…"
          value={notes}
          onInput={(e) => setNotes(e.currentTarget.value)}
        />
      </div>

      {/* Téléphone : bouton dans la zone du pouce, à la place de la barre de navigation. */}
      <div class="fixed inset-x-0 bottom-0 z-20 border-t border-trait bg-carte px-5 pt-3 pb-[max(24px,env(safe-area-inset-bottom))] md:hidden">
        <button type="submit" class="btn btn-plein w-full">
          Enregistrer la recette
        </button>
      </div>

      <FeuilleLegumePerso
        ouvert={perso !== null}
        nomInitial={perso?.nom ?? ''}
        monde={monde}
        onFermer={() => setPerso(null)}
        onChoisir={(legume, nouveau) => {
          if (nouveau) modifier((d) => ajouterLegumePerso(d, legume));
          setLegumes((l) => (l.includes(legume.id) ? l : [...l, legume.id]));
          setPerso(null);
        }}
      />
    </form>
  );
}

export function EcranEdition({ id }: { id?: string }) {
  const { donnees } = useDonnees();
  const existante = id ? donnees.recettes.find((r) => r.id === id) : undefined;
  const titre = id ? 'Modifier la recette' : 'Nouvelle recette';
  return (
    <AvecCatalogue titre={titre}>
      {(monde) =>
        id && !existante ? (
          <div class="flex flex-col gap-4 pt-2">
            <h1 tabIndex={-1} class="display text-[30px] outline-none">
              Recette introuvable
            </h1>
            <a href={lien({ nom: 'recettes' })} class="min-h-11 self-start font-semibold text-saison-texte underline">
              Voir mes recettes
            </a>
          </div>
        ) : (
          <Formulaire key={id ?? 'nouvelle'} monde={monde} existante={existante} />
        )
      }
    </AvecCatalogue>
  );
}
