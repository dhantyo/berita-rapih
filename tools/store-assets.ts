// Draw the extension icons and the store listing images from the Sapu mark and docs/img screenshots.
//   node tools/store-assets.ts
// Writes apps/extension/icons/icon-{16,32,48,128}.png and docs/store/*.png (needs the installed Chrome).
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { ROOT } from './lib/rules.ts';

const LIDI = 'rgb(176 122 18)';
const CREAM = 'rgb(247 241 228)';
const INK = 'rgb(44 34 22)';
// The broom from the overlay and the Android icon (24-unit grid).
const BROOM = 'M20 4 13 11M11.2 9.2l3.6 3.6M11.2 9.2C8 10 5.4 12.6 4 19c6.4-1.4 9-4 9.8-7.2M6.8 16.4 9.6 13.6M9 17.6l2.2-2.2';
// Inline: a page set with setContent may not load file:// fonts.
const font = `data:font/woff2;base64,${readFileSync(join(ROOT, 'fonts/geist.woff2')).toString('base64')}`;
const img = (f: string) => `data:image/png;base64,${readFileSync(join(ROOT, 'docs/img', f)).toString('base64')}`;

/** The mark: a lidi-coloured rounded square with the white broom, `size` px, inside a transparent canvas. */
const mark = (size: number, stroke = 1.7) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><rect width="24" height="24" rx="5.4" fill="${LIDI}"/>` +
  `<g transform="translate(3.6 3.6) scale(0.7)"><path d="${BROOM}" fill="none" stroke="white" stroke-width="${stroke / 0.7}" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`;

const page = (w: number, h: number, body: string, bg = 'transparent') => `<!doctype html><html><head><style>
@font-face { font-family: Geist; src: url(${font}); font-weight: 100 900; }
html, body { margin: 0; width: ${w}px; height: ${h}px; background: ${bg}; overflow: hidden; font-family: Geist, sans-serif; color: ${INK}; }
* { box-sizing: border-box; }
</style></head><body>${body}</body></html>`;

const browser = await chromium.launch({ channel: 'chrome' });
const tab = await browser.newPage();
const shoot = async (file: string, w: number, h: number, html: string) => {
  // Chrome won't shrink the window to icon sizes, so draw on a big page and capture just the area.
  await tab.setViewportSize({ width: Math.max(w, 800), height: Math.max(h, 600) });
  await tab.setContent(html, { waitUntil: 'load' });
  await tab.evaluate(() => document.fonts.ready);
  await tab.screenshot({ path: file, omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
  console.log('wrote', file.replace(ROOT, '').replace(/^[\\/]/, ''));
};

// Extension icons. Chrome's guideline for 128: 96px of artwork, 16px clear on every side.
const icons = join(ROOT, 'apps/extension/icons');
mkdirSync(icons, { recursive: true });
for (const s of [16, 32, 48, 128]) {
  const art = s === 128 ? 96 : s;
  const pad = (s - art) / 2;
  await shoot(join(icons, `icon-${s}.png`), s, s, page(s, s, `<div style="padding:${pad}px">${mark(art, s <= 16 ? 2.4 : s <= 32 ? 2 : 1.7)}</div>`));
}

const store = join(ROOT, 'docs/store');
mkdirSync(store, { recursive: true });

// Small promo tile, 440×280.
await shoot(join(store, 'promo-440x280.png'), 440, 280, page(440, 280, `
<div style="height:100%;display:flex;flex-direction:column;justify-content:center;gap:18px;padding:0 40px">
  <div style="display:flex;align-items:center;gap:14px">${mark(56)}<span style="font:700 34px/1 Geist;letter-spacing:-0.02em">Sapu Berita</span></div>
  <div style="font:500 21px/1.3 Geist;max-width:340px">Baca berita Indonesia tanpa iklan dan tanpa “Baca Juga”.</div>
</div>`, CREAM));

// Screenshots, 1280×800.
await shoot(join(store, 'screenshot-1-desktop.png'), 1280, 800, page(1280, 800, `<img src="${img('desktop.png')}" width="1280" height="800">`));
const phones = (title: string, sub: string, shots: string[]) => page(1280, 800, `
<div style="height:100%;display:flex;align-items:center;justify-content:space-between;gap:56px;padding:0 80px">
  <div style="flex:1;max-width:560px">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:28px">${mark(40)}<span style="font:700 24px/1 Geist">Sapu Berita</span></div>
    <div style="font:700 46px/1.12 Geist;letter-spacing:-0.02em">${title}</div>
    <div style="font:400 22px/1.45 Geist;margin-top:18px;color:rgb(104 88 68)">${sub}</div>
  </div>
  ${shots.map((s) => `<img src="${img(s)}" style="height:680px;border-radius:28px;box-shadow:0 18px 50px rgb(60 40 10 / 0.25)">`).join('')}
</div>`, CREAM);
await shoot(join(store, 'screenshot-2-phone.png'), 1280, 800,
  phones('Artikelnya saja.', 'Iklan, “Baca Juga” dan pop-up hilang. Halaman 2, 3 dan seterusnya digabung jadi satu.', ['phone-light.png', 'phone-dark.png']));
await shoot(join(store, 'screenshot-3-settings.png'), 1280, 800,
  phones('Atur sesukamu.', 'Ukuran huruf, jenis huruf, terang atau gelap. Bagian yang salah bisa kamu perbaiki sendiri.', ['phone-settings.png']));

await browser.close();
