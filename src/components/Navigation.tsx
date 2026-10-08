import { MOIS_ABREGES, NOMS_SAISONS, moisCourant, saisonDuMois } from '../lib/calendrier';
import { lien, type Route } from '../lib/routeur';
import { Icone, type NomIcone } from './Icone';

const ONGLETS: { route: Route; libelle: string; icone: NomIcone }[] = [
  { route: { nom: 'semaine' }, libelle: 'Semaine', icone: 'semaine' },
  { route: { nom: 'recettes' }, libelle: 'Recettes', icone: 'recettes' },
  { route: { nom: 'saisons' }, libelle: 'Saisons', icone: 'saisons' },
  { route: { nom: 'reglages' }, libelle: 'Réglages', icone: 'reglages' },
];

const ongletActif = (route: Route): Route['nom'] =>
  route.nom === 'recette' || route.nom === 'nouvelle-recette' || route.nom === 'modifier-recette' ? 'recettes' : route.nom;

/** Barre du bas sur téléphone (zone du pouce), rail latéral à partir de la tablette. */
export function Navigation({ route, masqueeSurTelephone = false }: { route: Route; masqueeSurTelephone?: boolean }) {
  const actif = ongletActif(route);
  const mois = moisCourant();
  return (
    <nav
      aria-label="Navigation principale"
      class={`fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 ${masqueeSurTelephone ? 'max-md:hidden' : ''} border-t border-trait bg-carte px-2 pt-1.5 pb-[max(14px,env(safe-area-inset-bottom))]
        md:inset-y-0 md:right-auto md:flex md:w-24 md:flex-col md:items-center md:gap-1.5 md:border-t-0 md:border-r md:px-2 md:py-5`}
    >
      <p class="display mb-4 hidden text-center text-[22px] text-saison-texte md:block" aria-hidden="true">
        {MOIS_ABREGES[mois - 1]}
        <span class="etiq mt-1 block text-xs">{NOMS_SAISONS[saisonDuMois(mois)]}</span>
      </p>
      {ONGLETS.map(({ route: cible, libelle, icone }) => {
        const courant = actif === cible.nom;
        return (
          <a
            key={cible.nom}
            href={lien(cible)}
            aria-current={courant ? 'page' : undefined}
            class={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[12.5px] font-semibold no-underline md:min-h-16 md:w-20
              ${courant ? 'text-saison-texte' : 'text-encre-2'}`}
          >
            <span class={`flex h-[30px] w-14 items-center justify-center rounded-full ${courant ? 'bg-saison-pale' : ''}`}>
              <Icone nom={icone} />
            </span>
            {libelle}
          </a>
        );
      })}
    </nav>
  );
}
