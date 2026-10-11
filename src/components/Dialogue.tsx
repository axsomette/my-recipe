import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

interface Props {
  ouvert: boolean;
  onFermer: () => void;
  /** id du titre qui nomme la fenêtre. */
  titreId: string;
  /** alertdialog pour une confirmation destructive. */
  alerte?: boolean;
  children: ComponentChildren;
}

const SEUIL_VITESSE = 0.5; // px/ms, mesurée sur la fin du geste : un geste vif ferme même sur une courte distance
const DUREE_SORTIE = 200;

/**
 * Feuille montante sur téléphone, fenêtre centrée sur tablette.
 * Le <dialog> natif piège le focus, ferme avec Échap et rend le focus à l'élément d'origine.
 * Sur téléphone, on la ferme aussi en la glissant vers le bas (la poignée le promet).
 */
export function Dialogue({ ouvert, onFermer, titreId, alerte = false, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const fermer = useRef(onFermer);
  fermer.current = onFermer;

  useEffect(() => {
    const dialogue = ref.current;
    if (!dialogue) return;
    if (ouvert && !dialogue.open) {
      dialogue.style.transform = '';
      dialogue.style.transition = '';
      dialogue.showModal();
      // Le focus va au titre, lu en premier, plutôt qu'à la première case (et sans cadre de focus au doigt).
      const titre = document.getElementById(titreId);
      if (titre && !dialogue.querySelector('[autofocus]')) {
        titre.tabIndex = -1;
        titre.focus({ preventScroll: true });
      }
    }
    if (!ouvert && dialogue.open) dialogue.close();
  }, [ouvert]);

  // Glisser vers le bas pour fermer : depuis la poignée, ou de n'importe où quand le contenu est tout en haut.
  useEffect(() => {
    const dialogue = ref.current;
    if (!dialogue) return;
    let depart: { y: number; t: number } | null = null;
    let decalage = 0;
    let glisse = false;
    let fige = false;
    let traces: { y: number; t: number }[] = [];

    const surTelephone = () => !matchMedia('(min-width: 768px)').matches;
    const debut = (e: TouchEvent) => {
      fige = false;
      if (!surTelephone() || e.touches.length !== 1) return;
      if ((e.target as Element).closest('input[type="text"], input[type="search"], textarea')) return;
      depart = { y: e.touches[0]!.clientY, t: e.timeStamp };
      decalage = 0;
      glisse = false;
      traces = [];
    };
    const deplace = (e: TouchEvent) => {
      if (fige) return e.preventDefault();
      if (!depart) return;
      const delta = e.touches[0]!.clientY - depart.y;
      if (!glisse) {
        // On ne prend la main que vers le bas, et seulement si le contenu ne peut plus remonter.
        // Décision dès le premier mouvement : sur iPhone, un mouvement laissé au navigateur lance son
        // propre défilement (l'effet élastique), et les mouvements suivants ne peuvent plus être retenus.
        if (delta === 0) return;
        if (delta < 0 || dialogue.scrollTop > 0) {
          depart = null;
          // Contenu trop court pour défiler : le geste ne doit rien faire bouger, surtout pas la page derrière.
          if (dialogue.scrollHeight <= dialogue.clientHeight) {
            fige = true;
            e.preventDefault();
          }
          return;
        }
        glisse = true;
        dialogue.style.transition = 'none';
      }
      e.preventDefault();
      decalage = Math.max(0, delta);
      dialogue.style.transform = `translateY(${decalage}px)`;
      traces = [...traces.filter((p) => e.timeStamp - p.t < 80), { y: decalage, t: e.timeStamp }];
    };
    const fin = () => {
      if (!depart) return;
      // Vitesse entre les derniers mouvements, sans compter le temps où le doigt se lève.
      const premiere = traces[0];
      const derniere = traces[traces.length - 1];
      const vitesse = premiere && derniere && derniere.t > premiere.t ? (derniere.y - premiere.y) / (derniere.t - premiere.t) : 0;
      depart = null;
      if (!glisse) return;
      if (decalage > Math.min(160, dialogue.offsetHeight * 0.3) || vitesse > SEUIL_VITESSE) {
        dialogue.style.transition = `transform ${DUREE_SORTIE}ms ease-in`;
        dialogue.style.transform = 'translateY(100%)';
        setTimeout(() => fermer.current(), DUREE_SORTIE);
      } else {
        dialogue.style.transition = 'transform 0.22s var(--sortie)';
        dialogue.style.transform = '';
      }
    };
    dialogue.addEventListener('touchstart', debut, { passive: true });
    dialogue.addEventListener('touchmove', deplace, { passive: false });
    dialogue.addEventListener('touchend', fin);
    dialogue.addEventListener('touchcancel', fin);
    return () => {
      dialogue.removeEventListener('touchstart', debut);
      dialogue.removeEventListener('touchmove', deplace);
      dialogue.removeEventListener('touchend', fin);
      dialogue.removeEventListener('touchcancel', fin);
    };
  }, []);

  return (
    <dialog
      ref={ref}
      class="feuille"
      role={alerte ? 'alertdialog' : undefined}
      aria-labelledby={titreId}
      onClose={onFermer}
      onClick={(e) => {
        // Un clic sur le voile (hors du contenu) ferme la fenêtre.
        const cadre = ref.current?.getBoundingClientRect();
        if (cadre && e.target === ref.current && (e.clientY < cadre.top || e.clientY > cadre.bottom || e.clientX < cadre.left || e.clientX > cadre.right)) {
          onFermer();
        }
      }}
    >
      {/* Poignée : on peut tirer la feuille vers le bas pour la fermer. */}
      <span class="poignee -mx-5 -mt-2.5 mb-0.5 flex h-8 items-center justify-center md:hidden" aria-hidden="true">
        <span class="block h-[5px] w-10 rounded-full bg-trait-fort opacity-50" />
      </span>
      {ouvert && children}
    </dialog>
  );
}
