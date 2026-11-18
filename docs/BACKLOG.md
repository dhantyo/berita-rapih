# Backlog

Work queued for the weekly run ([MAINTAINING.md](MAINTAINING.md)). One line per item: what, why, and the source (sheet submission ID, issue number, or "maintainer"). Remove an item once it ships.

## Weekly queue

### First: after 0.7.0 (released 2026-11-18)

1. Done on 2026-11-19: the user uploaded 0.7.0 to the Chrome Web Store with the new description, screenshots and privacy answers. Check it went live.
2. Done on 2026-11-18: Firefox 0.7.0 submitted with its source zip (listing screenshots and description updated); Edge 0.7.0 submitted (in review; privacy tab, screenshots and description updated). Check both went live.
3. **Automatic store uploads (the user creates the keys):** done 2026-11-19: all eight secrets are set. After the first release that uses them, check each store got the new version (the run's Stores summary, then each dashboard).
4. Two weeks after 0.7.0 (from 2026-12-02), if the old Tally sheet is quiet, tell the user the Tally form can be deleted.

### Other items

- **Full UI/UX sweep and design tokens (its own weekly PR; large).** The user wants every surface audited again: the reader, top bar, settings, editor and its sheet, feedback page, new-site card, install page. Parts were built quickly and feel uneven. Source: user, 2026-11-19.
  - Settings: build the target structure in [SETTINGS.md](SETTINGS.md), decided 2026-11-19. It sets section titles, a single feedback entry, a "Situs ini" section with Atur isi artikel and Kembalikan, "Lainnya" with language, "Update otomatis" and links, and tappable size dots. The sweep owns the look and wording, not the grouping. Rewrite the file's 0.7.0 part to match once built.
  - A full redesign is allowed (user, 2026-11-19: "fine with revamping the whole thing if it turns out aesthetic and minimalist"). Present the direction (mock or screenshots of one surface) before rebuilding everything. Keep what works: reading comfort, phone-first layout, the provider logo, the settings that exist.
  - Skills (installed 2026-11-19 in ~/.claude/skills): impeccable for direction, `audit`, `critique` and `extract`; `web-design-guidelines` (Vercel) as the rule checklist in the audit; `emil-design-eng`, `review-animations`, `gestures` and `mobile-native` (Emil Kowalski) for motion, the scroll-following bar, sheets and phone feel. First the audit and critique per surface, written up as a findings list; then `extract` to tokenize; then fix. Update DESIGN.md (and PRODUCT.md if needed) to match.
  - Tokens: `src/render/styles.ts` has 33 custom properties (colours mostly) but about 420 raw `px` values. Move spacing, type sizes and weights, radii, z-index layers and motion durations into tokens, and use them everywhere. The Android app's strings and the install page should follow the same scale.
  - Known findings to include: on desktop, the feedback page replaces the whole reader instead of opening in the same floating panel as settings (bottom sheet on phones, panel on wide screens). Also the editor sheet's misalignment and the scroll-following top bar below. Bundle those small items into this PR if it lands first.
  - Screenshots before and after on phone and desktop, light and dark, in the PR. Retake `docs/img` and the store images if the look changed.
- **Revamp the install page with the Taste skill (`design-taste-frontend`).** `site/index.html`, served at dhantyo.github.io/sapu-berita. The user wants it rebuilt with Taste, not only polished. Source: user, 2026-11-19.
  - Keep its job and its moving parts: install buttons per platform; the `STORE` links (a store without a URL stays hidden); reading `update.json` (`m.form || m.report`, version); the bookmark and Shortcut steps; the link to the privacy page; the visible AI-help note (no model named).
  - The real product is the visual: phone and desktop screenshots of the reader (`docs/img`, retaken by `node tools/screenshots.ts`), not stock photos of people reading.
  - Privacy: no analytics, no third-party requests. Self-host fonts and every image (the page already uses self-hosted Geist). Taste's scripts fetch photos and icons while building; whatever the page uses is committed, and the page loads nothing from other hosts.
  - Indonesian first, in full natural sentences (see MAINTAINING.md), English version as now.
  - Phone first: most visitors arrive from Reddit or a link on a phone. Check at 390px before 1440px.
  - Do it after the app's sweep (above) if that one changes the look, so the screenshots on the page show the new design. Its own PR.
- **Bug (0.7.0): the "send your edits?" question never shows after editing**, and nothing confirms a sent edit. Reproduce first: change a rule in the editor, close it, and check whether `finish()` in `src/render/editor.ts` reaches the ask (the `shape` comparison, `sendEditsAsked`). Then add a short confirmation once an edit is sent, e.g. a toast "Terima kasih, perubahan kamu sudah terkirim", also when sending is already switched on and happens silently. Seen on the extension, installed by hand (Load unpacked) on an older Android phone. It is 0.7.0 in Kiwi 107 (Chromium 107) on Android 6. Lead: Chrome before 114 has no Popover API, so the overlay falls back to z-index (`overlay.ts` ~667) and the question's sheet may be drawn under the reader. Reproduce in Chromium 107 (Playwright can pin an old build). On current desktop Chrome (bookmark) the question does show, so it's specific to old Chromium. The esbuild target is chrome100, so old Chrome is meant to work. Source: user, 2026-11-18.
- **Editor's bottom sheet: the text sits at the far left on wide screens** while the buttons are centred, e.g. the send question ("Kirim perubahan ini ke pengembang?"). Cause: `.ed-bar > *` centres each line with `margin: 0 auto` in a 680px column, but `.ed-q`, `.ed-ask`, `.ed-note` (and `.ed-msg`) come later with `margin: 0 …` and drop the `auto`. Fix: give those `margin-block` only, so every line sits in the same column. Check all the sheet's states (hint, "Bagian ini apa?", reset question, send question) on desktop and phone. Source: user, 2026-11-19.
- **Top bar should follow the scroll, not jump.** With "hide bar" on, it now snaps hidden or shown (`barHiddenAfterScroll` in `src/render/overlay.ts`). Make it slide by the scroll distance: scrolling up by 20px reveals 20px of the bar, as Chrome's address bar on Android does. Translate the bar by a clamped offset (0 to its height) updated from each scroll delta. When scrolling stops, finish to fully shown or hidden. Always fully shown at the top of the article and while a panel is open. Source: user, 2026-11-18.

- **Toolbar button with a popup.** Clicking the extension icon now does nothing (the manifest has no `action`). Give it a small, phone-first popup, like uBlock Origin's but easier to use with a thumb. Mobile Chromium browsers open it as a sheet or page, and Firefox for Android opens it as a tab.
  - On a supported site: open the reader and open settings. No per-site switch (SETTINGS.md, "Left out on purpose").
  - On any other site, only when the page looks like a news article: "Coba Sapu Berita di halaman ini". Never shown on other pages, and nothing appears on any page until the icon is clicked.
    - Clicking the icon grants `activeTab` for that tab (no install warning), so the popup can check the page: JSON-LD `NewsArticle`/`Article`, `og:type` article, and Readability's `isProbablyReaderable` (already a dependency).
    - Not an article: the popup shows only settings. The user's example is DW Indonesia (dw.com/id), an article from an unsupported site.
    - The button runs the reader on that page through `scripting`, then lets the user fix it with the editor and keep it as a personal preset for that domain (`src/personal.ts`).
    - Also offer "Sarankan situs ini" through the feedback form, so popular sites can become built-in.
    - Optional on-page offer, a setting (user, 2026-11-19): "Tawarkan Sapu Berita di situs berita lain", off by default. When on, an article on an unsupported site shows the small offer card by itself, reusing the bookmark's `showNewSitePrompt` (`src/render/newsiteprompt.ts`). When off, the offer is only in the icon's popup.
      - Checking every page needs access to all sites. Put `<all_urls>` in `optional_host_permissions` and request it with `permissions.request` only when the switch is turned on. Then only those users see the browser's "read and change all your data" prompt, and installs stay warning-free.
      - Once granted, `scripting.registerContentScripts` adds a tiny script on all sites that runs the article check and loads nothing else on other pages. Turning the switch off unregisters it and removes the permission.
      - The card needs its own "don't offer on this site" and a link to the switch, so it's easy to silence.
  - Settings can live in the popup too, reusing the overlay's settings panel.
  - Adding `action` and `scripting` changes the manifest, so the stores review it again and Firefox may ask users to accept the new permission. Check what each browser shows.
  - Source: user, 2026-11-18.
- **Kompas: "Lihat Foto" left in the clean view** under photos (the caption's link to the photo gallery). Seen on https://www.kompas.com/food/read/2026/11/18/203014675/10-hidangan-sup-terbaik-di-asia-tenggara-ada-3-dari-indonesia. Source: maintainer.
- **Detik Travel: two paragraphs run together** without a gap ("…PUBG Mobile. Bagi traveler…") on https://travel.detik.com/cerita-perjalanan/d-8758455/hidden-gem-paramotor-di-cikarang-wisatawan-serasa-main-pubg. Probably a `<br>` between them. Source: maintainer.
- **Report button in the Android app.** The app has no way into the feedback page outside the reader. Source: maintainer.
- **Say why extraction failed, in reports.** When the reader can't open an article, the report should carry the reason (`not-article`, `no-body`, blocked…). Source: maintainer.
- **Kontan: wrong or missing logo.** Source: maintainer.
- **Pikiran Rakyat: pages 2+ aren't merged.** The site is behind Cloudflare, so the page fetches fail. Source: maintainer.
- **Firefox listing approved → switch it on:** set `STORE.firefox` in `site/index.html` to https://addons.mozilla.org/firefox/addon/sapu-berita/, add it to README.md and docs/install-android.md, release. Check the AMO status first (`curl -s https://addons.mozilla.org/api/v5/addons/addon/sapu-berita/`). Source: maintainer.
- **Upload new versions to the stores from CI** (Chrome Web Store API, Edge Add-ons API, `web-ext sign`), with their API keys as repository secrets. Source: maintainer.

## Pinned by the user

Leave these alone unless the user asks.

- **Editor and feedback page design polish:**
  - blue source labels can overlap the site's own text;
  - Kompas's main photo isn't marked in the editor.
- **Testing on a real phone** (Android and iPhone).
- **iPhone Shortcut iCloud link.** It needs the user's iPhone: paste `dist/apple-loader.js` into a Shortcut once, then put the link in `site/index.html` (`ICLOUD_SHORTCUT`) and `docs/install-apple.md`.
