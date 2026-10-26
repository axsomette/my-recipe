import { dessinLogo } from '../lib/logo';

// Couleurs reprises des variables du thème (src/styles.css) : le logo suit le mode clair ou sombre.
const COULEURS = { hiver: 'var(--logo-hiver)', printemps: 'var(--logo-printemps)', ete: 'var(--logo-ete)', automne: 'var(--logo-automne)' };

/** Le cadran des saisons, la cuillère sur le mois donné (décoratif : le nom de l'app est écrit à côté). */
interface Props {
  mois: number;
  taille?: number;
  class?: string;
  style?: string;
  /** Couleur du trou de l'axe : celle de la surface sous le logo. */
  fond?: string;
}

export function Logo({ mois, taille = 48, class: classe, style, fond = 'var(--carte)' }: Props) {
  return (
    <svg
      class={classe}
      style={style}
      viewBox="0 0 256 256"
      width={taille}
      height={taille}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: dessinLogo({ mois, couleurs: COULEURS, encre: 'var(--logo-encre)', fond }) }}
    />
  );
}
