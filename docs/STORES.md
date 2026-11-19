# Store listings

The extension is listed in three stores. Each store installs it in one click and updates it by itself. Store installs don't show the "update available" bar, because the store already handles updates: `src/entries/extension.ts` detects them by the `update_url` that Chrome and Edge add, and by Firefox, whose installs all come from the store.

| Store | Covers | Cost | Package from each release |
|---|---|---|---|
| Chrome Web Store | Chrome, Brave, Opera, Vivaldi, Kiwi and other Chromium browsers on Android | $5 once | `sapu-berita-extension-X.Y.Z.zip` |
| Microsoft Edge Add-ons | Edge | free | `sapu-berita-extension-X.Y.Z.zip` |
| Firefox Add-ons (AMO) | Firefox on desktop and Android | free | `sapu-berita-firefox-X.Y.Z.zip`, plus `sapu-berita-source-X.Y.Z.zip` as the source |

When a listing goes live, put its URL in `STORE` near the top of the script in `site/index.html` (buttons and mentions for a store without a URL stay hidden), and in README.md and docs/install-android.md. Live now: Chrome Web Store, Edge Add-ons (also on Edge for Android). Firefox: awaiting review.

All three come from the GitHub release assets. Listing images live in `docs/store/` and are redrawn with `node tools/store-assets.ts`, which also draws the extension icons. The privacy policy is at https://dhantyo.github.io/sapu-berita/privacy.html (`site/privacy.html`).

## Updating a listing after a release

Once a store's keys are in the repository secrets (below), the release workflow submits the new package to it by itself. `.github/workflows/stores.yml` runs after every release tag except pre-releases.

It can also be started by hand for an existing release, for example to retry one store after its review finished: **Actions → Stores → Run workflow**, or `gh workflow run stores.yml -f tag=v0.7.0 -f stores=chrome`. Chrome and Edge review it in hours to a few days. Firefox usually signs it within minutes, and a human may review it later.

The APIs only send the package. Description, screenshots and the privacy tabs are still changed by hand in each dashboard, which is only needed when those change. In the Chrome dashboard, save those edits without submitting: the upload then submits them together with the package.

A store without keys is skipped, and its package is uploaded by hand from the release assets as before. A store still reviewing the previous version may refuse the new one. With daily releases that is common and harmless, because the next release catches up, so it shows as a warning on the run and in its summary rather than a failed run. The daily maintenance run reads those warnings and reports the ones that aren't a pending review, such as an expired key.

### Automatic store uploads

Each store needs its own keys, created once by the account owner. Put each value straight into the repository secrets, never in chat or a file: either **Settings → Secrets and variables → Actions → New repository secret** on GitHub, or in a terminal in the repository, `gh secret set NAME`, which asks for the value.

