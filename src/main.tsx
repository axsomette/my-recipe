import { render } from 'preact';
import { App } from './app';
import { chargerCatalogue } from './lib/catalogue';
import { FournisseurDonnees } from './lib/donnees';
import { suivreInstallation } from './lib/installation';
import './styles.css';

suivreInstallation();

const racine = document.getElementById('app')!;
render(
  <FournisseurDonnees>
    <App />
  </FournisseurDonnees>,
  racine,
);

/**
 * Écran de lancement (index.html) : il couvre le vrai chargement (légumes, polices)
 * et laisse à la rosace le temps d'éclore, sans jamais retenir l'app plus de 4 s.
 */
function fermerLancement() {
  const ecran = document.getElementById('lancement');
  if (!ecran) return;
  const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dureeMinimale = mouvementReduit ? 250 : 900; // ms depuis l'ouverture de la page
  const pret = Promise.all([chargerCatalogue().catch(() => undefined), document.fonts?.ready]);
  const limite = new Promise((fin) => setTimeout(fin, 4000));

  Promise.race([pret, limite]).then(() => {
    setTimeout(() => {
      racine.inert = false;
      ecran.classList.add('fin');
      setTimeout(() => ecran.remove(), 320);
    }, Math.max(0, dureeMinimale - performance.now()));
  });
}

fermerLancement();

// Hors connexion : service worker (en production seulement, le serveur de dev sert des fichiers non figés).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch(() => {
      /* sans service worker, l'app marche en ligne comme avant */
    });
  });
}

// Demande au navigateur de ne pas effacer les données sous pression de stockage (accordé surtout aux apps installées).
navigator.storage?.persist?.().catch(() => undefined);
