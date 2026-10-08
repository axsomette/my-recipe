// Lecteur autonome des planches *.dc.html (hors canevas Claude Design).
// Remplit les variables {{saison}} et {{theme}} à partir de l'URL (?saison=hiver&sombre=1),
// mémorisées pour la navigation entre écrans.
(() => {
  const SAISONS = ['automne', 'hiver', 'printemps', 'ete'];
  const params = new URLSearchParams(location.search);
  const lire = (cle) => {
    try { return sessionStorage.getItem(cle); } catch { return null; }
  };
  const ecrire = (cle, valeur) => {
    try { sessionStorage.setItem(cle, valeur); } catch { /* stockage indisponible */ }
  };
  if (params.has('saison')) ecrire('maquette-saison', params.get('saison'));
  if (params.has('sombre')) ecrire('maquette-sombre', params.get('sombre'));

  const saison = SAISONS.includes(lire('maquette-saison')) ? lire('maquette-saison') : 'automne';
  const sombreParDefaut = /sombre/i.test(document.title);
  const sombre = lire('maquette-sombre') === null ? sombreParDefaut : lire('maquette-sombre') === '1' || sombreParDefaut;

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[class*="{{"]').forEach((el) => {
      el.className = el.className.replace('{{saison}}', saison).replace('{{theme}}', sombre ? 'sombre' : '');
    });
    document.querySelectorAll('script[type="text/x-dc"]').forEach((s) => s.remove());
  });
})();
