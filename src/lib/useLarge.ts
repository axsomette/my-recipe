import { useEffect, useState } from 'preact/hooks';

const REQUETE = '(min-width: 1024px)';

/** Vrai sur tablette paysage et ordinateur : place pour deux colonnes. */
export function useLarge(): boolean {
  const [large, setLarge] = useState(() => window.matchMedia(REQUETE).matches);
  useEffect(() => {
    const media = window.matchMedia(REQUETE);
    const suivre = () => setLarge(media.matches);
    media.addEventListener('change', suivre);
    return () => media.removeEventListener('change', suivre);
  }, []);
  return large;
}
