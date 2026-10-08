/** « 1 recette », « 3 recettes » ; le pluriel par défaut ajoute un s. */
export function pluriel(nombre: number, singulier: string, pluriel = `${singulier}s`): string {
  return `${nombre} ${nombre > 1 ? pluriel : singulier}`;
}

/** « A », « A et B », « A, B et C ». */
export function listeNaturelle(mots: string[]): string {
  if (mots.length <= 1) return mots[0] ?? '';
  return `${mots.slice(0, -1).join(', ')} et ${mots[mots.length - 1]}`;
}
