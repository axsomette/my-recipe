// Vérifications des fonctions pures (calendrier, routage, stockage, saison, recettes).
// Lancement : npm run verifier — sans framework de test, juste des comparaisons.
import { readFileSync } from 'node:fs';
import { saisonDuMois, semaineIso } from '../../src/lib/calendrier.ts';
import {
  enregistrerRecette,
  iconeProche,
  indexerLegumes,
  legumeExistant,
  legumesDansLeNom,
  supprimerRecette,
  trouverSuggestion,
} from '../../src/lib/recettes.ts';
import { lien, lireRoute } from '../../src/lib/routeur.ts';
import { calculerScores, libelleSaison, niveauSaison, plagesDeMois } from '../../src/lib/saison.ts';
import { donneesVides, lireDonnees } from '../../src/lib/stockage.ts';
import type { Catalogue } from '../../src/lib/types.ts';

let echecs = 0;
const eq = (obtenu: unknown, attendu: unknown, message: string) => {
  const ok = JSON.stringify(obtenu) === JSON.stringify(attendu);
  if (!ok) echecs++;
  console.log(ok ? '✓' : '✗', message, ok ? '' : `→ ${JSON.stringify(obtenu)} ≠ ${JSON.stringify(attendu)}`);
};

eq(semaineIso(new Date(2026, 9, 8)).cle, '2026-W41', '8 oct. 2026 = semaine 41');
eq(semaineIso(new Date(2026, 9, 8)).lundi.getDate(), 5, 'lundi 5 oct.');
eq(semaineIso(new Date(2027, 0, 1)).cle, '2026-W53', '1er janv. 2027 = 2026-W53');
eq(semaineIso(new Date(2024, 11, 30)).cle, '2025-W01', '30 déc. 2024 = 2025-W01');
eq([12,1,3,6,9,11].map(saisonDuMois), ['hiver','hiver','printemps','ete','automne','automne'], 'saisons');
eq(lireRoute(''), { nom: 'semaine' }, 'route vide');
eq(lireRoute('#/recettes/abc'), { nom: 'recette', id: 'abc' }, 'détail');
eq(lireRoute('#/recettes/abc/modifier'), { nom: 'modifier-recette', id: 'abc' }, 'modifier');
eq(lireRoute('#/recettes/nouvelle'), { nom: 'nouvelle-recette' }, 'nouvelle');
eq(lireRoute('#/nimporte'), { nom: 'introuvable' }, 'introuvable');
eq(lireRoute(lien({ nom: 'recette', id: 'a b/é' })), { nom: 'recette', id: 'a b/é' }, 'aller-retour id encodé');
eq(lireDonnees(donneesVides()) !== null, true, 'données vides valides');
eq(lireDonnees({ version: 99 }), null, 'version future refusée');
eq(lireDonnees({ ...donneesVides(), recettes: [{ id: 'x' }] }), null, 'recette incomplète refusée');
eq(lireDonnees('pas un objet'), null, 'texte refusé');
const cat: Catalogue = JSON.parse(readFileSync(new URL('../../public/legumes.json', import.meta.url), 'utf8'));
const idx = indexerLegumes(cat, []);
const gratin = calculerScores(['poireau','ail','pommedeterre'], idx);
eq(gratin, [0.5,0.5,0.5,0.5,0,0,0.5,0.5,1,1,1,1], 'gratin (pomme de terre exclue)');
eq(calculerScores(['champignonmorille','persil'], idx), null, 'joker toutes saisons');
eq(calculerScores([], idx), null, 'sans légume = joker');
eq(niveauSaison(gratin, 10), 'pleine', 'octobre pleine');
eq(niveauSaison(gratin, 1), 'partie', 'janvier partie');
eq(niveauSaison(gratin, 5), 'hors', 'mai hors');
eq(niveauSaison(null, 5), 'toutes', 'joker');
eq(libelleSaison(gratin), 'de septembre à décembre', 'libellé long');
eq(libelleSaison(gratin, 'court'), 'sept. – déc.', 'libellé court');
const soupe = calculerScores(['panais','carotte','oignon','gingembre'], idx);
eq(libelleSaison(soupe), 'd’octobre à mars'.replace('d’','de '), 'boucle déc→janv');
eq(plagesDeMois([1,2,9,10,11,12]), [[9,2]], 'plage bouclée');
eq(plagesDeMois([4,5,6]), [[4,6]], 'plage simple');
eq(libelleSaison(calculerScores(['radis','ail'], idx)), 'aucun mois vraiment de saison', 'aucun mois ≥ 0,75');
eq(libelleSaison(calculerScores(['coing'], idx)), 'en octobre', 'un seul mois');
let d = donneesVides();
const r1 = enregistrerRecette(d, { nom: '  Gratin  ', legumes: ['poireau','ail','inconnu','ail'], notes: '' }, idx, '2026-10-08T10:00:00Z');
eq([r1.recette.nom, r1.recette.legumes], ['Gratin', ['poireau','ail']], 'nettoyage nom, doublons, ids inconnus');
d = { ...r1.donnees, plannings: [{ semaine: '2026-W41', slots: [{ jour: 0, moment: 'soir', recetteId: r1.recette.id, verrouille: true }] }] };
const r2 = enregistrerRecette(d, { id: r1.recette.id, nom: 'Gratin 2', legumes: ['poireau'], notes: 'x' }, idx, '2026-10-09T10:00:00Z');
eq([r2.donnees.recettes.length, r2.recette.createdAt, r2.recette.updatedAt], [1, '2026-10-08T10:00:00Z', '2026-10-09T10:00:00Z'], 'mise à jour conserve createdAt');
const d3 = supprimerRecette(r2.donnees, r1.recette.id);
eq([d3.recettes.length, d3.plannings[0].slots[0]], [0, { jour: 0, moment: 'soir', recetteId: null, verrouille: false }], 'suppression libère le slot');
eq(trouverSuggestion('cèpes', cat.suggestions)?.nom, 'Champignon cèpe', 'suggestion cèpes');
eq(trouverSuggestion('Potimarron', cat.suggestions)?.mois, [9,10], 'suggestion potimarron');
eq(trouverSuggestion('oca du Pérou', cat.suggestions), undefined, 'pas de suggestion');
eq(iconeProche('Yuzu', 'fruits', cat), 'legumes/icones/citron.svg', 'icône yuzu');
eq(iconeProche('Tomate cerise', 'legumes', cat), 'legumes/icones/tomate.svg', 'icône contenue');
eq(iconeProche('Oca du Pérou', 'legumes', cat), 'legumes/icones/panier.svg', 'icône générique');
eq(iconeProche('Verveine', 'herbes', cat), 'legumes/icones/herbe.svg', 'générique herbe');
eq(legumeExistant('Poireaux', cat.legumes)?.id, 'poireau', 'pluriel retrouvé');
eq(legumesDansLeNom('Risotto de courge et sauge', cat.legumes).map((l) => l.id), ['courge','sauge'], 'repérés dans le nom');
eq(legumesDansLeNom('Gratin de poireaux au comté', cat.legumes).map((l) => l.id), ['poireau'], 'pluriel dans le nom');
eq(legumesDansLeNom('Velouté de chou de Bruxelles', cat.legumes).map((l) => l.id).sort(), ['chou','choudebruxelles'], 'nom composé');
eq(legumesDansLeNom('Bailey et pâtes', cat.legumes).length, 0, 'pas de faux positif ail');
eq(legumesDansLeNom('Haricots verts sautés', cat.legumes).map((l) => l.id), ['haricotvert'], 'haricot vert (cru) nettoyé');

console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est bon.');
process.exitCode = echecs ? 1 : 0;
