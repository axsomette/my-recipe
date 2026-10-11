import { useEffect, useState } from 'preact/hooks';
import { Icone } from './Icone';

const DUREE = 6000;
const SORTIE = 200;

/** Confirmation en bas d'écran : elle monte avec un léger rebond, la coche se dessine, puis elle s'efface. */
export function Toast({ message, onFin }: { message: string | null; onFin: () => void }) {
  const [sortante, setSortante] = useState(false);
  useEffect(() => {
    setSortante(false);
    if (!message) return;
    const sortie = setTimeout(() => setSortante(true), DUREE - SORTIE);
    const fin = setTimeout(onFin, DUREE);
    return () => {
      clearTimeout(sortie);
      clearTimeout(fin);
    };
  }, [message]);
  return (
    <div role="status" class="pointer-events-none fixed inset-x-4 bottom-[100px] z-30 flex justify-center md:bottom-8">
      {message && (
        <p key={message} class={`${sortante ? 'toast-sort' : 'toast-entre'} pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl bg-encre px-4 py-3.5 text-[15px] text-papier`}>
          <Icone nom="coche" taille={22} epaisseur={2.4} class="shrink-0" />
          {message}
        </p>
      )}
    </div>
  );
}
