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

/**
 * Feuille montante sur téléphone, fenêtre centrée sur tablette.
 * Le <dialog> natif piège le focus, ferme avec Échap et rend le focus à l'élément d'origine.
 */
export function Dialogue({ ouvert, onFermer, titreId, alerte = false, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogue = ref.current;
    if (!dialogue) return;
    if (ouvert && !dialogue.open) dialogue.showModal();
    if (!ouvert && dialogue.open) dialogue.close();
  }, [ouvert]);

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
      <span class="mx-auto mb-2 block h-[5px] w-10 rounded-full bg-trait-fort opacity-50 md:hidden" aria-hidden="true" />
      {ouvert && children}
    </dialog>
  );
}
