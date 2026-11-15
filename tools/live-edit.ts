// Live check of the article editor (Atur isi artikel: green/red/blue page overlay, Masukkan/Buang, corner drag,
// header sources, Bersih, Kembalikan), of old-format settings and of the "hide the bar while scrolling" setting,
// on real articles in your installed Chrome. Needs `npm run build` first.
//
//   node tools/live-edit.ts [editor|migrate|bar|all] [--shot <folder>]
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

// ── The editor (Atur isi artikel) ──
const SHADOW = '.sapuberita-overlay';
const edBoxes = (p: Page, kind: string) =>
  p.evaluate(({ k }) => {
    const r = document.querySelector('.sapuberita-overlay')!.shadowRoot!;
    return [...r.querySelectorAll(`.ed-box.${k}`)]
      .filter((n) => (n as HTMLElement).style.display !== 'none')
      .map((n) => {
        const b = n.getBoundingClientRect();
        return { x: b.x, y: b.y, w: b.width, h: b.height, label: n.querySelector('.ed-label')?.textContent ?? '' };
      });
  }, { k: kind });
const barTop = (p: Page) => p.evaluate(() => document.querySelector('.sapuberita-overlay')!.shadowRoot!.querySelector('.ed-bar')!.getBoundingClientRect().top);
const edPersonal = async (p: Page) => (await settings(p)).personal?.[0];
const cleanTexts = (p: Page) =>
  p.evaluate(() => [...document.querySelector('.sapuberita-overlay')!.shadowRoot!.querySelectorAll('.content p, .content figcaption')].filter((e) => !e.closest('[data-user-hidden]')).map((e) => (e.textContent ?? '').trim()));

/** Tap the first box of this kind that the predicate accepts and that sits fully in the free area, scrolling down to find one. */
async function tapBox(page: Page, kind: string, accept: (b: { x: number; y: number; w: number; h: number }) => boolean = () => true) {
  const free = (await barTop(page)) - 4;
  for (let i = 0; i < 12; i++) {
    const hit = (await edBoxes(page, kind)).find((b) => b.y >= 60 && b.y + Math.min(b.h, 40) <= free && accept(b));
    if (hit) {
      await page.touchscreen.tap(hit.x + Math.min(hit.w / 2, 120), hit.y + Math.min(hit.h / 2, 18));
      await page.waitForTimeout(350);
      return hit;
    }
    await page.evaluate((dy) => window.scrollBy(0, dy), Math.round(free * 0.6));
    await page.waitForTimeout(300);
  }
  return undefined;
}
const barText = (p: Page) => p.locator(`${SHADOW} .ed-text`).first().innerText();
const sel = (p: Page) =>
  p.evaluate(() => {
    const n = document.querySelector('.sapuberita-overlay')!.shadowRoot!.querySelector('.ed-sel') as HTMLElement;
    const b = n.getBoundingClientRect();
    return { hidden: n.hidden, x: b.x + 3, y: b.y + 3, w: b.width - 6, h: b.height - 6 };
  });

async function toEditor(page: Page) {
  await page.locator('.aa').click();
  await page.getByRole('button', { name: 'Beri masukan' }).click();
  await page.getByText('Atur isi artikel').first().click();
  await page.waitForSelector(`${SHADOW} .ed-bar`, { timeout: 5000 });
  await page.waitForTimeout(1500);
}

