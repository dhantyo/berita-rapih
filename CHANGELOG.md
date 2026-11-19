# Changelog

Versions follow [semver](https://semver.org): MAJOR.MINOR.PATCH. While the version starts with 0, Sapu Berita is in beta; 1.0.0 is the public launch. Every tag `vX.Y.Z` publishes a GitHub Release built from this file.

The first four releases were published as 0.1.0-beta.1 to beta.4 and renamed on 2026-11-13 to the scheme below; the app files inside those releases still report their original beta names.

## [Unreleased]

- A calmer settings panel: titled sections, text size on a slider, quieter pickers and switches, short hints, and the title stays at the top while you scroll. Feedback has one button, at the top.
- New **Situs ini** section in the settings: **Atur isi artikel** opens from there directly, and Kembalikan sits next to it.
- Language and **Update otomatis** (was "Cek update") moved to a **Lainnya** section at the bottom, with links to the Sapu Berita page, the privacy page and what's new.
- Controls move smoothly: pickers slide to your choice, switches slide, the text-size slider glides to its notches, and changing the theme fades (in browsers that support it).
- With **Sembunyikan bar saat menggulir** on, the top bar now follows your scroll like a phone browser's address bar instead of jumping.
- **Atur isi artikel** opens on the clean view, and its bottom sheet is simpler and lined up with the article. On a computer it says "Klik" instead of "Ketuk". A short note confirms when your changes were sent.
- **Masukan** opens in the same place as the settings, and its back arrow returns there.
- The **Sapu** button over the original page and the offer on unsupported sites moved to the bottom of the screen, clear of the site's own buttons.
- Fixed: toggling a setting near the bottom of the settings no longer scrolls the panel back to the top.
- Fixed: in **Atur isi artikel**, removing a part that only exists in the clean view (like Kompas's "Gabung Kompas.com PLUS" line) now saves, so it stays gone in later articles too. Before, it was hidden for a moment and came back.
- Kompas: the "Terima kasih atas dukungan kepada KOMPAS.com… Gabung Kompas.com PLUS" line at the end of articles is swept.

## [0.7.0] - 2026-11-18

- The install page is simpler: install comes first, with one recommended way per device (Android, iPhone & iPad, computer) and a button for the browser you're using. The extension is now in the Chrome Web Store and Edge Add-ons, including Edge on Android.
- A visible note on the install page that Sapu Berita is made with the help of AI.
- **Atur isi artikel** works the other way round now: tap a part first, then say what it is (article text, not article text, or the title, author, date or main photo). The main photo can now be chosen too.
- You can tap parts in the clean view (Bersih) as well, and what you picked stays picked when you switch between Asli and Bersih.
- The first time you finish with changes, Sapu Berita asks once whether to send them to the developer. A switch in the settings changes the answer later.
- Feedback is sent straight from the article, without opening a form in a new tab. Screenshots are no longer attached.
- The settings button is a gear instead of "Aa".
- Clearer, more natural Indonesian text throughout the app.
- Firefox now lists at install what feedback can carry (the article link and the edited parts); nothing is sent unless you send it.

## [0.6.3] - 2026-11-17

- Feedback goes to a simple form that needs no account (with an optional screenshot), instead of GitHub. Installed copies switch within a day.
- New wording on the install page, in the stores and in the app: "Baca beritanya. Sapu sisanya."

## [0.6.2] - 2026-11-17

- The extension has an icon, and each release now includes packages for the Chrome Web Store, Edge Add-ons and Firefox Add-ons (desktop and Android). Installed from a store, it updates by itself. Privacy page: https://dhantyo.github.io/sapu-berita/privacy.html

## [0.6.1] - 2026-11-16

Editor fixes from trying it as a reader:

- It opens at the article, not at the top of the page (Kompas opened on a screen-high ad). Some sites block page scrolling from scripts; the editor now scrolls a way they can't.
- Tapping a paragraph picks that paragraph. On many sites an invisible wrapper sits over the text, so a tap used to pick the whole article ("Sebagian tampil") with no way to remove it; now the smallest coloured part under your finger is picked.
- *Buang* on the first paragraph of Detik (and other sites whose dateline is joined into it) works; before, it said "Dibuang" but the paragraph stayed.
- What you picked is scrolled above the bottom bar instead of hiding under it.
- Big empty ad slots show as a slim dashed red band instead of a screen of red.
- A picked ad is described in words ("iklan atau bagian tanpa teks") instead of the page's ad code.
- A colour key (Tampil · Dibuang · Sumber judul, penulis, tanggal) in the bar; the row of header sources fades at the edge so it reads as scrollable.
- Aa has a **Masukan** button at the top, next to ✕, so feedback is one tap away.

Back and closing:

- **Back closes what is open** instead of leaving the site: Aa, the feedback page (a sub-page goes back to the four choices first) and the editor. The page address doesn't change.
- On a phone, the Aa tray can be **swiped down** to close; it has a handle at the top.
- The editor's **Selesai** sits in the top bar, next to Asli/Bersih, on phone and desktop alike.

Look:

- The feedback page lists its four choices as rows, like the Aa panel, instead of boxed cards. What a report sends along is folded into one line you can open, and **Kirim** stays at the bottom while you type.
- The editor's bottom bar shows one thing at a time: the hint and colour key, or what you picked with **Buang**/**Tampilkan** and **Batal**. **Lainnya** (Kembalikan, Kirim usulan) is tucked in the corner.
- When the editor opens, the title isn't hidden under the site's own sticky header (Detik, Kompas).

Sites:

- ANTARA on a computer: the "Pewarta / Editor / Copyright" footer and the no-crawling notice no longer show up at the end of the article.

## [0.6.0] - 2026-11-15

- **One place for feedback:** Aa now has a single **Beri masukan** row. It opens a page with four choices: *Atur isi artikel* (the editor, below), *Laporkan masalah* (quick choices plus a note; the details sent along are shown before sending), *Usulkan situs*, and *Ide atau saran*.
- **The editor (Atur isi artikel):** it opens on the original page and paints what the reader takes in green, what it leaves out in red (struck through) and where the title, author, editor, date, main photo and logo come from in blue. Tap a part to select it, then **Masukkan** or **Buang**; drag a corner of the outline to make the selection bigger or smaller (it snaps to the page block that fits). To fix a header, tap its blue chip (Judul, Penulis, Editor, Tanggal) and then tap where it is written on the page. **Asli / Bersih** at the top switches between the page and the clean result at any time. **Kembalikan** goes back to the official rules (after a confirm); **Kirim usulan** sends your rule as a suggestion. Entries the official rule already covers are dropped quietly. This replaces Tandai and Pilih di halaman asli.
- **Your edits become your own version of the site:** parts you hide or add are kept as a personal rule for that outlet and applied when the article is read, ready to be sent as a suggestion. Earlier hides and additions carry over.
- **Set up a site that isn't supported yet (bookmark):** running the bookmark on an unsupported news site now offers *Coba atur sendiri*. The reader makes its best guess, you fix it in the editor, and your bookmark reads that site with your rule from then on. *Kirim usulan* sends it as a draft site rule so it can be added for everyone. (The Android app and the extension only run on supported sites, so this is bookmark-only.)
- **New setting: hide the bar while scrolling** (Aa → Umum). The top bar slides away as you scroll down and comes back when you scroll up. Off by default.
- **Kontan TV** video pages (tv.kontan.co.id/video/…) open in the reader with the video at the top and its description below.

## [0.5.0] - 2026-11-15

- **Eleven new sites:** Kumparan, IDN Times, Sindonews, Jawa Pos, Pikiran Rakyat, Medcom, Kontan (free articles; Kontan Plus stays behind its paywall), Katadata, Media Indonesia, Berita Satu and Kompas TV. Sindonews, Jawa Pos and Pikiran Rakyat articles split over pages are merged into one. On Android, open the Sapu Berita app once after updating to switch the new sites on under "Open by default".
- Articles that a site writes as loose text separated by line breaks, with no paragraphs at all (Sindonews, Medcom), come out as real paragraphs.
- **Logos look right on more sites:** BeritaSatu's no longer turns into a black box in light mode; logos with a cut-out letter (detik Rekomendit, TB News) keep their colours on a small plate instead of losing the letter in dark mode; logos whose pixels a site won't let the reader read (Kompas TV, Kontan) are sized properly instead of tiny; Jawa Pos's logo is loaded from the original file instead of a blurry resized copy.
- **Logos no longer lose their bottom edge** (Viva's descenders, Tirto's baseline): the crop around a logo keeps a pixel of margin, since the edge row can come out too faint to count when the logo is measured.

## [0.4.0] - 2026-11-14

- **Tandai: hide what doesn't belong.** In Aa, tap **Tandai**, then tap the part of the article that shouldn't be there (a promo, a leftover "Baca juga"). Widen or narrow the pick, then **Sembunyikan**: it's hidden straight away and on other articles from that site too. Aa shows how many parts are hidden on the site, with **Tampilkan lagi** to bring them back. After hiding, one tap sends a report with that part's text filled in, so the site rule can be fixed for everyone.
- **Add what's missing, from the original page.** In Aa, tap **Pilih di halaman asli**: the original page shows with a bar at the bottom. Tap the part the clean view left out (a credit box, a photo gallery, a paragraph), widen or narrow the pick, then **Tambahkan**. It appears in the clean view at its place in the article, and parts like it are added on other articles from that site too (Aa shows how many, with **Hapus** to undo). A one-tap report sends its text and where it sits on the page, so the site rule can be fixed for everyone.
- Paragraphs that a site writes as one block with blank lines between them (Tribrata News) become real paragraphs.
- **Reports without a GitHub account:** the Laporkan button and the install page can point at a simple form instead of GitHub (one repository setting, `SAPU_REPORT_URL`; see docs/DEVELOPING.md). Until it's set, reports still go to GitHub.
- **New site: Tribrata News** (tribratanews.polri.go.id), Polri's news portal. On Android, open the Sapu Berita app once after updating: it asks you to switch on the new site under "Open by default".
- **Less data:** opening the photo viewer no longer downloads every photo in the article at full size, only the ones you look at.
- The settings cookie that the bookmark shares across an outlet's sites now holds only what you changed (a few bytes instead of ~260 on every request to that outlet).
- A page description that is itself junk (an app ad) is dropped by the same site rules that clean the article text.

## [0.3.3] - 2026-11-14

- **Settings:** the bookmark and the Shortcut no longer show "Cek update": they always run the newest version, site fixes included. With "Buka otomatis" already gone there, the "Umum" group is hidden in that build.
- The "Otomatis" theme swatch is split at 45° again, now with clean edges (no dark fringe on the light half).
- **Editors printed on the page** are shown when the page data leaves them out: Liputan6 and Merdeka's "Tim Redaksi" card, Bisnis and iNews "Editor :" lines. An editor who is also the author is shown once.
- **Page count:** Liputan6 and Merdeka articles no longer say "merged from 2 (or 5) pages": their sections are all on one page already.

## [0.3.2] - 2026-11-14

- **Liputan6:** the "Jadi Intinya" summary shows as a summary box (and follows the "Kotak ringkasan" switch).

- **The original page goes quiet:** videos the news page plays by itself (video.tribunnews.com's player, autoplaying clips) are paused while the clean view is open, including ones that start later.
- **Video stories:** the "Download aplikasi …" text no longer shows under the title.
- **Video stories on video.tribunnews.com/view/** show their video too (found from the page's main image, which is the video's thumbnail).
- **Photo viewer:** no arrows when there's only one photo, and none on phones, where you swipe.

## [0.3.1] - 2026-11-14

- **"Sapu" button:** on the original page, the button that brings the clean view back is now called "Sapu" and sits top right, exactly where "Asli" is in the reader, with a border so it stands out on any site.
- **Photo viewer:** buttons redrawn in the reader's style; Back (Android's back button, the browser's) closes the viewer instead of leaving the article; the photo no longer shows twice while the viewer closes.
- **Video stories** (video.tribunnews.com and other pages whose data names their video) show their video at the top of the article. The "Download aplikasi …" line is dropped.
- **Tribun:** the "Tribunnews Update" videos inserted into articles (clips about other stories) are gone.
- **Settings, reordered:** "Umum" (open automatically, check for updates), then "Di artikel" in the order things appear on the page: main photo, summary box, links, media, and the end note. "Ringkasan sapuan" is now "Catatan di akhir artikel", with a hint saying what it shows. The bookmark and the Shortcut no longer show "Buka otomatis": running them already opens the clean view, so it did nothing there.
- **Install page:** a new section explains what Sapu Berita is and how it works.

## [0.3.0] - 2026-11-14

- **Videos and posts play in the article:** YouTube, Instagram, TikTok, X and Facebook posts a story quotes now play inside the reader, using each platform's own player. Turn off "Putar media di artikel" in settings to get the old link card back.
- **Photo viewer:** tap a photo to see it full screen with its caption; swipe between the article's photos, pinch or double-tap to zoom, swipe down or tap ✕ to close. Built on [PhotoSwipe](https://photoswipe.com) (MIT).
- **Photo captions** that outlets write as a line under the photo ("… (Foto: dok Instagram …)", set as a heading on Detik) now show as captions instead of headings.
- **New settings:** "Tampilkan link" (off: links inside the article read as plain text) and "Kotak ringkasan" (off: hides the outlet's summary boxes such as Ringkasan Berita and Executive Brief).
- **The outlet logo opens the outlet's homepage** (the regional site for regional articles). "Asli" still opens the original article.
- **Bookmark settings follow you across an outlet:** a change made on news.detik.com now also applies on hot.detik.com, detikJabar and the rest of Detik (likewise for every Tribun regional site). Before, each subdomain started from the defaults. Different outlets still keep separate settings: browsers keep each site's storage apart.
- **Desktop Detik photo stories** (detikHot) open in the reader with all their photos and captions; before, the desktop layout was refused as too short.
- **Install page works again:** since 0.2.3 a typo in the English text stopped the page's script, so its tabs and buttons did nothing.
- **detik Rekomendit** (rekomendit.detik.com) product guides open in the reader, without the shopping cards.
- **Detik's newer layout** (wolipop.detik.com and other sections moving to it): the article is read from its own text block again, so the author credit no longer shows as the first paragraph.

## [0.2.4] - 2026-11-13

- **Bisnis.com:** the "Executive Brief" summary shows as a summary box; the related-links list in the middle of articles is gone; foto.bisnis.com photo stories open, photos included.
- **Author** shows on detikHot and foto.bisnis.com articles whose page data lists the author as "-" or blank.
- Gallery counters ("1 / 4") no longer show as text.

## [0.2.3] - 2026-11-13

Fixes from testing on real phones.

- **Logos:** each outlet shows its own logo again. On phones, Detik and Tribun put a screen-tall ad above the header, which hid the real logo from the finder; regional sites (detikKalimantan, detikJabar, Tribun Jogja) showed Detik's "20D" anniversary image or Tribun's video logo instead. Logos drawn as inline SVG (Tirto, Viva) are now used too, and when a logo's server doesn't allow reading it (Merdeka), the outlet's other logo on the page is tried before falling back to a plate.
- **Editor** shown when the outlet names one (Tribun, Kompas, ANTARA).
- **Datelines** ("Banjarmasin -") run into the first paragraph instead of sitting on their own line (Detik).
- **Tirto:** italic words in titles show as italics, not as `<i>` tags; the publish date shows.
- **iPhone bookmark:** run it from the Bookmarks list; from the address bar Safari refuses with "Cannot Run Script". Install page and Apple guide updated.

## [0.2.2] - 2026-11-13

*Published as 0.1.0-beta.4.*

- Install page, after testing with a first-time iPhone user: Android offers two options (the app, or a Chrome bookmark with nothing to install); the iPhone bookmark setup is three plain steps (copy the link, save this page as a bookmark, edit it); a separate guide explains how to use the bookmark (only on an article page, from the address bar, Asli goes back).

## [0.2.1] - 2026-11-11

*Published as 0.1.0-beta.3.*

- Install page: the browser extension gets its own tab with a direct download and step-by-step install and update instructions.
- Install page and README say plainly that Sapu Berita is built with AI.

## [0.2.0] - 2026-11-11

*Published as 0.1.0-beta.2.*

- **New look:** a modernist sans, Geist, is now Sapu Berita's voice for headlines, text and labels, the same on every device. It's built in, so it shows instantly and offline.
- **Aa → Serif** is now Merriweather and **Aa → Jelas** is Fira Sans (a humanist sans in the tradition of German public signage); both download only when chosen.
- Install page and Android setup use the same type.

## [0.1.0] - 2026-11-11

*Published as 0.1.0-beta.1.*

First public beta.

**Baca berita bersih / Clean reading**
- 16 news sites supported: Detik, Kompas, Tribunnews (including regional sites), CNN Indonesia, CNBC Indonesia, Liputan6, Merdeka, Suara, Okezone, Viva, iNews, JPNN, ANTARA, Republika, Bisnis.com, Tirto.
- Removes ads, "Baca Juga" link lists, share buttons, newsletter and Google News prompts.
- Multi-page articles are merged into one page.
- Editor summaries ("Ringkasan Berita", "Poin Penting", "Baca 10 Detik") are shown as one tidy box.
- Embedded posts that belong to the story (X/Twitter, Instagram, TikTok, YouTube, Facebook) are kept as link cards.
- The outlet's own logo is detected from the site and recoloured for dark mode when needed.
- Settings: text size, font (serif, sans, extra-legible), light, sepia or dark theme, Indonesian or English interface.
- **Updates on its own:** once a day it checks for a new version and shows an Update button in the reader; site fixes arrive without reinstalling. Can be turned off.
- **Laporkan:** report a broken article from the reader, with the link and version filled in.

**Apps**
- **Android:** app that opens only news-site links (Open by default); every other link still goes to your browser.
- **iPhone, iPad, Mac:** a Safari bookmark (one button on Mac) and an Apple Shortcut, both always running the latest version.
- **Install page** on GitHub Pages that shows the right steps for your device.
- **Chrome, Brave, Edge (desktop):** browser extension, loaded unpacked.

**Known limits**
- Tempo (paywall), Kumparan, Sindonews and IDN Times are not supported yet.
- Android: since 30 September 2026, certified phones in Indonesia only install apps from Google-verified developers. Until Sapu Berita's developer registration is done, Android may block installing the APK.
