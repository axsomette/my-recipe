// Dessine l'emblème « la feuille du mois » : une page d'éphéméride dont le bandeau
// prend la couleur de la saison, et le produit de saison servi dans un bol.
// Écrit les SVG de public/icones/ et le bloc de l'écran de lancement dans index.html.
//   node scripts/dessiner-logo.mjs
// Les PNG (iPhone, Android) se rendent ensuite depuis les SVG, voir le README.
import { readFileSync, writeFileSync } from 'node:fs';

const racine = new URL('../', import.meta.url);
const lire = (chemin) => readFileSync(new URL(chemin, racine), 'utf8');
const ecrire = (chemin, texte) => writeFileSync(new URL(chemin, racine), texte);

const TRAIT = '#1E3B36'; // trait des illustrations (scripts/icones-maison)
const PAPIER = '#EEF0E7';
const FEUILLE = '#F9FAF5';
const CREUX = '#E3E6DA';

// `produit` est servi seul dans l'icône ; l'écran de lancement ajoute deux voisins de saison dans le bol.
export const SAISONS = [
  { id: 'hiver', teinte: '#6E2A63', produit: 'poireau', voisins: ['betterave', 'navet'] },
  { id: 'printemps', teinte: '#3B6B1F', produit: 'asperge', voisins: ['radis', 'petitpois'] },
  { id: 'ete', teinte: '#B3261E', produit: 'tomate', voisins: ['aubergine', 'poivron'] },
  { id: 'automne', teinte: '#A9480F', produit: 'potiron', voisins: ['champignon', 'chataigne'] },
];
// L'icône d'écran d'accueil est figée : la tomate d'été, la plus lisible en petit.
const SAISON_ICONE = SAISONS[2];

// --- Pièces, sur la grille 112 des illustrations ---

const PAGE = 'M18 24 L94 24 C98 24 100 26 100 30 L100 88 L84 102 L18 102 C14 102 12 100 12 96 L12 30 C12 26 14 24 18 24Z';
const BANDEAU = 'M12 46 L12 30 C12 26 14 24 18 24 L94 24 C98 24 100 26 100 30 L100 46Z';
const BLOC = 'M20 30 L92 30 C96 30 98 32 98 36 L98 100 C98 104 96 106 92 106 L20 106 C16 106 14 104 14 100 L14 36 C14 32 16 30 20 30Z';
const CORNE = 'M100 88 L88 88 C86 88 84 90 84 92 L84 102 Z';
const BOL = 'M28 78 L84 78 C84 90 74 97 56 97 C38 97 28 90 28 78Z';
const PRODUIT = { x: 56, y: 67, k: 0.42 }; // centre et échelle du produit au-dessus du bol

const chemin = (d, fill, extra = '') => `<path d="${d}" fill="${fill}"${extra}/>`;

/** Contenu d'un fichier de scripts/icones-maison, sans l'enveloppe <svg>. */
function illustration(nom) {
  const svg = lire(`scripts/icones-maison/${nom}.svg`);
  return svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
}

const produitPlace = (contenu) => {
  const { x, y, k } = PRODUIT;
  return `<g transform="translate(${x} ${y}) scale(${k}) translate(-56 -60)">${contenu}</g>`;
};

/** Bloc de feuilles derrière la page. */
const bloc = () => chemin(BLOC, CREUX);

/** La page du mois : bandeau, coin corné, produit, bol. `teinte` peut être une var() CSS. */
function page(teinte, produit) {
  return [
    chemin(PAGE, FEUILLE),
    chemin(BANDEAU, teinte.startsWith('var') ? 'none' : teinte, teinte.startsWith('var') ? ` style="fill:${teinte}"` : ''),
    chemin('M12 46 L100 46', 'none'),
    chemin(CORNE, CREUX),
    chemin('M20 54 L20 70', 'none', ' stroke="#fff" stroke-width="3.5" opacity="0.9"'),
    produit,
    chemin(BOL, FEUILLE),
    chemin('M30 84 C40 86 72 86 82 84', 'none', teinte.startsWith('var') ? ` stroke-width="3" style="stroke:${teinte}"` : ` stroke-width="3" stroke="${teinte}"`),
    chemin('M26 78 L86 78', 'none'),
  ].join('');
}

/** Les deux anneaux de reliure, posés par-dessus la page. */
function anneaux() {
  return [34, 78]
    .map(
      (x) =>
        `<circle cx="${x}" cy="36" r="4.4" fill="#221A20" stroke="none"/>` +
        `<rect x="${x - 3.6}" y="12" width="7.2" height="26" rx="3.6" fill="#C9CCBF" stroke-width="3.2"/>` +
        `<path d="M${x - 1} 17 L${x - 1} 24" fill="none" stroke="#fff" stroke-width="1.6" opacity="0.9"/>`,
    )
    .join('');
}

const traits = `stroke="${TRAIT}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"`;
const emblemeComplet = (s) => bloc() + page(s.teinte, produitPlace(illustration(s.produit))) + anneaux();

