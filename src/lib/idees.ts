// Idées de recettes de saison : un carnet intégré à l'app, fait des seuls produits du catalogue.
// Quand la semaine manque de recettes (ou au premier lancement), la fenêtre « Compléter la semaine »
// propose celles qui sont pleinement de saison ce mois-ci ; une idée cochée devient une recette.
// Fonctions pures : le hasard est injecté pour pouvoir les vérifier.
import { ajouter, depasse, typesRecette, type Compte, type TypeRepas } from './equilibre';
import { normaliser } from './recettes';
import { calculerScores, niveauSaison } from './saison';
import type { Legume, Recette, Reglages } from './types';

export interface Idee {
  nom: string;
  /** Ids du catalogue (public/legumes.json). */
  ingredients: string[];
}

// Classées par saison pour la relecture ; le calcul de saison décide seul du mois où chacune est proposée.
export const IDEES: Idee[] = [
  // Hiver
  { nom: 'Soupe de poireaux et pommes de terre', ingredients: ['poireau', 'pommedeterre', 'creme'] },
  { nom: 'Gratin de chou-fleur', ingredients: ['choufleur', 'lait', 'beurre', 'farine', 'fromage'] },
  { nom: 'Potée au chou', ingredients: ['chou', 'carotte', 'pommedeterre', 'saucisse', 'lardons'] },
  { nom: 'Velouté de potiron', ingredients: ['potiron', 'oignon', 'creme'] },
  { nom: 'Endives au jambon', ingredients: ['endive', 'jambon', 'lait', 'beurre', 'farine', 'fromage'] },
  { nom: 'Hachis parmentier', ingredients: ['steakhache', 'pommedeterre', 'oignon', 'lait', 'beurre'] },
  { nom: 'Pot-au-feu', ingredients: ['boeuf', 'carotte', 'poireau', 'navet', 'pommedeterre', 'laurier'] },
  { nom: 'Blanquette de veau', ingredients: ['veau', 'carotte', 'oignon', 'creme', 'riz'] },
  { nom: 'Choucroute garnie', ingredients: ['chou', 'saucisse', 'porc', 'pommedeterre'] },
  { nom: 'Choux de Bruxelles aux lardons', ingredients: ['choudebruxelles', 'lardons'] },
  { nom: 'Velouté de carottes', ingredients: ['carotte', 'oignon', 'creme'] },
  { nom: 'Soupe de panais au gingembre', ingredients: ['panais', 'gingembre', 'creme'] },
  { nom: 'Saucisses et purée de céleri', ingredients: ['celeri', 'pommedeterre', 'saucisse'] },
  { nom: 'Gratin de topinambours', ingredients: ['topinambour', 'creme', 'fromage'] },
  { nom: 'Salade d’endives, pomme et fromage', ingredients: ['endive', 'pomme', 'fromage'] },
  { nom: 'Mâche, betterave et œuf mollet', ingredients: ['mache', 'betterave', 'oeuf'] },
  { nom: 'Poulet rôti et salsifis', ingredients: ['poulet', 'salsifis'] },
  { nom: 'Risotto aux poireaux', ingredients: ['poireau', 'riz', 'fromage'] },
  { nom: 'Lentilles aux saucisses et carottes', ingredients: ['lentilles', 'saucisse', 'carotte', 'oignon'] },
  { nom: 'Côtes d’agneau et navets glacés', ingredients: ['agneau', 'navet'] },
  { nom: 'Bar et purée de céleri', ingredients: ['bar', 'celeri', 'pommedeterre'] },
  { nom: 'Saint-Jacques et fondue de poireaux', ingredients: ['saintjacques', 'poireau', 'creme'] },
  { nom: 'Grondin au four et carottes', ingredients: ['grondinrouge', 'carotte', 'pommedeterre'] },
  { nom: 'Velouté de chou-fleur', ingredients: ['choufleur', 'pommedeterre', 'creme'] },
  { nom: 'Tartiflette', ingredients: ['pommedeterre', 'lardons', 'oignon', 'fromage', 'creme'] },
  { nom: 'Soupe de légumes d’hiver', ingredients: ['poireau', 'carotte', 'navet', 'celeri', 'pommedeterre'] },
  { nom: 'Carbonade de bœuf', ingredients: ['boeuf', 'oignon', 'pain'] },
  { nom: 'Parmentier de canard au potiron', ingredients: ['canard', 'potiron', 'pommedeterre'] },
  { nom: 'Salade de chou et pomme', ingredients: ['chou', 'pomme', 'huileolive'] },
  { nom: 'Poulet aux clémentines et au miel', ingredients: ['poulet', 'clementine', 'miel'] },
  { nom: 'Curry de patate douce, épinards et coco', ingredients: ['patatedouce', 'epinard', 'noixdecoco', 'riz'] },
  { nom: 'Dahl de lentilles aux épinards', ingredients: ['lentilles', 'epinard', 'gingembre', 'riz'] },
  { nom: 'Quiche aux poireaux', ingredients: ['poireau', 'oeuf', 'creme', 'farine', 'beurre'] },
  { nom: 'Pintade au chou', ingredients: ['pintade', 'chou', 'lardons'] },
  { nom: 'Lapin à la moutarde et carottes', ingredients: ['lapin', 'carotte', 'creme'] },
  { nom: 'Boudin noir aux pommes', ingredients: ['boudinnoir', 'pomme'] },
  { nom: 'Cabillaud et purée de panais', ingredients: ['cabillaud', 'panais'] },
  { nom: 'Tajine de poulet aux carottes et navets', ingredients: ['poulet', 'carotte', 'navet', 'semoule'] },
  { nom: 'Chou farci', ingredients: ['chou', 'porc', 'riz'] },
  { nom: 'Cabillaud et poireaux à la crème', ingredients: ['cabillaud', 'poireau', 'creme'] },
  { nom: 'Soupe de lentilles et carottes', ingredients: ['lentilles', 'carotte'] },
  { nom: 'Thon rouge mi-cuit et échalotes confites', ingredients: ['thonrouge', 'echalote'] },
  { nom: 'Calmars à l’ail et au persil', ingredients: ['calmar', 'ail', 'persil'] },
  { nom: 'Saint-Jacques et endives braisées', ingredients: ['saintjacques', 'endive'] },

  // Printemps
  { nom: 'Asperges vertes et œufs mollets', ingredients: ['asperge', 'oeuf'] },
  { nom: 'Risotto aux asperges', ingredients: ['asperge', 'riz', 'fromage'] },
  { nom: 'Velouté d’asperges', ingredients: ['asperge', 'pommedeterre', 'creme'] },
  { nom: 'Tarte aux asperges et jambon', ingredients: ['asperge', 'jambon', 'oeuf', 'creme', 'farine', 'beurre'] },
  { nom: 'Agneau aux petits pois', ingredients: ['agneau', 'petitpois'] },
  { nom: 'Salade de radis, œuf et ciboulette', ingredients: ['radis', 'oeuf', 'ciboulette'] },
  { nom: 'Tartines de radis et fromage frais', ingredients: ['radis', 'pain', 'fromage'] },
  { nom: 'Épinards à la crème et œufs', ingredients: ['epinard', 'oeuf', 'creme'] },
  { nom: 'Merlu en papillote au fenouil', ingredients: ['merlu', 'fenouil'] },
  { nom: 'Merlu et poireaux au beurre blanc', ingredients: ['merlu', 'poireau', 'beurre'] },
  { nom: 'Saint-Pierre aux asperges', ingredients: ['saintpierre', 'asperge'] },
  { nom: 'Langoustines poêlées et riz', ingredients: ['langoustine', 'riz', 'persil'] },
  { nom: 'Harengs et pommes de terre tièdes', ingredients: ['hareng', 'pommedeterre', 'persil'] },
  { nom: 'Chinchard grillé et salade', ingredients: ['chinchard', 'laitue', 'pommedeterre'] },
  { nom: 'Poulet rôti, navets et radis', ingredients: ['poulet', 'navet', 'radis'] },
  { nom: 'Soupe de petits pois à la menthe', ingredients: ['petitpois', 'menthe'] },
  { nom: 'Pâtes aux petits pois et lardons', ingredients: ['petitpois', 'pates', 'lardons'] },
  { nom: 'Artichauts vinaigrette', ingredients: ['artichaut', 'huileolive'] },
  { nom: 'Salade de fenouil et pamplemousse', ingredients: ['fenouil', 'pamplemousse'] },
  { nom: 'Velouté d’épinards', ingredients: ['epinard', 'pommedeterre'] },
  { nom: 'Omelette aux épinards', ingredients: ['epinard', 'oeuf'] },
  { nom: 'Quiche aux épinards et chèvre', ingredients: ['epinard', 'fromage', 'oeuf', 'creme', 'farine'] },
  { nom: 'Wok d’asperges, petits pois et tofu', ingredients: ['asperge', 'petitpois', 'tofu', 'riz'] },
  { nom: 'Navarin d’agneau aux navets', ingredients: ['agneau', 'navet', 'pommedeterre'] },
  { nom: 'Chinchard au four et fenouil', ingredients: ['chinchard', 'fenouil'] },
  { nom: 'Salade de pamplemousse et crevettes', ingredients: ['pamplemousse', 'crevette', 'laitue'] },

  // Été
  { nom: 'Thon blanc mi-cuit et courgettes', ingredients: ['thonblanc', 'courgette'] },
  { nom: 'Sardines grillées et tomates', ingredients: ['sardine', 'tomate'] },
  { nom: 'Tacaud en papillote et courgettes', ingredients: ['tacaud', 'courgette'] },
  { nom: 'Salade composée, œuf et lardons', ingredients: ['laitue', 'oeuf', 'lardons'] },
  { nom: 'Ratatouille', ingredients: ['courgette', 'aubergine', 'poivron', 'tomate', 'ail', 'huileolive'] },
  { nom: 'Tomates farcies', ingredients: ['tomate', 'steakhache', 'riz'] },
  { nom: 'Tomates et mozzarella au basilic', ingredients: ['tomate', 'mozzarella', 'basilic'] },
  { nom: 'Taboulé', ingredients: ['semoule', 'tomate', 'concombre', 'menthe', 'persil'] },
  { nom: 'Gaspacho', ingredients: ['tomate', 'concombre', 'poivron'] },
  { nom: 'Courgettes farcies', ingredients: ['courgette', 'steakhache', 'riz'] },
  { nom: 'Moussaka', ingredients: ['aubergine', 'agneau', 'tomate', 'lait', 'farine'] },
  { nom: 'Aubergines rôties au yaourt', ingredients: ['aubergine', 'yaourt', 'menthe'] },
  { nom: 'Poulet rôti et haricots verts', ingredients: ['poulet', 'haricotvert'] },
  { nom: 'Salade niçoise', ingredients: ['tomate', 'haricotvert', 'oeuf', 'thon'] },
  { nom: 'Pâtes au pesto et courgettes', ingredients: ['pates', 'courgette', 'basilic'] },
  { nom: 'Tian de légumes', ingredients: ['courgette', 'tomate', 'aubergine'] },
  { nom: 'Maquereau grillé et concombre au yaourt', ingredients: ['maquereau', 'concombre', 'yaourt'] },
  { nom: 'Brochettes de poulet et poivrons', ingredients: ['poulet', 'poivron', 'courgette'] },
  { nom: 'Merguez et poivrons grillés', ingredients: ['merguez', 'poivron'] },
  { nom: 'Poivrons farcis au riz et chorizo', ingredients: ['poivron', 'riz', 'chorizo'] },
  { nom: 'Salade de pastèque, feta et menthe', ingredients: ['pasteque', 'fromage', 'menthe'] },
  { nom: 'Melon et jambon', ingredients: ['melon', 'jambon'] },
  { nom: 'Thon rouge, tomates et poivrons', ingredients: ['thonrouge', 'tomate', 'poivron'] },
  { nom: 'Anchois marinés et tomates', ingredients: ['anchois', 'tomate', 'huileolive'] },
  { nom: 'Dorade au four et tomates', ingredients: ['doradegrise', 'tomate'] },
  { nom: 'Soupe au pistou', ingredients: ['haricotvert', 'courgette', 'tomate', 'basilic', 'pates'] },
  { nom: 'Burger maison, tomate et salade', ingredients: ['steakhache', 'pain', 'tomate', 'laitue', 'fromage'] },
  { nom: 'Omelette aux courgettes', ingredients: ['courgette', 'oeuf'] },
  { nom: 'Poulet et aubergines au basilic', ingredients: ['poulet', 'aubergine', 'basilic'] },
  { nom: 'Porc aux prunes', ingredients: ['porc', 'prune'] },
  { nom: 'Canard aux figues', ingredients: ['canard', 'figue'] },
  { nom: 'Salade de maïs, tomates et poivrons', ingredients: ['mais', 'tomate', 'poivron'] },
  { nom: 'Chili con carne', ingredients: ['steakhache', 'haricotsrouges', 'tomate', 'poivron'] },
  { nom: 'Calmars à la tomate', ingredients: ['calmar', 'tomate'] },
  { nom: 'Langoustines grillées et salade', ingredients: ['langoustine', 'laitue'] },
  { nom: 'Saint-Pierre et petits pois', ingredients: ['saintpierre', 'petitpois'] },
  { nom: 'Harengs grillés et salade de tomates', ingredients: ['hareng', 'tomate'] },
  { nom: 'Gratin de blettes', ingredients: ['blette', 'creme', 'fromage'] },

  // Automne
  { nom: 'Tagliatelles au potiron et lardons', ingredients: ['potiron', 'pates', 'lardons'] },
  { nom: 'Gratin de brocoli', ingredients: ['brocoli', 'creme', 'fromage'] },
  { nom: 'Pâtes au brocoli et saucisse', ingredients: ['brocoli', 'pates', 'saucisse'] },
  { nom: 'Sole meunière et épinards', ingredients: ['sole', 'epinard', 'beurre'] },
  { nom: 'Limande-sole et fondue de poireaux', ingredients: ['limandesole', 'poireau'] },
  { nom: 'Porc aux pommes et oignons', ingredients: ['porc', 'pomme', 'oignon'] },
  { nom: 'Poulet aux raisins', ingredients: ['poulet', 'raisin'] },
  { nom: 'Salade de betterave, noix et mâche', ingredients: ['betterave', 'noix', 'mache'] },
  { nom: 'Velouté de chou-fleur aux noisettes', ingredients: ['choufleur', 'noisette', 'creme'] },
  { nom: 'Sardines au four et courgettes', ingredients: ['sardine', 'courgette'] },
  { nom: 'Gratin de courge', ingredients: ['courge', 'creme', 'fromage'] },
  { nom: 'Risotto à la courge et à la sauge', ingredients: ['courge', 'riz', 'sauge', 'fromage'] },
  { nom: 'Velouté de courge aux châtaignes', ingredients: ['courge', 'chataigne', 'creme'] },
  { nom: 'Dinde aux marrons', ingredients: ['dinde', 'chataigne'] },
  { nom: 'Pintade aux raisins', ingredients: ['pintade', 'raisin'] },
  { nom: 'Saucisses et purée de potiron', ingredients: ['saucisse', 'potiron', 'pommedeterre'] },
  { nom: 'Curry de chou-fleur et pois chiches', ingredients: ['choufleur', 'poischiches', 'riz'] },
  { nom: 'Rougets et fenouil rôti', ingredients: ['rougetbarbet', 'fenouil'] },
  { nom: 'Rougets et écrasé de potiron', ingredients: ['rougetbarbet', 'potiron'] },
  { nom: 'Bar rôti au fenouil', ingredients: ['bar', 'fenouil'] },
  { nom: 'Moules marinières et frites', ingredients: ['moule', 'echalote', 'pommedeterre', 'creme'] },
  { nom: 'Poêlée de blettes et pois chiches', ingredients: ['blette', 'poischiches', 'ail'] },
  { nom: 'Gratin de chou-fleur et brocoli', ingredients: ['choufleur', 'brocoli', 'fromage'] },
  { nom: 'Velouté de poireaux et noisettes', ingredients: ['poireau', 'noisette', 'creme'] },
  { nom: 'Canard aux poires', ingredients: ['canard', 'poire'] },
  { nom: 'Tarte fine aux poireaux et chèvre', ingredients: ['poireau', 'fromage', 'farine', 'beurre'] },
  { nom: 'Lapin aux carottes', ingredients: ['lapin', 'carotte', 'oignon'] },
];