**Chrome Web Store** (about 10 minutes, Google changes these screens often; [fregante's guide with pictures](https://github.com/fregante/chrome-webstore-upload-keys)):
1. At https://console.cloud.google.com, create a project (any name, e.g. `sapu-berita-upload`).
2. **Google Auth Platform → Get started**. Any app name, your email. Audience: **External** (Internal needs a Workspace account). Finish.
3. **Audience → Publish app**, so the status is **In production**. Otherwise the refresh token stops working after 7 days. Google doesn't need to verify an app only you use.
4. **Clients → Create client → Desktop app**. Save the client ID and client secret.
5. Enable the API: https://console.cloud.google.com/apis/library/chromewebstore.googleapis.com → **Enable**.
6. In a terminal: `npx chrome-webstore-upload-keys`. Enter the client ID and secret, sign in with the account that owns the store listing, and continue past "Google hasn't verified this app". It prints the refresh token.
7. Publisher ID: in the Chrome Web Store developer dashboard, the long ID in the address bar after `/devconsole/`.
8. Secrets: `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN`, `CWS_PUBLISHER_ID`.

**Firefox Add-ons:**
1. https://addons.mozilla.org/developers/addon/api/key/ → **Generate new credentials**.
2. Secrets: `AMO_API_KEY` (the "JWT issuer") and `AMO_API_SECRET` (the "JWT secret").

**Edge Add-ons:**
1. Partner Center → **Microsoft Edge → Publish API**. If it offers "enable the new experience", click **Enable**.
2. **Create API credentials**. Copy the client ID and the API key; the key is shown only once.
3. Secrets: `EDGE_CLIENT_ID`, `EDGE_API_KEY`.
4. The key expires after 72 days, and Partner Center emails before it does. To renew: on the same page, **New API key**, then `gh secret set EDGE_API_KEY` with the new one.

The extension IDs (Chrome `cnpcdeijcckcobfngmglmdfgfcdlnglc`, Edge product `52c939f3-79ef-4a25-b7cd-d309ecd843b9`, Firefox `sapu-berita@dhantyo.github.io` from the manifest) are public and live in the workflow itself. Firefox gets the source zip and the reviewer's build notes with every version.

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
> • Ada bagian yang salah? Atur sendiri lewat Pengaturan → Beri masukan → Atur isi artikel, atau kirim masukan langsung dari artikel tersebut
> • Satu tombol untuk kembali ke tampilan asli situs
>
> Bekerja di hampir 30 situs berita besar Indonesia (daftar lengkapnya: https://github.com/dhantyo/sapu-berita#supported-sites). Perbaikan untuk tiap situs datang sendiri setiap hari.
>
> Tanpa akun, tanpa pelacak, dan tanpa server. Semuanya terjadi di perangkatmu. Masukan hanya terkirim kalau kamu sendiri yang mengirimnya. Sapu Berita tidak melewati paywall: yang dirapikan hanya yang memang sudah ditampilkan oleh situsnya.
>
> Kode terbuka (GPL-3.0): https://github.com/dhantyo/sapu-berita
>
> ---
>
> Read the news. Sweep the rest. Sapu Berita turns articles on Indonesian news sites into one clean page: no ads or pop-ups, and articles split over several pages merged into one. No accounts, no tracking; everything runs on your device.

Don't list outlet names in a store description: the Chrome Web Store rejected 0.6.3 for it as keyword spam ("Yellow Argon"). Link to the supported-sites list instead.

**Single purpose** (Chrome):
> Shows articles on Indonesian news sites in a clean reading view, without ads and with all pages merged.

**Permission justifications** (Chrome). When a release adds a permission, fill in its justification on the dashboard before tagging: the API uploads the new version but can't publish it until every permission is justified, and it stays a draft (0.8.0 did).
- `storage`: saves the reader's own settings on their device: text size, font, theme, their own corrections to which parts of an article are shown, and whether they agreed to send those corrections to the developer. Settings themselves are never sent. (Edge has this text since 0.7.0; use it for Chrome too.)
- **Host permissions** (content script on the listed news domains): the reader view runs only on these news sites, to read the article on the page and show it cleaned up. No other site is touched unless the reader opts in (below).
- `activeTab` (since 0.8): when the reader clicks the toolbar button, the popup looks at that one tab to tell whether it is a news article, and offers to tidy it up. Nothing is sent.
- `scripting` (since 0.8): runs that article check, and the reader view itself, in the tab the reader chose from the popup; and, only if the reader turns on "Tawarkan Sapu Berita di situs berita lain", registers the small check that offers the reader view on news articles from sites it doesn't support yet.
- **Optional host permission `<all_urls>`** (since 0.8): asked for only when the reader turns on "Tawarkan Sapu Berita di situs berita lain" in the popup, and given back when they turn it off. Used only for the on-device article check above. Nothing is sent.
- **Remote code:** no. The daily `rules.json` is data (CSS selectors per site), not code.

**Data usage** (Chrome and Edge), since 0.7: tick **Web history** (the article link sent with feedback and with edits) and **Website content** (the parts of the article an edit changes, and what the reader writes on the feedback page). Nothing else. Both are sent only when the reader presses Kirim on the feedback page, or after they agreed once to send edits from Atur isi artikel; they go to the developer's Google Form. Tick all three certifications: no selling, no use beyond the single purpose, no creditworthiness use. The Chrome dashboard is filled in by hand (extensions can't script it); Edge can be done through Brave.

**Firefox data collection:** the manifest declares `data_collection_permissions: { required: ["browsingActivity", "websiteContent"] }` (tools/build.ts), so Firefox lists both at install. The in-app question still decides whether anything is sent. 0.6 declared `["none"]`.
