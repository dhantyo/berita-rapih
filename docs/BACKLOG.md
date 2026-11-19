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
- **Pikiran Rakyat: pages 2+ can't be merged.** Cloudflare answers the reader's page=all request with a challenge (403), even from inside the page, and a hidden frame stays on it too. Getting past it would mean defeating bot protection, so don't. Since the UI sweep the article ends with a link to the full page; opening it passes the check and the reader sweeps it. Revisit only if Pikiran Rakyat changes its setup. Source: maintainer.
- **Detik: some paragraphs contain their subhead run into the text** ("Harga tiket dan fasilitas paramotor Cikarang Sebelum menikmati…"). It is in Detik's own text with no break, so there's nothing reliable to split on. Leave unless it turns out to be common. Source: maintainer, 2026-11-19.
- **Extension popup: first real use on a phone.** Kiwi and Edge for Android open the popup as a sheet or page, Firefox for Android as a tab; the permission prompt for "Tawarkan…" also differs per browser. Check each once after 0.8.0 is in the stores. Source: maintainer, 2026-11-19.
- **Firefox listing approved → switch it on:** set `STORE.firefox` in `site/index.html` to https://addons.mozilla.org/firefox/addon/sapu-berita/, add it to README.md and docs/install-android.md, release. Check the AMO status first (`curl -s https://addons.mozilla.org/api/v5/addons/addon/sapu-berita/`). Source: maintainer.

## Pinned by the user

Leave these alone unless the user asks.

- **Editor and feedback page design polish:**
  - blue source labels can overlap the site's own text;
  - Kompas's main photo isn't marked in the editor.
- **Testing on a real phone** (Android and iPhone).
- **iPhone Shortcut iCloud link.** It needs the user's iPhone: paste `dist/apple-loader.js` into a Shortcut once, then put the link in `site/index.html` (`ICLOUD_SHORTCUT`) and `docs/install-apple.md`.
