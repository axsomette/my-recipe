// Service worker écrit à la main : l'app fonctionne hors connexion.
// La version ci-dessous est remplacée à chaque build (vite.config.ts) : un nouveau déploiement installe un nouveau cache.
const VERSION = '__VERSION__';
const CACHE = `recettes-de-saison-${VERSION}`;
const BASE = new URL('./', self.location).pathname; // /my-recipe/

const COQUILLE = ['', 'index.html', 'legumes.json', 'manifest.webmanifest', 'icones/favicon.svg', 'icones/rosace.svg', 'icones/apple-touch-icon.png', 'icones/icone-192.png', 'fonts/young-serif.woff2', 'fonts/hanken-grotesk.woff2', 'fonts/sofia-sans-extra-condensed-700.woff2'];

/** Fichiers du build cités par index.html (noms avec empreinte, différents à chaque version). */
async function fichiersDuBuild() {
  const html = await (await fetch(`${BASE}index.html`, { cache: 'no-cache' })).text();
  return [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map((m) => m[1]);
}

/** Toutes les illustrations, pour un calendrier complet hors connexion. */
async function illustrations() {
  const catalogue = await (await fetch(`${BASE}legumes.json`, { cache: 'no-cache' })).json();
  const chemins = [...catalogue.legumes, ...catalogue.suggestions].map((l) => l.icone);
  return [...new Set([...chemins, 'legumes/icones/panier.svg', 'legumes/icones/herbe.svg', 'legumes/icones/champignon.svg'])];
}

self.addEventListener('install', (evenement) => {
  evenement.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const urls = [...COQUILLE.map((c) => BASE + c), ...(await fichiersDuBuild())];
      await cache.addAll(urls);
      // Les illustrations sont un plus : un échec isolé ne doit pas bloquer l'installation.
      await Promise.allSettled((await illustrations()).map((c) => cache.add(BASE + c)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (evenement) => {
  evenement.waitUntil(
    (async () => {
      const anciens = (await caches.keys()).filter((cle) => cle.startsWith('recettes-de-saison-') && cle !== CACHE);
      await Promise.all(anciens.map((cle) => caches.delete(cle)));
      await self.clients.claim();
    })(),
  );
});

async function reseauPuisCache(requete) {
  const cache = await caches.open(CACHE);
  try {
    const reponse = await fetch(requete);
    if (reponse.ok) cache.put(`${BASE}index.html`, reponse.clone());
    return reponse;
  } catch {
    return (await cache.match(`${BASE}index.html`)) ?? Response.error();
  }
}

async function cacheEtMiseAJour(requete) {
  const cache = await caches.open(CACHE);
  const enCache = await cache.match(requete);
  const frais = fetch(requete)
    .then((reponse) => {
      if (reponse.ok) cache.put(requete, reponse.clone());
      return reponse;
    })
    .catch(() => undefined);
  return enCache ?? (await frais) ?? Response.error();
}

async function cacheDabord(requete) {
  const cache = await caches.open(CACHE);
  const enCache = await cache.match(requete);
  if (enCache) return enCache;
  const reponse = await fetch(requete);
  if (reponse.ok) cache.put(requete, reponse.clone());
  return reponse;
}

self.addEventListener('fetch', (evenement) => {
  const { request } = evenement;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;

  if (request.mode === 'navigate') evenement.respondWith(reseauPuisCache(request));
  else if (url.pathname.endsWith('/legumes.json')) evenement.respondWith(cacheEtMiseAJour(request));
  else evenement.respondWith(cacheDabord(request));
});
