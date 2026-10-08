// Mois, saisons et semaines ISO : fonctions pures.

export const NOMS_MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const MOIS_ABREGES = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
export const NOMS_JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
export const INITIALES_MOIS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

export type Saison = 'hiver' | 'printemps' | 'ete' | 'automne';
export const NOMS_SAISONS: Record<Saison, string> = { hiver: 'Hiver', printemps: 'Printemps', ete: 'Été', automne: 'Automne' };

/** Saison météorologique d'un mois (1–12) : déc.–févr. hiver, mars–mai printemps… */
export function saisonDuMois(mois: number): Saison {
  if (mois === 12 || mois <= 2) return 'hiver';
  if (mois <= 5) return 'printemps';
  if (mois <= 8) return 'ete';
  return 'automne';
}

/** Mois courant, de 1 à 12. */
export const moisCourant = (date = new Date()) => date.getMonth() + 1;

export const majuscule = (texte: string) => texte.charAt(0).toUpperCase() + texte.slice(1);

/** Semaine ISO 8601 d'une date : année ISO, numéro, et lundi de la semaine (heure locale). */
export function semaineIso(date = new Date()) {
  const jour = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const rangJour = (jour.getDay() + 6) % 7; // lundi = 0
  const lundi = new Date(jour);
  lundi.setDate(jour.getDate() - rangJour);
  // Le jeudi de la semaine donne l'année ISO.
  const jeudi = new Date(lundi);
  jeudi.setDate(lundi.getDate() + 3);
  const annee = jeudi.getFullYear();
  const premierJeudi = new Date(annee, 0, 4);
  const lundiSemaine1 = new Date(premierJeudi);
  lundiSemaine1.setDate(premierJeudi.getDate() - ((premierJeudi.getDay() + 6) % 7));
  const numero = 1 + Math.round((lundi.getTime() - lundiSemaine1.getTime()) / (7 * 24 * 3600 * 1000));
  return { annee, numero, lundi, cle: `${annee}-W${String(numero).padStart(2, '0')}` };
}
