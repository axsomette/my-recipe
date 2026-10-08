import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';

/** Donne au service worker un numéro de version unique par build, pour que chaque déploiement le mette à jour. */
function versionnerServiceWorker(): Plugin {
  let sortie = 'dist';
  return {
    name: 'versionner-service-worker',
    apply: 'build',
    configResolved(config) {
      sortie = config.build.outDir;
    },
    async closeBundle() {
      const chemin = join(sortie, 'sw.js');
      const source = await readFile(chemin, 'utf8');
      await writeFile(chemin, source.replace("const VERSION = '__VERSION__'", `const VERSION = '${Date.now().toString(36)}'`));
    },
  };
}

// GitHub Pages sert le site sous /<nom du dépôt>/.
export default defineConfig({
  base: '/my-recipe/',
  plugins: [preact(), tailwindcss(), versionnerServiceWorker()],
});
