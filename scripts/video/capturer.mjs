// Captures de l'app réelle pour la vidéo (téléphone 390×844, ×3).
import { createRequire } from 'node:module';
const require = createRequire('/opt/node-tools/node_modules/');
const { chromium } = require('playwright');
const D = process.argv[2] ?? new URL('ecrans', import.meta.url).pathname;
const URL = 'http://localhost:4173/my-recipe/';
const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, reducedMotion: 'reduce' });
const page = await ctx.newPage();
const shot = (nom, opts = {}) => page.screenshot({ path: `${D}/${nom}.png`, ...opts });
await page.goto(URL);
await page.getByText('Votre carnet est encore vide').waitFor();
await page.addStyleTag({ content: '::-webkit-scrollbar{display:none}' });
// Carnet de départ : 4 idées, la semaine a 3 repas vides.
await page.getByRole('button', { name: 'Partir d’idées de saison' }).click();
let d = page.getByRole('dialog');
await d.waitFor();
const cases = d.locator('input[type=checkbox]');
for (let i = 4; i < await cases.count(); i++) if (await cases.nth(i).isChecked()) await cases.nth(i).uncheck();
await d.getByRole('button', { name: /Ajouter ces 4 repas/ }).click();
await page.waitForTimeout(400);
await page.evaluate(() => window.scrollTo(0, 0));
await shot('accueil');
// Bannière puis fenêtre d'idées
await page.getByRole('button', { name: 'Voir les idées de saison' }).click();
d = page.getByRole('dialog');
await d.waitFor();
await page.waitForTimeout(300);
const c2 = d.locator('input[type=checkbox]');
const n = await c2.count();
for (let i = 0; i < n; i++) if (await c2.nth(i).isChecked()) await c2.nth(i).uncheck();
await d.evaluate((e) => (e.scrollTop = 0));
await shot('idees-0');
for (let i = 0; i < 3; i++) {
  await c2.nth(i).check();
  await d.evaluate((e) => (e.scrollTop = 0));
  await shot(`idees-${i + 1}`);
}
const boites = [];
for (let i = 0; i < 3; i++) boites.push(await c2.nth(i).boundingBox());
console.log('cases', JSON.stringify(boites));
await d.getByRole('button', { name: /Ajouter ces 3 repas/ }).click();
await page.waitForTimeout(400);
await page.getByRole('heading', { name: 'Ma semaine' }).evaluate((h) => window.scrollTo(0, h.getBoundingClientRect().top + window.scrollY - 16));
await page.waitForTimeout(200);
await shot('semaine');
// Calendrier, poissons
await page.goto(URL + '#/saisons');
await page.addStyleTag({ content: '::-webkit-scrollbar{display:none}' });
await page.getByRole('button', { name: /^Poissons/ }).click();
await page.waitForTimeout(300);
await page.evaluate(() => window.scrollTo(0, 0));
await shot('calendrier-poissons');
await page.getByRole('heading', { name: /Poissons et fruits de mer/ }).evaluate((h) => window.scrollTo(0, h.getBoundingClientRect().top + window.scrollY - 120));
await page.waitForTimeout(200);
await shot('calendrier-poissons-liste');
await nav.close();
