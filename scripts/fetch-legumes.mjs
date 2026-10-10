#!/usr/bin/env node
// Synchronise public/legumes.json avec les sources ouvertes.
//
//  - ADEME / Impact CO₂ : produits de saison, leurs mois et leurs noms, lus dans le dépôt
//    open source de l'ADEME (licence MIT) — la source même de leur API, sans clé ni compte.
//  - Liste « base » : produits absents de l'ADEME (pomme de terre, aromates…),
//    disponibles toute l'année.
//  - Agenda des Chefs METRO (data.gouv.fr) : mois de saison des poissons et fruits de mer
//    (version CSV), et mois phares d'autres fruits et légumes (version JSON), utilisés
//    seulement comme suggestion quand on ajoute un légume perso.
//  - Illustrations : dessinées pour le projet, dans scripts/icones-maison/<id>.svg,
//    copiées dans public/legumes/icones/. Aucune image n'est téléchargée.
//
// Usage : node scripts/fetch-legumes.mjs
// Sans dépendance : Node 22+ (fetch natif, Object.groupBy).

import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(RACINE, 'public');
const SORTIE = join(PUBLIC, 'legumes.json');
const ICONES_SOURCE = join(RACINE, 'scripts', 'icones-maison');
const ICONES_PUBLIC = join(PUBLIC, 'legumes', 'icones');

// Dépôt public de l'ADEME (https://github.com/incubateur-ademe/impactco2, licence MIT).
const ADEME_DEPOT = 'https://raw.githubusercontent.com/incubateur-ademe/impactco2/main';
const METRO_DATASET = 'https://www.data.gouv.fr/api/1/datasets/6ac3b2518a941afc6ea8e4b0/';
const METRO_RESSOURCE = 'ffd48740-e61e-49fe-a564-d0c148234825'; // version JSON
const METRO_CSV = 'b4f00fdc-1398-4a54-854a-ea43bc646fa1'; // version CSV : seule à donner les poissons colonne par colonne
const USER_AGENT = 'recettes-de-saison/1.0 (https://github.com/axsomette/my-recipe)';

// Catégories ADEME → identifiants de l'app.
const CATEGORIES = {
  'légumes': 'legumes',
  'fruits': 'fruits',
  'herbes': 'herbes',
  'pommes de terre et autres tubercules': 'tubercules',
  'fruits à coque et graines oléagineuses': 'fruits-a-coque',
  'pâtes, riz et céréales': 'cereales',
};

