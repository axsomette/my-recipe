// Pictogrammes d'interface (trait, couleur héritée). Les illustrations de produits
// sont des fichiers à part : voir <Vignette>.
const TRACES = {
  semaine: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  recettes: '<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M9 3.5v17M12 8h4M12 11.5h4"/>',
  saisons: '<path d="M12 20v-8"/><path d="M12 12c0-4 3-7 8-7 0 5-3 7-8 7z"/><path d="M12 14c0-3-2.5-5.5-7-5.5 0 4 2.5 5.5 7 5.5z"/>',
  reglages: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  fleche: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  retour: '<path d="m15 5-7 7 7 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  fermer: '<path d="M6 6l12 12M18 6 6 18"/>',
  coche: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  recherche: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  bas: '<path d="m6 9 6 6 6-6"/>',
  haut: '<path d="m6 15 6-6 6 6"/>',
  crayon: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  poubelle: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5v.01"/>',
  alerte: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.01"/>',
  moins: '<path d="M6 12h12"/>',
  garder: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>',
  garde: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  changer: '<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 20v-4h-4"/>',
  exporter: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  importer: '<path d="M12 16V5M7 10l5-5 5 5M5 20h14"/>',
  fichier: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
} as const;

export type NomIcone = keyof typeof TRACES;

export function Icone({ nom, taille = 24, epaisseur = 1.8, class: classe }: { nom: NomIcone; taille?: number; epaisseur?: number; class?: string }) {
  return (
    <svg
      class={classe}
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width={epaisseur}
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: TRACES[nom] }}
    />
  );
}
