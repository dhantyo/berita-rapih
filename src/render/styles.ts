// Overlay styles, scoped by Shadow DOM so the site's CSS can't leak in (or ours out).
// Colours use rgb() rather than hex: iOS Shortcuts reportedly chokes on the hash character.
//
// World: an editorial web edition (NYT-grade). Paper and ink, hairline rules, serif for the
// journalism, grey sans for everything that is ours (labels, bylines, controls). One accent,
// lidi ochre (the colour of a sapu lidi), reserved for Sapu marks: progress, active settings,
// the sweep line. Never decoration.

const LIGHT = `
  --bg: rgb(255 255 255); --ink: rgb(18 18 18); --muted: rgb(92 92 92);
  --rule: rgb(0 0 0 / 0.1); --rule-strong: rgb(0 0 0 / 0.26); --chip: rgb(0 0 0 / 0.045);
  --panel: rgb(255 255 255); --accent: rgb(176 122 18); --plate: transparent; --shadow: rgb(0 0 0 / 0.16);
  --text-weight: 400; --text-track: 0em;
  --seg-on: rgb(255 255 255); --control: var(--accent); --control-on: rgb(255 255 255); --thumb: rgb(255 255 255);
  --ed-green: rgb(22 140 76); --ed-red: rgb(204 42 42); --ed-blue: rgb(28 98 214); --ed-on: rgb(255 255 255);`;
const SEPIA = `
  --bg: rgb(247 241 228); --ink: rgb(44 34 22); --muted: rgb(104 88 68);
  --rule: rgb(60 40 10 / 0.12); --rule-strong: rgb(60 40 10 / 0.3); --chip: rgb(60 40 10 / 0.06);
  --panel: rgb(251 247 238); --accent: rgb(160 106 10); --plate: rgb(255 255 255); --shadow: rgb(60 40 10 / 0.2);
  --text-weight: 400; --text-track: 0em;
  --seg-on: rgb(255 253 248); --control: var(--accent); --control-on: rgb(255 255 255); --thumb: rgb(255 255 255);
  --ed-green: rgb(26 128 70); --ed-red: rgb(190 44 36); --ed-blue: rgb(36 94 200); --ed-on: rgb(255 255 255);`;
const DARK = `
  --bg: rgb(18 18 18); --ink: rgb(232 232 230); --muted: rgb(168 168 165);
  --rule: rgb(255 255 255 / 0.12); --rule-strong: rgb(255 255 255 / 0.28); --chip: rgb(255 255 255 / 0.07);
  --panel: rgb(30 30 30); --accent: rgb(222 172 70); --plate: rgb(255 255 255); --shadow: rgb(0 0 0 / 0.5);
  /* Light text on black looks heavier: a touch lighter and looser (Geist is variable; others snap to 400). */
  --text-weight: 370; --text-track: 0.006em;
  --seg-on: rgb(64 64 62); --control: var(--accent); --control-on: rgb(246 246 244); --thumb: rgb(246 246 244);
  --ed-green: rgb(58 196 116); --ed-red: rgb(255 104 92); --ed-blue: rgb(104 164 255); --ed-on: rgb(10 14 24);`;

/* One scale for all of Sapu's chrome (not the article, which is sized in em against the reader's text size).
   Spacing on a 4px grid, radii, chrome type sizes, control heights, motion. */
const SCALE = `
  --sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px; --sp-5: 20px; --sp-6: 24px; --sp-8: 32px;
  --r-sm: 7px; --r-md: 10px; --r-lg: 14px; --r-sheet: 18px; --r-pill: 999px;
  --fs-cap: 12px; --fs-sm: 13px; --fs-ui: 14px; --fs-md: 15px; --fs-lg: 17px;
  --h-ctl: 36px; --h-touch: 44px;
  --dur-1: 140ms; --dur-2: 200ms; --dur-3: 320ms;
  --ease: cubic-bezier(0.2, 0.8, 0.2, 1); --ease-out: cubic-bezier(0.16, 1, 0.3, 1); --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);`;

