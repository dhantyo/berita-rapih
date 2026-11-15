// Live check of the reader's own edits (hide a part / add a part from the page) and of the "hide the bar while
// scrolling" setting, on real articles in your installed Chrome. Needs `npm run build` first.
//
//   node tools/live-edit.ts [hide|add|migrate|bar|all] [--shot <folder>]
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type BrowserContext, type Page } from 'playwright-core';
import { ROOT } from './lib/rules.ts';

const args = process.argv.slice(2);
const which = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--shot') ?? 'all';
const shotDir = args.includes('--shot') ? args[args.indexOf('--shot') + 1] : undefined;
if (shotDir) mkdirSync(shotDir, { recursive: true });
const core = readFileSync(join(ROOT, 'dist', 'shortcut.js'), 'utf8');
const UA = 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
const DETIK = 'https://news.detik.com/berita/d-8746131/pkb-pertimbangkan-hak-menyatakan-pendapat-terkait-polemik-gibran';
const TRIBUN = 'https://www.tribunnews.com/nasional/7909546/pernyataan-lengkap-gibran-usai-sampaikan-niat-mundur-sebagai-wapres-singgung-wejangan-prabowo';

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' });
const newContext = (scheme: 'light' | 'dark' = 'light') =>
  browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA, colorScheme: scheme });
