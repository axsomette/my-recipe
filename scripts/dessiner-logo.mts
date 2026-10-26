// Tire du logo (src/lib/logo.ts) les icônes de public/icones/, l'écran de lancement d'index.html
// et la planche animée de la maquette (design/Lancement.dc.html).
//   npm run logo
// Les PNG (iPhone, Android) se rendent ensuite depuis les SVG, voir le README.
import { readFileSync, writeFileSync } from 'node:fs';
import { COULEURS_LOGO, COULEURS_LOGO_SOMBRE, ENCRE_LOGO, PAPIER_LOGO, dessinLogo, svgLogo } from '../src/lib/logo.ts';

const racine = new URL('../', import.meta.url);
const lire = (chemin: string) => readFileSync(new URL(chemin, racine), 'utf8');
const ecrire = (chemin: string, texte: string) => writeFileSync(new URL(chemin, racine), texte);

// L'icône d'écran d'accueil est figée : la cuillère montre 10 h (octobre), la pose classique des cadrans.
const MOIS_ICONE = 10;

const tuile = (echelle: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="${PAPIER_LOGO}"/>` +
  `<g transform="translate(256 256) scale(${echelle}) translate(-128 -128)">${dessinLogo({ mois: MOIS_ICONE })}</g></svg>\n`;

ecrire('public/icones/app.svg', tuile(1.62));
ecrire('public/icones/app-adaptable.svg', tuile(1.26)); // zone sûre des icônes adaptables Android
ecrire('public/icones/favicon.svg', svgLogo({ mois: MOIS_ICONE, petit: true, fond: '#FFFFFF' }) + '\n');
ecrire('public/icones/logo.svg', svgLogo({ mois: MOIS_ICONE }) + '\n');
ecrire('public/icones/logo-noir.svg', svgLogo({ mois: MOIS_ICONE, mono: '#111111', fond: '#FFFFFF' }) + '\n');
ecrire('public/icones/logo-blanc.svg', svgLogo({ mois: MOIS_ICONE, mono: '#FFFFFF', fond: '#111111' }) + '\n');

// Maquette (design/icones) : les mêmes fichiers, le logo dans les quatre saisons et sur fond sombre.
for (const f of ['app', 'app-adaptable', 'favicon', 'logo', 'logo-noir', 'logo-blanc']) ecrire(`design/icones/${f}.svg`, lire(`public/icones/${f}.svg`));
for (const mois of [1, 4, 7, 10]) ecrire(`design/icones/logo-mois-${mois}.svg`, svgLogo({ mois }) + '\n');
ecrire('design/icones/logo-sombre.svg', svgLogo({ mois: MOIS_ICONE, couleurs: COULEURS_LOGO_SOMBRE, encre: '#ECEAE1', fond: '#211B22' }) + '\n');
// Planche des animations : l'anneau et la cuillère à part, pour la faire tourner de novembre à décembre.
const enDeux = (mois: number) => {
  const dessin = dessinLogo({ mois });
  const coupure = dessin.indexOf('<g class="l-cuillere"');
  return { anneau: dessin.slice(0, coupure), cuillere: dessin.slice(coupure) };
};
for (const mois of [11, 12]) ecrire(`design/icones/logo-anneau-${mois}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">${enDeux(mois).anneau}</svg>\n`);
ecrire('design/icones/logo-cuillere.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">${enDeux(12).cuillere}</svg>\n`);

// --- Écran de lancement ---
// Les douze mois apparaissent un à un, la cuillère fait un tour complet et s'arrête sur le mois en cours,
// dont le segment s'épaissit ; puis le titre tombe lettre par lettre. Le mois est posé par le script
// d'index.html (classe « courant » et angle de la cuillère).

const VARIABLES = {
  hiver: 'var(--l-hiver)', printemps: 'var(--l-printemps)', ete: 'var(--l-ete)', automne: 'var(--l-automne)',
};
const cadran = `<svg class="l-cadran" viewBox="0 0 256 256" aria-hidden="true">${dessinLogo({ mois: MOIS_ICONE, couleurs: VARIABLES, encre: 'var(--l-encre)', fond: 'var(--l-fond)', animable: true })}</svg>`;

let rang = 0;
const lettres = (mot: string) => `<span class="l-mot">${[...mot].map((c) => `<span class="l" style="--i:${rang++}">${c}</span>`).join('')}</span>`;
const titre = `<p class="l-titre" aria-hidden="true">${lettres('Recettes')}<span class="l-ligne">${'de saison'.split(' ').map(lettres).join(' ')}</span></p>`;
const NB_LETTRES = rang;

type Etape = [number, string];
const CLES: Record<string, Etape[]> = {
  pose: [[0, 'opacity:0;transform:scale(0.92)'], [1, 'opacity:1;transform:none']],
  seg: [[0, 'opacity:0;transform:scale(0.72)'], [1, 'opacity:1;transform:none']],
  tour: [[0, 'transform:rotate(var(--depart))'], [1, 'transform:rotate(var(--arrivee))']],
  gonfle: [[0, 'opacity:0;transform:scale(0.9)'], [0.6, 'opacity:1;transform:scale(1.04)'], [1, 'opacity:1;transform:none']],
  lettre: [
    [0, 'opacity:0;transform:translateY(-0.7em)'],
    [0.42, 'opacity:1;transform:translateY(0.05em) scale(1.08,0.86)'],
    [0.64, 'transform:translateY(-0.16em) scale(0.97,1.04)'],
    [0.84, 'transform:translateY(0.02em) scale(1.01,0.99)'],
    [1, 'opacity:1;transform:none'],
  ],
  monte: [[0, 'opacity:0;transform:translateY(8px)'], [1, 'opacity:1;transform:none']],
};
const REBOND = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
const TOUR = 'cubic-bezier(0.45, 0, 0.2, 1.12)'; // accélère, puis dépasse à peine et se pose
interface Pas { sel: string; cle: string; debut: number; duree: number; courbe: string; groupe?: string; }

/** Chronologie (secondes) pour le mois donné ; `groupe` regroupe les règles qui partagent un délai calculé. */
function chronologie(prefixe: string, mois: number): Pas[] {
  const pas: Pas[] = [{ sel: `${prefixe} .l-cadran`, cle: 'pose', debut: 0, duree: 0.3, courbe: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }];
  for (let k = 0; k < 12; k++) pas.push({ sel: `${prefixe} .l-seg[data-mois="${k + 1}"]`, cle: 'seg', debut: 0.04 + k * 0.035, duree: 0.3, courbe: REBOND, groupe: 'seg' });
  pas.push({ sel: `${prefixe} .l-cuillere`, cle: 'tour', debut: 0.22, duree: 0.95, courbe: TOUR });
  pas.push({ sel: `${prefixe} .l-seg[data-mois="${mois}"] .l-seg-plein`, cle: 'gonfle', debut: 1.08, duree: 0.38, courbe: 'ease-out', groupe: 'gonfle' });
  for (let i = 0; i < NB_LETTRES; i++) pas.push({ sel: `${prefixe} .l-titre .l[style="--i:${i}"]`, cle: 'lettre', debut: 0.62 + i * 0.03, duree: 0.62, courbe: 'ease-out', groupe: 'lettre' });
  pas.push({ sel: `${prefixe} .l-mois`, cle: 'monte', debut: 1.3, duree: 0.4, courbe: 'ease-out' });
  return pas;
}
const fin = Math.max(...chronologie('', 10).map((p) => p.debut + p.duree));
const keyframes = (nom: string, etapes: Etape[]) => `@keyframes ${nom} { ${etapes.map(([o, css]) => `${+(o * 100).toFixed(2)}% { ${css}; }`).join(' ')} }`;

const STYLES_FIXES = [
  '.l-cadran { width: 132px; height: 132px; margin-bottom: 4px; overflow: visible; }',
  '.l-cadran .l-seg, .l-cadran .l-seg-plein { transform-box: view-box; transform-origin: 128px 128px; }',
  '.l-cadran .l-seg-plein { opacity: 0; }',
  '.l-cadran .l-seg.courant .l-seg-plein { opacity: 1; }',
  `.l-cadran .l-cuillere { --arrivee: ${30 * MOIS_ICONE}deg; --depart: ${30 * MOIS_ICONE - 360}deg; transform-box: view-box; transform-origin: 128px 128px; transform: rotate(var(--arrivee)); }`,
  '.l-titre .l-mot { display: inline-block; white-space: nowrap; }',
  '.l-titre .l { display: inline-block; transform-origin: 50% 100%; }',
];

/** App : jouée une fois, au mois posé par le script (classe « courant »). */
function stylesApp() {
  const regles = [
    `.l-cadran { animation: l-pose 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) both; }`,
    `.l-cadran .l-seg { animation: l-seg 0.3s ${REBOND} calc(0.04s + var(--k) * 0.035s) both; }`,
    `.l-cadran .l-cuillere { animation: l-tour 0.95s ${TOUR} 0.22s both; }`,
    `.l-cadran .l-seg.courant .l-seg-plein { animation: l-gonfle 0.38s ease-out 1.08s both; }`,
    `.l-titre .l { animation: l-lettre 0.62s ease-out calc(0.62s + var(--i) * 0.03s) both; }`,
    `.l-mois { animation: l-monte 0.4s ease-out 1.3s both; }`,
  ];
  const cles = Object.entries(CLES).map(([nom, etapes]) => keyframes(`l-${nom}`, etapes));
  return [...STYLES_FIXES, ...regles, ...cles, '@media (prefers-reduced-motion: reduce) { .l-cadran, .l-cadran *, .l-titre .l, .l-mois { animation: none !important; } }'].join('\n');
}

/** Maquette : chaque saison (classe sur la planche) a son mois ; tout boucle sur `cycle` secondes. */
function stylesBoucle(cycle: number) {
  const MOIS: Record<string, number> = { hiver: 1, printemps: 4, ete: 7, automne: 10 };
  const regles: string[] = [...STYLES_FIXES, `.l-centre { animation: l-scene ${cycle}s linear infinite; }`];
  const cles = [`@keyframes l-scene { 0% { opacity: 0; } 4% { opacity: 1; } 90% { opacity: 1; } 96%, 100% { opacity: 0; } }`];
  let n = 0;
  for (const [saison, mois] of Object.entries(MOIS)) {
    regles.push(`.${saison} .l-cuillere { --arrivee: ${30 * mois}deg; --depart: ${30 * mois - 360}deg; }`);
    regles.push(`.${saison} .l-seg[data-mois="${mois}"] .l-seg-plein { opacity: 1; }`);
    for (const pas of chronologie(`.${saison}`, mois)) {
      if (pas.cle !== 'gonfle' && pas.cle !== 'tour' && saison !== 'automne') continue; // règles communes écrites une fois
      const nom = `l-b${n++}`;
      const p = (t: number) => +((t / cycle) * 100).toFixed(2);
      const etapes = CLES[pas.cle]!;
      const corps = etapes.map(([o, css], i) => `${p(pas.debut + o * pas.duree)}% { ${css};${i < etapes.length - 1 ? ` animation-timing-function: ${pas.courbe};` : ''} }`);
      cles.push(`@keyframes ${nom} { 0% { ${etapes[0]![1]}; } ${corps.join(' ')} 100% { ${etapes.at(-1)![1]}; } }`);
      const sel = pas.cle === 'gonfle' || pas.cle === 'tour' ? pas.sel : pas.sel.replace(`.${saison} `, '');
      regles.push(`${sel} { animation: ${nom} ${cycle}s linear infinite; }`);
    }
  }
  return [...regles, ...cles, '@media (prefers-reduced-motion: reduce) { .l-centre, .l-cadran, .l-cadran *, .l-titre .l, .l-mois { animation: none !important; } }'].join('\n');
}

function remplacerBloc(chemin: string, bloc: string) {
  const texte = lire(chemin);
  const debut = texte.indexOf('<!-- logo:debut');
  const fin = texte.indexOf('<!-- logo:fin -->') + '<!-- logo:fin -->'.length;
  if (debut < 0 || fin < debut) throw new Error(`${chemin} : repères <!-- logo:debut --> / <!-- logo:fin --> introuvables`);
  ecrire(chemin, texte.slice(0, debut) + bloc + texte.slice(fin));
}
const entete = '<!-- logo:debut (généré par scripts/dessiner-logo.mts) -->';
remplacerBloc('index.html', [entete, `<style>\n${stylesApp()}\n</style>`, cadran, titre, '<!-- logo:fin -->'].join('\n        '));
remplacerBloc('design/Lancement.dc.html', [entete, `<style>\n${stylesBoucle(4.4)}\n</style>`, cadran, titre, '<!-- logo:fin -->'].join('\n      '));

// Couleurs du logo selon le thème, partagées par l'écran de lancement et l'app (voir src/styles.css).
console.log(`Logo, icônes et écran de lancement écrits (animation de ${fin.toFixed(2)} s).`);
console.log(`Couleurs : ${JSON.stringify(COULEURS_LOGO)} / sombre ${JSON.stringify(COULEURS_LOGO_SOMBRE)} / encre ${ENCRE_LOGO}`);