export const OVERLAY_CSS = `
:host { all: initial; }
.root {
  ${LIGHT}
  ${SCALE}
  /* One modernist voice: Geist sets the journalism and every label (bundled, see render/fonts.ts).
     Pengaturan → Serif swaps the journalism to Merriweather, Pengaturan → Jelas to Fira Sans; labels stay Geist. */
  --sans: "Sapu Geist", -apple-system, BlinkMacSystemFont, "Segoe UI Variable Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --serif: "Sapu Merriweather", Charter, "Iowan Old Style", Georgia, "Noto Serif", serif;
  --legible: "Sapu Fira Sans", Verdana, "Segoe UI", Tahoma, "DejaVu Sans", sans-serif;
  --head: var(--sans);
  --body: var(--sans);
  /* Per-face tuning, so text size 3 looks the same size in every face (x-heights differ). */
  --text-k: 0.95;
  --lead: 1.6;
  --head-lead: 1.08;
  --head-track: -0.028em;
  --sub-track: -0.016em;
  --fs: 19px;
  --narrow: 0px;
  position: fixed; inset: 0; z-index: 2147483647; overflow-y: auto; overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch; scrollbar-color: var(--rule-strong) transparent;
  background: var(--bg); color: var(--ink);
  font: 15px/1.5 var(--sans); -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;
}
.root[data-theme="sepia"] { ${SEPIA} }
.root[data-theme="dark"] { ${DARK} }
@media (prefers-color-scheme: dark) { .root[data-theme="auto"] { ${DARK} } }
/* The editor's layer over the original page (render/editor.ts): same colours and face as the reader. */
.tokens { ${LIGHT} ${SCALE} --sans: "Sapu Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font: 15px/1.5 var(--sans); color: var(--ink); }
.tokens[data-theme="sepia"] { ${SEPIA} }
.tokens[data-theme="dark"] { ${DARK} }
@media (prefers-color-scheme: dark) { .tokens[data-theme="auto"] { ${DARK} } }
.pagepick[hidden] { display: none; }
.root[data-font="serif"] { --body: var(--serif); --head: var(--serif); --text-k: 0.92; --lead: 1.68; --head-lead: 1.16; --head-track: -0.008em; --sub-track: 0em; }
.root[data-font="legible"] { --body: var(--legible); --head: var(--legible); --text-k: 1; --lead: 1.7; --head-lead: 1.14; --head-track: -0.01em; --sub-track: 0em; }
@media (max-width: 600px) { .root { --narrow: 1.5px; } }
.root ::selection { background: color-mix(in srgb, var(--accent) 32%, transparent); }
.root :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }
button { font: inherit; color: inherit; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
button, .switch-row, .nav-row, .seg, .size { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }

/* ── Masthead bar: whose journalism this is, and our two controls ── */
.bar {
  position: sticky; top: 0; z-index: 2; height: 56px; padding: 0 max(16px, env(safe-area-inset-right)) 0 max(16px, env(safe-area-inset-left));
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  background: var(--bg); border-bottom: 1px solid var(--rule);
}
.outlet { display: flex; align-items: center; min-width: 0; color: inherit; text-decoration: none; }
/* Outlet logo. Fitted (pixels analysed): a window cropped to the drawn pixels, sized optically,
   recoloured with a filter only where its own colour wouldn't show on our ground. */
.logo { position: relative; display: block; overflow: hidden; flex: none; }
.logo img { display: block; }
.logo[data-state="pending"] { width: 96px; height: 22px; }
.logo[data-state="pending"] img { visibility: hidden; height: 22px; width: auto; }
.logo[data-state="fitted"] img { position: absolute; max-width: none; transition: filter 160ms var(--ease); }
.logo[data-badge="true"] { border-radius: 6px; }
/* Light and sepia grounds: a logo drawn for a dark header (white lettering) becomes ink. */
.logo[data-on-light="ink"] img { filter: brightness(0); opacity: 0.86; }
/* Dark ground: a logo drawn for a light header (dark lettering) becomes white; light-ground recolouring is undone. */
.root[data-theme="dark"] .logo[data-on-light="ink"] img { filter: none; opacity: 1; }
.root[data-theme="dark"] .logo[data-on-dark="white"] img { filter: brightness(0) invert(1); opacity: 0.92; }
@media (prefers-color-scheme: dark) {
  .root[data-theme="auto"] .logo[data-on-light="ink"] img { filter: none; opacity: 1; }
  .root[data-theme="auto"] .logo[data-on-dark="white"] img { filter: brightness(0) invert(1); opacity: 0.92; }
}
/* A logo with a knocked-out glyph keeps its colours; where its body would vanish it gets a plate of the opposite tone. */
.logo[data-plate-on-light="true"] { background: rgb(24 24 24); box-shadow: 0 0 0 4px rgb(24 24 24); margin: 4px; border-radius: 2px; }
.root[data-theme="dark"] .logo[data-plate-on-dark="true"] { background: rgb(255 255 255); box-shadow: 0 0 0 4px rgb(255 255 255); margin: 4px; border-radius: 2px; }
@media (prefers-color-scheme: dark) {
  .root[data-theme="auto"] .logo[data-plate-on-dark="true"] { background: rgb(255 255 255); box-shadow: 0 0 0 4px rgb(255 255 255); margin: 4px; border-radius: 2px; }
}
/* Plate fallback (server forbids pixel reads): whole logo on the site's own dark header colour, or white in dark themes. */
.logo[data-state="plate"] { display: inline-flex; align-items: center; border-radius: 4px; padding: 3px 0; background: var(--plate); }
.logo[data-state="plate"] img { height: 22px; width: auto; max-width: 210px; object-fit: contain; }
.root[data-theme="sepia"] .logo[data-state="plate"], .root[data-theme="dark"] .logo[data-state="plate"] { padding: 4px 8px; }
@media (prefers-color-scheme: dark) { .root[data-theme="auto"] .logo[data-state="plate"] { padding: 4px 8px; } }
.logo[data-state="plate"][data-plate="dark"] { background: var(--logo-ground, rgb(24 24 24)); padding: 4px 8px; }
.outlet-name { font: 700 18px/1 var(--sans); letter-spacing: -0.025em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.outlet.square { gap: 9px; }
.outlet.square .logo { border-radius: 6px; }
.outlet.square .logo[data-state="plate"] { padding: 0; background: transparent; }
.outlet.square .logo[data-state="plate"] img { height: 30px; }
.outlet.square .outlet-name { font-size: 17px; }
.tools { display: flex; gap: 8px; flex: none; }
.btn {
  height: var(--h-ctl); padding: 0 14px; border-radius: var(--r-pill); border: 1px solid var(--rule-strong); background: transparent;
  font: 600 var(--fs-ui)/1 var(--sans); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  transition: background-color var(--dur-1) var(--ease), border-color var(--dur-1) var(--ease), color var(--dur-1) var(--ease), transform 120ms var(--ease-out);
}
@media (hover: hover) and (pointer: fine) { .btn:hover { background: var(--chip); } }
.nav-row:active, .switch-row:active { background: var(--chip); }
.btn.primary { background: var(--ink); border-color: var(--ink); color: var(--bg); }
@media (hover: hover) and (pointer: fine) { .btn.primary:hover { background: color-mix(in srgb, var(--ink) 84%, var(--bg)); border-color: transparent; } }
.btn.quiet { border-color: transparent; color: var(--muted); }
@media (hover: hover) and (pointer: fine) { .btn.quiet:hover { color: var(--ink); } }
.btn:disabled, .btn[aria-disabled="true"] { opacity: 0.38; cursor: default; pointer-events: none; }
a.btn { color: inherit; text-decoration: none; flex: none; }
a.btn.primary { color: var(--bg); }
.btn[aria-expanded="true"] { border-color: var(--ink); background: var(--chip); }
.gear { width: var(--h-ctl); padding: 0; }
.bar { transition: transform 240ms var(--ease-out); will-change: transform; }
/* While the finger moves, the bar moves with it, without easing. */
.bar.tracking { transition: none; }
.bar[data-hidden] .outlet, .bar[data-hidden] .tools { visibility: hidden; transition: visibility 0s 240ms; }
/* Tucked away, the reading hairline stays at the very top of the screen. */
.bar[data-hidden] .progress { bottom: auto; top: 100%; }
.progress { position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; background: var(--accent); transform-origin: 0 50%; transform: scaleX(0); }

/* ── The article ── */
.column { font-size: calc((var(--fs) - var(--narrow)) * var(--text-k)); width: min(100% - 32px, 34em); margin: 0 auto; padding: 2.2em 0 0; }
h1 {
  margin: 0 0 0.45em; font: 700 clamp(1.6em, 1.1em + 2.3vw, 2.3em)/var(--head-lead) var(--head);
  letter-spacing: var(--head-track); text-wrap: balance;
}
.deck { margin: 0 0 0.9em; font: 400 1.1em/1.42 var(--head); letter-spacing: calc(var(--sub-track) / 2); color: var(--muted); text-wrap: pretty; }
/* Every item carries its "·" in a left gutter; the gutter is clipped, so a wrapped line never starts with a dot. */
.meta { display: flex; flex-wrap: wrap; margin: 0 0 0 -1.4em; clip-path: inset(-0.6em -0.6em -0.6em 1.4em); font: 400 0.74em/1.5 var(--sans); color: var(--muted); font-variant-numeric: tabular-nums; }
.meta .section { color: var(--ink); font-weight: 600; }
/* Each part (section, byline, date) stays whole; the row only breaks at the separators. */
.meta .section, .meta .date, .meta .name { white-space: nowrap; }
.meta > span { position: relative; margin-left: 1.4em; }
.meta > span::before { content: "·"; position: absolute; left: -0.95em; color: var(--rule-strong); }
.hero { margin: 1.4em 0 0; }
.hero img { display: block; width: 100%; height: auto; background: var(--chip); }
/* Photos open the viewer (gallery.ts). */
.hero img, .content img { cursor: zoom-in; }
.content figure[data-embed] img { cursor: pointer; }
.root[data-links="off"] .content a img { pointer-events: auto; }
.pswp { --pswp-bg: rgb(12 12 12); --pswp-icon-color: rgb(245 245 245); --pswp-icon-color-secondary: rgb(30 30 30); font-family: var(--sans); }
/* Viewer controls: the reader's pill buttons, on a dark glass so they read over any photo. */
.pswp__top-bar { height: auto; align-items: center; gap: 8px; padding: max(12px, env(safe-area-inset-top)) max(14px, env(safe-area-inset-right)) 0 max(14px, env(safe-area-inset-left)); }
.pswp .pswp__button, .pswp .pswp__button:hover, .pswp .pswp__button:focus, .pswp .pswp__button:active {
  width: 40px; height: 40px; margin: 0; padding: 0; display: grid; place-items: center; overflow: visible;
  border: 1px solid rgb(255 255 255 / 0.22); border-radius: 20px; background: rgb(22 22 22 / 0.62); color: rgb(245 245 245);
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); box-shadow: 0 4px 14px -6px rgb(0 0 0 / 0.5); opacity: 1;
  transition: background-color 160ms var(--ease), border-color 160ms var(--ease);
}
@media (hover: hover) and (pointer: fine) { .pswp .pswp__button:hover { background: rgb(52 52 52 / 0.78); border-color: rgb(255 255 255 / 0.36); } }
.pswp .pswp__button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.pswp .pswp__button--zoom { display: none; }
.pswp--zoom-allowed .pswp__button--zoom { display: grid; }
.pswp .pswp__icn { position: static; width: 20px; height: 20px; margin: 0; fill: none; color: inherit; transform: none; overflow: visible; }
.pswp .pswp__button--arrow { position: absolute; top: 50%; margin-top: -22px; width: 44px; height: 44px; border-radius: 22px; }
.pswp .pswp__button--arrow--prev { left: max(16px, env(safe-area-inset-left)); }
.pswp .pswp__button--arrow--next { right: max(16px, env(safe-area-inset-right)); left: auto; }
.pswp .pswp__button--arrow .pswp__icn { width: 22px; height: 22px; }
/* Arrows only with more than one photo, and only for a mouse: on touch screens you swipe. */
.pswp.pswp--one-slide .pswp__button--arrow { display: none; }
@media (hover: none), (pointer: coarse) { .pswp .pswp__button--arrow { display: none; } }
.pswp__counter { order: -1; margin: 0 auto 0 0; height: 32px; padding: 0 12px; border-radius: 16px; border: 1px solid rgb(255 255 255 / 0.22);
  background: rgb(22 22 22 / 0.62); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  font: 600 13px/30px var(--sans); font-variant-numeric: tabular-nums; color: rgb(245 245 245); text-shadow: none; opacity: 1; }
.pswp__caption { position: absolute; left: 0; right: 0; bottom: 0; padding: 28px 20px max(18px, env(safe-area-inset-bottom)); margin: 0 auto; max-width: 720px;
  font: 400 14px/1.5 var(--sans); color: rgb(235 235 235); background: linear-gradient(transparent, rgb(0 0 0 / 0.72) 40%); pointer-events: none; }
.pswp__caption[hidden] { display: none; }
.pswp--ui-visible .pswp__caption { opacity: 1; transition: opacity 0.25s; }
.pswp:not(.pswp--ui-visible) .pswp__caption { opacity: 0; }

.content { margin-top: 1.6em; font-family: var(--body); font-weight: var(--text-weight); letter-spacing: var(--text-track); line-height: var(--lead); overflow-wrap: break-word; text-wrap: pretty; }
.root[data-font="legible"] .content { letter-spacing: calc(var(--text-track) + 0.005em); }
.content > :first-child { margin-top: 0; }
.content p, .content div { margin: 0 0 1.05em; }
.content h2, .content h3, .content h4 { font-family: var(--head); line-height: 1.25; letter-spacing: var(--sub-track); margin: 1.7em 0 0.5em; text-wrap: balance; }
.content h2 { font-size: 1.28em; } .content h3 { font-size: 1.12em; }
/* An h4 is text-sized: on a tight heading leading its wrapped lines look cramped next to the paragraphs (Tribun's
   "Berikut rangkuman…" lead-ins), so it takes the text's own leading. */
.content h4 { font-size: 1em; line-height: var(--lead); }
.content a { color: inherit; text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 0.2em; text-decoration-color: var(--rule-strong); }
@media (hover: hover) and (pointer: fine) { .content a:hover { text-decoration-color: var(--accent); } }
.content img, .content picture, .content video { display: block; max-width: 100%; height: auto; margin: 1.6em 0 0.5em; }
.content figure { margin: 1.6em 0; }
.content figure img { margin: 0 0 0.5em; }
.content figure > p, .content figure > div { margin: 0; }
.content figcaption { font: 0.72em/1.45 var(--sans); color: var(--muted); }
.content ul, .content ol { margin: 0 0 1.1em; padding-left: 1.25em; }
.content li + li { margin-top: 0.4em; }
.content li::marker { color: var(--muted); }
.content blockquote { margin: 1.7em 0; padding: 0.9em 0 0.2em; border-top: 2px solid var(--ink); border-bottom: 1px solid var(--rule); font-size: 0.94em; }
.content blockquote > b:first-child { display: block; margin-bottom: 0.55em; font: 700 0.74em/1.3 var(--sans); letter-spacing: 0.04em; text-transform: uppercase; }
.content blockquote > ul { margin-bottom: 0.9em; }
/* Social-post cards: quoted posts are part of the story; static, no third-party scripts. */
.content figure[data-embed] {
  margin: 1.6em 0; padding: 0.85em 1em; border: 1px solid var(--rule); border-radius: 10px;
  font: 0.8em/1.5 var(--sans); color: var(--ink);
}
.content figure[data-embed] figcaption { margin: 0 0 0.45em; font: inherit; color: var(--muted); }
/* Embedded players: the platform's own post, edge to edge in the column; the card underneath waits for "off". */
.content iframe.player { display: block; width: 100%; border: 0; border-radius: 10px; background: var(--chip); }
.root[data-embeds="on"] .content figure[data-embed]:has(iframe.player) { padding: 0; border: 0; }
.root[data-embeds="on"] .content figure[data-embed]:has(iframe.player) > :not(iframe) { display: none; }
.root[data-embeds="off"] .content iframe.player { display: none; }
/* Reader switches: links as plain text, summary boxes hidden. Social-post links always work. */
.root[data-links="off"] .content a:not([data-embed-link]) { color: inherit; text-decoration: none; pointer-events: none; cursor: text; }
.root[data-summaries="off"] .content blockquote[data-summary] { display: none; }
.content figure[data-embed] figcaption b { color: var(--ink); }
.content figure[data-embed] p { margin: 0 0 0.6em; font-size: 1.06em; }
.content figure[data-embed] a[data-embed-link] { display: inline-flex; align-items: center; gap: 4px; font-weight: 600; text-decoration: none; color: var(--ink); }
@media (hover: hover) and (pointer: fine) { .content figure[data-embed] a[data-embed-link]:hover { text-decoration: underline; text-underline-offset: 0.2em; } }
.content figure[data-embed="youtube"] { padding: 0; overflow: hidden; }
.content figure[data-embed="youtube"] a[data-embed-link] { position: relative; display: block; }
.content figure[data-embed="youtube"] img { margin: 0; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; }
.content figure[data-embed="youtube"] .play {
  position: absolute; left: 50%; top: 50%; translate: -50% -50%; padding: 10px; border-radius: 50%;
  color: rgb(255 255 255); background: rgb(0 0 0 / 0.62); fill: currentColor; stroke: none;
}
.content figure[data-embed="youtube"] figcaption { margin: 0; padding: 0.7em 1em; }
.content table { width: 100%; border-collapse: collapse; margin: 1.6em 0; font: 0.78em/1.4 var(--sans); font-variant-numeric: tabular-nums; }
.content td, .content th { padding: 0.5em 0.6em 0.5em 0; border-bottom: 1px solid var(--rule); text-align: left; vertical-align: top; }
.content hr { border: 0; border-top: 1px solid var(--rule); margin: 2em 0; }

.status { display: flex; align-items: center; gap: 10px; margin: 0.4em 0 0; font: 0.74em/1.4 var(--sans); color: var(--muted); }
.spinner { width: 12px; height: 12px; border-radius: 50%; border: 2px solid var(--rule-strong); border-top-color: var(--accent); animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* The rest of the article couldn't be loaded: a quiet notice above the sweep line, linking to the site's full page. */
.unloaded { margin: 2.2em 0 0; padding: 0.8em 0 0; border-top: 2px solid var(--ink); font: 0.8em/1.5 var(--sans); color: var(--ink); }
.unloaded + .sweep { margin-top: 1.6em; }
.unloaded a { display: inline-flex; align-items: center; gap: 4px; color: var(--ink); font-weight: 600; text-decoration: underline; text-decoration-color: var(--rule-strong); text-underline-offset: 0.2em; }
.sweep {
  display: flex; flex-wrap: wrap; align-items: center; gap: 6px 14px; margin: 2.6em 0 0; padding: 1em 0 3.5em;
  border-top: 1px solid var(--rule); font: 0.72em/1.45 var(--sans); color: var(--muted);
}
.sweep .mark { display: inline-flex; align-items: center; gap: 6px; color: var(--ink); font-weight: 600; }
.sweep .mark svg { color: var(--accent); }
.sweep a { margin-left: auto; color: var(--ink); font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; }
@media (hover: hover) and (pointer: fine) { .sweep a:hover { text-decoration: underline; text-underline-offset: 0.2em; } }
.end { height: 3.5em; }
svg { flex: none; }

/* ── Settings panel: a popover under the bar on wide screens, a bottom sheet on phones (docs/SETTINGS.md) ── */
.panel {
  position: fixed; z-index: 3; top: 64px; right: 12px; width: 340px; max-height: calc(100vh - 76px); max-height: calc(100dvh - 76px); overflow-y: auto; overscroll-behavior: contain;
  padding: 0 var(--sp-4) var(--sp-4); box-sizing: border-box; background: var(--panel); color: var(--ink); border: 1px solid var(--rule);
  border-radius: var(--r-lg); box-shadow: 0 16px 40px -8px var(--shadow), 0 2px 6px var(--shadow); scrollbar-width: thin; scrollbar-color: var(--rule-strong) transparent;
  transform-origin: top right; opacity: 0; transform: translateY(-4px) scale(0.97); visibility: hidden;
  transition: opacity 120ms var(--ease), transform 150ms var(--ease-out), visibility 0s linear 150ms;
}
.panel[data-open="true"] { opacity: 1; transform: none; visibility: visible; transition: opacity var(--dur-1) var(--ease), transform var(--dur-2) var(--ease-out); }
@media (max-width: 600px) {
  .panel { top: auto; left: 0; right: 0; bottom: 0; width: auto; max-height: 86vh; max-height: 86dvh; border-width: 1px 0 0; border-radius: var(--r-sheet) var(--r-sheet) 0 0;
    padding-bottom: max(var(--sp-4), env(safe-area-inset-bottom)); opacity: 1; transform: translateY(100%);
    transition: transform 240ms var(--ease-drawer), visibility 0s linear 240ms; }
  .panel[data-open="true"] { transition: transform 340ms var(--ease-drawer); }
}
/* The title stays put while the sheet scrolls. */
.panel-head { position: sticky; top: 0; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: var(--sp-2);
  margin: 0 calc(-1 * var(--sp-4)); padding: var(--sp-3) var(--sp-3) var(--sp-3) var(--sp-4); background: var(--panel); border-bottom: 1px solid var(--rule); }
.panel-head h2 { margin: 0; font: 650 var(--fs-lg)/1.2 var(--sans); letter-spacing: -0.015em; }
.panel-head .head-actions { display: flex; align-items: center; gap: var(--sp-1); }
.panel-head .head-feedback { height: 32px; padding: 0 var(--sp-3); font-size: var(--fs-sm); }
/* The sheet's handle (phones): says "this slides down". */
.panel .grabber { display: none; }
@media (max-width: 600px) {
  .panel-head { padding-top: 22px; }
  .panel .grabber { display: block; position: absolute; left: 50%; top: 8px; width: 36px; height: 4px; margin-left: -18px; border-radius: 2px; background: var(--rule-strong); }
}
.icon-btn { width: var(--h-ctl); height: var(--h-ctl); display: grid; place-items: center; border: 0; border-radius: 50%; background: transparent; cursor: pointer; color: var(--muted);
  transition: background-color var(--dur-1) var(--ease), color var(--dur-1) var(--ease), transform 120ms var(--ease-out); }
@media (hover: hover) and (pointer: fine) { .icon-btn:hover { background: var(--chip); color: var(--ink); } }

/* Sections: a small grey title, then the controls. A hairline only between sections. */
.sec { padding: var(--sp-4) 0 var(--sp-1); }
.sec + .sec { border-top: 1px solid var(--rule); }
.sec-title { margin: 0 0 var(--sp-1); font: 600 var(--fs-cap)/1.3 var(--sans); color: var(--muted); }
.sec-host { font-weight: 400; }
.sec-host::before { content: " · "; }
.field { padding: var(--sp-2) 0; }
.field .label { display: block; margin: 0 0 6px; font: 500 var(--fs-sm)/1.3 var(--sans); color: var(--ink); }
/* A short choice (language) sits on the label's row, like the text size. */
.field.inline { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); }
.field.inline .label { margin: 0; }
.field.inline .seg { flex: 0 1 200px; }
.field.inline .seg button { min-height: 34px; }

/* Text size: a slider with a notch per step, A small on the left and A large on the right. */
.size { display: flex; align-items: center; gap: var(--sp-1); }
.size-btn { flex: none; width: 36px; height: 40px; display: grid; place-items: center; border: 0; border-radius: var(--r-md); background: transparent; cursor: pointer;
  font: 600 13px/1 var(--sans); color: var(--muted); transition: background-color var(--dur-1) var(--ease), color var(--dur-1) var(--ease), transform 120ms var(--ease-out); }
.size-btn.big { font-size: 20px; }
@media (hover: hover) and (pointer: fine) { .size-btn:hover { background: var(--chip); color: var(--ink); } }
.size-btn:disabled { opacity: 0.3; cursor: default; background: transparent; }
.slider { position: relative; flex: 1; height: 40px; }
/* Thumb is 22px: the notches sit between the thumb's centre at each end. */
.ticks { position: absolute; left: 10px; right: 10px; top: 50%; height: 12px; margin-top: -6px; display: flex; justify-content: space-between; pointer-events: none; }
.ticks i { width: 2px; height: 12px; border-radius: 1px; background: var(--rule-strong); }
.ticks i[data-on="true"] { background: var(--control); }
.slider input { -webkit-appearance: none; appearance: none; position: relative; display: block; width: 100%; height: 40px; margin: 0; padding: 0; background: transparent; cursor: pointer; touch-action: pan-y; }
.slider input:focus-visible { outline: none; }
.slider input::-webkit-slider-runnable-track { height: 4px; border-radius: var(--r-pill); background: linear-gradient(to right, var(--control) var(--p), var(--rule-strong) var(--p)); }
.slider input::-moz-range-track { height: 4px; border-radius: var(--r-pill); background: var(--rule-strong); }
.slider input::-moz-range-progress { height: 4px; border-radius: var(--r-pill); background: var(--control); }
.slider input::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 22px; height: 22px; margin-top: -9px; border: 0; border-radius: 50%;
  background: var(--thumb); box-shadow: 0 1px 3px rgb(0 0 0 / 0.3), 0 0 0 1px var(--muted); transition: transform var(--dur-1) var(--ease); }
.slider input::-moz-range-thumb { width: 22px; height: 22px; border: 0; border-radius: 50%; background: var(--thumb); box-shadow: 0 1px 3px rgb(0 0 0 / 0.3), 0 0 0 1px var(--muted); }
.slider input:focus-visible::-webkit-slider-thumb { box-shadow: 0 0 0 2px var(--panel), 0 0 0 4px var(--accent); }
.slider input:focus-visible::-moz-range-thumb { box-shadow: 0 0 0 2px var(--panel), 0 0 0 4px var(--accent); }

/* Segmented control: a quiet track; the chosen option is lifted, not outlined. */
.seg { position: relative; isolation: isolate; display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 2px; padding: 3px; border-radius: var(--r-md); background: var(--chip); }
.seg::before { content: ""; position: absolute; z-index: -1; top: 3px; bottom: 3px; left: 3px; width: calc((100% - 6px - (var(--n) - 1) * 2px) / var(--n));
  border-radius: var(--r-sm); background: var(--seg-on); box-shadow: 0 1px 2px var(--shadow), 0 0 0 1px var(--rule);
  transform: translateX(calc(var(--i) * (100% + 2px))); transition: transform 280ms var(--ease-out); }
.seg button {
  min-height: 40px; padding: 6px 4px; border: 0; border-radius: var(--r-sm); background: transparent; cursor: pointer; color: var(--muted);
  font-size: var(--fs-ui); line-height: 1.1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px;
  transition: background-color var(--dur-1) var(--ease), color var(--dur-1) var(--ease), box-shadow var(--dur-1) var(--ease), transform 120ms var(--ease-out);
}
@media (hover: hover) and (pointer: fine) { .seg button:hover { color: var(--ink); } }
.seg button[aria-checked="true"] { color: var(--ink); font-weight: 600; }
.swatch { flex: none; box-sizing: border-box; width: 18px; height: 18px; border-radius: 50%; border: 1px solid var(--rule-strong); background-clip: padding-box; }
.swatch.split { border: 0; border-radius: 0; }
.swatch.split svg { display: block; }
.swatch.split .ring { stroke: var(--rule-strong); stroke-width: 1; }

/* Switch rows: label, one line of hint, the switch. */
.rows { display: flex; flex-direction: column; }
.switch-row, .personal-row { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); min-height: var(--h-touch); padding: 7px 0; }
.switch-row { cursor: pointer; margin: 0 calc(-1 * var(--sp-2)); padding: 7px var(--sp-2); border-radius: var(--r-md); transition: background-color var(--dur-1) var(--ease); }
.switch-row .text, .nav-row .text, .personal-row .text { font: var(--fs-ui)/1.3 var(--sans); }
.switch-row .hint, .nav-row .hint { display: block; margin-top: 2px; font-size: var(--fs-cap); line-height: 1.35; color: var(--muted); }
.personal-row .text { color: var(--muted); font-size: var(--fs-sm); }
/* Off: an outlined track (3:1 against the panel); on: ink. */
.switch { flex: none; position: relative; box-sizing: border-box; width: 36px; height: 22px; padding: 0; border-radius: var(--r-pill); border: 1.5px solid var(--muted); background: transparent; cursor: pointer;
  transition: background-color var(--dur-2) var(--ease), border-color var(--dur-2) var(--ease), transform 120ms var(--ease-out); }
.switch::after { content: ""; position: absolute; top: 3px; left: 3px; width: 13px; height: 13px; border-radius: 50%; background: var(--muted);
  transition: transform 260ms var(--ease-out), background-color var(--dur-2) var(--ease); }
.switch[aria-checked="true"] { background: var(--control); border-color: var(--control); }
.switch[aria-checked="true"]::after { transform: translateX(14px); background: var(--control-on); box-shadow: 0 1px 2px rgb(0 0 0 / 0.28); }

/* A row that opens something (Atur isi artikel). */
.nav-row { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); width: 100%; min-height: 52px; padding: var(--sp-2) 0; border: 0; background: transparent;
  color: var(--ink); text-align: left; cursor: pointer; border-radius: var(--r-md); transition: background-color var(--dur-1) var(--ease); }
.nav-row { margin: 0 calc(-1 * var(--sp-2)); padding-left: var(--sp-2); padding-right: var(--sp-2); width: calc(100% + 2 * var(--sp-2)); }
.nav-row svg { color: var(--muted); transition: transform var(--dur-1) var(--ease), color var(--dur-1) var(--ease); }
@media (hover: hover) and (pointer: fine) { .nav-row:hover svg { color: var(--ink); transform: translateX(2px); } }

/* The foot: where Sapu Berita lives, and which build this is. */
.panel-foot { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 14px; margin: var(--sp-2) 0 0; font: var(--fs-cap)/1.4 var(--sans); color: var(--muted); }
.panel-foot a { color: var(--ink); text-decoration: none; }
@media (hover: hover) and (pointer: fine) { .panel-foot a:hover { text-decoration: underline; text-underline-offset: 0.2em; } }
.panel-foot .version { margin-left: auto; }

/* Parts the reader removed in the editor. */
.content [data-user-hidden] { display: none !important; }
/* The editor (render/editor.ts): boxes over the page, selection with corner handles, top toggle, bottom bar. */
.ed-boxes { position: fixed; inset: 0; z-index: 2147483640; pointer-events: none; overflow: hidden; }
.ed-boxes[hidden], .ed-sel[hidden], .ed-drag[hidden] { display: none; }
.ed-box { position: absolute; box-sizing: border-box; border: 2px solid var(--c); border-radius: 4px; background: color-mix(in srgb, var(--c) 13%, transparent); }
.ed-box.in { --c: var(--ed-green); }
.ed-box.out { --c: var(--ed-red); background: color-mix(in srgb, var(--c) 16%, transparent); }
.ed-box.out::after { content: ""; position: absolute; left: 4px; right: 4px; top: 50%; height: 0; border-top: 2px solid var(--c); }
/* A big empty red area (an ad slot) shrinks to a band at its top edge instead of covering the page. */
.ed-box.out.slim { border-style: dashed; background: color-mix(in srgb, var(--c) 10%, transparent); }
.ed-box.out.slim::after { display: none; }
.ed-box.src { --c: var(--ed-blue); background: color-mix(in srgb, var(--c) 10%, transparent); }
.ed-label { position: absolute; left: -2px; top: -2px; transform: translateY(-100%); padding: 2px 7px; border-radius: 6px 6px 6px 0; background: var(--ed-blue); color: var(--ed-on); font: 600 12px/1.35 var(--sans); white-space: nowrap; }
.ed-box.low .ed-label { transform: none; border-radius: 4px 0 6px 0; }
.ed-sel { position: fixed; z-index: 2147483647; /* the reader's own layer: later in the DOM, so it draws over the clean view */ box-sizing: border-box; pointer-events: none; border: 2px solid var(--accent); border-radius: 6px; background: color-mix(in srgb, var(--accent) 9%, transparent); box-shadow: 0 0 0 9999px rgb(0 0 0 / 0.12); }
.ed-h { position: absolute; width: 44px; height: 44px; margin: 0; padding: 0; border: 0; background: transparent; pointer-events: auto; touch-action: none; cursor: nwse-resize; }
.ed-h::before { content: ""; position: absolute; left: 50%; top: 50%; width: 16px; height: 16px; margin: -8px 0 0 -8px; box-sizing: border-box; border: 2px solid var(--accent); border-radius: 50%; background: var(--bg); }
.ed-h.tl { left: -22px; top: -22px; } .ed-h.tr { right: -22px; top: -22px; cursor: nesw-resize; }
.ed-h.bl { left: -22px; bottom: -22px; cursor: nesw-resize; } .ed-h.br { right: -22px; bottom: -22px; }
.ed-h:focus-visible::before { outline: 2px solid var(--ink); outline-offset: 2px; }
.ed-drag { position: fixed; z-index: 2147483647; box-sizing: border-box; pointer-events: none; border: 2px dashed var(--accent); background: color-mix(in srgb, var(--accent) 8%, transparent); }
.ed-top { position: fixed; z-index: 2147483647; top: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: space-between; gap: 12px; height: 52px;
  padding: 0 max(14px, env(safe-area-inset-right)) 0 max(14px, env(safe-area-inset-left)); background: var(--panel); border-bottom: 1px solid var(--rule); box-shadow: 0 8px 22px -14px var(--shadow); }
.ed-title { font: 600 15px/1.3 var(--sans); letter-spacing: -0.01em; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ed-seg { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 2px; padding: 3px; border-radius: var(--r-md); background: var(--chip); flex: none; }
.ed-seg button { min-width: 74px; min-height: 34px; padding: 4px 12px; border: 0; border-radius: var(--r-sm); background: transparent; cursor: pointer; color: var(--muted); font: 500 var(--fs-ui)/1.1 var(--sans);
  transition: background-color var(--dur-1) var(--ease), color var(--dur-1) var(--ease), box-shadow var(--dur-1) var(--ease); }
.ed-seg button[aria-checked="true"] { background: var(--seg-on); color: var(--ink); font-weight: 600; box-shadow: 0 1px 2px var(--shadow), 0 0 0 1px var(--rule); }
.ed-bar { position: fixed; z-index: 2147483647; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; gap: 6px; max-height: 60vh; overflow-y: auto;
  padding: 8px max(16px, env(safe-area-inset-right)) max(10px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
  background: var(--panel); border-top: 1px solid var(--rule); box-shadow: 0 -10px 28px -14px var(--shadow); }
.ed-bar > * { width: 100%; max-width: 680px; margin: 0 auto; box-sizing: border-box; }
.ed-line { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.ed-text { margin: 0; padding-top: 4px; min-width: 0; font: 14px/1.4 var(--sans); color: var(--muted); display: flex; flex-direction: column; gap: 2px; }
.ed-what { color: var(--ink); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; }
.ed-state { font: 650 12px/1.3 var(--sans); }
.ed-state { color: var(--ink); }
.ed-state.out, .ed-state.mix { color: var(--muted); }
/* "Bagian ini apa?": two answers side by side, then the header fields as chips. */
.ed-q { margin-block: 2px 0; font: 650 var(--fs-md)/1.3 var(--sans); color: var(--ink); }
.ed-choices { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.ed-choice { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; min-height: 52px; padding: 8px 12px; border: 1px solid var(--rule-strong); border-radius: var(--r-md);
  background: transparent; color: var(--ink); cursor: pointer; text-align: left; font: 600 var(--fs-ui)/1.25 var(--sans);
  transition: background-color var(--dur-1) var(--ease), border-color var(--dur-1) var(--ease); }
@media (hover: hover) and (pointer: fine) { .ed-choice:hover { background: var(--chip); } }
.ed-choice[aria-pressed="true"] { border-color: var(--ink); box-shadow: inset 0 0 0 1px var(--ink); background: var(--chip); }
.ed-choice[aria-pressed="true"] .ed-choice-title::after { content: " \\2713"; }
.ed-choice:disabled { opacity: 0.4; cursor: default; }
.ed-choice-desc { font: 400 var(--fs-cap)/1.3 var(--sans); color: var(--muted); }
.ed-chip:disabled { opacity: 0.4; cursor: default; }
.pagepick[data-mode="clean"] .ed-h { display: none; }
/* The field chips wrap instead of scrolling: four short choices must all be seen. */
.ed-chips.ed-fields { flex-wrap: wrap; overflow: visible; padding-right: 0; -webkit-mask-image: none; mask-image: none; }
.ed-msg { margin-block: 0; font: 600 var(--fs-sm)/1.4 var(--sans); color: var(--ink); }
.ed-live { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); margin: 0; }
.ed-ask { margin-block: 0; font: var(--fs-ui)/1.45 var(--sans); color: var(--ink); }
.ed-note { margin-block: 0; font: var(--fs-sm)/1.4 var(--sans); color: var(--muted); }
.ed-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.ed-bar .btn { color: var(--ink); text-decoration: none; }
.ed-bar .btn.primary { color: var(--panel); }
.ed-sources { display: flex; flex-direction: column; gap: 6px; }
.ed-label-row { display: flex; align-items: center; justify-content: space-between; font: 600 12px/1.3 var(--sans); color: var(--muted); }
.ed-label-row .btn { min-height: 28px; padding: 2px 8px; font-size: 13px; }
.ed-chips { display: flex; flex-wrap: nowrap; align-items: center; gap: 6px; overflow-x: auto; padding-bottom: 2px; scrollbar-width: none; }
.ed-chips-label { flex: none; margin-right: 2px; font: 600 12px/1.3 var(--sans); color: var(--muted); }
.ed-top .ed-done { flex: none; padding: 0 18px; background: var(--ink); border-color: var(--ink); color: var(--panel); }
@media (max-width: 600px) { .ed-top .ed-title { display: none; } }
/* More chips than fit: the right edge fades, so the row reads as scrollable. */
.ed-chips { -webkit-mask-image: linear-gradient(to right, black 85%, transparent); mask-image: linear-gradient(to right, black 85%, transparent); padding-right: 28px; }
.ed-chip { flex: none; display: inline-flex; flex-direction: column; align-items: flex-start; min-height: 34px; padding: 5px 12px; border: 1px solid var(--rule-strong); border-radius: var(--r-pill); background: transparent; color: var(--ink); cursor: pointer; font: 600 var(--fs-sm)/1.25 var(--sans); }
@media (hover: hover) and (pointer: fine) { .ed-chip:hover { background: var(--chip); } }
.ed-chip[aria-pressed="true"] { background: var(--ink); border-color: var(--ink); color: var(--panel); }
.ed-chip-value { font: 400 11px/1.3 var(--sans); opacity: 0.85; }
.ed-chip.static { justify-content: center; cursor: default; border-style: dashed; font-weight: 500; color: var(--muted); }
.root[data-editing] .bar { display: none; }
.root[data-editing] .column { padding-top: 66px; }
.root[data-editing]::after { content: ""; display: block; height: 130px; }
@media (max-width: 600px) { .ed-title { display: none; } }
.update { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 16px; margin: 0 0 28px; padding: 12px 14px; border: 1px solid var(--rule); border-radius: 10px; background: var(--chip); font: 14px/1.4 var(--sans); }
.update .actions { display: flex; align-items: center; gap: 8px; }
.update .later { border: 0; background: none; padding: 6px 4px; color: var(--muted); font: inherit; cursor: pointer; }
@media (hover: hover) and (pointer: fine) { .update .later:hover { color: var(--ink); } }

/* ── Masukan: drawn where the settings panel is (render/feedback.ts), a popover under the bar or a bottom sheet ── */
.feedback { position: fixed; z-index: 4; top: 64px; right: 12px; width: 380px; max-height: calc(100vh - 76px); max-height: calc(100dvh - 76px); box-sizing: border-box;
  overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; background: var(--panel); color: var(--ink);
  border: 1px solid var(--rule); border-radius: var(--r-lg); box-shadow: 0 16px 40px -8px var(--shadow), 0 2px 6px var(--shadow);
  transform-origin: top right; animation: fb-pop 150ms var(--ease-out); }
@keyframes fb-pop { from { opacity: 0; transform: translateY(-4px) scale(0.97); } }
@media (max-width: 600px) {
  .feedback { top: auto; left: 0; right: 0; bottom: 0; width: auto; max-height: 86vh; max-height: 86dvh; border-width: 1px 0 0;
    border-radius: var(--r-sheet) var(--r-sheet) 0 0; animation: fb-sheet 300ms var(--ease-drawer); }
  @keyframes fb-sheet { from { transform: translateY(40px); opacity: 0; } }
}
.fb-bar {
  position: sticky; top: 0; z-index: 1; height: 56px; display: flex; align-items: center; gap: var(--sp-1);
  padding: 0 var(--sp-4) 0 var(--sp-2); background: var(--panel); border-bottom: 1px solid var(--rule);
}
.fb-bar h2 { margin: 0; font: 650 var(--fs-lg)/1.2 var(--sans); letter-spacing: -0.015em; }
.fb-bar .icon-btn { color: var(--ink); }
.fb-body { padding: var(--sp-4) var(--sp-4) max(var(--sp-4), env(safe-area-inset-bottom)); font: var(--fs-md)/1.5 var(--sans); }
.fb-lead { margin: 0 0 14px; font: 14px/1.45 var(--sans); color: var(--muted); }
/* The choices read like the settings panel: rows on hairlines, not boxed cards. */
.fb-choices { display: flex; flex-direction: column; border-top: 1px solid var(--rule); }
.fb-choice {
  display: flex; align-items: center; justify-content: space-between; gap: 14px; width: 100%; min-height: 64px; padding: 14px 4px; text-align: left; cursor: pointer;
  border: 0; border-bottom: 1px solid var(--rule); border-radius: 0; background: transparent; color: var(--ink);
  transition: background-color 160ms var(--ease);
}
@media (hover: hover) and (pointer: fine) { .fb-choice:hover { background: var(--chip); } }
.fb-choice:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
.fb-choice-text { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.fb-choice-title { font: 600 var(--fs-md)/1.3 var(--sans); }
.fb-choice-desc { font: 400 14px/1.35 var(--sans); color: var(--muted); }
.fb-chevron { color: var(--muted); }
.fb-chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 18px; }
.fb-chip {
  min-height: 36px; padding: 0 14px; border-radius: var(--r-pill); border: 1px solid var(--rule-strong); background: transparent; cursor: pointer; color: var(--ink);
  font: 500 var(--fs-ui)/1.2 var(--sans); transition: background-color 160ms var(--ease), border-color 160ms var(--ease);
}
@media (hover: hover) and (pointer: fine) { .fb-chip:hover { background: var(--chip); } }
.fb-chip[aria-pressed="true"] { border-color: var(--ink); background: var(--ink); color: var(--panel); font-weight: 600; }
.fb-field { margin: 0 0 18px; }
.fb-field label { display: block; margin: 0 0 8px; font: 600 12px/1.3 var(--sans); color: var(--muted); }
.fb-text { display: block; width: 100%; box-sizing: border-box; padding: 11px 12px; border: 1px solid var(--rule-strong); border-radius: 10px; background: transparent; color: var(--ink); font: 16px/1.45 var(--sans); resize: vertical; }
.fb-text:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
/* What goes along with a report: one line, opened on request. */
.fb-box { margin: 0 0 8px; border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule); }
.fb-box summary { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 44px; cursor: pointer; list-style: none; font: 500 13px/1.3 var(--sans); color: var(--muted); }
.fb-box summary::-webkit-details-marker { display: none; }
.fb-box summary::after { content: ""; width: 7px; height: 7px; margin-right: 4px; border-right: 1.5px solid currentColor; border-bottom: 1.5px solid currentColor; transform: rotate(45deg) translateY(-2px); transition: transform 160ms var(--ease); }
.fb-box[open] summary::after { transform: rotate(-135deg) translateY(-2px); }
.fb-box .fb-details { padding: 0 0 12px; }
.fb-details { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 4px 12px; margin: 0; font: 13px/1.4 var(--sans); }
.fb-details dt { color: var(--muted); }
.fb-details dd { margin: 0; overflow-wrap: anywhere; }
/* Kirim stays in reach at the bottom while the reader types. */
.fb-send-row { position: sticky; bottom: 0; display: flex; flex-direction: column; align-items: stretch; gap: 8px; margin-top: 12px;
  padding: 14px 0 0; background: linear-gradient(transparent, var(--panel) 22%); }
.btn.fb-send { width: 100%; height: var(--h-touch); font-size: var(--fs-md); text-decoration: none; }
.fb-send-wrap { display: flex; flex-direction: column; gap: 8px; }
.fb-fallback { margin: 0; font: 14px/1.45 var(--sans); color: var(--ink); text-align: center; }
.fb-fallback:empty { display: none; }
.fb-fallback a { color: inherit; font-weight: 600; text-underline-offset: 0.2em; }
.fb-sent { display: flex; flex-direction: column; align-items: flex-start; gap: 14px; }
.fb-sent .fb-lead { color: var(--ink); font-size: 16px; }
.fb-note { margin: 0; font: 13px/1.45 var(--sans); color: var(--muted); text-align: center; }

/* ── A short note over the reader (overlay.ts toast): ink pill at the bottom, then gone ── */
.toast { position: fixed; z-index: 2147483647; left: 50%; bottom: max(24px, calc(env(safe-area-inset-bottom) + 16px)); transform: translateX(-50%);
  display: inline-flex; align-items: center; gap: var(--sp-2); max-width: calc(100vw - 32px); box-sizing: border-box; padding: 11px 18px 11px 14px;
  border-radius: var(--r-pill); background: var(--ink); color: var(--bg); font: 600 var(--fs-ui)/1.3 var(--sans); box-shadow: 0 10px 28px -8px rgb(0 0 0 / 0.45);
  animation: toast-in 280ms var(--ease-out); transition: opacity 220ms var(--ease), transform 220ms var(--ease); }
.toast svg { color: var(--accent); }
.toast.leaving { opacity: 0; transform: translate(-50%, 8px); }
@keyframes toast-in { from { opacity: 0; transform: translate(-50%, 10px); } }

/* ── Floating button while the original page is showing ── */
/* Bottom right, in the thumb's reach and clear of the site's own header controls. Ink with an ochre broom and a white
   ring, so it stands out on light and dark news sites alike. It sits outside the themed root: literal colours. */
.reopen {
  position: fixed; z-index: 2147483647; bottom: max(16px, calc(env(safe-area-inset-bottom) + 12px)); right: max(16px, env(safe-area-inset-right));
  display: inline-flex; align-items: center; gap: 7px; height: 44px; padding: 0 18px 0 14px; cursor: pointer;
  border: 0; border-radius: 22px;
  font: 650 15px/1 "Sapu Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; letter-spacing: -0.01em;
  color: rgb(255 255 255); background: rgb(18 18 18); -webkit-tap-highlight-color: transparent; touch-action: manipulation; -webkit-user-select: none; user-select: none;
  box-shadow: 0 0 0 2px rgb(255 255 255 / 0.9), 0 10px 26px -6px rgb(0 0 0 / 0.5);
  animation: reopen-in 320ms cubic-bezier(0.16, 1, 0.3, 1);
}
.reopen svg { color: rgb(222 172 70); }
@media (hover: hover) and (pointer: fine) { .reopen:hover { background: rgb(40 40 40); } }
.reopen:focus-visible { outline: 2px solid rgb(222 172 70); outline-offset: 4px; }
@keyframes reopen-in { from { opacity: 0; transform: translateY(8px); } }

/* ── The bookmark's offer on a site without a rule: a card at the bottom, led by what it can do ── */
.nsprompt {
  position: fixed; z-index: 2147483647; left: 50%; bottom: max(16px, calc(env(safe-area-inset-bottom) + 12px)); transform: translateX(-50%);
  width: min(420px, calc(100vw - 24px)); box-sizing: border-box; padding: var(--sp-4); border: 1px solid var(--rule); border-radius: var(--r-lg);
  background: var(--panel); color: var(--ink); box-shadow: 0 0 0 1px rgb(255 255 255 / 0.6), 0 16px 40px -8px rgb(0 0 0 / 0.45);
  animation: ns-in 320ms var(--ease-out);
}
@keyframes ns-in { from { opacity: 0; transform: translate(-50%, 12px); } }
.ns-text { margin: 0 0 var(--sp-3); font: 500 var(--fs-ui)/1.45 var(--sans); }
.ns-actions { display: flex; flex-wrap: wrap; gap: var(--sp-2); }
.nsprompt .btn { color: var(--ink); }
.nsprompt .btn.primary { color: var(--panel); }

@media (prefers-reduced-motion: reduce) {
  .nsprompt { animation: none; }
  .panel, .panel[data-open="true"], .btn, .seg button, .switch-row, .nav-row, .fb-choice, .fb-chip, .switch, .switch::after, .size-btn, .icon-btn, .nav-row svg { transition: none; }
  .reopen, .toast, .feedback { animation: none; }
  .bar { transition: none; }
  .panel { transform: none !important; }
  .seg::before { transition: none; }
  .bar[data-hidden] .outlet, .bar[data-hidden] .tools { transition: none; }
  .spinner { animation-duration: 2.4s; }
}
`;
