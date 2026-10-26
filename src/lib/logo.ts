// Logo « le cadran des saisons » : douze segments, un par mois, aux couleurs de leur saison,
// et une cuillère pour aiguille qui montre le mois en cours. Grille 256 × 256, centre (128, 128).
// Source unique : l'app (rail), l'écran de lancement, les icônes et la maquette en sont tirés
// (scripts/dessiner-logo.mts).
import { saisonDuMois, type Saison } from './calendrier';

export const COULEURS_LOGO: Record<Saison, string> = { hiver: '#6E2A63', printemps: '#3B6B1F', ete: '#B3261E', automne: '#A9480F' };
export const COULEURS_LOGO_SOMBRE: Record<Saison, string> = { hiver: '#D9A0CC', printemps: '#A6D17E', ete: '#F2877C', automne: '#F09A5B' };
export const ENCRE_LOGO = '#221A20';
export const PAPIER_LOGO = '#EEF0E7';

const C = 128;
// Anneau des mois, et segment du mois en cours, plus épais vers l'extérieur.
const R = 116;
const r = 98;
const R_COURANT = 128;
const r_COURANT = 91;
const ECART = 7; // intervalle entre deux mois, bords parallèles

/** Angle du mois m (1–12) sur le cadran, en degrés depuis l'axe x, sens horaire : décembre à midi, octobre à 10 h. */
export const angleDuMois = (m: number) => -90 + 30 * m;

const arrondi = (n: number) => Math.round(n * 100) / 100;

/** Couleur de remplissage : attribut pour une valeur fixe, style pour une variable CSS (thème clair/sombre). */
const peindre = (c: string) => (c.startsWith('var(') ? ` style="fill:${c}"` : ` fill="${c}"`);

function point(a: number, rayon: number, cote: 1 | -1): [number, number] {
  const ux = Math.cos((a * Math.PI) / 180);
  const uy = Math.sin((a * Math.PI) / 180);
  const decale = ECART / 2;
  const t = Math.sqrt(rayon * rayon - decale * decale);
  return [arrondi(C + t * ux - decale * uy * cote), arrondi(C + t * uy + decale * ux * cote)];
}

/** Segment d'anneau du mois m : ses deux bords suivent exactement les rayons à ±15° du mois. */
export function segment(m: number, exterieur = R, interieur = r): string {
  const a0 = angleDuMois(m) - 15;
  const a1 = angleDuMois(m) + 15;
  const [x0, y0] = point(a0, exterieur, 1);
  const [x1, y1] = point(a1, exterieur, -1);
  const [x2, y2] = point(a1, interieur, -1);
  const [x3, y3] = point(a0, interieur, 1);
  return `M${x0} ${y0}A${exterieur} ${exterieur} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${interieur} ${interieur} 0 0 0 ${x3} ${y3}Z`;
}

/** Arc d'une saison entière (version petite taille : quatre arcs au lieu de douze segments). */
function arcSaison(premier: number, exterieur: number, interieur: number): string {
  const a0 = angleDuMois(premier) - 15;
  const a1 = angleDuMois(premier) + 75;
  const [x0, y0] = point(a0, exterieur, 1);
  const [x1, y1] = point(a1, exterieur, -1);
  const [x2, y2] = point(a1, interieur, -1);
  const [x3, y3] = point(a0, interieur, 1);
  return `M${x0} ${y0}A${exterieur} ${exterieur} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${interieur} ${interieur} 0 0 0 ${x3} ${y3}Z`;
}

/** Cuillère dessinée vers midi ; on la tourne de 30° par mois. */
const CUILLERE =
  '<ellipse cx="128" cy="72" rx="21" ry="27"/>' +
  '<path d="M121.5 95C122.5 110 121.5 146 120.5 170a7.5 7.5 0 0 0 15 0C134.5 146 133.5 110 134.5 95Z"/>' +
  '<circle cx="128" cy="128" r="15"/>';
const CUILLERE_PETITE =
  '<ellipse cx="128" cy="74" rx="25" ry="30"/>' +
  '<path d="M118 96V172a10 10 0 0 0 20 0V96Z"/>' +
  '<circle cx="128" cy="128" r="18"/>';

export interface OptionsLogo {
  /** Mois montré par la cuillère, de 1 à 12. */
  mois?: number;
  couleurs?: Record<Saison, string>;
  encre?: string;
  /** Couleur du trou de l'axe (le fond sur lequel le logo est posé). */
  fond?: string;
  /** Une seule couleur pour tout (versions noire, blanche, gravure). */
  mono?: string;
  /** Dessin simplifié pour 16–32 px : quatre arcs de saison, cuillère plus épaisse. */
  petit?: boolean;
  /** Ajoute data-mois et des classes aux pièces, pour l'animation de l'écran de lancement. */
  animable?: boolean;
}

/** Contenu SVG du logo (sans la balise <svg>), pour un viewBox 0 0 256 256. */
export function dessinLogo({
  mois = 10,
  couleurs = COULEURS_LOGO,
  encre = ENCRE_LOGO,
  fond = PAPIER_LOGO,
  mono,
  petit = false,
  animable = false,
}: OptionsLogo = {}): string {
  const teinte = (m: number) => mono ?? couleurs[saisonDuMois(m)];
  const anneau = petit
    ? [12, 3, 6, 9].map((premier) => `<path d="${arcSaison(premier, 118, 92)}"${peindre(teinte(premier))}/>`).join('')
    : Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        const courant = m === mois;
        const d = courant && !animable ? segment(m, R_COURANT, r_COURANT) : segment(m);
        const attrs = animable ? ` class="l-seg" data-mois="${m}" style="--k:${i}"` : '';
        const epais = animable ? `<path class="l-seg-plein" d="${segment(m, R_COURANT, r_COURANT)}"${peindre(teinte(m))}/>` : '';
        return `<g${attrs}><path d="${d}"${peindre(teinte(m))}/>${epais}</g>`;
      }).join('');
  const reflet = petit || mono ? '' : '<path d="M118.5 61C120.5 55 123.5 52 128 51" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity="0.85"/>';
  const encreCuillere = mono ?? encre;
  const cuillere = `<g class="l-cuillere"${encreCuillere.startsWith('var(') ? '' : ` fill="${encreCuillere}"`} style="${encreCuillere.startsWith('var(') ? `fill:${encreCuillere};` : ''}${animable ? '' : `--arrivee:${30 * mois}deg;`}" transform="rotate(${30 * mois} 128 128)">${petit ? CUILLERE_PETITE : CUILLERE}${reflet}</g>`;
  const axe = `<circle cx="128" cy="128" r="${petit ? 6.5 : 5.5}"${peindre(fond)}/>`;
  return anneau + cuillere + axe;
}

export const svgLogo = (options: OptionsLogo = {}, viewBox = '0 0 256 256') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${dessinLogo(options)}</svg>`;