let failed = 0;
const ok = (cond: boolean, what: string) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${what}`);
  if (!cond) failed++;
};

async function open(ctx: BrowserContext, url: string, before?: string): Promise<Page> {
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(2000);
  await page.evaluate(() => document.querySelector('#kgmModal-cookie')?.remove());
  if (before) await page.evaluate((s) => localStorage.setItem('sapuberita:settings', s), before);
  await page.evaluate(core);
  await page.waitForSelector('.sapuberita-overlay .content p', { timeout: 20_000, state: 'attached' });
  await page.waitForTimeout(1500);
  return page;
}
const visibleCount = (page: Page, sel: string) =>
  page.evaluate((s) => {
    const r = document.querySelector('.sapuberita-overlay')!.shadowRoot!;
    return [...r.querySelectorAll(s)].filter((e) => !e.closest('[data-user-hidden]') && (e as HTMLElement).getClientRects().length > 0).length;
  }, sel);
const settings = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('sapuberita:settings') ?? '{}'));
const shot = (page: Page, name: string) => page.screenshot({ path: shotDir ? join(shotDir, name) : undefined });

async function toEditTool(page: Page, tool: string) {
  await page.locator('.aa').click();
  await page.getByRole('button', { name: 'Beri masukan' }).click();
  await page.getByText('Atur isi artikel').first().click();
  await page.getByText(tool, { exact: true }).first().click();
  await page.waitForTimeout(500);
}

async function hideFlow() {
  console.log('\n== Detik: hide a paragraph');
  const ctx = await newContext();
  const page = await open(ctx, DETIK);
  const target = page.locator('.sapuberita-overlay .content p').nth(2);
  const text = ((await target.textContent()) ?? '').trim();
  console.log('  target:', text.slice(0, 60));
  const before = await visibleCount(page, '.content p');
  await toEditTool(page, 'Sembunyikan bagian');
  await target.click();
  await page.getByRole('button', { name: 'Sembunyikan', exact: true }).click();
  await page.waitForTimeout(500);
  ok((await visibleCount(page, '.content p')) === before - 1, 'paragraph disappears immediately');
  const link = await page.locator('.pickbar.done a.btn.primary').getAttribute('href');
  ok(!!link && decodeURIComponent(link).includes(text.slice(0, 30)), 'one-tap report link contains the note');
  console.log('  stored:', JSON.stringify((await settings(page)).personal));
  await page.locator('.aa').click();
  const row = page.locator('.hidden-row .text').first();
  ok(/1 bagian disembunyikan di situs ini/.test((await row.textContent()) ?? ''), 'Aa shows "1 bagian disembunyikan di situs ini"');
  await page.close();

  const again = await open(ctx, DETIK);
  ok((await visibleCount(again, '.content p')) === before - 1, 'still hidden after reopening in a new page');
  await again.locator('.aa').click();
  await again.getByRole('button', { name: 'Tampilkan lagi' }).click();
  await again.waitForTimeout(400);
  ok((await visibleCount(again, '.content p')) === before, 'undo (Tampilkan lagi) restores it');
  await ctx.close();
}

async function addFlow() {
  console.log('\n== Tribun: add .credit from the original page');
  const ctx = await newContext();
  const page = await open(ctx, TRIBUN);
  ok(await page.evaluate(() => !!document.querySelector('.credit')), '.credit exists on the original page');
  const inClean = (p: Page) => p.evaluate(() => !!document.querySelector('.sapuberita-overlay')!.shadowRoot!.querySelector('[data-user-added]'));
  ok(!(await inClean(page)), 'not in the clean view before');
  await toEditTool(page, 'Tambahkan dari halaman asli');
  await page.evaluate(() => (document.querySelector('.credit *') ?? document.querySelector('.credit'))!.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(300);
  const pos = await page.evaluate(() => {
    const el = (document.querySelector('.credit *') ?? document.querySelector('.credit')) as HTMLElement;
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, tag: el.tagName };
  });
  console.log('  child:', pos.tag);
  await page.touchscreen.tap(pos.x, pos.y);
  await page.waitForTimeout(300);
  const wider = page.getByRole('button', { name: 'Lebih luas' });
  await wider.click();
  await page.waitForTimeout(200);
  for (let i = 0; i < 4; i++) {
    const done = await page.evaluate(() => {
      const o = document.querySelector('.sapuberita-overlay')!.shadowRoot!.querySelector('.pick-outline') as HTMLElement;
      const c = document.querySelector('.credit')!.getBoundingClientRect();
      return Math.abs(parseFloat(o.style.width) - 8 - c.width) < 2 && Math.abs(parseFloat(o.style.height) - 8 - c.height) < 2;
    });
    if (done) break;
    await wider.click();
    await page.waitForTimeout(200);
  }
  await page.getByRole('button', { name: 'Tambahkan', exact: true }).click();
  await page.waitForTimeout(800);
  ok(await inClean(page), 'credit box appears in the clean view immediately');
  const link = await page.locator('.pickbar.done a.btn.primary').getAttribute('href');
  ok(!!link && /credit/.test(decodeURIComponent(link)), 'one-tap report link contains the note');
  console.log('  stored:', JSON.stringify((await settings(page)).personal));
  await page.locator('.aa').click();
  ok(/1 bagian ditambahkan di situs ini/.test((await page.locator('.hidden-row .text').first().textContent()) ?? ''), 'Aa shows "1 bagian ditambahkan di situs ini"');
  await page.close();

  const again = await open(ctx, TRIBUN);
  ok(await inClean(again), 'still added after reopening in a new page');
  await again.locator('.aa').click();
  await again.getByRole('button', { name: 'Hapus', exact: true }).click();
  await again.waitForTimeout(400);
  ok(!(await inClean(again)), 'undo (Hapus) removes it');
  await ctx.close();
}

async function migrateFlow() {
  console.log('\n== Old-format settings migrate');
  const ctx = await newContext();
  const probe = await open(ctx, DETIK);
  const fp = await probe.evaluate(() => {
    const p = document.querySelector('.sapuberita-overlay')!.shadowRoot!.querySelectorAll('.content p')[2];
    return 't:' + (p?.textContent ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().slice(0, 80);
  });
  const total = await visibleCount(probe, '.content p');
  await ctx.close();
  const ctx2 = await newContext();
  const p2 = await open(ctx2, DETIK, JSON.stringify({ hidden: [`detik:${fp}`] }));
  const n = await visibleCount(p2, '.content p');
  console.log('  fingerprint:', fp.slice(0, 50), '| paragraphs', total, '->', n);
  ok(n === total - 1, 'legacy hidden entry applies');
  await p2.locator('.aa').click();
  ok(/1 bagian disembunyikan/.test((await p2.locator('.hidden-row .text').first().textContent()) ?? ''), 'Aa counts the migrated entry');
  await ctx2.close();
}

async function barFlow() {
  console.log('\n== Hide the bar while scrolling');
  const barBottom = (p: Page) => p.evaluate(() => (document.querySelector('.sapuberita-overlay')!.shadowRoot!.querySelector('.bar') as HTMLElement).getBoundingClientRect().bottom);
  const scroll = (p: Page, y: number) =>
    p.evaluate(async (to) => {
      (document.querySelector('.sapuberita-overlay')!.shadowRoot!.querySelector('.root') as HTMLElement).scrollTop = to;
      await new Promise((r) => setTimeout(r, 600));
    }, y);
  for (const scheme of ['light', 'dark'] as const) {
    const ctx = await newContext(scheme);
    const page = await open(ctx, DETIK, JSON.stringify({ hideBar: true }));
    await scroll(page, 800);
    ok((await barBottom(page)) <= 0.5, `${scheme}: bar hidden after scrolling down 800`);
    await shot(page, `bar-${scheme}-hidden.png`);
    await scroll(page, 750);
    ok((await barBottom(page)) >= 55, `${scheme}: bar back after scrolling up 50`);
    await shot(page, `bar-${scheme}-visible.png`);
    await scroll(page, 1200);
    ok((await barBottom(page)) <= 0.5, `${scheme}: hidden again`);
    await page.evaluate(() => (document.querySelector('.sapuberita-overlay')!.shadowRoot!.querySelector('.aa') as HTMLElement).click());
    await page.waitForTimeout(500);
    ok((await barBottom(page)) >= 55, `${scheme}: opening Aa brings it back`);
    await shot(page, `bar-${scheme}-panel.png`);
    await page.evaluate(() => (document.querySelector('.sapuberita-overlay')!.shadowRoot!.querySelector('.aa') as HTMLElement).click());
    await scroll(page, 0);
    ok((await barBottom(page)) >= 55, `${scheme}: visible at the top`);
    await ctx.close();
  }
  const ctx = await newContext();
  const page = await open(ctx, DETIK);
  await scroll(page, 800);
  ok((await barBottom(page)) >= 55, 'default off: bar stays');
  await ctx.close();
}

if (which === 'hide' || which === 'all') await hideFlow();
if (which === 'add' || which === 'all') await addFlow();
if (which === 'migrate' || which === 'all') await migrateFlow();
if (which === 'bar' || which === 'all') await barFlow();
await browser.close();
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
