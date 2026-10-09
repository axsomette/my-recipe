// Vérifications des fonctions pures (calendrier, routage, stockage, saison, recettes).
// Lancement : npm run verifier — sans framework de test, juste des comparaisons.
import { readFileSync } from 'node:fs';
import { saisonDuMois, semaineIso } from '../../src/lib/calendrier.ts';
import {
  enregistrerRecette,
  iconeProche,
  indexerLegumes,
  legumeExistant,
  cleRecherche,
  legumesDansLeNom,
  supprimerRecette,
  trouverSuggestion,
} from '../../src/lib/recettes.ts';
import { lien, lireRoute } from '../../src/lib/routeur.ts';
import { alignerPlanning, basculerDehors, basculerGarde, changerRecette, classer, creneaux, estDehors, genererSemaine, propositionsHorsSaison, rangerPlanning, remplirVides, semainePrecedente } from '../../src/lib/planning.ts';
import { calculerScores, libelleSaison, niveauSaison, plagesDeMois } from '../../src/lib/saison.ts';
import { analyserImport, contenuExport, fusionner, nomFichierExport, supprimerLegumePerso } from '../../src/lib/sauvegarde.ts';
import { donneesVides, limitesLibres, lireDonnees } from '../../src/lib/stockage.ts';
import { typesRecette } from '../../src/lib/equilibre.ts';
import type { Moment, Reglages } from '../../src/lib/types.ts';
const reg = (jours: number, moments: Moment[], extra: Partial<Reglages> = {}): Reglages => ({ jours, moments, dehors: [], limites: limitesLibres(), ...extra });
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
eq(libelleSaison(soupe), 'd’octobre à mars', 'boucle déc→janv');
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
eq(['Épinard', 'Pomme de terre', 'Chou de Bruxelles', 'Radis'].map((n) => [cleRecherche(n).includes(cleRecherche('EPINARDS')), cleRecherche(n).includes(cleRecherche('pommes de t')), cleRecherche(n).includes(cleRecherche('choux de bruxelles')), cleRecherche(n).includes(cleRecherche('radis'))].indexOf(true)), [0, 1, 2, 3], 'recherche sans accent ni pluriel');
eq(legumesDansLeNom('Risotto de courge et sauge', cat.legumes).map((l) => l.id), ['courge','sauge'], 'repérés dans le nom');
eq(legumesDansLeNom('Gratin de poireaux au comté', cat.legumes).map((l) => l.id), ['poireau'], 'pluriel dans le nom');
eq(legumesDansLeNom('Velouté de chou de Bruxelles', cat.legumes).map((l) => l.id).sort(), ['chou','choudebruxelles'], 'nom composé');
eq(legumesDansLeNom('Bailey et pâtes', cat.legumes).map((l) => l.id), ['pates'], 'pas de faux positif ail (mais les pâtes, oui)');
eq(legumesDansLeNom('Œufs mimosa au thon', cat.legumes).map((l) => l.id).sort(), ['oeuf', 'thon'], 'garde-manger et ligature œ');
eq(legumesDansLeNom('Haricots verts sautés', cat.legumes).map((l) => l.id), ['haricotvert'], 'haricot vert (cru) nettoyé');