/** Emblème seul, fond transparent : rail de navigation, favicon. */
const embleme = (s) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="6 8 100 100"><g ${traits}>${emblemeComplet(s)}</g></svg>\n`;

/** Icône carrée sur papier ; `echelle` réduite pour la zone sûre des icônes adaptables Android. */
const icone = (s, echelle) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="${PAPIER}"/>` +
  `<g transform="translate(256 258) scale(${echelle}) translate(-56 -59)" ${traits}>${emblemeComplet(s)}</g></svg>\n`;

for (const s of SAISONS) ecrire(`public/icones/feuille-${s.id}.svg`, embleme(s));
ecrire('public/icones/favicon.svg', embleme(SAISON_ICONE));
ecrire('public/icones/app.svg', icone(SAISON_ICONE, 3.9));
ecrire('public/icones/app-adaptable.svg', icone(SAISON_ICONE, 3.0));

// --- Écran de lancement ---
// Les quatre pages de l'année sont empilées, celle de la saison en cours au fond : les trois autres
// se tournent l'une après l'autre sur leurs anneaux, puis les produits de la saison tombent dans le bol
// et le titre arrive lettre par lettre. L'ordre dépend de la saison, posée en classe sur <html>.
// Une seule chronologie sert à l'app (jouée une fois) et à la maquette (en boucle).

const ORDRE = SAISONS.map((s) => s.id);
const PLACES = [
  { x: 56, y: 66, k: 0.38 }, // produit principal
  { x: 34, y: 71, k: 0.3 }, // voisin de gauche
  { x: 78, y: 71, k: 0.3 }, // voisin de droite
];
const TITRE = ['Recettes', 'de saison'];

const utiliser = (nom, { x, y, k }) => `<use href="#l-${nom}" x="${x - 56 * k}" y="${y - 60 * k}" width="${112 * k}" height="${112 * k}"/>`;
/** Trio de la saison : les voisins d'abord, derrière le produit principal. */
const trio = (s) =>
  [2, 3, 1].map((rang) => `<g class="l-prod l-prod-${rang}">${utiliser(rang === 1 ? s.produit : s.voisins[rang - 2], PLACES[rang - 1])}</g>`).join('');
const svgLancement = (classe, contenu) => `<svg class="${classe}" viewBox="6 8 100 100" ${traits}>${contenu}</svg>`;
const nomsProduits = [...new Set(SAISONS.flatMap((s) => [s.produit, ...s.voisins]))];
const symboles = nomsProduits.map((n) => `<symbol id="l-${n}" viewBox="0 0 112 112">${illustration(n)}</symbol>`).join('');

let rangLettre = 0;
const lettres = (mot) =>
  `<span class="l-mot">${[...mot].map((c) => `<span class="l" style="--i:${rangLettre++}">${c}</span>`).join('')}</span>`;
const titre = `<p class="l-titre" aria-hidden="true">${lettres(TITRE[0])}<span class="l-ligne">${TITRE[1].split(' ').map(lettres).join(' ')}</span></p>`;
const NB_LETTRES = rangLettre;

