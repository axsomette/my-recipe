// Mode clair ou sombre : automatique (réglage du téléphone), ou forcé dans les réglages.
// Le script en tête d'index.html applique la même règle avant le premier affichage.
import { useState } from 'preact/hooks';
import { ecrireApparence, lireApparence, type Apparence } from './stockage';

const SOMBRE = window.matchMedia('(prefers-color-scheme: dark)');
const COULEUR_BARRE = { clair: '#EEF0E7', sombre: '#161217' };

function appliquer(apparence: Apparence) {
  const theme = apparence === 'auto' ? (SOMBRE.matches ? 'sombre' : 'clair') : apparence;
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COULEUR_BARRE[theme]);
}

/** À appeler au démarrage : en automatique, l'app suit le téléphone quand il change de mode. */
export function suivreApparence() {
  SOMBRE.addEventListener('change', () => appliquer(lireApparence()));
}

export function useApparence() {
  const [apparence, setApparence] = useState(lireApparence);
  const choisir = (choix: Apparence) => {
    ecrireApparence(choix);
    appliquer(choix);
    setApparence(choix);
  };
  return { apparence, choisir };
}
