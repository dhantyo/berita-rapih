// Live check of the article editor (Atur isi artikel: green/red/blue page overlay, pick first, "Bagian ini apa?", corner drag, picking in Bersih,
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
  await page.locator('.gear').click();
  await page.locator(`${SHADOW} .nav-row`).click(); // Pengaturan → Situs ini → Atur isi artikel
  await page.waitForSelector(`${SHADOW} .ed-bar`, { timeout: 5000 });
  await page.waitForTimeout(1500);
}

/** Answers posted to the feedback form, caught before they leave (build with SAPU_REPORT_URL set to a Google Form). */
async function catchForm(page: Page) {
  const posts: Array<Record<string, string>> = [];
  await page.route('**/formResponse', async (route) => {
    posts.push(Object.fromEntries(new URLSearchParams(route.request().postData() ?? '')));
    await route.fulfill({ status: 200, body: '' });
  });
  return posts;
}
const sheetQ = (p: Page) => p.locator(`${SHADOW} .ed-q`).first().innerText().catch(() => '');
const pressed = (p: Page, id: string) => p.locator(`${SHADOW} [data-ed="${id}"]`).getAttribute('aria-pressed');
const edMsg = (p: Page) => p.locator(`${SHADOW} .ed-msg`).first().innerText().catch(() => '');
/** Tap a paragraph of the clean view (in Bersih), the n-th one that sits fully between the bars. */
async function tapClean(page: Page, n = 2) {
  const pos = await page.evaluate((k) => {
    const r = document.querySelector('.sapuberita-overlay')!.shadowRoot!;
    const free = r.querySelector('.ed-bar')!.getBoundingClientRect().top;
    const ps = [...r.querySelectorAll('.content > p')].filter((p) => {
      const b = p.getBoundingClientRect();
      return b.top > 70 && b.bottom < free - 4 && (p.textContent ?? '').length > 60;
    });
    const p = ps[k] ?? ps[0];
    if (!p) return null;
    const b = p.getBoundingClientRect();
    return { x: b.x + 40, y: b.y + 10, text: (p.textContent ?? '').trim().slice(0, 60) };
  }, n);
  if (pos) await page.touchscreen.tap(pos.x, pos.y);
  await page.waitForTimeout(400);
  return pos;
}

