// Retake the screenshots in docs/img (README, install page, and the source of the store images) on live
// articles, with the built reader (dist/shortcut.js) in your installed Chrome. Then run
// `node tools/store-assets.ts` to redraw docs/store from them. Needs `npm run build` first.
//
//   node tools/screenshots.ts
//
// The articles were picked with the user: light topics, calm photos, no politics, several outlets
// (docs/BACKLOG.md history). When one is gone, pick another by the same rules: food, travel or tips;
// no politics, crime, disasters, religion or people in controversy.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Page } from 'playwright-core';
import { ROOT } from './lib/rules.ts';

const LIGHT = 'https://www.kompas.com/food/read/2026/11/18/203014675/10-hidangan-sup-terbaik-di-asia-tenggara-ada-3-dari-indonesia';
const DARK = 'https://travel.detik.com/cerita-perjalanan/d-8758455/hidden-gem-paramotor-di-cikarang-wisatawan-serasa-main-pubg';
const DESKTOP = 'https://m.tribunnews.com/travel/7905546/batagor-indonesia-masuk-10-besar-hidangan-seafood-terbaik-dunia-versi-tasteatlas';

const core = readFileSync(join(ROOT, 'dist', 'shortcut.js'), 'utf8');
const PHONE_UA = 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const SHADOW = '.sapuberita-overlay';
const out = (f: string) => join(ROOT, 'docs/img', f);

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' });

/** Open an article, set the reader's settings, run the reader and wait until it has settled (logo, extra pages). */
async function open(url: string, o: { desktop?: boolean; dark?: boolean; settings?: object } = {}): Promise<Page> {
  const ctx = await browser.newContext(o.desktop
    ? { viewport: { width: 1280, height: 800 }, userAgent: DESKTOP_UA, colorScheme: o.dark ? 'dark' : 'light' }
    : { viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: PHONE_UA, colorScheme: o.dark ? 'dark' : 'light' });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(2500);
  if (o.settings) await page.evaluate((s) => localStorage.setItem('sapuberita:settings', s), JSON.stringify(o.settings));
  await page.evaluate(core);
  await page.waitForSelector(`${SHADOW} .content p`, { timeout: 30_000, state: 'attached' });
  // Extra pages merged, the logo fitted, photos loaded.
  for (let i = 0; i < 40 && (await page.locator(`${SHADOW} .status`).count()); i++) await page.waitForTimeout(500);
  await page.waitForTimeout(2500);
  return page;
}
const shot = async (page: Page, file: string) => {
  await page.screenshot({ path: out(file) });
  console.log('wrote docs/img/' + file);
};

// Phone, light: the article as it opens.
const light = await open(LIGHT);
await shot(light, 'phone-light.png');
// Phone, settings (sepia): the gear's panel.
const sepia = await open(LIGHT, { settings: { theme: 'sepia' } });
await sepia.locator('.gear').click();
await sepia.waitForTimeout(600);
await shot(sepia, 'phone-settings.png');
// Phone, the editor: a paragraph picked in the clean view, "Bagian ini apa?" open.
await light.locator('.gear').click();
await light.getByRole('button', { name: 'Beri masukan' }).click();
await light.locator(`${SHADOW} .fb-choice`).first().click();
await light.waitForTimeout(1500);
await light.locator(`${SHADOW} [data-ed="view-clean"]`).click();
await light.waitForTimeout(500);
const target = await light.evaluate(() => {
  const r = document.querySelector('.sapuberita-overlay')!.shadowRoot!;
  const root = r.querySelector('.root') as HTMLElement;
  const ps = [...r.querySelectorAll('.content > p')].filter((p) => (p.textContent ?? '').length > 120);
  const p = ps[2] ?? ps[0]!;
  root.scrollTop += p.getBoundingClientRect().top - 90;
  const b = p.getBoundingClientRect();
  return { x: b.x + 40, y: b.y + 12 };
});
await light.waitForTimeout(400);
await light.touchscreen.tap(target.x, target.y);
await light.waitForTimeout(600);
await shot(light, 'phone-editor.png');
// Phone, dark.
const dark = await open(DARK, { dark: true });
await shot(dark, 'phone-dark.png');
// Desktop: two pages merged into one.
const desk = await open(DESKTOP, { desktop: true });
await shot(desk, 'desktop.png');

await browser.close();
