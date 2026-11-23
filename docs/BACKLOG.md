# Backlog

Work queued for the weekly run ([MAINTAINING.md](MAINTAINING.md)). One line per item: what, why, and the source (sheet submission ID, issue number, or "maintainer"). Remove an item once it ships.

## Weekly queue

### First: after 0.8.0 (released 2026-11-19)

1. Done on 2026-11-19: Chrome 0.8.0 resent (the release run's upload was refused while 0.7.0 was in review); the API could upload but not publish it until the new permissions were justified, so the user filled in the justifications and submitted it from the dashboard. Check it went live (the store page's "Version" line). Next time a release adds a permission, the user fills in its justification before the release, or the upload stays a draft.
2. Firefox 0.8.0 and Edge 0.8.0 were uploaded automatically on 2026-11-19 and are in review. Check both went live (and that Firefox approved its listing: then switch on `STORE.firefox`, see below).
3. Two weeks after 0.7.0 (from 2026-12-02), if the old Tally sheet is quiet, tell the user the Tally form can be deleted.

### Other items

- **Old Chromium (Kiwi 107): the send question didn't show.** Not reproducible with the Popover API switched off (the question sits on top and can be tapped). Most likely the switch in Pengaturan had already been touched once, which counts as an answer. Since the UI sweep a note says when edits were sent, so this shows on the phone. Close this if the user sees the note on Kiwi. Source: user, 2026-11-18.
- **Pikiran Rakyat: pages 2+ can't be merged.** Cloudflare answers the reader's page=all request with a challenge (403), even from inside the page, and a hidden frame stays on it too. Getting past it would mean defeating bot protection, so don't. Since the UI sweep the article ends with a link to the full page; opening it passes the check and the reader sweeps it. Revisit only if Pikiran Rakyat changes its setup. Source: maintainer.
- **Detik: some paragraphs contain their subhead run into the text** ("Harga tiket dan fasilitas paramotor Cikarang Sebelum menikmati…"). It is in Detik's own text with no break, so there's nothing reliable to split on. Leave unless it turns out to be common. Source: maintainer, 2026-11-19.
- **Extension popup: first real use on a phone.** Kiwi and Edge for Android open the popup as a sheet or page, Firefox for Android as a tab; the permission prompt for "Tawarkan…" also differs per browser. Check each once after 0.8.0 is in the stores. Source: maintainer, 2026-11-19.
- **DW www pages: inline photos are empty.** On www.dw.com the photos in the middle of an article are lazy: until scrolled to, the live page has `<img src="">`, so the clean view shows their caption only (amp.dw.com is fine since the weekly run of 2026-11-20). The URLs survive only as a template (`data-url=".../<id>_${formatId}.jpg"`) in the server HTML and in `window.__APP_STATE__`. Options: a rule option to read images from that template (format 906 is 1110px wide), or send www readers to the amp page. Source: maintainer, 2026-11-20.
- **Firefox listing approved → switch it on:** set `STORE.firefox` in `site/index.html` to https://addons.mozilla.org/firefox/addon/sapu-berita/, add it to README.md and docs/install-android.md, release. Check the AMO status first (`curl -s https://addons.mozilla.org/api/v5/addons/addon/sapu-berita/`). Source: maintainer.
- **Canary: a one-off 5xx from a site fails the whole run.** On 2026-11-23 one Kumparan sample answered HTTP 500 in CI while the other sample passed and it read fine on a rerun. Consider treating a 5xx as a warning, or retrying it once, so the canary only goes red for real breakage (a CI tooling change, so weekly). Source: maintainer, 2026-11-23.

## Pinned by the user

Leave these alone unless the user asks.

- **Editor and feedback page design polish:**
  - blue source labels can overlap the site's own text;
  - Kompas's main photo isn't marked in the editor.
- **Testing on a real phone** (Android and iPhone).
- **iPhone Shortcut iCloud link.** It needs the user's iPhone: paste `dist/apple-loader.js` into a Shortcut once, then put the link in `site/index.html` (`ICLOUD_SHORTCUT`) and `docs/install-apple.md`.