// Chronologie (secondes). `cle` : étapes de 0 à 1 d'une animation.
const CLES = {
  pose: [[0, 'opacity:0;transform:translateY(6px)'], [1, 'opacity:1;transform:none']],
  tourne: [[0, 'transform:none'], [1, 'transform:rotateX(178deg)']],
  tombe: [[0, 'opacity:0;transform:translateY(-20px) scale(0.8)'], [1, 'opacity:1;transform:none']],
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
const chronologie = () => {
  const etapes = [{ sel: '.l-feuillet', cle: 'pose', debut: 0, duree: 0.36, courbe: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }];
  for (const [i, saison] of ORDRE.entries()) {
    // Pages au-dessus de la saison en cours : de la plus ancienne (en haut, tournée la première) à la précédente.
    for (let rang = 1; rang <= 3; rang++) {
      const page = ORDRE[(i + rang) % 4];
      etapes.push({ sel: `.${saison} .l-p-${page}`, cle: 'tourne', debut: 0.12 + (rang - 1) * 0.2, duree: 0.42, courbe: 'cubic-bezier(0.55, 0.05, 0.6, 1)', z: 5 - rang });
    }
    for (let rang = 1; rang <= 3; rang++) {
      etapes.push({ sel: `.${saison} .l-p-${saison} .l-prod-${rang}`, cle: 'tombe', debut: 0.74 + (rang - 1) * 0.11, duree: 0.5, courbe: REBOND });
    }
  }
  for (let i = 0; i < NB_LETTRES; i++) {
    etapes.push({ sel: `.l-titre .l[style="--i:${i}"]`, cle: 'lettre', debut: 0.46 + i * 0.03, duree: 0.62, courbe: 'ease-out', lettre: i });
  }
  etapes.push({ sel: '.l-mois', cle: 'monte', debut: 1.2, duree: 0.4, courbe: 'ease-out' });
  return etapes;
};
export const FIN_LANCEMENT = Math.max(...chronologie().map((e) => e.debut + e.duree));

const keyframes = (nom, etapes) => `@keyframes ${nom} { ${etapes.map(([o, css]) => `${+(o * 100).toFixed(2)}% { ${css}; }`).join(' ')} }`;

/** Styles communs : empilement, origines des transformations, état sans animation. */
function stylesFixes() {
  const z = chronologie()
    .filter((e) => e.z)
    .map((e) => `${e.sel} { z-index: ${e.z}; }`);
  const visibles = ORDRE.map((s) => `.${s} .l-p-${s}`).join(', ');
  return [
    '.l-feuillet { position: relative; width: 136px; height: 136px; margin-bottom: 2px; perspective: 520px; }',
    '.l-feuillet > svg:not([width]) { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }',
    '.l-anneaux { z-index: 9; }',
    '.l-page { transform-origin: 50% 28%; backface-visibility: hidden; }',
    '.l-prod { transform-box: fill-box; transform-origin: 50% 100%; }',
    '.l-titre .l-mot { display: inline-block; white-space: nowrap; }',
    '.l-titre .l { display: inline-block; transform-origin: 50% 100%; }',
    ...z,
    `@media (prefers-reduced-motion: reduce) { .l-page { visibility: hidden; } ${visibles} { visibility: visible; } }`,
  ].join('\n');
}

/** App : chaque étape jouée une fois, avec son délai. Les lettres partagent une règle. */
function stylesApp() {
  const regles = chronologie()
    .filter((e) => e.lettre === undefined)
    .map((e) => `${e.sel} { animation: l-${e.cle} ${e.duree}s ${e.courbe} ${e.debut.toFixed(2)}s both; }`);
  regles.push(`.l-titre .l { animation: l-lettre 0.62s ease-out calc(0.46s + var(--i) * 0.03s) both; }`);
  const cles = Object.entries(CLES).map(([nom, etapes]) => keyframes(`l-${nom}`, etapes));
  return [...regles, ...cles, '@media (prefers-reduced-motion: reduce) { .l-feuillet, .l-feuillet *, .l-titre .l, .l-mois { animation: none !important; } }'].join('\n');
}

/** Maquette : tout tourne en boucle sur `cycle` secondes, la scène s'efface avant de recommencer. */
function stylesBoucle(cycle) {
  const regles = [];
  const cles = [`@keyframes l-scene { 0% { opacity: 0; } 5% { opacity: 1; } 90% { opacity: 1; } 96%, 100% { opacity: 0; } }`];
  regles.push(`.l-centre { animation: l-scene ${cycle}s linear infinite; }`);
  chronologie().forEach((e, n) => {
    const nom = `l-b${n}`;
    const p = (t) => +((t / cycle) * 100).toFixed(2);
    const etapes = CLES[e.cle];
    const premier = etapes[0][1];
    const dernier = etapes.at(-1)[1];
    const corps = etapes.map(([o, css], i) => `${p(e.debut + o * e.duree)}% { ${css};${i < etapes.length - 1 ? ` animation-timing-function: ${e.courbe};` : ''} }`);
    cles.push(`@keyframes ${nom} { 0% { ${premier}; } ${corps.join(' ')} 100% { ${dernier}; } }`);
    regles.push(`${e.sel} { animation: ${nom} ${cycle}s linear infinite; }`);
  });
  return [...regles, ...cles, '@media (prefers-reduced-motion: reduce) { .l-centre, .l-feuillet, .l-feuillet *, .l-titre .l, .l-mois { animation: none !important; } }'].join('\n');
}

const pages = SAISONS.map((s) => svgLancement(`l-page l-p-${s.id}`, page(s.teinte, trio(s))));
const scene = [
  '<div class="l-feuillet" aria-hidden="true">',
  `<svg width="0" height="0" style="position:absolute">${symboles}</svg>`,
  svgLancement('l-bloc', bloc()),
  ...pages,
  svgLancement('l-anneaux', anneaux()),
  '</div>',
  titre,
];

const blocApp = [
  '<!-- logo:debut (généré par scripts/dessiner-logo.mjs) -->',
  `<style>\n${stylesFixes()}\n${stylesApp()}\n</style>`,
  ...scene,
  '<!-- logo:fin -->',
].join('\n        ');

function remplacerBloc(chemin, bloc) {
  const texte = lire(chemin);
  const debut = texte.indexOf('<!-- logo:debut');
  const fin = texte.indexOf('<!-- logo:fin -->') + '<!-- logo:fin -->'.length;
  if (debut < 0 || fin < debut) throw new Error(`${chemin} : repères <!-- logo:debut --> / <!-- logo:fin --> introuvables`);
  ecrire(chemin, texte.slice(0, debut) + bloc + texte.slice(fin));
}
remplacerBloc('index.html', blocApp);
remplacerBloc(
  'design/Lancement.dc.html',
  ['<!-- logo:debut (généré par scripts/dessiner-logo.mjs) -->', `<style>\n${stylesFixes()}\n${stylesBoucle(4.2)}\n</style>`, ...scene, '<!-- logo:fin -->'].join('\n      '),
);

console.log(`Emblèmes, icônes et écran de lancement écrits (animation de ${FIN_LANCEMENT.toFixed(2)} s).`);
