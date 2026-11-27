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
  <div style="display:flex;align-items:center;gap:14px">${mark(56)}<span style="font:700 34px/1 Geist;letter-spacing:-0.02em">Berita Rapih</span></div>
  <div style="font:600 25px/1.25 Geist;letter-spacing:-0.01em;max-width:340px">Beritanya saja.<br>Tanpa berantakan.</div>
</div>`, CREAM));

// Screenshots, 1280×800.
await shoot(join(store, 'screenshot-1-desktop.png'), 1280, 800, page(1280, 800, `<img src="${img('desktop.png')}" width="1280" height="800">`));
const phones = (title: string, sub: string, shots: string[]) => page(1280, 800, `
<div style="height:100%;display:flex;align-items:center;justify-content:space-between;gap:56px;padding:0 80px">
  <div style="flex:1;max-width:560px">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:28px">${mark(40)}<span style="font:700 24px/1 Geist">Berita Rapih</span></div>
    <div style="font:700 46px/1.12 Geist;letter-spacing:-0.02em">${title}</div>
    <div style="font:400 22px/1.45 Geist;margin-top:18px;color:rgb(104 88 68)">${sub}</div>
  </div>
  ${shots.map((s) => `<img src="${img(s)}" style="height:680px;border-radius:28px;box-shadow:0 18px 50px rgb(60 40 10 / 0.25)">`).join('')}
</div>`, CREAM);
await shoot(join(store, 'screenshot-2-phone.png'), 1280, 800,
  phones('Satu artikel, satu halaman.', 'Halaman 2, 3, dan seterusnya langsung digabung jadi satu. Iklan dan pop-up ikut dibuang.', ['phone-light.png', 'phone-dark.png']));
await shoot(join(store, 'screenshot-3-settings.png'), 1280, 800,
  phones('Atur sesukamu.', 'Ukuran dan jenis huruf, lalu tema terang, sepia, atau gelap. Semuanya ada di tombol roda gigi.', ['phone-settings.png']));
await shoot(join(store, 'screenshot-4-editor.png'), 1280, 800,
  phones('Ada yang salah? Perbaiki sendiri.', 'Ketuk bagian artikel, lalu pilih apakah bagian tersebut termasuk isi artikel atau bukan. Hasilnya langsung terlihat.', ['phone-editor.png']));

// GitHub: the README banner (light and dark, at 2x for sharp text) and the repo's social preview.
// The social preview isn't set from the repo: upload docs/store/social-preview.png under Settings → General.
const hi = await browser.newPage({ deviceScaleFactor: 2 });
const shootHi = async (file: string, w: number, h: number, html: string) => {
  await hi.setViewportSize({ width: w, height: h });
  await hi.setContent(html, { waitUntil: 'load' });
  await hi.evaluate(() => document.fonts.ready);
  await hi.screenshot({ path: file, clip: { x: 0, y: 0, width: w, height: h } });
  console.log('wrote', file.replace(ROOT, '').replace(/^[\\/]/, ''));
};
const THEMES = {
  light: { bg: CREAM, ink: INK, muted: 'rgb(104 88 68)', accent: LIDI, ring: 'rgb(60 40 10 / 0.08)', shadow: 'rgb(60 40 10 / 0.22)', shots: ['phone-light.png', 'phone-dark.png'] },
  dark: { bg: 'rgb(22 21 19)', ink: 'rgb(236 233 226)', muted: 'rgb(168 160 146)', accent: 'rgb(222 172 70)', ring: 'rgb(255 255 255 / 0.14)', shadow: 'rgb(0 0 0 / 0.6)', shots: ['phone-dark.png', 'phone-light.png'] },
};
/** Name and pitch on the left, two phones on the right that run off the bottom edge. */
const banner = (w: number, h: number, t: (typeof THEMES)['light'], phoneH: number, top: number) => page(w, h, `
<div style="position:relative;height:100%;color:${t.ink}">
  <div style="position:absolute;left:72px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;max-width:560px">
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:30px">${mark(60)}<span style="font:700 40px/1 Geist;letter-spacing:-0.025em">Berita Rapih</span></div>
    <div style="font:700 54px/1.06 Geist;letter-spacing:-0.03em">Just the news.<br><span style="color:${t.accent}">None of the mess.</span></div>
    <div style="font:400 22px/1.45 Geist;margin-top:22px;color:${t.muted};max-width:430px">Indonesian news as one clean page. No ads, no pop-ups, every page merged.</div>
  </div>
  ${t.shots.map((s, i) => `<img src="${img(s)}" style="position:absolute;top:${top + i * 44}px;right:${72 + (1 - i) * (phoneH / 2 + 28)}px;height:${phoneH}px;border-radius:30px;box-shadow:0 0 0 1px ${t.ring},0 22px 60px ${t.shadow}">`).join('')}
</div>`, t.bg);
const gh = join(ROOT, 'docs/img');
await shootHi(join(gh, 'banner-light.png'), 1280, 560, banner(1280, 560, THEMES.light, 640, 64));
await shootHi(join(gh, 'banner-dark.png'), 1280, 560, banner(1280, 560, THEMES.dark, 640, 64));
await shoot(join(store, 'social-preview.png'), 1280, 640, banner(1280, 640, THEMES.light, 700, 74));

await browser.close();
