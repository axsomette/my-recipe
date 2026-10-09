// Passage de relais entre deux écrans, en mémoire seulement (rien n'est enregistré) :
// depuis la semaine, « Ajouter une recette » crée une recette qui ira dans un repas vide.

let semaineEnAttente: string | null = null;
let messagePourLaSemaine: string | null = null;

/** La prochaine recette créée sera placée dans cette semaine (clé ISO). */
export const reserverPourLaSemaine = (semaine: string) => {
  semaineEnAttente = semaine;
};

/** Lue une seule fois, à l'ouverture du formulaire : annuler la création efface la demande. */
export function prendreSemaineEnAttente(): string | null {
  const semaine = semaineEnAttente;
  semaineEnAttente = null;
  return semaine;
}

/** Message affiché au retour sur la semaine (« Velouté ajouté : lundi soir »). */
export const laisserMessage = (message: string) => {
  messagePourLaSemaine = message;
};

export function prendreMessage(): string | null {
  const message = messagePourLaSemaine;
  messagePourLaSemaine = null;
  return message;
}
