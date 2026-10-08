// Permet à Node d'importer les sources TypeScript de l'app, écrites sans extension
// dans les imports (convention Vite) : on retente avec .ts / .tsx.
import { register } from 'node:module';

register(
  'data:text/javascript,' +
    encodeURIComponent(`
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (erreur) {
    if (!specifier.startsWith('.') || /\\.\\w+$/.test(specifier)) throw erreur;
    for (const extension of ['.ts', '.tsx']) {
      try {
        return await next(specifier + extension, context);
      } catch {}
    }
    throw erreur;
  }
}`),
);
