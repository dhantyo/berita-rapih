# Backlog

Work queued for the weekly run ([MAINTAINING.md](MAINTAINING.md)). One line per item: what, why, and the source (sheet submission ID, issue number, or "maintainer"). Remove an item once it ships.

## Weekly queue

### First: finish the contributions batch (built 2026-11-18, PR weekly/2026-11-18)

Built early, on the user's word, in the session that planned it: the Google Form and its sheet, the pick-first editor, picking in Bersih, the one-time send question with its setting, the gear icon, the Indonesian text pass, the privacy page, the Firefox manifest, the store texts and new screenshots (`node tools/screenshots.ts`, then `node tools/store-assets.ts`). What is left, in order, once the user approves the PR:

1. Merge. Point the repository variable at the new form (not before the merge: master's CI would hand the new template to 0.6 copies, which don't fill `{kind}` and `{detail}`):
   `gh variable set SAPU_REPORT_URL --body 'https://docs.google.com/forms/d/e/1FAIpQLSc9RX8WT8IDwv8vESjdiQTT3RetOp6L2hGphXQMpY-zMLEuDA/viewform?usp=pp_url&entry.1679581615={kind}&entry.1868248012={url}&entry.300525631={site}&entry.368900275={version}&entry.1562198632={platform}&entry.1402800012={note}&entry.909966618={detail}'`
   Then `npm run release -- 0.7.0` (MINOR): the release builds it in and writes it into update.json as `form`.
2. Upload `sapu-berita-extension-0.7.0.zip` to the Chrome Web Store and Edge Add-ons, and `sapu-berita-firefox-0.7.0.zip` (with the source zip) to AMO, with the four new images in `docs/store/`.
3. Store privacy tabs: tick **Web history** and **Website content** (docs/STORES.md). The user does Chrome's; Edge's can be done through Brave.
4. Two weeks after 0.7.0, if the old Tally sheet is quiet, tell the user it can be deleted.

### Other items

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
