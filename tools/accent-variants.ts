// Render the settings panel in a few accent colours, light and dark, side by side in one image, to choose an accent.
// Needs `npm run build` first. Writes <folder>/accents.png (and one shot per variant).
//
//   node tools/accent-variants.ts .impeccable/shots/accents
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { ROOT } from './lib/rules.ts';

const dir = resolve(process.argv[2] ?? join(ROOT, '.impeccable/shots/accents'));
mkdirSync(dir, { recursive: true });
const URL_ = 'https://www.kompas.com/food/read/2026/11/18/203014675/10-hidangan-sup-terbaik-di-asia-tenggara-ada-3-dari-indonesia';
const UA = 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
const core = readFileSync(join(ROOT, 'dist', 'shortcut.js'), 'utf8');

/** name, light accent, dark accent */
const VARIANTS: Array<[string, string, string]> = [
  ['Ochre (now)', 'rgb(176 122 18)', 'rgb(222 172 70)'],
  ['Terracotta', 'rgb(191 77 44)', 'rgb(236 132 98)'],
  ['Teal', 'rgb(13 118 110)', 'rgb(86 196 182)'],
  ['Lidi green', 'rgb(96 122 26)', 'rgb(168 198 88)'],
  ['Ink only', 'rgb(18 18 18)', 'rgb(232 232 230)'],
];

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' });
const shots: Array<{ name: string; light: string; dark: string }> = [];
for (const scheme of ['light', 'dark'] as const) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA, colorScheme: scheme });
  const page = await ctx.newPage();
  await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(2500);
  await page.evaluate(core);
  await page.waitForSelector('.sapuberita-overlay .content p', { timeout: 30_000, state: 'attached' });
  await page.waitForTimeout(3000);
  // Scroll the article a little so the progress hairline shows, then open the panel.
  await page.evaluate(() => { const r = document.querySelector('.sapuberita-overlay')!.shadowRoot!.querySelector('.root') as HTMLElement; r.scrollTop = 900; });
  await page.locator('.gear').click();
  await page.waitForTimeout(600);
  for (const [i, [name, light, dark]] of VARIANTS.entries()) {
    const value = scheme === 'light' ? light : dark;
    await page.evaluate((v) => {
      const r = document.querySelector('.sapuberita-overlay')!.shadowRoot!;
      let st = r.querySelector('#variant') as HTMLStyleElement | null;
      if (!st) { st = document.createElement('style'); st.id = 'variant'; r.append(st); }
      st.textContent = `.root, .root[data-theme] { --accent: ${v} !important; --control: ${v} !important; }`;
    }, value);
    await page.waitForTimeout(250);
    const file = `${i}-${scheme}.png`;
    await page.screenshot({ path: join(dir, file) });
    (shots[i] ??= { name, light: '', dark: '' })[scheme] = file;
  }
  await ctx.close();
}

// One sheet: a column per variant, light above dark.
const html = `<!doctype html><meta charset="utf-8"><style>
body { margin: 0; padding: 24px; background: rgb(236 236 234); font: 600 15px/1.3 system-ui, sans-serif; display: flex; gap: 18px; }
figure { margin: 0; display: flex; flex-direction: column; gap: 10px; }
figcaption { text-align: center; }
img { width: 260px; border-radius: 10px; box-shadow: 0 2px 8px rgb(0 0 0 / 0.2); }
</style>${shots.map((s) => `<figure><figcaption>${s.name}</figcaption><img src="${s.light}"><img src="${s.dark}"></figure>`).join('')}`;
const sheet = join(dir, 'accents.html');
writeFileSync(sheet, html);
const ctx = await browser.newContext({ viewport: { width: 5 * 278 + 30, height: 1200 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto(pathToFileURL(sheet).href);
await page.waitForTimeout(500);
await page.screenshot({ path: join(dir, 'accents.png'), fullPage: true });
console.log('wrote', join(dir, 'accents.png'));
await browser.close();