// Produits courants absents de l'ADEME. Toute l'année : ils n'entrent pas
// dans le score de saison, on n'invente aucun mois.
const BASE = [
  { id: 'pommedeterre', nom: 'Pomme de terre', categorie: 'tubercules' },
  { id: 'patatedouce', nom: 'Patate douce', categorie: 'tubercules' },
  { id: 'persil', nom: 'Persil', categorie: 'herbes' },
  { id: 'basilic', nom: 'Basilic', categorie: 'herbes' },
  { id: 'ciboulette', nom: 'Ciboulette', categorie: 'herbes' },
  { id: 'coriandre', nom: 'Coriandre', categorie: 'herbes' },
  { id: 'thym', nom: 'Thym', categorie: 'herbes' },
  { id: 'romarin', nom: 'Romarin', categorie: 'herbes' },
  { id: 'laurier', nom: 'Laurier', categorie: 'herbes' },
  { id: 'menthe', nom: 'Menthe', categorie: 'herbes' },
  { id: 'sauge', nom: 'Sauge', categorie: 'herbes' },
  { id: 'gingembre', nom: 'Gingembre', categorie: 'herbes' },
  // Garde-manger : ce qui complète les recettes, hors de toute saisonnalité.
  { id: 'poulet', nom: 'Poulet', categorie: 'viandes' },
  { id: 'boeuf', nom: 'Bœuf', categorie: 'viandes' },
  { id: 'porc', nom: 'Porc', categorie: 'viandes' },
  { id: 'agneau', nom: 'Agneau', categorie: 'viandes' },
  { id: 'jambon', nom: 'Jambon', categorie: 'viandes' },
  { id: 'lardons', nom: 'Lardons', categorie: 'viandes' },
  { id: 'saucisse', nom: 'Saucisse', categorie: 'viandes' },
  { id: 'dinde', nom: 'Dinde', categorie: 'viandes' },
  { id: 'canard', nom: 'Canard', categorie: 'viandes' },
  { id: 'veau', nom: 'Veau', categorie: 'viandes' },
  { id: 'lapin', nom: 'Lapin', categorie: 'viandes' },
  { id: 'pintade', nom: 'Pintade', categorie: 'viandes' },
  { id: 'steakhache', nom: 'Steak haché', categorie: 'viandes' },
  { id: 'merguez', nom: 'Merguez', categorie: 'viandes' },
  { id: 'chorizo', nom: 'Chorizo', categorie: 'viandes' },
  { id: 'boudinnoir', nom: 'Boudin noir', categorie: 'viandes' },
  { id: 'saumon', nom: 'Saumon', categorie: 'poissons' },
  { id: 'cabillaud', nom: 'Cabillaud', categorie: 'poissons' },
  { id: 'thon', nom: 'Thon', categorie: 'poissons' },
  { id: 'crevette', nom: 'Crevette', categorie: 'poissons' },
  { id: 'moule', nom: 'Moule', categorie: 'poissons' },
  // Courants mais absents de l'Agenda METRO : toute l'année, sauf la Saint-Jacques,
  // dont la pêche est fermée du 15 mai au 30 septembre (saison réglementaire, pas inventée).
  { id: 'maquereau', nom: 'Maquereau', categorie: 'poissons' },
  { id: 'truite', nom: 'Truite', categorie: 'poissons' },
  { id: 'saintjacques', nom: 'Saint-Jacques', categorie: 'poissons', mois: [1, 2, 3, 4, 5, 10, 11, 12] },
  { id: 'huitre', nom: 'Huître', categorie: 'poissons' },
  { id: 'crabe', nom: 'Crabe', categorie: 'poissons' },
  { id: 'poulpe', nom: 'Poulpe', categorie: 'poissons' },
  { id: 'oeuf', nom: 'Œuf', categorie: 'cremerie' },
  { id: 'fromage', nom: 'Fromage', categorie: 'cremerie' },
  { id: 'beurre', nom: 'Beurre', categorie: 'cremerie' },
  { id: 'creme', nom: 'Crème fraîche', categorie: 'cremerie' },
  { id: 'lait', nom: 'Lait', categorie: 'cremerie' },
  { id: 'yaourt', nom: 'Yaourt', categorie: 'cremerie' },
  { id: 'mozzarella', nom: 'Mozzarella', categorie: 'cremerie' },
  { id: 'pates', nom: 'Pâtes', categorie: 'feculents' },
  { id: 'riz', nom: 'Riz', categorie: 'feculents' },
  { id: 'pain', nom: 'Pain', categorie: 'feculents' },
  { id: 'farine', nom: 'Farine', categorie: 'feculents' },
  { id: 'semoule', nom: 'Semoule', categorie: 'feculents' },
  { id: 'lentilles', nom: 'Lentilles', categorie: 'feculents' },
  { id: 'poischiches', nom: 'Pois chiches', categorie: 'feculents' },
  { id: 'haricotsrouges', nom: 'Haricots rouges', categorie: 'feculents' },
  { id: 'huileolive', nom: 'Huile d’olive', categorie: 'epicerie' },
  { id: 'chocolat', nom: 'Chocolat', categorie: 'epicerie' },
  { id: 'tofu', nom: 'Tofu', categorie: 'epicerie' },
  { id: 'miel', nom: 'Miel', categorie: 'epicerie' },
];

// Illustrations génériques, pour un produit sans dessin dédié.
const ICONES_GENERIQUES = ['panier', 'champignon', 'herbe'];

