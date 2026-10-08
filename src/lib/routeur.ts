// Routage par hash (#/semaine…) : GitHub Pages ne sait pas renvoyer index.html
// pour une URL inconnue, le hash évite donc toute 404 au rechargement.
import { useEffect, useState } from 'preact/hooks';

export type Route =
  | { nom: 'semaine' }
  | { nom: 'recettes' }
  | { nom: 'nouvelle-recette' }
  | { nom: 'recette'; id: string }
  | { nom: 'modifier-recette'; id: string }
  | { nom: 'saisons' }
  | { nom: 'reglages' }
  | { nom: 'introuvable' };

export function lireRoute(hash: string): Route {
  const segments = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const [premier, second, troisieme] = segments;
  switch (premier) {
    case undefined:
    case 'semaine':
      return segments.length <= 1 ? { nom: 'semaine' } : { nom: 'introuvable' };
    case 'recettes':
      if (second === undefined) return { nom: 'recettes' };
      if (second === 'nouvelle' && troisieme === undefined) return { nom: 'nouvelle-recette' };
      if (troisieme === undefined) return { nom: 'recette', id: second };
      if (troisieme === 'modifier' && segments.length === 3) return { nom: 'modifier-recette', id: second };
      return { nom: 'introuvable' };
    case 'saisons':
      return segments.length === 1 ? { nom: 'saisons' } : { nom: 'introuvable' };
    case 'reglages':
      return segments.length === 1 ? { nom: 'reglages' } : { nom: 'introuvable' };
    default:
      return { nom: 'introuvable' };
  }
}

/** Lien vers une route, à placer dans un href. */
export function lien(route: Route): string {
  switch (route.nom) {
    case 'semaine':
    case 'introuvable':
      return '#/semaine';
    case 'recettes':
      return '#/recettes';
    case 'nouvelle-recette':
      return '#/recettes/nouvelle';
    case 'recette':
      return `#/recettes/${encodeURIComponent(route.id)}`;
    case 'modifier-recette':
      return `#/recettes/${encodeURIComponent(route.id)}/modifier`;
    case 'saisons':
      return '#/saisons';
    case 'reglages':
      return '#/reglages';
  }
}

export function naviguer(route: Route, { remplacer = false } = {}) {
  if (remplacer) {
    history.replaceState(null, '', lien(route));
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    location.hash = lien(route);
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => lireRoute(location.hash));
  useEffect(() => {
    const suivre = () => setRoute(lireRoute(location.hash));
    window.addEventListener('hashchange', suivre);
    return () => window.removeEventListener('hashchange', suivre);
  }, []);
  return route;
}
