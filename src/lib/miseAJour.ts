// Mise à jour automatique. Une app installée sur l'écran d'accueil peut rester des jours en mémoire
// sans recharger sa page : elle garderait l'ancienne version. À chaque retour au premier plan, on
// regarde si une nouvelle version est en ligne, et on recharge dès que c'est sans risque :
// tout de suite si la personne vient d'arriver, sinon à la prochaine sortie de l'app.
// Jamais pendant une saisie : formulaire de recette, fenêtre ouverte, champ actif.

const BASE = import.meta.env.BASE_URL;
/** Juste après le retour dans l'app, la personne n'a pas encore commencé à agir : recharger ne coupe rien. */
const FENETRE_SURE = 6000;
/** Vérification de fond tant que l'app reste ouverte. */
const INTERVALLE = 30 * 60 * 1000;
const CLE_TENTATIVE = 'recettes-de-saison:mise-a-jour';

let revenueA = performance.now();
/** Version trouvée en ligne, à charger dès que ce sera sans risque. */
let enAttente: string | null = null;

/** Script principal de la page affichée : son nom change à chaque build. */
const scriptAffiche = () => document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/"]')?.getAttribute('src') ?? null;

/** Script principal de la version en ligne (`no-store` : le service worker laisse passer la requête au réseau). */
async function scriptEnLigne(): Promise<string | null> {
  if (!navigator.onLine) return null;
  try {
    const reponse = await fetch(`${BASE}index.html`, { cache: 'no-store' });
    if (!reponse.ok) return null;
    return (await reponse.text()).match(/<script type="module"[^>]*\ssrc="([^"]+)"/)?.[1] ?? null;
  } catch {
    return null;
  }
}

function sansRisque() {
  if (document.querySelector('dialog[open]')) return false;
  if (/^#\/recettes\/(nouvelle|[^/]+\/modifier)\b/.test(location.hash)) return false;
  return !document.activeElement?.matches('input, textarea, select');
}

function recharger(cible: string) {
  // Une seule tentative par version : si la page rechargée est encore l'ancienne (réseau capricieux), on n'insiste pas.
  try {
    if (sessionStorage.getItem(CLE_TENTATIVE) === cible) return;
    sessionStorage.setItem(CLE_TENTATIVE, cible);
  } catch {
    /* sans sessionStorage, on recharge quand même */
  }
  location.reload();
}

function nouvelleVersion(cible: string) {
  const vientDArriver = document.visibilityState === 'visible' && performance.now() - revenueA < FENETRE_SURE;
  if ((vientDArriver || document.visibilityState === 'hidden') && sansRisque()) recharger(cible);
  else enAttente = cible;
}

async function verifier() {
  const affiche = scriptAffiche();
  const enLigne = await scriptEnLigne();
  if (affiche && enLigne && enLigne !== affiche) nouvelleVersion(enLigne);
}

export function suivreMisesAJour(enregistrement: Promise<ServiceWorkerRegistration | undefined>) {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      revenueA = performance.now();
      void enregistrement.then((sw) => sw?.update()).catch(() => undefined);
      void verifier();
    } else if (enAttente && sansRisque()) {
      // La personne quitte l'app : la nouvelle version l'attendra à son retour.
      recharger(enAttente);
    }
  });
  // Un nouveau service worker qui prend la main signale aussi une nouvelle version : on vérifie aussitôt
  // (utile tant que l'ancien, qui ne laisse pas passer la vérification au réseau, est encore installé).
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.addEventListener('controllerchange', () => void verifier());
  }
  setInterval(() => document.visibilityState === 'visible' && void verifier(), INTERVALLE);
}