// Produits proches dont on reprend l'illustration (le nom ne contient pas l'id).
const CORRESPONDANCES = {
  potimarron: 'potiron', rutabaga: 'navet', crosne: 'topinambour', cardon: 'celeri',
  feve: 'petitpois', bergamote: 'citron', kumquat: 'orange', pomelo: 'pamplemousse',
  mirabelle: 'prune', truffe: 'champignon', girolle: 'champignon', cepe: 'champignon',
  salade: 'laitue', roquette: 'laitue', yuzu: 'citron', butternut: 'courge',
  // Garde-manger
  steak: 'boeuf', volaille: 'poulet', magret: 'canard', chipolata: 'saucisse', boudin: 'boudinnoir',
  bacon: 'lardons', poisson: 'cabillaud', colin: 'merlu', lieu: 'lieunoir', dorade: 'doradegrise',
  daurade: 'doradegrise', lotte: 'baudroie', loup: 'bar', rouget: 'rougetbarbet', grondin: 'grondinrouge',
  limande: 'limandesole', carrelet: 'pliecarrelet', plie: 'pliecarrelet', saumonette: 'roussette',
  haddock: 'eglefin', germon: 'thonblanc', encornet: 'calmar', seiche: 'calmar', pieuvre: 'poulpe',
  tourteau: 'crabe', araignee: 'crabe', coquille: 'saintjacques', gambas: 'crevette',
  spaghetti: 'pates', tagliatelle: 'pates', lasagne: 'pates',
  nouille: 'pates', macaroni: 'pates', baguette: 'pain', parmesan: 'fromage', comte: 'fromage',
  emmental: 'fromage', gruyere: 'fromage', chevre: 'fromage', feta: 'fromage', ricotta: 'creme',
  mascarpone: 'creme', couscous: 'semoule', boulgour: 'semoule', quinoa: 'semoule', cacao: 'chocolat',
};

const TOUS_LES_MOIS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
// Garde-fous : en dessous, on considère que l'API a mal répondu et on n'écrit rien.
const MIN_PRODUITS_ADEME = 60;
const MIN_POISSONS_METRO = 15;

// Noms METRO rendus plus familiers ; l'id reste celui du nom METRO.
const NOMS_POISSONS = {
  baudroie: 'Lotte (baudroie)', pliecarrelet: 'Plie (carrelet)', calmar: 'Calmar (encornet)',
  merlu: 'Merlu (colin)', thonblanc: 'Thon blanc (germon)', limandesole: 'Limande-sole',
};
const MOIS_CSV = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const slugifier = (texte) =>
  texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');

// « Haricot vert (cru) » → « Haricot vert », « Champignon (morille crue) » → « Champignon (morille) ».
const nettoyerNom = (nom) => nom.replace(/\s*\(crue?\)$/, '').replace(/ crue?\)/, ')').trim();

// JSON indenté, mais listes de nombres sur une ligne : diffs git lisibles.
const formaterJson = (objet) =>
  `${JSON.stringify(objet, null, 1).replace(/\[\s+([\d,\s]+?)\s+\]/g, (_, nombres) => `[${nombres.replace(/\s+/g, '')}]`)}\n`;

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

async function telechargerJson(url, { entetes = {}, essais = 3 } = {}) {
  let derniereErreur;
  for (let essai = 1; essai <= essais; essai++) {
    try {
      const reponse = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, ...entetes },
        signal: AbortSignal.timeout(20_000),
      });
      if (!reponse.ok) throw new Error(`HTTP ${reponse.status} pour ${url}`);
      return await reponse.json();
    } catch (erreur) {
      derniereErreur = erreur;
      if (essai < essais) await attendre(1000 * essai);
    }
  }
  throw derniereErreur;
}

async function lireSiExiste(chemin, encodage) {
  try {
    return await readFile(chemin, encodage);
  } catch {
    return null;
  }
}

// N'écrit que si le contenu change, pour que git ne voie que les vraies évolutions.
async function ecrireSiChange(chemin, contenu) {
  const actuel = await lireSiExiste(chemin);
  const nouveau = typeof contenu === 'string' ? Buffer.from(contenu) : contenu;
  if (actuel && Buffer.compare(actuel, nouveau) === 0) return false;
  await mkdir(dirname(chemin), { recursive: true });
  await writeFile(chemin, nouveau);
  return true;
}

async function telechargerTexte(url) {
  const reponse = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(20_000) });
  if (!reponse.ok) throw new Error(`HTTP ${reponse.status} pour ${url}`);
  return reponse.text();
}

