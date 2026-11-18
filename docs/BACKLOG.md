# Backlog

Work queued for the weekly run ([MAINTAINING.md](MAINTAINING.md)). One line per item: what, why, and the source (sheet submission ID, issue number, or "maintainer"). Remove an item once it ships.

## Weekly queue

### First: the contributions batch (approved by the user on 2026-11-18 for Friday 2026-11-20)

The user has already agreed to this design. Build all of it in this run, on one branch with one PR, and show screenshots. It's bigger than the usual 1 to 3 items, so it's the only item for this Friday. `[Unreleased]` already holds the install-page redesign (commit cfc6cae, not released yet); it ships with this batch.

1. **One Google Form for all feedback, replacing Tally.**
   - Create it in the user's Google account, using Claude in Chrome (the user's Brave).
   - Fields: kind (report / idea / site request / editor change), url, site, version, platform, note (paragraph), detail (paragraph: the edit as JSON).
   - Link it to a new Google Sheet. Read the `entry.<id>` names from a prefilled link.
   - The app sends with `fetch(…/formResponse, { method: 'POST', mode: 'no-cors', body: FormData })`. If that throws (a page's CSP can block it for the bookmark or the Shortcut), fall back to opening the prefilled `viewform` link in a new tab.
   - The feedback page's Kirim sends directly: no new tab, no screenshots. The user dropped screenshot uploads.
   - Point `SAPU_REPORT_URL` and the daily and weekly task prompts at the new sheet, which you read with the Drive connector. Keep `triage.tsv`. Retire the Tally form only after the first release that uses the new one.
2. **Editor: pick first, then say what it is.**
   - The bar starts with only "Ketuk bagian halaman yang ingin kamu ubah." A tap selects the part, and a sheet asks "Bagian ini apa?":
     - Isi artikel (show it);
     - Bukan isi artikel (remove it);
     - Judul · Penulis · Tanggal · Foto utama.
   - The sheet marks the part's current state. The corner handles for resizing and Batal stay. The "Sumber:" chip row goes.
3. **Editor: picking works in Bersih too, and the selection carries across views.**
   - Tap a block in the clean view to select it. Map it to its source with the existing provenance (`marks.cleanOf` and related).
   - Switching Asli/Bersih keeps the same part highlighted. If it has no counterpart in the other view, the bar says "Bagian ini tidak tampil di versi bersih" (or the reverse).
4. **Asking once whether to send edits.**
   - The first Selesai that has changes asks: "Kirim perubahan ini ke pengembang?" with an explanation, [Kirim] [Tidak usah], and "Pilihan ini bisa kamu ubah kapan saja di Pengaturan."
   - Remember the answer and never ask again. With yes, every later Selesai sends in the background.
   - Add a switch in the settings panel: "Kirim perubahan dari Atur isi artikel".
   - Remove "Kirim usulan" from Lainnya.
5. **A gear icon instead of "Aa"** on the reader's settings button. Update every text that says "Aa → …": the app, the install page, the docs and the store texts.
6. **Indonesian text pass over everything users read in Indonesian:** reader, settings panel, feedback page, editor, update bar, Android app strings, install page, privacy page, store descriptions. Follow the copy rule in MAINTAINING.md ("How we work").
7. **Privacy and stores.**
   - Privacy page (both languages): with the reader's consent, edits send the article link and the edited parts; pressing Kirim on the feedback page sends the reader's note. Nothing else is sent.
   - Chrome Web Store and Edge privacy tabs: tick "Web history" and "Website content". The user does the Chrome dashboard (extensions can't script it). Edge can be done through Brave.
   - Firefox: change the manifest's `data_collection_permissions` to declare `browsingActivity` and `websiteContent` as required, so they appear in Firefox's install prompt. The in-app question still decides whether anything is sent.
8. **New screenshots** showing the gear and the new editor:
   - `docs/img/*` (README and install page);
   - `docs/store/*` (redraw with `node tools/store-assets.ts`);
   - then upload them to the three listings.
9. **Release (MINOR), after the user approves the PR.** Then upload the new package to all three stores.

### Other items

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
