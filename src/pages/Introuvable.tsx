import { lien } from '../lib/routeur';

export function Introuvable() {
  return (
    <div class="flex flex-col gap-4 pt-2">
      <h1 tabIndex={-1} class="display text-[30px] outline-none">
        Page introuvable
      </h1>
      <p class="text-encre-2">Ce lien ne mène à aucun écran de l’app.</p>
      <a href={lien({ nom: 'semaine' })} class="min-h-11 self-start font-semibold text-saison-texte underline">
        Revenir à ma semaine
      </a>
    </div>
  );
}