// Nom français tel que l'ADEME l'affiche : « kg de ;pomme » → « Pomme », « [s] » = marque du pluriel.
function nomAdeme(libelle) {
  const nom = (libelle.includes(';') ? libelle.split(';')[1] : libelle).replace(/\[[^\]]*\]/g, '').trim();
  return nom.charAt(0).toUpperCase() + nom.slice(1);
}

async function produitsAdeme() {
  const [donnees, categories, noms] = await Promise.all([
    telechargerTexte(`${ADEME_DEPOT}/src/data/categories/fruitsetlegumes.ts`),
    telechargerTexte(`${ADEME_DEPOT}/src/utils/fruitsetlegumes.ts`),
    telechargerJson(`${ADEME_DEPOT}/src/utils/Equivalent/values.json`),
  ]);
  // fruitsetlegumes.ts : { slug: 'pomme', …, months: [0, 1, …] } — mois numérotés de 0 à 11.
  const fiches = [...donnees.matchAll(/slug:\s*'([a-z0-9]+)'[^]*?months:\s*\[([\d,\s]*)\]/g)];
  const nbSlugs = [...donnees.matchAll(/slug:\s*'/g)].length;
  // utils/fruitsetlegumes.ts : pomme: 'fruits', …
  const categorieDe = Object.fromEntries([...categories.matchAll(/^\s*([a-z0-9]+):\s*'([^']+)',?$/gm)].map((m) => [m[1], m[2]]));

  if (fiches.length !== nbSlugs) throw new Error('ADEME : format du fichier des fruits et légumes inattendu');
  const produits = fiches.map(([, slug, mois]) => {
    const categorie = CATEGORIES[categorieDe[slug]];
    const libelle = noms[slug]?.fr;
    const listeMois = mois.split(',').map((m) => m.trim()).filter(Boolean).map((m) => Number(m) + 1);
    const valide = categorie && typeof libelle === 'string' && listeMois.length > 0 && listeMois.every((m) => Number.isInteger(m) && m >= 1 && m <= 12);
    if (!valide) throw new Error(`ADEME : produit « ${slug} » incomplet`);
    return { slug, nom: nettoyerNom(nomAdeme(libelle)), categorie, mois: [...new Set(listeMois)].sort((a, b) => a - b) };
  });

  if (produits.length < MIN_PRODUITS_ADEME) {
    throw new Error(`ADEME : seulement ${produits.length} produits, synchro annulée`);
  }
  return produits;
}

// SVG d'une ligne : moins lourd, et les diffs git restent lisibles.
const compacterSvg = (svg) => svg.replace(/>\s+</g, '><').replace(/\s{2,}/g, ' ').trim();

// Copie l'illustration d'un produit ; sans dessin dédié, on prend le panier
// et on le signale (annotation visible dans l'Action GitHub).
async function icone(id) {
  const svg = await lireSiExiste(join(ICONES_SOURCE, `${id}.svg`), 'utf8');
  if (!svg) {
    console.warn(`::warning::Pas d'illustration pour « ${id} » : panier en attendant (scripts/icones-maison/${id}.svg)`);
    return icone('panier');
  }
  await ecrireSiChange(join(ICONES_PUBLIC, `${id}.svg`), compacterSvg(svg));
  return `legumes/icones/${id}.svg`;
}

// Illustration la plus proche pour un nom libre : correspondance connue,
// sinon l'id contenu dans le nom, le plus à gauche (« chou kale » → chou), sinon générique.
function iconeProche(nom, idsIllustres, categorie) {
  const slug = slugifier(nom);
  const alias = Object.keys(CORRESPONDANCES).find((cle) => slug.includes(cle));
  if (alias) return CORRESPONDANCES[alias];
  const contenu = [...idsIllustres]
    .filter((id) => slug.includes(id))
    .sort((a, b) => slug.indexOf(a) - slug.indexOf(b) || b.length - a.length)[0];
  if (contenu) return contenu;
  return categorie === 'champignons' ? 'champignon' : categorie === 'herbes' ? 'herbe' : 'panier';
}

// CSV (RFC 4180) : champs entre guillemets, guillemets doublés, séparateur deviné sur l'en-tête.
function lireCsv(texte) {
  const enTete = texte.slice(0, texte.indexOf('\n'));
  const separateur = [';', ',', '\t'].sort((a, b) => enTete.split(b).length - enTete.split(a).length)[0];
  const lignes = [];
  let ligne = [], champ = '', guillemets = false;
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (guillemets) {
      if (c === '"' && texte[i + 1] === '"') { champ += '"'; i++; }
      else if (c === '"') guillemets = false;
      else champ += c;
    } else if (c === '"') guillemets = true;
    else if (c === separateur) { ligne.push(champ); champ = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texte[i + 1] === '\n') i++;
      ligne.push(champ); champ = '';
      if (ligne.some((x) => x !== '')) lignes.push(ligne);
      ligne = [];
    } else champ += c;
  }
  ligne.push(champ);
  if (ligne.some((x) => x !== '')) lignes.push(ligne);
  const [colonnes, ...donnees] = lignes;
  return donnees.map((valeurs) => Object.fromEntries(colonnes.map((col, i) => [col.replace(/^\uFEFF/, '').trim(), (valeurs[i] ?? '').trim()])));
}

function booleen(valeur, contexte) {
  if (/^(true|vrai|oui|1|x)$/i.test(valeur)) return true;
  if (/^(false|faux|non|0|)$/i.test(valeur)) return false;
  throw new Error(`METRO : valeur « ${valeur} » inattendue (${contexte})`);
}

// Poissons et fruits de mer de l'Agenda des Chefs : leurs mois de saison entrent dans le calcul.
async function poissonsMetro(jeu) {
  const ressource = jeu.resources?.find((r) => r.id === METRO_CSV);
  if (!ressource?.url) throw new Error('METRO : ressource CSV introuvable sur data.gouv.fr');
  const lignes = lireCsv(await telechargerTexte(ressource.url)).filter((l) => /^poissons?/i.test(l.category_fr ?? ''));
  const poissons = lignes.map((l) => {
    const id = slugifier(l.product_fr ?? '');
    const mois = MOIS_CSV.flatMap((m, i) => (booleen(l[m], `${l.product_fr} › ${m}`) ? [i + 1] : []));
    // Le nombre de mois annoncé doit correspondre aux colonnes cochées.
    if (!id || mois.length === 0 || (l.month_count && Number(l.month_count) !== mois.length)) {
      throw new Error(`METRO : poisson « ${l.product_fr} » incohérent`);
    }
    return { id, nom: NOMS_POISSONS[id] ?? l.product_fr, mois };
  });
  if (poissons.length < MIN_POISSONS_METRO) throw new Error(`METRO : seulement ${poissons.length} poissons`);
  return poissons;
}

async function suggestionsMetro(jeu, idsConnus, idsIllustres) {
  const ressource = jeu.resources?.find((r) => r.id === METRO_RESSOURCE);
  if (!ressource?.url) throw new Error('METRO : ressource JSON introuvable sur data.gouv.fr');
  const calendrier = await telechargerJson(ressource.url);
  if (!Array.isArray(calendrier) || calendrier.length !== 12) throw new Error('METRO : calendrier inattendu');

  const parProduit = new Map();
  for (const { month, fruits_vegetables: produits = [] } of calendrier) {
    for (const p of produits) {
      const id = slugifier(p.product_fr);
      if (!id || idsConnus.has(id)) continue;
      const categorie = p.type_fr === 'Fruit' ? 'fruits' : 'legumes';
      const entree = parProduit.get(id) ?? {
        id,
        nom: p.product_fr,
        categorie,
        mois: [],
        icone: `legumes/icones/${iconeProche(p.product_fr, idsIllustres, p.type_fr === 'Champignon' ? 'champignons' : categorie)}.svg`,
      };
      entree.mois.push(month);
      parProduit.set(id, entree);
    }
  }
  return [...parProduit.values()]
    .map((s) => ({ ...s, mois: [...new Set(s.mois)].sort((a, b) => a - b) }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

async function main() {
  console.log('→ ADEME (dépôt open source)…');
  const ademe = await produitsAdeme();

  // On repart d'un dossier propre : aucune icône orpheline ne reste publiée.
  await rm(ICONES_PUBLIC, { recursive: true, force: true });

  const legumes = [];
  for (const p of ademe) {
    legumes.push({
      id: p.slug,
      nom: p.nom,
      categorie: p.categorie,
      mois: p.mois,
      source: 'ademe',
      touteLannee: p.mois.length === 12,
      icone: await icone(p.slug),
    });
  }
  console.log('→ Agenda des Chefs METRO…');
  const jeuMetro = await telechargerJson(METRO_DATASET);
  let poissons;
  try {
    poissons = (await poissonsMetro(jeuMetro)).map((p) => ({ ...p, categorie: 'poissons', source: 'metro' }));
  } catch (erreur) {
    // Les poissons ne doivent pas bloquer la synchro des légumes : on garde ceux déjà connus.
    console.warn(`::warning::${erreur.message} : poissons METRO repris de legumes.json`);
    const actuel = JSON.parse((await lireSiExiste(SORTIE, 'utf8')) ?? '{"legumes":[]}');
    poissons = actuel.legumes.filter((l) => l.source === 'metro');
  }
  for (const p of poissons) {
    if (legumes.some((l) => l.id === p.id)) continue;
    legumes.push({ id: p.id, nom: p.nom, categorie: p.categorie, mois: p.mois, source: 'metro', touteLannee: p.mois.length === 12, icone: await icone(p.id) });
  }
  for (const b of BASE) {
    if (legumes.some((l) => l.id === b.id)) continue; // l'ADEME ou METRO l'a ajouté entre-temps : leur version prime
    const mois = b.mois ?? TOUS_LES_MOIS;
    legumes.push({ ...b, mois, source: 'base', touteLannee: mois.length === 12, icone: await icone(b.id) });
  }
  legumes.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  for (const id of ICONES_GENERIQUES) await icone(id);

  const illustres = new Set((await readdir(ICONES_SOURCE)).map((f) => f.replace(/\.svg$/, '')));
  const suggestions = await suggestionsMetro(jeuMetro, new Set(legumes.map((l) => l.id)), illustres);
  for (const s of suggestions) await icone(s.icone.match(/icones\/(.+)\.svg$/)[1]);

  const donnees = {
    version: 1,
    sources: [
      { id: 'ademe', nom: 'ADEME – Impact CO₂', url: 'https://github.com/incubateur-ademe/impactco2', licence: 'MIT', usage: 'mois de saison' },
      { id: 'metro', nom: 'Agenda des Chefs – METRO France', url: 'https://www.data.gouv.fr/datasets/calendrier-des-produits-de-saison-pour-les-chefs-fruits-et-legumes-poissons-fromages', licence: 'Licence Ouverte 2.0', usage: 'mois de saison des poissons, suggestions de mois pour les légumes perso' },
    ],
    legumes,
    suggestions,
    correspondances: CORRESPONDANCES,
  };

  // La date ne change que si les données changent : pas de commit inutile chaque mois.
  const actuel = JSON.parse((await lireSiExiste(SORTIE, 'utf8')) ?? 'null');
  const { majLe: ancienneDate, ...ancien } = actuel ?? {};
  const identique = JSON.stringify(ancien) === JSON.stringify(donnees);
  const majLe = identique ? ancienneDate : new Date().toISOString().slice(0, 10);
  const ecrit = await ecrireSiChange(SORTIE, formaterJson({ majLe, ...donnees }));

  const parSource = Object.groupBy(legumes, (l) => l.source);
  console.log(
    `✓ ${legumes.length} produits (ADEME ${parSource.ademe?.length ?? 0}, poissons METRO ${parSource.metro?.length ?? 0}, base ${parSource.base?.length ?? 0}), ` +
    `${suggestions.length} suggestions METRO — ${ecrit ? `legumes.json mis à jour (${majLe})` : 'aucun changement'}`,
  );
}

main().catch((erreur) => {
  console.error(`✗ Synchro interrompue : ${erreur.message}`);
  process.exit(1);
});
