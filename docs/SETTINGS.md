# Settings, as of 0.7.0

A snapshot of what the reader's settings panel holds today, where it sits, and which build shows what. The UI sweep (BACKLOG.md) starts from this; update it when the panel changes.

Code: the model is `src/settings.ts`, the panel is `settingsPanel` in `src/render/overlay.ts`, and the labels are in `src/render/i18n.ts`.

## How you get there

The reader's top bar holds three things:
- the outlet's logo, a link to its homepage;
- the gear (**Pengaturan**), which opens the panel;
- **Asli**, which shows the original page. A floating **Sapu** button there brings the clean view back.

The panel is a bottom sheet on phones (grabber, swipe down to close) and a floating panel on wide screens.

## The panel, top to bottom

**Header:** "Pengaturan", a **Masukan** button (feedback, one tap from the top), and close.

**1. Look** (segmented controls, no group title above them):

| Control | Options (ID / EN) | Default |
|---|---|---|
| Ukuran teks / Text size | A− · five dots · A+ | step 3 of 5 |
| Jenis huruf / Font | Sans · Serif · Jelas (Legible); each label is set in its own font | Sans |
| Tema / Theme | Otomatis · Terang · Sepia · Gelap (Auto · Light · Sepia · Dark), each with a colour swatch | Otomatis |
| Bahasa / Language | Indonesia · English | Indonesia |

**2. Umum / General** (switches, each with a hint line):

| Switch | Hint | Default | Shown in |
|---|---|---|---|
| Buka otomatis / Open automatically | Off: the clean view opens only from the Sapu button | on | extension, Android |
| Cek update / Check for updates | Once a day, for new versions and site fixes | on | extension, Android |
| Sembunyikan bar saat menggulir / Hide the bar while scrolling | The bar comes back when you scroll up | off | all |
| Kirim perubahan dari Atur isi artikel / Send changes from Adjust the article | The parts you change and the article link go to the developer | off | all |

**3. Di dalam artikel / In the article** (switches, in the order they appear in the article):

| Switch | Hint | Default |
|---|---|---|
| Foto utama / Main photo | Under the headline | on |
| Kotak ringkasan / Summary boxes | Ringkasan Berita, Executive Brief and the like | on |
| Tampilkan link / Show links | Off: links read as plain text | on |
| Putar media di dalam artikel / Play media in the article | YouTube, Instagram, TikTok, X, Facebook | on |
| Catatan di akhir artikel / Note at the end of the article | How much was swept, pages merged, the original link | on |

**4. Feedback row:** "Ada masukan?" with **Beri masukan**. This is the same page as the header's Masukan button.

**5. Personal version row** (only on a site where the reader made their own edits): "Perubahan buatanmu sedang dipakai di situs ini" with **Kembalikan**. The first tap asks, the second tap resets.

**6. Version line:** "Sapu Berita 0.7.0".

## Tiers: which build shows what

| Build | Look | Umum | Di dalam artikel | Settings stored in |
|---|---|---|---|---|
| Extension (store or by hand) | all | all four | all | extension storage, shared by every site |
| Android app | all | all four | all | the app's storage |
| Bookmark and iOS Shortcut (`forceOpen`, `selfUpdating`) | all | Sembunyikan bar, Kirim perubahan | all | per outlet: a cookie on the outlet's main domain, plus localStorage. Each outlet starts from the defaults |

The bookmark always opens the clean view when tapped, so it has no "Buka otomatis". It also loads the newest core on every tap, so it has no "Cek update".

In a store install, "Cek update" still fetches the daily site fixes (`rules.json`). It just never shows the "new version" bar, because the store updates the extension. Its hint still mentions new versions.

## Reached from the panel, not settings themselves

- **Masukan (feedback page):** four choices.
  - **Atur isi artikel** opens the editor.
  - **Laporkan masalah** offers chips and a note.
  - **Usulkan situs**.
  - **Ide atau saran**.

  On desktop it replaces the reader instead of opening in the panel; this is noted in the backlog.
- **Atur isi artikel (editor):** pick a part of the page, then choose "Isi artikel", "Bukan isi artikel", or "Jadikan sebagai" Judul · Penulis · Tanggal · Foto utama. Works in both Asli and Bersih. When it closes with changes, it asks once whether to send them. That answer sets "Kirim perubahan…".

## Stored but not shown

- `sendEditsAsked`: whether the one-time send question was answered.
- `personal`: the reader's own rules per outlet, made in the editor (`src/personal.ts`).
- `hidden`, `added`: lists from before 0.6, read once, folded into `personal`, then never written again.

## Planned (in BACKLOG.md, not built yet)

- **Tawarkan Sapu Berita di situs berita lain** (Umum, extension only, off by default). When it's switched on, the extension asks for access to all sites. An article on an unsupported site then shows a small offer card by itself. Switching it off gives the access back.
- **"Jangan tawarkan di situs ini"** on that card, a per-site list. It needs a place in the panel to undo it, for example a list of silenced sites under the switch.
- **Toolbar popup** (extension): open the reader, open settings (the same panel, reused), a switch for the current site, and "Coba Sapu Berita di halaman ini" on article pages of unsupported sites.
- **"Kirim perubahan"** gets a short confirmation when an edit is sent. The setting itself stays as it is.
- **The UI sweep** may regroup or rename anything above. Update this file when it does.

## Notes for the sweep

- The look controls have no group title, while the two switch groups do.
- Feedback appears twice: the header button and the row near the bottom.
- "Kirim perubahan…" sits under Umum, but it belongs with the editor and feedback.
- The text size dots are not a slider. A− and A+ are the only way to change the size.
- "Cek update" reads as if it were about app versions only. In a store install it only fetches site fixes, which most people would want to keep on.
- There is no "about" or link to the install page, privacy page, or changelog. The version line is plain text.
