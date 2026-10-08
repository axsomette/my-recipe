import { urlPublique } from '../lib/catalogue';

/** Illustration d'un produit (décorative : le nom est toujours écrit à côté). */
export function Vignette({ icone, taille = 40 }: { icone: string; taille?: 28 | 32 | 40 | 64 }) {
  return (
    <img
      class="vignette shrink-0"
      src={urlPublique(icone)}
      alt=""
      width={taille}
      height={taille}
      loading="lazy"
      decoding="async"
    />
  );
}
