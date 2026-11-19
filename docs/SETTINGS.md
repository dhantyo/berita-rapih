# Settings

What the reader's settings panel holds, where it sits, and which build shows what. The structure was decided on 2026-11-19 and built in the UI sweep. Update this file when the panel changes.

Code: the model is `src/settings.ts`, the panel is `settingsPanel` in `src/render/overlay.ts`, the labels are in `src/render/i18n.ts`, and the styles are in `src/render/styles.ts`.

## How you get there

The reader's top bar holds three things:
- the outlet's logo, a link to its homepage;
- the gear (**Pengaturan**), which opens the panel;
- **Asli**, which shows the original page. A floating **Sapu** button at the bottom right of the screen brings the clean view back.

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
- **Links:** Tentang Sapu Berita · Privasi · Apa yang baru. The install page, the privacy page, and the GitHub release notes.
- **The version:** "Sapu Berita 0.x.y".

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

- **A per-site on/off switch, in the panel or the popup.** Nobody asked for it, and Buka otomatis plus the Sapu button already cover "not here". Add it if feedback asks.
- **A list of every site with the reader's own edits.** Each site's Kembalikan is enough for now.

## Planned (in BACKLOG.md, not built yet)

- **Tawarkan Sapu Berita di situs berita lain** (Umum, extension only, off by default). It asks for access to all sites only when switched on. Under it: "Situs yang tidak ditawarkan", with a way to undo each.
- **Toolbar popup** (extension): open the reader, open settings (the same panel), and "Coba Sapu Berita di halaman ini" plus "Sarankan situs ini" on article pages of unsupported sites.
- **Offer card** on articles from unsupported sites, only when "Tawarkan…" is on, with "Jangan tawarkan di situs ini".
