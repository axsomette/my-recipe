import { useEffect, useRef } from 'preact/hooks';
import { Navigation } from './components/Navigation';
import { useDonnees } from './lib/donnees';
import { useRoute, type Route } from './lib/routeur';
import { Introuvable } from './pages/Introuvable';
import { EcranEdition } from './pages/RecetteEdition';
import { EcranRecettes } from './pages/Recettes';
import { Reglages } from './pages/Reglages';
import { Saisons } from './pages/Saisons';
import { Semaine } from './pages/Semaine';

const TITRES: Record<Route['nom'], string> = {
  semaine: 'Ma semaine',
  recettes: 'Mes recettes',
  'nouvelle-recette': 'Nouvelle recette',
  recette: 'Recette',
  'modifier-recette': 'Modifier la recette',
  saisons: 'Calendrier des saisons',
  reglages: 'Réglages',
  introuvable: 'Page introuvable',
};

function Ecran({ route }: { route: Route }) {
  switch (route.nom) {
    case 'semaine':
      return <Semaine />;
    case 'recettes':
      return <EcranRecettes key="recettes" />;
    case 'recette':
      return <EcranRecettes key="recettes" id={route.id} />;
    case 'nouvelle-recette':
      return <EcranEdition />;
    case 'modifier-recette':
      return <EcranEdition id={route.id} />;
    case 'saisons':
      return <Saisons />;
    case 'reglages':
      return <Reglages />;
    case 'introuvable':
      return <Introuvable />;
  }
}

/** Avertit quand les données ne peuvent pas être lues ou enregistrées sur cet appareil. */
function AlerteStockage() {
  const { chargement, sauvegardeOk } = useDonnees();
  let message: string | null = null;
  if (chargement === 'indisponible') {
    message = 'Ce navigateur bloque l’enregistrement : vos recettes seront perdues en fermant la page. Désactivez la navigation privée pour les garder.';
  } else if (chargement === 'illisible') {
    message = 'Vos données enregistrées sont illisibles. Une copie a été mise de côté ; importez une sauvegarde depuis les réglages pour retrouver vos recettes.';
  } else if (!sauvegardeOk) {
    message = 'La dernière modification n’a pas pu être enregistrée : l’espace de stockage est plein ou bloqué. Exportez vos données depuis les réglages.';
  }
  if (!message) return null;
  return (
    <p role="alert" class="mb-5 rounded-2xl bg-danger-pale px-4 py-3.5 text-[15px]">
      {message}
    </p>
  );
}

export function App() {
  const route = useRoute();
  const precedente = useRef<Route | null>(null);

  // À chaque changement d'écran : titre de l'onglet, et focus sur le titre de la page
  // pour que lecteurs d'écran et clavier repartent du bon endroit.
  useEffect(() => {
    document.title = route.nom === 'semaine' ? 'Recettes de saison' : `${TITRES[route.nom]} · Recettes de saison`;
    const avant = precedente.current;
    precedente.current = route;
    if (!avant) return; // premier affichage : on ne déplace pas le focus
    // Sur deux colonnes, passer d'une recette à l'autre garde la liste à sa place.
    const dansLesRecettes = (r: Route) => r.nom === 'recettes' || r.nom === 'recette';
    if (!(window.matchMedia('(min-width: 1024px)').matches && dansLesRecettes(avant) && dansLesRecettes(route))) {
      window.scrollTo(0, 0);
    }
    // Différé d'un tour : une fenêtre qui se ferme au même moment (suppression) rend d'abord son focus.
    const minuteur = setTimeout(() => {
      const cible = document.querySelector<HTMLElement>('main [data-focus-ecran]') ?? document.querySelector<HTMLElement>('main h1');
      cible?.focus({ preventScroll: true });
      if (route.nom === 'recette' && cible?.textContent) document.title = `${cible.textContent} · Recettes de saison`;
    });
    return () => clearTimeout(minuteur);
  }, [route]);

  return (
    <>
      <a
        href="#contenu"
        onClick={(e) => {
          e.preventDefault();
          document.querySelector<HTMLElement>('main h1')?.focus();
        }}
        class="sr-only z-30 rounded-xl bg-encre px-4 py-3 text-papier focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Aller au contenu
      </a>
      <Navigation route={route} masqueeSurTelephone={route.nom === 'nouvelle-recette' || route.nom === 'modifier-recette'} />
      <main id="contenu" class="mx-auto w-full max-w-3xl px-5 pt-5 pb-32 md:pl-[calc(96px+40px)] md:pr-10 md:pb-12 lg:max-w-5xl">
        <AlerteStockage />
        <Ecran route={route} />
      </main>
    </>
  );
}
