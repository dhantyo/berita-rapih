// Screenshot every surface of the reader, phone and desktop, for UI reviews (before and after a change).
// Uses the built reader (dist/shortcut.js) in your installed Chrome on live articles. Needs `npm run build` first.
//
//   node tools/ui-shots.ts <folder>      e.g. node tools/ui-shots.ts .impeccable/shots/before
//
// Nothing is sent: the editor's send question is photographed, never answered, and Google Forms requests are blocked.
// Articles: the same calm ones as tools/screenshots.ts; the new-site card uses an article from an unsupported outlet.
import { mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium, type Page } from 'playwright-core';
import { ROOT } from './lib/rules.ts';

const dir = resolve(process.argv[2] ?? join(ROOT, '.impeccable/shots/now'));
mkdirSync(dir, { recursive: true });

const KOMPAS = 'https://www.kompas.com/food/read/2026/11/18/203014675/10-hidangan-sup-terbaik-di-asia-tenggara-ada-3-dari-indonesia';
const TRIBUN = 'https://m.tribunnews.com/travel/7905546/batagor-indonesia-masuk-10-besar-hidangan-seafood-terbaik-dunia-versi-tasteatlas';
const UNSUPPORTED = 'https://www.dw.com/id/wacana-badak-jawa-dipindah-tuai-sorotan/a-79964682';

const core = readFileSync(join(ROOT, 'dist', 'shortcut.js'), 'utf8');
const PHONE_UA = 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const S = '.sapuberita-overlay';

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' });

async function open(url: string, o: { desktop?: boolean; dark?: boolean; settings?: object; wait?: string } = {}): Promise<Page> {
  const ctx = await browser.newContext(o.desktop
    ? { viewport: { width: 1280, height: 800 }, userAgent: DESKTOP_UA, colorScheme: o.dark ? 'dark' : 'light' }
    : { viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: PHONE_UA, colorScheme: o.dark ? 'dark' : 'light' });
  await ctx.route(/docs\.google\.com\/forms/, (r) => r.abort());
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(2500);
  if (o.settings) await page.evaluate((s) => localStorage.setItem('sapuberita:settings', s), JSON.stringify(o.settings));
  await page.evaluate(core);
  if (o.wait === 'none') {
    await page.waitForTimeout(3000);
    return page;
  }
  await page.waitForSelector(`${S} .content p`, { timeout: 30_000, state: 'attached' });
  for (let i = 0; i < 40 && (await page.locator(`${S} .status`).count()); i++) await page.waitForTimeout(500);
  await page.waitForTimeout(2000);
  return page;
}
const shot = async (page: Page, file: string) => {
  await page.waitForTimeout(450);
  await page.screenshot({ path: join(dir, file) });
  console.log('wrote', file);
};
const inShadow = (page: Page, fn: string) => page.evaluate((f) => {
  const r = document.querySelector('.sapuberita-overlay')!.shadowRoot!;
  return new Function('r', f)(r);
}, fn);
const step = async (name: string, f: () => Promise<void>) => {
  try {
    await f();
  } catch (e) {
    console.log('FAILED', name, (e as Error).message.split('\n')[0]);
  }
};

/** Open the editor from Masukan, switch to Bersih, and pick a paragraph. */
async function pickInClean(page: Page, file: string, desktop = false) {
  await page.locator(`${S} [data-ed="view-clean"]`).click();
  await page.waitForTimeout(500);
  const t = (await inShadow(page, `
    const root = r.querySelector('.root');
    const ps = [...r.querySelectorAll('.content > p')].filter((p) => (p.textContent || '').length > 120);
    const p = ps[2] || ps[0];
    root.scrollTop += p.getBoundingClientRect().top - 90;
    const b = p.getBoundingClientRect();
    return { x: b.x + 40, y: b.y + 12 };`)) as { x: number; y: number };
  await page.waitForTimeout(400);
  if (desktop) await page.mouse.click(t.x, t.y);
  else await page.touchscreen.tap(t.x, t.y);
  await shot(page, file);
}

