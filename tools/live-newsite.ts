// Live check of "a new site" (docs/FEEDBACK.md §5) with the built bookmark (dist/shortcut.js) on a real news site
// that has no rule: the offer appears, "Coba atur sendiri" reads the page with Readability and opens the editor in
// new-site mode, a junk part is dropped, Selesai saves the personal rule, and another article of the site opens
// with it in a new page of the same browser context. Needs `npm run build` first.
//
//   node tools/live-newsite.ts [--shot <folder>]
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Page } from 'playwright-core';
import { ROOT } from './lib/rules.ts';

const args = process.argv.slice(2);
const shotDir = args.includes('--shot') ? args[args.indexOf('--shot') + 1] : undefined;
if (shotDir) mkdirSync(shotDir, { recursive: true });
const core = readFileSync(join(ROOT, 'dist', 'shortcut.js'), 'utf8');
const UA = 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
// era.id: no rule in rules/sites (checked), server-rendered articles.
const FIRST = 'https://era.id/nasional/184757/pasal-makar-bakal-tampar-para-bintang-kepolisian-imbas-penyadapan-ke-prabowo';
const SECOND = 'https://era.id/nasional/184756/batal-berjuang-lewat-pk-gibran-pilih-mengundurkan-diri-hmp-dibatalkan-jokowi-pasrah';
const JUNK = 'Siapa TK?'; // a subheading of the first article to leave out

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA, colorScheme: 'light' });
let failed = 0;
const ok = (cond: boolean, what: string, extra?: unknown) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${what}${!cond && extra !== undefined ? `  ${JSON.stringify(extra)}` : ''}`);
  if (!cond) failed++;
};
const shot = (page: Page, name: string) => page.screenshot({ path: shotDir ? join(shotDir, name) : undefined });
const shadow = (page: Page, sel: string, host = '.sapuberita-overlay') =>
  page.evaluate(({ s, h }) => document.querySelector(h)?.shadowRoot?.querySelector(s)?.textContent ?? null, { s: sel, h: host });
const personal = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('sapuberita:settings') ?? '{}').personal ?? []);

async function load(url: string): Promise<Page> {
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(2500);
  await page.evaluate(core);
  return page;
}

// ── 1. The offer ──
const p1 = await load(FIRST);
await p1.waitForSelector('.sapuberita-newsite', { state: 'attached', timeout: 15_000 });
await p1.waitForTimeout(600);
ok((await shadow(p1, '.ns-text', '.sapuberita-newsite')) ?.startsWith('Berita Rapih belum mengenal situs ini.') === true, 'the offer appears on a site without a rule');
ok(!(await p1.$('.sapuberita-overlay')), 'the reader is not open yet');
await shot(p1, 'newsite-prompt.png');

// ── 2. Coba atur sendiri: the Readability guess, the editor in new-site mode ──
await p1.evaluate(() => (document.querySelector('.sapuberita-newsite')!.shadowRoot!.querySelector('[data-ns="try"]') as HTMLElement).click());
await p1.waitForSelector('.sapuberita-overlay .ed-bar', { state: 'attached', timeout: 20_000 });
await p1.waitForTimeout(1500);
ok(!(await p1.$('.sapuberita-newsite')), 'the offer is gone');
ok((await shadow(p1, '.ed-title')) === 'Atur situs baru', 'the editor is in new-site mode');
ok(/era\.id/.test((await shadow(p1, '.ed-text')) ?? ''), 'the bar says which site is being set up');
const counts = await p1.evaluate(() => {
  const r = document.querySelector('.sapuberita-overlay')!.shadowRoot!;
  return { green: r.querySelectorAll('.ed-box.in').length, paras: r.querySelectorAll('.content p').length };
});
ok(counts.green > 10 && counts.paras > 10, 'the Readability guess is green', counts);
await shot(p1, 'newsite-editor.png');

// ── 3. Drop a junk part, Selesai ──
const find = (text: string) =>
  p1.evaluate((s) => {
    const el = [...document.querySelectorAll('p, h2, h3, strong')].find((e) => (e.textContent ?? '').trim() === s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + Math.min(r.width / 2, 100), y: r.top + r.height / 2, top: r.top };
  }, text);
// The site scrolls smoothly: ask for an instant jump and wait for it.
const first = await find(JUNK);
if (first) {
  await p1.evaluate((dy) => window.scrollTo({ top: window.scrollY + dy, behavior: 'instant' }), first.top - 220);
  await p1.waitForTimeout(600);
}
const where = await find(JUNK);
ok(!!where, `found "${JUNK}" on the page`);
if (where) {
  await p1.waitForTimeout(400);
  await p1.touchscreen.tap(where.x, where.y);
  await p1.waitForTimeout(500);
  await p1.evaluate(() => (document.querySelector('.sapuberita-overlay')!.shadowRoot!.querySelector('[data-ed="remove"]') as HTMLElement | null)?.click());
  await p1.waitForTimeout(500);
  await shot(p1, 'newsite-editor-removed.png');
}
await p1.evaluate(() => (document.querySelector('.sapuberita-overlay')!.shadowRoot!.querySelector('[data-ed="done"]') as HTMLElement).click());
await p1.waitForTimeout(800);
const saved = (await personal(p1))[0];
console.log('saved rule:', JSON.stringify(saved));
ok(saved?.newSite?.domains?.[0] === 'era.id', 'a personal rule with newSite was saved for the domain');
ok(/^\^\/nasional\/\\d\+\/\[a-z0-9-\]\+/.test(saved?.newSite?.articleUrl ?? ''), 'articleUrl is generalised from the path', saved?.newSite?.articleUrl);
ok(saved?.newSite?.body?.length === 1, 'one body selector', saved?.newSite?.body);
ok(!!(await p1.$('.sapuberita-overlay')), 'the reader is showing again');

// ── 4. Another article of the site, in a new page of the same context ──
const p2 = await load(SECOND);
await p2.waitForSelector('.sapuberita-overlay .content p', { state: 'attached', timeout: 20_000 });
await p2.waitForTimeout(1500);
ok(!(await p2.$('.sapuberita-newsite')), 'no offer on the next article');
const read = await p2.evaluate(() => {
  const r = document.querySelector('.sapuberita-overlay')!.shadowRoot!;
  return { paras: r.querySelectorAll('.content p').length, title: r.querySelector('h1')?.textContent ?? '' };
});
ok(read.paras > 5, 'the reader opens with the personal rule', read);
await shot(p2, 'newsite-reader.png');

// ── 5. Pengaturan: Perubahan buatanmu, Kembalikan removes the new site ──
await p2.evaluate(() => (document.querySelector('.sapuberita-overlay')!.shadowRoot!.querySelector('.gear') as HTMLElement).click());
await p2.waitForTimeout(500);
ok(/Perubahan buatanmu/.test((await shadow(p2, '.personal-row')) ?? ''), 'Pengaturan says "Perubahan buatanmu"');
await shot(p2, 'newsite-settings.png');
await p2.evaluate(() => {
  const btn = document.querySelector('.sapuberita-overlay')!.shadowRoot!.querySelector('.personal-row .btn') as HTMLElement;
  btn.click();
  btn.click();
});
await p2.waitForTimeout(800);
ok((await personal(p2)).length === 0, 'Kembalikan removes the rule, the new site included');

// ── 6. Back to the offer ──
const p3 = await load(SECOND);
await p3.waitForSelector('.sapuberita-newsite', { state: 'attached', timeout: 15_000 });
ok(true, 'after the reset the site is offered again');

await browser.close();
console.log(failed ? `${failed} FAILED` : 'ALL PASSED');
process.exit(failed ? 1 : 0);
