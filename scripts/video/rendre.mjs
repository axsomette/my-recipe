// Rend la vidéo image par image : node scripts/video/rendre.mjs <dossier> [fps] [temps…]
// Sans temps : toutes les images (30 s × fps). Avec des temps : seulement ces instants (contrôle).
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire('/opt/node-tools/node_modules/');
const { chromium } = require('playwright');

const [dossier, fpsTexte = '30', ...temps] = process.argv.slice(2);
const fps = Number(fpsTexte);
mkdirSync(dossier, { recursive: true });
const nav = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const page = await nav.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await page.goto(`file://${fileURLToPath(new URL('promo.html', import.meta.url))}`);
await page.evaluate(() => window.pret);
const instants = temps.length ? temps.map(Number) : Array.from({ length: Math.round(30 * fps) }, (_, i) => i / fps);
for (const [i, t] of instants.entries()) {
  await page.evaluate((x) => window.rendre(x), t);
  await page.screenshot({ path: `${dossier}/${temps.length ? `t${t}` : String(i).padStart(4, '0')}.png` });
}
await nav.close();
console.log(`${instants.length} images`);