// ── Phone ──
await step('phone light', async () => {
  const p = await open(KOMPAS);
  await shot(p, 'p01-reader-top.png');
  await inShadow(p, `const root = r.querySelector('.root'); root.scrollTop = root.scrollHeight;`);
  await shot(p, 'p02-reader-end.png');
  await inShadow(p, `r.querySelector('.root').scrollTop = 0;`);
  await p.locator('.gear').click();
  await shot(p, 'p03-settings-top.png');
  await inShadow(p, `const s = r.querySelector('.panel'); s.scrollTop = s.scrollHeight;`);
  await shot(p, 'p04-settings-bottom.png');
  await p.locator(`${S} .head-feedback`).click();
  await shot(p, 'p05-feedback.png');
  await p.locator(`${S} .fb-choice`).nth(1).click();
  await shot(p, 'p06-feedback-report.png');
  await p.close();
});
await step('phone editor', async () => {
  const p = await open(KOMPAS);
  await p.locator('.gear').click();
  await p.locator(`${S} .head-feedback`).click();
  await p.locator(`${S} .fb-choice`).first().click();
  await p.waitForTimeout(1500);
  await shot(p, 'p07-editor-hint.png');
  await pickInClean(p, 'p08-editor-sheet.png');
  await p.locator(`${S} [data-ed="remove"]`).click();
  await p.waitForTimeout(500);
  await p.locator(`${S} [data-ed="done"]`).click();
  await shot(p, 'p09-editor-ask.png');
  await p.close();
});
await step('phone original', async () => {
  const p = await open(KOMPAS);
  await p.locator(`${S} .bar .btn:not(.gear)`).click();
  await shot(p, 'p10-original-reopen.png');
  await p.close();
});
await step('phone dark', async () => {
  const p = await open(KOMPAS, { dark: true });
  await shot(p, 'p11-dark.png');
  await p.locator('.gear').click();
  await shot(p, 'p12-dark-settings.png');
  await p.close();
});
await step('phone sepia', async () => {
  const p = await open(KOMPAS, { settings: { theme: 'sepia', font: 'serif' } });
  await shot(p, 'p13-sepia-serif.png');
  await p.locator('.gear').click();
  await shot(p, 'p13b-sepia-settings.png');
  await p.close();
});
await step('phone new site', async () => {
  const p = await open(UNSUPPORTED, { wait: 'none' });
  await shot(p, 'p14-newsite-card.png');
  await p.close();
});

// ── Desktop ──
await step('desktop', async () => {
  const d = await open(TRIBUN, { desktop: true });
  await shot(d, 'd01-reader.png');
  await d.locator('.gear').click();
  await shot(d, 'd02-settings.png');
  await d.locator(`${S} .head-feedback`).click();
  await shot(d, 'd03-feedback.png');
  await d.close();
});
await step('desktop editor', async () => {
  const d = await open(TRIBUN, { desktop: true });
  await d.locator('.gear').click();
  await d.locator(`${S} .head-feedback`).click();
  await d.locator(`${S} .fb-choice`).first().click();
  await d.waitForTimeout(1500);
  await shot(d, 'd04-editor-hint.png');
  await pickInClean(d, 'd05-editor-sheet.png', true);
  await d.locator(`${S} [data-ed="remove"]`).click();
  await d.waitForTimeout(500);
  await d.locator(`${S} [data-ed="done"]`).click();
  await shot(d, 'd06-editor-ask.png');
  await d.close();
});
await step('desktop dark', async () => {
  const d = await open(TRIBUN, { desktop: true, dark: true });
  await shot(d, 'd07-dark.png');
  await d.locator('.gear').click();
  await shot(d, 'd08-dark-settings.png');
  await d.close();
});

await browser.close();
