// Badge de saison et frise des 12 mois : les deux composants « signature » de la maquette.
import { INITIALES_MOIS, NOMS_MOIS } from '../lib/calendrier';
import { LIBELLES_NIVEAU, type NiveauSaison } from '../lib/saison';

const PICTOS: Record<NiveauSaison, string> = {
  pleine: '<circle cx="7" cy="7" r="5.5" fill="currentColor"/>',
  partie: '<circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M7 2a5 5 0 0 1 0 10z" fill="currentColor"/>',
  hors: '<circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  toutes:
    '<path d="M2.5 7c0-1.4 1-2.3 2.1-2.3C6.6 4.7 7.4 9.3 9.4 9.3c1.1 0 2.1-.9 2.1-2.3s-1-2.3-2.1-2.3C7.4 4.7 6.6 9.3 4.6 9.3 3.5 9.3 2.5 8.4 2.5 7z" fill="none" stroke="currentColor" stroke-width="1.5"/>',
};

/** Forme + texte : le niveau ne repose jamais sur la seule couleur. */
export function BadgeSaison({ niveau }: { niveau: NiveauSaison }) {
  return (
    <span class={`badge badge-${niveau}`}>
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" dangerouslySetInnerHTML={{ __html: PICTOS[niveau] }} />
      {LIBELLES_NIVEAU[niveau]}
    </span>
  );
}

export function PictoToutelAnnee() {
  return <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" dangerouslySetInnerHTML={{ __html: PICTOS.toutes }} />;
}

/** « janvier à avril 50 %, mai et juin 0 %… » : regroupe les mois consécutifs de même valeur. */
export function decrireScores(scores: number[]): string {
  const morceaux: string[] = [];
  let debut = 0;
  for (let i = 1; i <= 12; i++) {
    if (i < 12 && scores[i] === scores[debut]) continue;
    const pourcent = `${Math.round((scores[debut] ?? 0) * 100)} %`;
    const mois =
      i - 1 === debut ? NOMS_MOIS[debut] : i - 1 === debut + 1 ? `${NOMS_MOIS[debut]} et ${NOMS_MOIS[i - 1]}` : `${NOMS_MOIS[debut]} à ${NOMS_MOIS[i - 1]}`;
    morceaux.push(`${mois} ${pourcent}`);
    debut = i;
  }
  return `Part des légumes de saison : ${morceaux.join(', ')}`;
}

interface PropsFrise {
  /** 12 valeurs entre 0 et 1 (hauteur remplie de chaque mois). */
  valeurs: number[];
  /** Mois mis en évidence (1–12). */
  mois: number;
  variante?: 'grande' | 'normale' | 'mini';
  /** Texte lu par les lecteurs d'écran à la place du graphique. */
  description: string;
  class?: string;
}

export function Frise({ valeurs, mois, variante = 'normale', description, class: classe = '' }: PropsFrise) {
  return (
    <div class={`frise ${variante === 'normale' ? '' : `frise-${variante}`} ${classe}`} role="img" aria-label={description}>
      {INITIALES_MOIS.map((lettre, i) => (
        <span key={i} class={`mois ${i + 1 === mois ? 'ici' : ''}`}>
          <span class="case">
            <i style={{ height: `${Math.round((valeurs[i] ?? 0) * 100)}%`, animationDelay: `${i * 15}ms` }} />
          </span>
          <span class="lettre" aria-hidden="true">
            {lettre}
          </span>
        </span>
      ))}
    </div>
  );
}
