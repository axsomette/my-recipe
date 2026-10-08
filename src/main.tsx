import { render } from 'preact';
import { App } from './app';
import { moisCourant, saisonDuMois } from './lib/calendrier';
import { FournisseurDonnees } from './lib/donnees';
import './styles.css';

// L'accent de couleur suit la saison en cours.
document.documentElement.classList.add(saisonDuMois(moisCourant()));

render(
  <FournisseurDonnees>
    <App />
  </FournisseurDonnees>,
  document.getElementById('app')!,
);
