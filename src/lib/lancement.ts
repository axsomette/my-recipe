// Fin de l'écran de lancement (index.html) : une fenêtre qui s'ouvre d'elle-même attend qu'il soit parti.

let terminer: () => void = () => undefined;

export const finLancement = new Promise<void>((resolve) => {
  terminer = resolve;
});

export const signalerFinLancement = () => terminer();
