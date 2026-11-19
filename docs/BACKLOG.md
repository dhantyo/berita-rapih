# Backlog

Work queued for the weekly run ([MAINTAINING.md](MAINTAINING.md)). One line per item: what, why, and the source (sheet submission ID, issue number, or "maintainer"). Remove an item once it ships.

## Weekly queue

### First: after 0.7.0 (released 2026-11-18)

1. Done on 2026-11-19: the user uploaded 0.7.0 to the Chrome Web Store with the new description, screenshots and privacy answers. Check it went live.
2. Done on 2026-11-18: Firefox 0.7.0 submitted with its source zip (listing screenshots and description updated); Edge 0.7.0 submitted (in review; privacy tab, screenshots and description updated). Check both went live.
3. **Automatic store uploads (the user creates the keys):** done 2026-11-19: all eight secrets are set. After the first release that uses them, check each store got the new version (the run's Stores summary, then each dashboard).
4. Two weeks after 0.7.0 (from 2026-12-02), if the old Tally sheet is quiet, tell the user the Tally form can be deleted.

### Other items

- **Old Chromium (Kiwi 107): the send question didn't show.** Not reproducible with the Popover API switched off (the question sits on top and can be tapped). Most likely the switch in Pengaturan had already been touched once, which counts as an answer. Since the UI sweep a note says when edits were sent, so this shows on the phone. Close this if the user sees the note on Kiwi. Source: user, 2026-11-18.
- **Revamp the install page with the Taste skill (`design-taste-frontend`).** `site/index.html`, served at dhantyo.github.io/sapu-berita. The user wants it rebuilt with Taste, not only polished. Source: user, 2026-11-19.
  - Keep its job and its moving parts: install buttons per platform; the `STORE` links (a store without a URL stays hidden); reading `update.json` (`m.form || m.report`, version); the bookmark and Shortcut steps; the link to the privacy page; the visible AI-help note (no model named).
  - The real product is the visual: phone and desktop screenshots of the reader (`docs/img`, retaken by `node tools/screenshots.ts`), not stock photos of people reading.
  - Privacy: no analytics, no third-party requests. Self-host fonts and every image (the page already uses self-hosted Geist). Taste's scripts fetch photos and icons while building; whatever the page uses is committed, and the page loads nothing from other hosts.
  - Indonesian first, in full natural sentences (see MAINTAINING.md), English version as now.
  - Phone first: most visitors arrive from Reddit or a link on a phone. Check at 390px before 1440px.
  - Do it after the app's sweep (above) if that one changes the look, so the screenshots on the page show the new design. Its own PR.

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
- **Tribun "5 Populer Regional": the summary heading renders cramped.** "Berikut rangkuman berita populer regional selengkapnya selama 24 jam terakhir:" shows as a bold block whose two lines sit much tighter than the next heading ("1. Sultan Banten Tolak Badak..."), as if a bold paragraph with a `<br>` became a heading without the heading line height. Check how that block is built on the page and how the clean view classifies it. https://www.tribunnews.com/regional/7913400/5-populer-regional-sultan-banten-tolak-badak-jawa-dipindah-polisi-ajak-tersangka-makan-di-restoran (seen in dark theme, Jelas font). Source: user, 2026-11-19.
- **Kompas: "Lihat Foto" left in the clean view** under photos (the caption's link to the photo gallery). Seen on https://www.kompas.com/food/read/2026/11/18/203014675/10-hidangan-sup-terbaik-di-asia-tenggara-ada-3-dari-indonesia. Source: maintainer.
- **Detik Travel: two paragraphs run together** without a gap ("…PUBG Mobile. Bagi traveler…") on https://travel.detik.com/cerita-perjalanan/d-8758455/hidden-gem-paramotor-di-cikarang-wisatawan-serasa-main-pubg. Probably a `<br>` between them. Source: maintainer.
- **Report button in the Android app.** The app has no way into the feedback page outside the reader. Source: maintainer.
- **Say why extraction failed, in reports.** When the reader can't open an article, the report should carry the reason (`not-article`, `no-body`, blocked…). Source: maintainer.
- **Kontan: wrong or missing logo.** Source: maintainer.
- **Pikiran Rakyat: pages 2+ aren't merged.** The site is behind Cloudflare, so the page fetches fail. Source: maintainer.
- **Firefox listing approved → switch it on:** set `STORE.firefox` in `site/index.html` to https://addons.mozilla.org/firefox/addon/sapu-berita/, add it to README.md and docs/install-android.md, release. Check the AMO status first (`curl -s https://addons.mozilla.org/api/v5/addons/addon/sapu-berita/`). Source: maintainer.

## Pinned by the user

Leave these alone unless the user asks.

- **Editor and feedback page design polish:**
  - blue source labels can overlap the site's own text;
  - Kompas's main photo isn't marked in the editor.
- **Testing on a real phone** (Android and iPhone).
- **iPhone Shortcut iCloud link.** It needs the user's iPhone: paste `dist/apple-loader.js` into a Shortcut once, then put the link in `site/index.html` (`ICLOUD_SHORTCUT`) and `docs/install-apple.md`.