export interface IdeeProposee {
  idee: Idee;
  scores: number[];
  types: TypeRepas[];
  /** Produits saisonniers de l'idée, de saison ce mois-ci (pour les vignettes). */
  vedettes: Legume[];
}

export interface DemandeIdees {
  mois: number;
  index: Map<string, Legume>;
  /** Recettes déjà notées : une idée du même nom n'est pas reproposée. */
  recettes: Recette[];
  /** Repas déjà prévus dans la semaine, par type, pour respecter les limites. */
  compte: Compte;
  limites: Reglages['limites'];
  nombre: number;
  /** Noms déjà montrés (« Autres idées ») : écartés tant qu'il reste d'autres idées. */
  dejaVues?: string[];
  idees?: Idee[];
  aleatoire?: () => number;
}

const saisonniers = (idee: Idee, index: Map<string, Legume>) =>
  idee.ingredients.map((id) => index.get(id)).filter((l): l is Legume => l !== undefined && !l.touteLannee);

/** Un produit de l'idée vit son dernier mois de saison : à cuisiner tant qu'il est là. */
const finitCeMois = (produits: Legume[], mois: number) => produits.some((l) => l.mois.includes(mois) && !l.mois.includes((mois % 12) + 1));

/** Type principal d'une idée, pour varier les propositions : viande, poisson ou végé. */
const principal = (types: TypeRepas[]): TypeRepas => (types.includes('viande') ? 'viande' : types.includes('poisson') ? 'poisson' : 'vege');