async function editorDetik(scheme: 'light' | 'dark') {
  console.log(`\n== Detik editor (${scheme})`);
  const ctx = await newContext(scheme);
  const page = await open(ctx, DETIK);
  await toEditor(page);
  await page.waitForTimeout(500);
  const green = await edBoxes(page, 'in');
  const red = await edBoxes(page, 'out');
  const blue = await edBoxes(page, 'src');
  console.log('  boxes in view: green', green.length, 'red', red.length, 'blue', blue.map((b) => b.label).join(','));
  const total = await page.evaluate(() => document.querySelector('.sapuberita-overlay')!.shadowRoot!.querySelectorAll('.ed-box.in').length);
  ok(total > 5, `green boxes over the article parts (${total})`);
  ok(blue.some((b) => b.label === 'Judul'), 'blue Judul label on the page title');
  await shot(page, `editor-detik-${scheme}-top.png`);
  if (scheme === 'dark') {
    // Dark: a selection with handles, and the clean preview.
    await tapBox(page, 'in', (x) => x.w > 150 && x.h > 50);
    await shot(page, 'editor-detik-dark-selected.png');
    await page.locator(`${SHADOW} [data-ed="view-clean"]`).click();
    await page.waitForTimeout(500);
    await shot(page, 'editor-detik-dark-clean.png');
    await ctx.close();
    return;
  }

  // Red → Masukkan. A red box inside the article: tap, it is selected, Masukkan makes it green.
  const reds = (await edBoxes(page, 'out')).length;
  const redTotal = await page.evaluate(() => document.querySelector('.sapuberita-overlay')!.shadowRoot!.querySelectorAll('.ed-box.out').length);
  ok(redTotal > 0, `there are red parts on the page (${redTotal}; ${reds} in view)`);
  const b = await tapBox(page, 'out', (x) => x.h < 300 && x.h > 20);
  console.log('  tapped red:', JSON.stringify(b), '|', (await barText(page)).replace(/\n/g, ' ').slice(0, 80));
  ok(/Tidak tampil/.test(await barText(page)), 'selecting a red part says "Tidak tampil"');
  await shot(page, 'editor-detik-light-red-selected.png');
  const greenBefore = (await edBoxes(page, 'in')).length;
  await page.locator(`${SHADOW} [data-ed="add"]`).click();
  await page.waitForTimeout(600);
  const p1 = await edPersonal(page);
  console.log('  personal after Masukkan:', JSON.stringify(p1));
  ok(/Ikut tampil/.test(await barText(page)), 'after Masukkan it reads "Ikut tampil"');
  ok(!!p1 && p1.add.length === 1, 'an add entry is saved');
  ok((await edBoxes(page, 'in')).length >= greenBefore, 'green again');
  await shot(page, 'editor-detik-light-after-add.png');

  // Green paragraph → Buang (a paragraph further down: its selector is not unique, so a text fingerprint is saved).
  const g = await tapBox(page, 'in', (x) => x.w > 150 && x.h > 50);
  ok(!!g, 'found a green paragraph');
  console.log('  selected green:', JSON.stringify(g), '|', (await barText(page)).replace(/\s+/g, ' ').slice(0, 90));
  ok(/Ikut tampil/.test(await barText(page)), 'selecting a green part says "Ikut tampil"');
  await shot(page, 'editor-detik-light-green-selected.png');
  const greensNow = (await edBoxes(page, 'in')).length;
  await page.locator(`${SHADOW} [data-ed="remove"]`).click();
  await page.waitForTimeout(600);
  const p2 = await edPersonal(page);
  console.log('  personal after Buang:', JSON.stringify(p2));
  ok(!!p2 && p2.remove.length >= 1, 'a remove entry is saved');
  ok(/Tidak tampil/.test(await barText(page)), 'after Buang it reads "Tidak tampil"');
  ok((await edBoxes(page, 'out')).length >= 1, 'the paragraph is red now');
  console.log('  green boxes', greensNow, '->', (await edBoxes(page, 'in')).length);

  // Drag a corner outward → snaps to the parent.
  const g2 = await tapBox(page, 'in', (x) => x.w > 150 && x.h > 50);
  ok(!!g2, 'found another green paragraph to resize');
  const parent = await page.evaluate(() => {
    const r = document.querySelector('.sapuberita-overlay')!.shadowRoot!;
    const s = (r.querySelector('.ed-sel') as HTMLElement).getBoundingClientRect();
    // The page element under the selection's middle, and its parent.
    const el = document.elementFromPoint(s.x + s.width / 2, s.y + s.height / 2) as HTMLElement;
    const p = el.parentElement!.getBoundingClientRect();
    return { tag: el.tagName, cls: el.parentElement!.className.slice(0, 40), x: p.x, y: p.y, w: p.width, h: p.height };
  });
  console.log('  parent of the selection:', JSON.stringify(parent));
  const s0 = await sel(page);
  // The parent is taller than the screen: its visible part is the whole free area. Drag the top-left corner out to it.
  const handle = page.locator(`${SHADOW} .ed-h.tl`);
  const hb = (await handle.boundingBox())!;
  const tx = Math.max(4, parent.x);
  const ty = 62;
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(tx, ty, { steps: 6 });
  await shot(page, 'editor-detik-light-dragging.png');
  await page.mouse.up();
  await page.waitForTimeout(400);
  const s1 = await sel(page);
  console.log('  selection', JSON.stringify(s0), '->', JSON.stringify(s1));
  ok(s1.w > s0.w + 2 || s1.h > s0.h + 10, 'dragging a corner outward makes the selection bigger (snapped to a parent)');
  await shot(page, 'editor-detik-light-snapped.png');

  // Bersih: the clean view has the add and not the removed paragraph.
  const removedText = (p2?.remove[0] ?? '').replace(/^t:/, '');
  await page.locator(`${SHADOW} [data-ed="view-clean"]`).click();
  await page.waitForTimeout(600);
  const texts = await cleanTexts(page);
  ok(!texts.some((x) => removedText && x.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().startsWith(removedText.slice(0, 40))), 'Bersih: the removed paragraph is gone');
  await shot(page, 'editor-detik-light-clean.png');
  await page.locator(`${SHADOW} [data-ed="view-original"]`).click();
  await page.waitForTimeout(400);
  ok((await edBoxes(page, 'in')).length > 0, 'back on Asli the boxes are drawn again');
  await page.locator(`${SHADOW} [data-ed="done"]`).click();
  await page.waitForTimeout(500);
  ok(await page.locator(`${SHADOW} .content p`).first().isVisible(), 'Selesai returns to the reader');
  await page.close();

  const again = await open(ctx, DETIK);
  const t2 = await cleanTexts(again);
  ok(!t2.some((x) => removedText && x.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().startsWith(removedText.slice(0, 40))), 'edits persist after reopening the article');
  await again.locator('.aa').click();
  ok(/Versi pribadi aktif/.test((await again.locator('.hidden-row .text').first().textContent()) ?? ''), 'Aa says the personal version is on');
  await shot(again, 'editor-detik-light-aa.png');
  await again.close();
  await ctx.close();
}

