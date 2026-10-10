import { render } from 'preact';
import { App } from './app';
import { suivreApparence } from './lib/apparence';
import { chargerCatalogue } from './lib/catalogue';
import { FournisseurDonnees } from './lib/donnees';
import { suivreInstallation } from './lib/installation';
import { signalerFinLancement } from './lib/lancement';
import './styles.css';

suivreInstallation();
suivreApparence();

const racine = document.getElementById('app')!;
render(
  <FournisseurDonnees>
    <App />
  </FournisseurDonnees>,
  racine,
);

/**
 * Écran de lancement (index.html) : il couvre le vrai chargement (légumes, polices)
 * et laisse aux pages de l'année le temps de se tourner, sans jamais retenir l'app plus de 4 s.
 */
function fermerLancement() {
  const ecran = document.getElementById('lancement');
  if (!ecran) return signalerFinLancement();
  const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dureeMinimale = mouvementReduit ? 250 : 1600; // ms depuis l'ouverture de la page
  const pret = Promise.all([chargerCatalogue().catch(() => undefined), document.fonts?.ready]);
  const limite = new Promise((fin) => setTimeout(fin, 4000));

  Promise.race([pret, limite]).then(() => {
    setTimeout(() => {
      racine.inert = false;
      ecran.classList.add('fin');
      setTimeout(() => {
        ecran.remove();
        signalerFinLancement();
      }, 320);
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