/**
 * Idées pleinement de saison ce mois-ci, absentes des recettes, dans les limites de la semaine.
 * Ordre : un produit qui finit sa saison d'abord, puis le hasard ; le choix alterne viande, poisson
 * et végé, et évite de proposer deux fois le même produit de saison.
 */
export function ideesDeSaison({ mois, index, recettes, compte, limites, nombre, dejaVues = [], idees = IDEES, aleatoire = Math.random }: DemandeIdees): IdeeProposee[] {
  const connues = new Set(recettes.map((r) => normaliser(r.nom)));
  const vues = new Set(dejaVues.map(normaliser));
  const possibles = idees.flatMap((idee) => {
    if (connues.has(normaliser(idee.nom)) || idee.ingredients.some((id) => !index.has(id))) return [];
    const scores = calculerScores(idee.ingredients, index);
    if (!scores || niveauSaison(scores, mois) !== 'pleine') return [];
    const produits = saisonniers(idee, index);
    return [{ idee, scores, types: typesRecette({ legumes: idee.ingredients }, index), vedettes: produits.filter((l) => l.mois.includes(mois)), urgence: finitCeMois(produits, mois) ? 0 : 1, rang: aleatoire() }];
  });
  // Les idées pas encore vues passent d'abord ; une fois toutes vues, on recommence.
  const nouvelles = possibles.filter((p) => !vues.has(normaliser(p.idee.nom)));
  const file = (nouvelles.length > 0 ? nouvelles : possibles).sort((a, b) => a.urgence - b.urgence || a.rang - b.rang);

  const total = { ...compte };
  const choisies: IdeeProposee[] = [];
  const produitsPris = new Set<string>();
  const parType: Record<TypeRepas, number> = { viande: 0, poisson: 0, feculents: 0, vege: 0 };
  while (choisies.length < nombre) {
    const candidates = file.filter((p) => !choisies.some((c) => c.idee === p.idee) && !depasse(total, p.types, limites));
    if (candidates.length === 0) break;
    // Pénalité : produit de saison déjà proposé, puis type principal déjà fréquent.
    const penalite = (p: (typeof candidates)[number]) => p.vedettes.filter((l) => produitsPris.has(l.id)).length * 10 + parType[principal(p.types)];
    const meilleure = candidates.reduce((a, b) => (penalite(b) < penalite(a) ? b : a));
    choisies.push({ idee: meilleure.idee, scores: meilleure.scores, types: meilleure.types, vedettes: meilleure.vedettes });
    ajouter(total, meilleure.types);
    parType[principal(meilleure.types)]++;
    for (const l of meilleure.vedettes) produitsPris.add(l.id);
  }
  return choisies;
}