async function editorTribun() {
  console.log('\n== Tribun editor: Penulis from .credit');
  const ctx = await newContext('light');
  const page = await open(ctx, TRIBUN);
  const author = await page.evaluate(() => {
    const a = document.querySelector('.credit a');
    return a ? { text: (a.textContent ?? '').trim(), cls: a.className } : null;
  });
  console.log('  .credit a:', JSON.stringify(author));
  ok(!!author, '.credit has an author link');
  const bylineBefore = await page.locator(`${SHADOW} .meta .byline`).first().textContent().catch(() => null);
  console.log('  byline in the reader before:', bylineBefore);
  await toEditor(page);
  await shot(page, 'editor-tribun-light-top.png');
  const tapOnPage = async (css: string) => {
    await page.evaluate((c) => document.querySelector(c)!.scrollIntoView({ block: 'center' }), css);
    await page.waitForTimeout(400);
    const pos = await page.evaluate((c) => {
      const r = document.querySelector(c)!.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, css);
    await page.touchscreen.tap(pos.x, pos.y);
    await page.waitForTimeout(700);
  };
  const edMsg = (p: Page) => p.locator(`${SHADOW} .ed-msg`).first().innerText().catch(() => '');
  // 1. The author link: Tribun's page data already gives the same name, so the entry is retired at once.
  await page.locator(`${SHADOW} [data-ed="field-byline"]`).click();
  ok(/Ketuk bagian halaman/.test(await barText(page)), 'Penulis chip asks to tap the page');
  await page.evaluate(() => document.querySelector('.credit a')!.scrollIntoView({ block: 'center' }));
  await shot(page, 'editor-tribun-light-field.png');
  await tapOnPage('.credit a');
  console.log('  message:', await edMsg(page), '| personal:', JSON.stringify(await edPersonal(page)));
  ok(/sekarang dibaca/.test(await edMsg(page)), 'tapping the author link reads Penulis from it');
  ok(!(await edPersonal(page)), 'and since the official rule already has that name, the entry is retired quietly');
  // 2. The editor link as Penulis: a different name, so it is kept and the reader header follows.
  await page.locator(`${SHADOW} [data-ed="field-byline"]`).click();
  await tapOnPage('#editor a');
  const p = await edPersonal(page);
  console.log('  personal:', JSON.stringify(p));
  ok(!!p?.fields?.byline, 'a byline selector is saved for another element');
  const editorName = await page.evaluate(() => (document.querySelector('#editor a')!.textContent ?? '').trim());
  await page.locator(`${SHADOW} [data-ed="view-clean"]`).click();
  await page.waitForTimeout(600);
  const byline = await page.locator(`${SHADOW} .meta .byline`).first().textContent().catch(() => null);
  console.log('  byline in the reader after:', byline);
  ok(!!byline && byline.includes(editorName), 'Bersih: the reader header shows the chosen name');
  await shot(page, 'editor-tribun-light-clean.png');
  await page.locator(`${SHADOW} [data-ed="view-original"]`).click();
  await page.waitForTimeout(500);
  await page.locator(`${SHADOW} [data-ed="more"]`).click();
  await shot(page, 'editor-tribun-light-more.png');
  const href = await page.locator(`${SHADOW} [data-ed="send"]`).getAttribute('href');
  ok(!!href && /byline/.test(decodeURIComponent(href)), 'Kirim usulan carries the rule as JSON');
  await page.locator(`${SHADOW} [data-ed="reset"]`).click();
  ok(/Kembalikan ke aturan bawaan/.test(await page.locator(`${SHADOW} .ed-ask`).innerText()), 'Kembalikan asks first');
  await shot(page, 'editor-tribun-light-confirm.png');
  await page.locator(`${SHADOW} [data-ed="reset-yes"]`).click();
  await page.waitForTimeout(1500);
  ok(!(await edPersonal(page)), 'Kembalikan removes the personal rule');
  await page.locator(`${SHADOW} [data-ed="done"]`).click();
  await page.waitForTimeout(500);
  const after = await page.locator(`${SHADOW} .meta .byline`).first().textContent().catch(() => null);
  ok(after === bylineBefore, `the header is back to the official one (${after})`);
  await toEditor(page);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  ok((await page.locator(`${SHADOW} .ed-bar`).count()) === 0 && (await page.locator(`${SHADOW} .content p`).first().isVisible()), 'Escape closes the editor and shows the reader');
  await ctx.close();
}

async function editorFlow() {
  await editorDetik('light');
  await editorDetik('dark');
  await editorTribun();
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
  ok(/Versi pribadi aktif/.test((await p2.locator('.hidden-row .text').first().textContent()) ?? ''), 'Aa shows the migrated personal version');
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

if (which === 'editor' || which === 'all') await editorFlow();
if (which === 'migrate' || which === 'all') await migrateFlow();
if (which === 'bar' || which === 'all') await barFlow();
await browser.close();
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