// --- Générateur de semaine ---
// Hasard reproductible pour les vérifications.
const graine = (n: number) => () => ((n = (n * 1103515245 + 12345) % 2147483648) / 2147483648);
const r = (id: string, scores: number[] | null) => ({ id, nom: id, legumes: [], notes: '', createdAt: '', updatedAt: '', scoreParMois: scores });
const plein = Array(12).fill(1), moitie = Array(12).fill(0.5), zero = Array(12).fill(0);
const recettesTest = [r('hors', zero), r('joker', null), r('moitie', moitie), r('p1', plein), r('p2', plein), r('p3', plein)];
eq(creneaux({ jours: 2, moments: ['soir', 'midi'] }), [{ jour: 0, moment: 'midi' }, { jour: 0, moment: 'soir' }, { jour: 1, moment: 'midi' }, { jour: 1, moment: 'soir' }], 'créneaux midi puis soir');
eq(classer(recettesTest, 10, new Set(), graine(1)).map((x) => x.id).slice(3), ['moitie', 'joker', 'hors'], 'ordre : saison, partie, joker, hors saison');
eq(classer(recettesTest, 10, new Set(['p1', 'p2']), graine(1)).map((x) => x.id).slice(0, 3)[0], 'p3', 'semaine précédente évitée');
const g1 = genererSemaine({ recettes: recettesTest, reglages: reg(4, ['soir']), mois: 10, semaine: '2026-W41', aleatoire: graine(2) });
eq([g1.manquants, new Set(g1.planning.slots.map((s) => s.recetteId)).size, g1.planning.slots.slice(3).map((s) => s.recetteId)], [0, 4, ['moitie']], 'semaine sans doublon, saison d’abord');
const g2 = genererSemaine({ recettes: recettesTest, reglages: reg(7, ['midi', 'soir']), mois: 10, semaine: '2026-W41', aleatoire: graine(3) });
eq([g2.manquants, g2.planning.slots.filter((s) => s.recetteId).length], [9, 5], 'pas assez de recettes : repas vides comptés');
eq(g2.planning.slots.some((s) => s.recetteId === 'hors'), false, 'jamais de recette hors saison placée d’office');
eq(propositionsHorsSaison(g2.planning, { recettes: recettesTest, reglages: reg(7, ['midi', 'soir']), mois: 10 }).map((x) => x.id), ['hors'], 'recette hors saison proposée à part');
const complete = remplirVides(g2.planning, ['hors'], reg(7, ['midi', 'soir']));
eq([complete.slots.filter((s) => s.recetteId).length, complete.slots.find((s) => !g2.planning.slots.find((x) => x.jour === s.jour && x.moment === s.moment)!.recetteId)?.recetteId], [6, 'hors'], 'hors saison placée dans le premier repas vide');
eq(remplirVides(complete, ['hors'], reg(7, ['midi', 'soir'])).slots.filter((s) => s.recetteId === 'hors').length, 1, 'pas de doublon en complétant');
const garde = basculerGarde(g1.planning, { jour: 1, moment: 'soir' });
const gardee = garde.slots[1]!.recetteId;
const g3 = genererSemaine({ recettes: recettesTest, reglages: reg(4, ['soir']), mois: 10, semaine: '2026-W41', actuel: garde, aleatoire: graine(9) });
eq([g3.planning.slots[1]!.recetteId, g3.planning.slots[1]!.verrouille, g3.planning.slots.filter((s) => s.recetteId === gardee).length], [gardee, true, 1], 'repas gardé conservé, sans doublon');
const change = changerRecette(g1.planning, { jour: 0, moment: 'soir' }, { recettes: recettesTest, reglages: reg(4, ['soir']), mois: 10, aleatoire: graine(4) })!;
eq([change.slots[0]!.recetteId !== g1.planning.slots[0]!.recetteId, new Set(change.slots.map((s) => s.recetteId)).size], [true, 4], 'changer un repas : autre recette, sans doublon');
eq(changerRecette(g2.planning, { jour: 0, moment: 'midi' }, { recettes: recettesTest, reglages: reg(7, ['midi', 'soir']), mois: 10 }), null, 'aucune autre recette disponible');
eq(semainePrecedente(new Date(2026, 9, 8)), '2026-W40', 'semaine précédente');
eq(semainePrecedente(new Date(2026, 0, 1)), '2025-W52', 'semaine précédente au Nouvel An');
const p40 = { semaine: '2026-W40', slots: [] }, p39 = { semaine: '2026-W39', slots: [] }, p41 = { semaine: '2026-W41', slots: [] };
eq(rangerPlanning([p39, p40], p41, '2026-W40').map((p) => p.semaine), ['2026-W40', '2026-W41'], 'on garde la semaine précédente seulement');

eq(alignerPlanning(g1.planning, { jours: 1, moments: ['midi', 'soir'] }, '2026-W41').slots.map((s) => [s.moment, s.recetteId === null]), [['midi', true], ['soir', false]], 'planning aligné sur de nouveaux réglages');

// --- Équilibre : types de repas, limites, repas dehors ---
const indexCatalogue = new Map(cat.legumes.map((l) => [l.id, l]));
eq([typesRecette({ ...r('a', null), legumes: ['poulet', 'pommedeterre'] }, indexCatalogue), typesRecette({ ...r('b', null), legumes: ['saumon'] }, indexCatalogue), typesRecette({ ...r('c', null), legumes: ['potiron', 'pates'] }, indexCatalogue)],
  [['viande', 'feculents'], ['poisson'], ['feculents', 'vege']], 'types déduits des ingrédients (pomme de terre = féculent)');
