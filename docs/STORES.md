# Store listings

The extension is listed in three stores. Each store installs it in one click and updates it by itself. Store installs don't show the "update available" bar, because the store already handles updates: `src/entries/extension.ts` detects them by the `update_url` that Chrome and Edge add, and by Firefox, whose installs all come from the store.

| Store | Covers | Cost | Package from each release |
|---|---|---|---|
| Chrome Web Store | Chrome, Brave, Opera, Vivaldi, Kiwi and other Chromium browsers on Android | $5 once | `sapu-berita-extension-X.Y.Z.zip` |
| Microsoft Edge Add-ons | Edge | free | `sapu-berita-extension-X.Y.Z.zip` |
| Firefox Add-ons (AMO) | Firefox on desktop and Android | free | `sapu-berita-firefox-X.Y.Z.zip`, plus `sapu-berita-source-X.Y.Z.zip` as the source |

All three come from the GitHub release assets. Listing images live in `docs/store/` and are redrawn with `node tools/store-assets.ts`, which also draws the extension icons. The privacy policy is at https://dhantyo.github.io/sapu-berita/privacy.html (`site/privacy.html`).

## Updating a listing after a release

Upload the new package in each store's dashboard. Chrome and Edge review it in hours to a few days. Firefox usually signs it within minutes, and a human may review it later. Automating these uploads from CI is possible later, once each store's API keys are in the repository secrets.

## First submission

Each account is the owner's to create. Then:

### Chrome Web Store
1. Register at https://chrome.google.com/webstore/devconsole and pay the one-time $5.
2. **New item** → upload `sapu-berita-extension-X.Y.Z.zip`.
3. **Store listing:**
   - description and category below;
   - language: Indonesian;
   - images: `docs/store/screenshot-*.png`, `promo-440x280.png` as the small promo tile, and the icon from the package.
4. **Privacy:** fill in the single purpose, the permission justifications and the data answers below. Privacy policy URL: the one above.
5. **Distribution:** public, all regions.
6. Submit for review.

### Microsoft Edge Add-ons
1. Register at https://partner.microsoft.com/dashboard/microsoftedge (free).
2. **Create new extension** → upload the same zip.
3. Fill in the same texts and images. Category: News & Weather. Privacy policy: the URL above.
4. Submit.

### Firefox Add-ons
1. Sign in at https://addons.mozilla.org/developers/ (free).
2. **Submit a New Add-on** → **On this site** → upload `sapu-berita-firefox-X.Y.Z.zip`. Tick both **Firefox** and **Firefox for Android**.
3. When asked about source code: **yes**. Upload `sapu-berita-source-X.Y.Z.zip`. Build notes: "Node 22. `npm ci && npm run build`; the add-on is `dist/extension-firefox/`. content.js is an esbuild bundle (not minified) of src/entries/extension.ts. The innerHTML warnings come from bundled libraries: @mozilla/readability, DOMPurify and PhotoSwipe."
4. Fill in the same texts. License: GPL-3.0. Privacy policy: the URL above.

## Listing texts

**Name:** Sapu Berita

**Summary** (132 characters max):
> Baca beritanya, sapu sisanya. Iklan dan pop-up hilang, artikel yang dipecah jadi beberapa halaman digabung jadi satu.

**Category:** News & Weather (Chrome, Edge); Feeds, News & Blogging (Firefox).

**Description:**

> Baca beritanya. Sapu sisanya.
>
> Sapu Berita merapikan artikel di situs berita Indonesia. Begitu kamu membuka artikel, yang tampil hanya beritanya: judul, penulis, foto utama dan isinya, dalam satu halaman.
>
> • Artikel yang dipecah jadi beberapa halaman langsung digabung jadi satu
> • Iklan, pop-up dan video yang menyela hilang, begitu juga daftar link "Baca Juga" di tengah cerita
> • Atur ukuran dan jenis huruf, tema terang, sepia atau gelap
> • Ada bagian yang salah? Atur sendiri lewat Aa → Atur isi artikel, atau kirim masukan
> • Satu tombol untuk kembali ke tampilan asli situs
>
> Bekerja di hampir 30 situs berita besar Indonesia (daftar lengkapnya: https://github.com/dhantyo/sapu-berita#supported-sites). Perbaikan untuk tiap situs datang sendiri setiap hari.
>
> Tanpa akun, tanpa pelacak, tanpa server. Semua terjadi di perangkatmu. Sapu Berita tidak melewati paywall: yang dirapikan hanya yang memang sudah ditampilkan situsnya.
>
> Kode terbuka (GPL-3.0): https://github.com/dhantyo/sapu-berita
>
> ---
>
> Read the news. Sweep the rest. Sapu Berita turns articles on Indonesian news sites into one clean page: no ads or pop-ups, and articles split over several pages merged into one. No accounts, no tracking; everything runs on your device.

Don't list outlet names in a store description: the Chrome Web Store rejected 0.6.3 for it as keyword spam ("Yellow Argon"). Link to the supported-sites list instead.

**Single purpose** (Chrome):
> Shows articles on Indonesian news sites in a clean reading view, without ads and with all pages merged.

**Permission justifications** (Chrome):
- `storage`: saves the reader's own settings (text size, font, theme, and their own corrections to an article's content) on their device.
- **Host permissions** (content script on the listed news domains): the reader view runs only on these news sites, to read the article on the page and show it cleaned up. No other site is touched.
- **Remote code:** no. The daily `rules.json` is data (CSS selectors per site), not code.

**Data usage** (Chrome and Edge): collects no user data in any category. Tick all three certifications: no selling, no use beyond the single purpose, no creditworthiness use.

**Firefox data collection:** none. The manifest declares `data_collection_permissions: { required: ["none"] }`.
