# Settings

What the reader's settings panel holds, where it sits, and which build shows what. The structure was decided on 2026-11-19 and built in the UI sweep. Update this file when the panel changes.

Code: the model is `src/settings.ts`, the panel is `settingsPanel` in `src/render/overlay.ts`, the labels are in `src/render/i18n.ts`, and the styles are in `src/render/styles.ts`.

## How you get there

The reader's top bar holds three things:
- the outlet's logo, a link to its homepage;
- the gear (**Pengaturan**), which opens the panel;
- **Asli**, which shows the original page. A floating **Rapih** button at the bottom right of the screen brings the clean view back.

The panel is a bottom sheet on phones and a popover under the gear on wide screens. On phones it rises from the bottom edge, and you close it with a downward drag, a tap outside it, or ×. The title row stays at the top while the panel scrolls.

## The panel, top to bottom

The panel is ordered by how often each part is used, and every section has a title.

**Header:** Pengaturan · **Masukan** · close. Masukan is the only way into feedback. It opens in the panel's place, and its back arrow returns to settings.

**1. Tampilan**

| Control | Options | Default |
|---|---|---|
| Ukuran teks | A notched slider with five steps, a small A and a large A on either side. Drag it freely and it glides to the nearest notch; the A buttons, a tap on the track and the arrow keys glide too. The article resizes while you drag. | step 3 of 5 |
| Jenis huruf | Sans · Serif · Jelas, each label in its own font | Sans |
| Tema | Otomatis · Terang · Sepia · Gelap, each with a colour swatch. Changing it crossfades in browsers with View Transitions. | Otomatis |

**2. Di dalam artikel**: switches in the order the parts appear in an article. All are on by default and shown in every build.
- Foto utama
- Kotak ringkasan
- Tampilkan link
- Putar media di dalam artikel
- Catatan di akhir artikel

**3. Situs ini · kompas.com**: the hostname without `www.` or `m.`.
- **Atur isi artikel** opens the editor.
- **Kembalikan** resets your own edits for this site, with the line "Perubahan buatanmu sedang dipakai di situs ini". It only shows when you have edits here; the first tap asks, the second resets.

**4. Umum**

| Switch | Default | Shown in |
|---|---|---|
| Buka otomatis | on | extension, Android |
| Sembunyikan bar saat menggulir: the bar follows the scroll | off | all |
| Kirim perubahan ke pengembang | off | all |

**5. Lainnya**
- **Bahasa:** Indonesia · English, on one row.
- **Update otomatis** (extension, Android, on). Its hint depends on the build: "Perbaikan situs, sekali sehari. Versi baru datang lewat store" for a store install, and "Versi baru dan perbaikan situs, sekali sehari" for a hand install or the Android app.
- **Links:** Tentang Berita Rapih · Privasi · Apa yang baru. The install page, the privacy page, and the GitHub release notes.
- **The version:** "Berita Rapih 0.x.y".

## How the controls behave

- **Pickers:** one quiet track; the chosen option is raised, and that highlight slides to a new choice. Each picker is one Tab stop, and the arrow keys change the choice.
- **Switches:** outlined when off and ochre when on, with a white knob that slides. The whole row is the tap target.
- **Ochre** marks Sapu's own state: switches that are on, the slider fill and its notches, the progress line, focus rings, the editor's selection, and the broom.
- **Hover effects** only apply where a mouse can hover. On touch, a row gets a soft fill while pressed. Buttons don't shrink when pressed.
- **Keyboard:** Tab stays inside the open panel, and Escape closes it and returns focus to the gear.
- **Reduced motion:** with it on, everything changes instantly.

## Which build shows what

| Build | Not shown | Settings stored in |
|---|---|---|
| Extension (store or hand install) | nothing | extension storage, shared by every site |
| Android app | nothing | the app's storage |
| Bookmark and iOS Shortcut (`forceOpen`, `selfUpdating`) | Buka otomatis, Update otomatis | per outlet: a cookie on the outlet's main domain, plus localStorage. Each outlet starts from the defaults |

The bookmark always opens the clean view when tapped, so it has no "Buka otomatis". It also loads the newest core on every tap, so it has no "Update otomatis".

## Reached from the panel, not settings themselves

- **Masukan:** four choices.
  - **Atur isi artikel** opens the editor.
  - **Laporkan masalah** offers chips and a note.
  - **Usulkan situs**.
  - **Ide atau saran**.
- **Atur isi artikel (editor):**
  - It opens on Bersih; new-site mode starts on the page. The first switch to Asli scrolls to the article.
  - Pick a part, then choose Isi artikel, Bukan isi artikel, or "Jadikan sebagai" Judul · Penulis · Tanggal · Foto utama.
  - When it closes with changes, it asks once whether to send them, and that answer sets "Kirim perubahan ke pengembang".
  - A short note at the bottom says when edits were sent, or that they couldn't be.

## Stored but not shown

- `sendEditsAsked`: whether the one-time send question was answered. Touching the switch counts as an answer.
- `personal`: the reader's own rules per outlet, made in the editor (`src/personal.ts`).
- `hidden`, `added`: lists from before 0.6, read once, folded into `personal`, then never written again.

## Left out on purpose

- **A per-site on/off switch, in the panel or the popup.** Nobody asked for it, and Buka otomatis plus the Rapih button already cover "not here". Add it if feedback asks.
- **A list of every site with the reader's own edits.** Each site's Kembalikan is enough for now.

## The extension's toolbar popup

Code: `src/entries/popup.ts`, `ext-offer.ts`, `offer.ts`, `background.ts`.

- **On a supported site:** "Situs ini didukung Berita Rapih." with **Buka tampilan bersih** and **Pengaturan**, which opens the reader with this panel. On a page there that isn't an article, it says so.
- **On another site, if the page looks like a news article** (`src/looks-like-article.ts`: JSON-LD, og:type with a publish time, or a body of long paragraphs):
  - **Coba Berita Rapih di halaman ini** reads it as a new site and opens the editor.
  - **Sarankan situs ini** opens the feedback form for that site.
- **On anything else:** it says the page isn't an article, or that it can't run there (the browser's own pages).
- **Always: "Tawarkan Berita Rapih di situs berita lain"** (off by default). This switch lives in the popup, not in this panel, because only an extension page may ask the browser for permissions.
  - Turning it on asks for access to all sites. A tiny check then offers the reader, by itself, on articles from sites without a rule. Its card has **Jangan tawarkan di situs ini**.
  - Silenced sites are listed under the switch, each with a way to undo it.
  - Turning it off removes the check and gives the access back.
- Stored in extension storage under `offer` (`{ on, silenced }`), apart from the reader's settings.

The Android app's home screen has **Kirim masukan** (the feedback form), for feedback without an article open.
