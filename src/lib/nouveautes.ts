// « Quoi de neuf » : ce qui change dans l'app, version par version.
// Pour annoncer une mise à jour, ajouter une entrée EN TÊTE de VERSIONS : la fenêtre s'ouvre
// une fois chez les personnes qui utilisaient déjà l'app, puis reste à relire dans les réglages.
import { moisCourant, saisonDuMois } from './calendrier';
import type { Donnees } from './types';

/** Illustration du catalogue (`legumes/icones/<id>.svg`), ou la feuille du mois aux couleurs de la saison. */
export type Illustration = string | 'feuille-du-mois';

export interface Nouveaute {
  titre: string;
  texte: string;
  /** Une ou deux illustrations : la seconde est posée en médaillon sur la première. */
  illustrations: Illustration[];
  /** Où aller voir : le calendrier des saisons, ou les idées de saison de la semaine. */
  lien?: 'calendrier' | 'idees';
}

export interface Version {
  /** Date de la mise en ligne (AAAA-MM-JJ), qui sert aussi d'identifiant. */
  id: string;
  /** Une ligne pour l'historique des réglages. */
  resume: string;
  /** Trois nouveautés au plus : la fenêtre doit tenir sur un écran de téléphone. */
  nouveautes: Nouveaute[];
}

const produit = (id: string) => `legumes/icones/${id}.svg`;

export const VERSIONS: Version[] = [
  {
    id: '2026-10-10',
    resume: 'Poissons de saison, 41 nouveaux produits, idées de saison',
    nouveautes: [
      {
        titre: 'Les poissons ont leur saison',
        texte: 'Sardine, sole, Saint-Jacques… 26 poissons et fruits de mer comptent désormais dans la saison de vos recettes.',
        illustrations: [produit('sardine'), produit('saintjacques')],
        lien: 'calendrier',
      },
      {
        titre: '41 nouveaux produits',
        texte: 'Dinde, canard, merguez, lotte, poulpe… tous dessinés, prêts à cocher dans vos recettes.',
        illustrations: [produit('canard'), produit('merguez')],
      },
      {
        titre: 'Des idées de saison',
        texte: 'Une semaine incomplète ? L’app propose des plats du moment, faits avec ce qui est de saison.',
        illustrations: ['feuille-du-mois'],
        lien: 'idees',
      },
    ],
  },
  {
    id: '2026-10-09',
    resume: 'Équilibre de la semaine, repas pris dehors',
    nouveautes: [
      {
        titre: 'L’équilibre de la semaine',
        texte: 'Viande, poisson, féculents, végé : la semaine affiche son bilan et respecte les limites que vous choisissez.',
        illustrations: [produit('boeuf'), produit('cabillaud')],
      },
      {
        titre: 'Les repas pris dehors',
        texte: 'Cantine, restaurant : un repas pris dehors, pour une fois ou chaque semaine, reste libre.',
        illustrations: [produit('pain')],
      },
      {
        titre: 'Le garde-manger illustré',
        texte: 'Viandes, poissons, crèmerie, pâtes et riz rejoignent les fruits et légumes dans vos recettes.',
        illustrations: [produit('pates'), produit('fromage')],
      },
    ],
  },
  {
    id: '2026-10-08',
    resume: 'Première version : semaine de saison, calendrier, hors connexion',
    nouveautes: [
      {
        titre: 'Votre semaine de saison',
        texte: 'Notez vos recettes : l’app calcule leurs mois de saison et compose vos repas, de saison d’abord.',
        illustrations: ['feuille-du-mois'],
      },
      {
        titre: 'Le calendrier des saisons',
        texte: 'Ce qui est de saison, mois par mois, d’après l’ADEME.',
        illustrations: [produit('potiron'), produit('poireau')],
        lien: 'calendrier',
      },
      {
        titre: 'Hors connexion',
        texte: 'Installée sur l’écran d’accueil, l’app fonctionne sans réseau. Tout reste sur l’appareil.',
        illustrations: [produit('panier')],
      },
    ],
  },
];

export const VERSION_ACTUELLE = VERSIONS[0]!.id;

/**
 * Version à présenter à l'ouverture : la dernière, si elle n'a pas encore été vue et que la personne
 * utilisait déjà l'app (un nouveau carnet a l'écran de premier lancement, pas les nouveautés).
 */
export function versionAPresenter(donnees: Pick<Donnees, 'nouveautesVue' | 'recettes'>, versions = VERSIONS): Version | null {
  const derniere = versions[0];
  if (!derniere || donnees.nouveautesVue === derniere.id || donnees.recettes.length === 0) return null;
  return derniere;
}

/** Chemin de l'illustration dans public/ ; la feuille du mois prend la couleur de la saison. */
export const cheminIllustration = (illustration: Illustration, mois = moisCourant()) =>
  illustration === 'feuille-du-mois' ? `icones/feuille-${saisonDuMois(mois)}.svg` : illustration;

/** « 10 octobre 2026 ». */
export const dateDeVersion = (id: string) => new Date(`${id}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