async function editorDetik(scheme: 'light' | 'dark') {
  console.log(`\n== Detik editor (${scheme})`);
  const ctx = await newContext(scheme);
  const page = await open(ctx, DETIK);
  const posts = await catchForm(page);
  await toEditor(page);
  await page.waitForTimeout(500);
  const green = await edBoxes(page, 'in');
  const red = await edBoxes(page, 'out');
  const blue = await edBoxes(page, 'src');
  console.log('  boxes in view: green', green.length, 'red', red.length, 'blue', blue.map((b) => b.label).join(','));
  const total = await page.evaluate(() => document.querySelector('.sapuberita-overlay')!.shadowRoot!.querySelectorAll('.ed-box.in').length);
  ok(total > 5, `green boxes over the article parts (${total})`);
  ok(blue.some((b) => b.label === 'Judul'), 'blue Judul label on the page title');
  ok(/Ketuk bagian halaman/.test(await barText(page)), 'the bar starts with "Ketuk bagian halaman…"');
  await shot(page, `editor-detik-${scheme}-top.png`);
  if (scheme === 'dark') {
    // Dark: the sheet over a pick, and the same pick in the clean view.
    await tapBox(page, 'in', (x) => x.w > 150 && x.h > 50);
    await shot(page, 'editor-detik-dark-selected.png');
    await page.locator(`${SHADOW} [data-ed="view-clean"]`).click();
    await page.waitForTimeout(700);
    ok(!(await sel(page)).hidden, 'dark: the pick is outlined in Bersih too');
    await shot(page, 'editor-detik-dark-clean.png');
    await ctx.close();
    return;
  }

  // Red → "Isi artikel".
  const redTotal = await page.evaluate(() => document.querySelector('.sapuberita-overlay')!.shadowRoot!.querySelectorAll('.ed-box.out').length);
  ok(redTotal > 0, `there are red parts on the page (${redTotal})`);
  const b = await tapBox(page, 'out', (x) => x.h < 300 && x.h > 20);
  console.log('  tapped red:', JSON.stringify(b), '|', (await barText(page)).replace(/\n/g, ' ').slice(0, 80));
  ok((await sheetQ(page)) === 'Bagian ini apa?', 'a tap opens "Bagian ini apa?"');
  ok(/Tidak tampil/.test(await barText(page)) && (await pressed(page, 'remove')) === 'true', 'a red part is marked "Bukan isi artikel"');
  await shot(page, 'editor-detik-light-red-selected.png');
  await page.locator(`${SHADOW} [data-ed="add"]`).click();
  await page.waitForTimeout(600);
  const p1 = await edPersonal(page);
  console.log('  personal after Isi artikel:', JSON.stringify(p1), '|', await edMsg(page));
  ok(!!p1 && p1.add.length === 1, 'an add entry is saved');
  ok(/ikut tampil/.test(await edMsg(page)) && !(await sheetQ(page)), 'it says so and the sheet closes');

  // Green paragraph → "Bukan isi artikel".
  const g = await tapBox(page, 'in', (x) => x.w > 150 && x.h > 50);
  ok(!!g && (await pressed(page, 'add')) === 'true', 'a green part is marked "Isi artikel"');
  await shot(page, 'editor-detik-light-green-selected.png');
  await page.locator(`${SHADOW} [data-ed="remove"]`).click();
  await page.waitForTimeout(600);
  const p2 = await edPersonal(page);
  console.log('  personal after Bukan isi artikel:', JSON.stringify(p2));
  ok(!!p2 && p2.remove.length >= 1, 'a remove entry is saved');

  // Drag a corner outward → snaps to the parent.
  const g2 = await tapBox(page, 'in', (x) => x.w > 150 && x.h > 50);
  ok(!!g2, 'found another green paragraph to resize');
  const parent = await page.evaluate(() => {
    const r = document.querySelector('.sapuberita-overlay')!.shadowRoot!;
    const s = (r.querySelector('.ed-sel') as HTMLElement).getBoundingClientRect();
    const el = document.elementFromPoint(s.x + s.width / 2, s.y + s.height / 2) as HTMLElement;
    const p = el.parentElement!.getBoundingClientRect();
    return { x: p.x, y: p.y, w: p.width, h: p.height };
  });
  const s0 = await sel(page);
  const handle = page.locator(`${SHADOW} .ed-h.tl`);
  const hb = (await handle.boundingBox())!;
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(Math.max(4, parent.x), 62, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const s1 = await sel(page);
  console.log('  selection', JSON.stringify(s0), '->', JSON.stringify(s1));
  ok(s1.w > s0.w + 2 || s1.h > s0.h + 10, 'dragging a corner outward makes the selection bigger (snapped to a parent)');
  await shot(page, 'editor-detik-light-snapped.png');
  await page.locator(`${SHADOW} [data-ed="deselect"]`).click();

  // The pick follows: picked on Asli, still outlined in Bersih.
  await tapBox(page, 'in', (x) => x.w > 150 && x.h > 50);
  const pickedText = (await barText(page)).replace(/\s+/g, ' ');
  await page.locator(`${SHADOW} [data-ed="view-clean"]`).click();
  await page.waitForTimeout(700);
  const inClean = await sel(page);
  ok(!inClean.hidden && inClean.h > 10, 'a part picked on Asli is outlined in Bersih');
  ok((await barText(page)).replace(/\s+/g, ' ') === pickedText, 'and the sheet still describes it');
  await shot(page, 'editor-detik-light-carried.png');
  await page.locator(`${SHADOW} [data-ed="deselect"]`).click();

  // Picking in Bersih: tap a paragraph, then "Bukan isi artikel" there.
  const removedBefore = (await edPersonal(page))?.remove.length ?? 0;
  const tapped = await tapClean(page, 1);
  ok(!!tapped && (await sheetQ(page)) === 'Bagian ini apa?', 'a tap in Bersih opens the sheet');
  await shot(page, 'editor-detik-light-clean-picked.png');
  await page.locator(`${SHADOW} [data-ed="view-original"]`).click();
  await page.waitForTimeout(700);
  ok(!(await sel(page)).hidden, 'a part picked in Bersih is outlined on Asli');
  await page.locator(`${SHADOW} [data-ed="view-clean"]`).click();
  await page.waitForTimeout(500);
  await page.locator(`${SHADOW} [data-ed="remove"]`).click();
  await page.waitForTimeout(600);
  const texts = await cleanTexts(page);
  ok(((await edPersonal(page))?.remove.length ?? 0) > removedBefore, 'Bersih: "Bukan isi artikel" saves a remove entry');
  ok(!!tapped && !texts.some((x) => x.startsWith(tapped.text)), 'Bersih: the paragraph is gone at once');

  // Selesai asks once whether to send; yes sends the edit and is remembered.
  await page.locator(`${SHADOW} [data-ed="done"]`).click();
  await page.waitForTimeout(400);
  ok((await sheetQ(page)) === 'Kirim perubahan ini ke pengembang?', 'the first Selesai with changes asks to send them');
  await shot(page, 'editor-detik-light-ask.png');
  await page.locator(`${SHADOW} [data-ed="ask-yes"]`).click();
  await page.waitForTimeout(1500);
  const s = await settings(page);
  console.log('  posted:', JSON.stringify(posts).slice(0, 300));
  ok(posts.length === 1 && Object.values(posts[0]!).includes('edit'), 'Kirim posts the edit to the form');
  ok(s.sendEdits === true && s.sendEditsAsked === true, 'the answer is remembered');
  ok(await page.locator(`${SHADOW} .content p`).first().isVisible(), 'and the reader shows again');

  // Next time: no question, sent in the background.
  await toEditor(page);
  await tapBox(page, 'in', (x) => x.w > 150 && x.h > 50);
  await page.locator(`${SHADOW} [data-ed="remove"]`).click();
  await page.waitForTimeout(500);
  await page.locator(`${SHADOW} [data-ed="done"]`).click();
  await page.waitForTimeout(1200);
  ok(posts.length === 2 && (await page.locator(`${SHADOW} .ed-bar`).count()) === 0, 'later edits are sent without asking');
  await page.close();

  const again = await open(ctx, DETIK);
  await again.locator('.gear').click();
  ok(/Perubahan buatanmu/.test((await again.locator('.personal-row .text').first().textContent()) ?? ''), 'Pengaturan says the personal version is on');
  ok((await again.locator('[data-switch="sendEdits"]').getAttribute('aria-checked')) === 'true', 'and the send switch is on');
  await shot(again, 'editor-detik-light-settings.png');
  await again.close();
  await ctx.close();
}

async function feedbackFlow() {
  console.log('\n== Feedback page sends directly');
  const ctx = await newContext();
  const page = await open(ctx, DETIK);
  const posts = await catchForm(page);
  await page.locator('.gear').click();
  await page.locator(`${SHADOW} .head-feedback`).click();
  await page.getByText('Ide atau saran').first().click();
  await page.locator(`${SHADOW} textarea`).fill('Tolong tambahkan mode baca malam yang lebih redup.');
  await page.locator(`${SHADOW} .fb-send`).click();
  await page.waitForTimeout(1200);
  console.log('  posted:', JSON.stringify(posts));
  ok(posts.length === 1 && Object.values(posts[0]!).includes('idea'), 'Kirim posts the idea to the form');
  ok(await page.locator(`${SHADOW} .fb-sent`).isVisible(), 'and thanks the reader');
  await shot(page, 'feedback-sent.png');
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
  ok(!!author, '.credit has an author link');
  const bylineBefore = await page.locator(`${SHADOW} .meta .byline`).first().textContent().catch(() => null);
  await toEditor(page);
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
  // 1. The author link as Penulis: the page data already gives the same name, so the entry is retired at once.
  await tapOnPage('.credit a');
  ok((await sheetQ(page)) === 'Bagian ini apa?', 'tapping the author link opens the sheet');
  await shot(page, 'editor-tribun-light-field.png');
  ok((await pressed(page, 'field-byline')) === 'true', 'the sheet shows the author link is already the Penulis');
  await page.locator(`${SHADOW} [data-ed="field-byline"]`).click();
  await page.waitForTimeout(700);
  ok(!(await sheetQ(page)) && !(await edPersonal(page)), 'choosing it again changes nothing and closes the sheet');
  // 2. The editor link as Penulis: a different name, so it is kept and the reader header follows.
  await tapOnPage('#editor a');
  await page.locator(`${SHADOW} [data-ed="field-byline"]`).click();
  await page.waitForTimeout(700);
  const p = await edPersonal(page);
  ok(!!p?.fields?.byline, 'a byline selector is saved for another element');
  const editorName = await page.evaluate(() => (document.querySelector('#editor a')!.textContent ?? '').trim());
  await page.locator(`${SHADOW} [data-ed="view-clean"]`).click();
  await page.waitForTimeout(600);
  const byline = await page.locator(`${SHADOW} .meta .byline`).first().textContent().catch(() => null);
  ok(!!byline && byline.includes(editorName), 'Bersih: the reader header shows the chosen name');
  // Tapping the byline in Bersih marks it as Penulis.
  const by = (await page.locator(`${SHADOW} .meta .byline`).first().boundingBox())!;
  await page.touchscreen.tap(by.x + 10, by.y + by.height / 2);
  await page.waitForTimeout(400);
  ok((await pressed(page, 'field-byline')) === 'true', 'Bersih: tapping the byline shows it is the Penulis');
  await shot(page, 'editor-tribun-light-clean-byline.png');
  await page.locator(`${SHADOW} [data-ed="deselect"]`).click();
  await page.locator(`${SHADOW} [data-ed="view-original"]`).click();
  await page.waitForTimeout(500);
  await page.locator(`${SHADOW} [data-ed="more"]`).click();
  ok((await page.locator(`${SHADOW} [data-ed="send"]`).count()) === 0, 'Lainnya has no "Kirim usulan" any more');
  await page.locator(`${SHADOW} [data-ed="reset"]`).click();
  ok(/Kembalikan ke aturan bawaan/.test(await page.locator(`${SHADOW} .ed-ask`).innerText()), 'Kembalikan asks first');
  await page.locator(`${SHADOW} [data-ed="reset-yes"]`).click();
  await page.waitForTimeout(1500);
  ok(!(await edPersonal(page)), 'Kembalikan removes the personal rule');
  await page.locator(`${SHADOW} [data-ed="done"]`).click();
  await page.waitForTimeout(500);
  ok((await page.locator(`${SHADOW} .ed-bar`).count()) === 0, 'Selesai with nothing left to send closes without asking');
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
  await feedbackFlow();
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
  await p2.locator('.gear').click();
  ok(/Perubahan buatanmu/.test((await p2.locator('.personal-row .text').first().textContent()) ?? ''), 'Pengaturan shows the migrated personal version');
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
    // It follows the scroll: 20px up shows about 20px of it at once; let go there and it settles back to hidden.
    await page.evaluate(() => { (document.querySelector('.sapuberita-overlay')!.shadowRoot!.querySelector('.root') as HTMLElement).scrollTop -= 20; });
    await page.waitForTimeout(60);
    const partial = await barBottom(page);
    ok(partial > 12 && partial < 28, `${scheme}: 20px up shows about 20px of the bar (${Math.round(partial)})`);
    await page.waitForTimeout(600);
    ok((await barBottom(page)) <= 0.5, `${scheme}: a mostly hidden bar settles hidden`);
    await page.evaluate(() => (document.querySelector('.sapuberita-overlay')!.shadowRoot!.querySelector('.gear') as HTMLElement).click());
    await page.waitForTimeout(500);
    ok((await barBottom(page)) >= 55, `${scheme}: opening Pengaturan brings it back`);
    await shot(page, `bar-${scheme}-panel.png`);
    await page.evaluate(() => (document.querySelector('.sapuberita-overlay')!.shadowRoot!.querySelector('.gear') as HTMLElement).click());
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