const vides = { semaine: '2026-W41', slots: [] };
const parType = [r('v1', plein), r('v2', plein), r('v3', plein), r('p1', plein), r('vg', plein)];
const typesTest: Record<string, ('viande' | 'poisson' | 'feculents' | 'vege')[]> = { v1: ['viande'], v2: ['viande'], v3: ['viande'], p1: ['poisson'], vg: ['vege'] };
const gl = genererSemaine({ recettes: parType, reglages: reg(5, ['soir'], { limites: { viande: 1, poisson: null, feculents: null } }), mois: 10, semaine: '2026-W41', actuel: vides, typesDe: (id) => typesTest[id]!, aleatoire: graine(5) });
const placees = gl.planning.slots.map((x) => x.recetteId).filter(Boolean) as string[];
eq([placees.filter((id) => id.startsWith('v') && id !== 'vg').length, gl.manquants, gl.ecartees], [1, 2, 2], 'limite viande respectée, recettes écartées comptées');
const gd = genererSemaine({ recettes: parType, reglages: reg(3, ['midi', 'soir'], { dehors: [{ jour: 0, moment: 'midi' }, { jour: 1, moment: 'midi' }] }), mois: 10, semaine: '2026-W41', aleatoire: graine(6) });
eq(gd.planning.slots.filter((x) => estDehors(x, { dehors: [{ jour: 0, moment: 'midi' }, { jour: 1, moment: 'midi' }] })).map((x) => [x.jour, x.recetteId]), [[0, null], [1, null]], 'repas dehors habituels laissés libres');
const habit = { dehors: [{ jour: 0, moment: 'midi' as const }] };
const unJour = basculerDehors(gd.planning, { jour: 2, moment: 'soir' }, habit);
eq([unJour.slots.find((x) => x.jour === 2 && x.moment === 'soir')!.recetteId, estDehors(unJour.slots.find((x) => x.jour === 2 && x.moment === 'soir')!, habit)], [null, true], 'repas dehors pour une fois : vidé');
const retour = basculerDehors(unJour, { jour: 0, moment: 'midi' }, habit);
eq(estDehors(retour.slots.find((x) => x.jour === 0 && x.moment === 'midi')!, habit), false, 'habitude levée pour une semaine');
const relance = genererSemaine({ recettes: parType, reglages: reg(3, ['midi', 'soir'], habit), mois: 10, semaine: '2026-W41', actuel: unJour, aleatoire: graine(7) });
eq(relance.planning.slots.find((x) => x.jour === 2 && x.moment === 'soir')!.recetteId, null, 'le repas dehors reste libre en régénérant');
eq(changerRecette(gl.planning, gl.planning.slots.find((x) => x.recetteId === 'p1')!, { recettes: parType, reglages: reg(5, ['soir'], { limites: { viande: 1, poisson: null, feculents: null } }), mois: 10, typesDe: (id) => typesTest[id]! }), null, 'changer un repas respecte les limites');
const v1 = { version: 1, recettes: [], legumesPerso: [], reglages: { jours: 5, moments: ['soir'] }, plannings: [{ semaine: '2026-W40', slots: [{ jour: 0, moment: 'soir', recetteId: null, verrouille: false }] }], dernierExport: null };
const migree = lireDonnees(v1);
eq([migree?.version, migree?.reglages.dehors, migree?.reglages.limites.viande, migree?.plannings[0]!.slots[0]!.dehors], [2, [], null, null], 'sauvegarde v1 migrée en v2');

// --- Sauvegarde ---
eq([libelleSaison([0,0,0,1,1,1,0,0,0,0,0,0]), libelleSaison([0,0,0,0,0,0,0,1,1,0,0,0]), libelleSaison([0,0,1,1,0,0,0,0,0,0,0,0])], ['d’avril à juin', 'd’août à septembre', 'de mars à avril'], 'élision des mois');
eq(nomFichierExport(new Date(2026, 9, 8)), 'recettes-de-saison-2026-10-08.json', 'nom du fichier daté');
const base = { ...donneesVides(), recettes: [{ ...r('a', null), legumes: ['poireau'], updatedAt: '2026-10-01' }] };
eq(analyserImport(contenuExport(base)).ok, true, 'export relu sans perte');
eq(analyserImport('{pas du json'), { ok: false, raison: 'illisible' }, 'fichier illisible');
eq(analyserImport('{"courses":["pain"]}'), { ok: false, raison: 'format' }, 'autre fichier JSON');
eq(analyserImport('{"version":99}'), { ok: false, raison: 'version' }, 'version plus récente');
const importee = { ...donneesVides(), recettes: [{ ...r('a', null), nom: 'A modifiée', legumes: ['poireau'], updatedAt: '2026-10-05' }, { ...r('b', null), legumes: ['tomate'], updatedAt: '2026-09-01' }] };
const fusion = fusionner(base, importee, cat);
eq([fusion.ajoutees, fusion.misesAJour, fusion.donnees.recettes.find((x) => x.id === 'a')!.nom], [1, 1, 'A modifiée'], 'fusion : ajout et version la plus récente');
eq(fusion.donnees.recettes.find((x) => x.id === 'b')!.scoreParMois?.[7], 1, 'fusion : scores recalculés');
const avecPerso = { ...base, legumesPerso: [{ id: 'perso-cepe', nom: 'Cèpe', categorie: 'legumes' as const, mois: [9, 10, 11], source: 'perso' as const, touteLannee: false, icone: 'legumes/icones/champignon.svg' }], recettes: [{ ...r('c', null), legumes: ['perso-cepe', 'poireau'] }] };
const sansPerso = supprimerLegumePerso(avecPerso, 'perso-cepe', cat);
eq([sansPerso.legumesPerso.length, sansPerso.recettes[0]!.legumes], [0, ['poireau']], 'légume perso retiré des recettes');

console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est bon.');
process.exitCode = echecs ? 1 : 0;
