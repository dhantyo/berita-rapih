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

## Target structure (decided 2026-11-19, built by the UI sweep)

The panel is reordered by how often each thing is used. Every section gets a title, each thing appears once, and things about the current site sit together. The sweep may change the look and the wording, but not this order or grouping unless it finds a real problem. Changes from 0.7.0 are in *italics*.

**Header:** Pengaturan · Masukan · close. *This is the only feedback entry; the "Ada masukan?" row at the bottom goes.*

**1. Tampilan** *(new section title)*
- **Ukuran teks:** A− · dots · A+. *Each dot can be tapped to jump to that size.*
- **Jenis huruf:** Sans · Serif · Jelas
- **Tema:** Otomatis · Terang · Sepia · Gelap

**2. Di dalam artikel** (unchanged): Foto utama · Kotak ringkasan · Tampilkan link · Putar media · Catatan di akhir artikel

**3. *Situs ini (detik.com)*** *(new)*
- ***Atur isi artikel**: opens the editor directly. Today it hides behind Masukan, yet it's a reading tool as much as a way to send feedback. The Masukan page keeps its own way in.*
- **Kembalikan**: only when the reader has their own edits for this site, with the line "Perubahan buatanmu sedang dipakai di situs ini". *Moved here from the bottom.*

**4. Umum**
- Buka otomatis (extension, Android)
- Sembunyikan bar saat menggulir. *The bar follows the scroll (planned).*
- *Tawarkan Sapu Berita di situs berita lain (planned; extension only, off). It asks for access to all sites only when switched on. Under it, when any exist: "Situs yang tidak ditawarkan" with a way to undo each.*
- Kirim perubahan ke pengembang. *Renamed from "Kirim perubahan dari Atur isi artikel", and it shows "terkirim" after each send (planned). It stays a global switch, so it lives here, not under Situs ini.*

**5. *Lainnya*** *(new, at the bottom)*
- **Bahasa:** Indonesia · English. *Moved down: set once, rarely changed.*
- ***Update otomatis**, renamed from "Cek update". The hint depends on the build: "Perbaikan situs, sekali sehari" for a store install, where the store brings new versions, and "Versi baru dan perbaikan situs, sekali sehari" for a hand install or the Android app. The bookmark keeps hiding it, because it loads the newest version on every tap.* (extension, Android)
- *Links: Halaman Sapu Berita · Privasi · Apa yang baru (the changelog)*, then the version.

**Which build shows what**

| Build | Not shown |
|---|---|
| Extension | nothing |
| Android app | Tawarkan… (the app opens news links by itself) |
| Bookmark / iOS Shortcut | Buka otomatis, Tawarkan…, Update otomatis |

**Left out on purpose:**
- **A per-site on/off switch, in the panel or the popup.** Nobody asked for it, and Buka otomatis plus the Sapu button already cover "not here". Add it if feedback asks.
- **A list of every site with the reader's own edits.** Each site's Kembalikan is enough for now.

## Planned elsewhere (in BACKLOG.md, not built yet)

- **Toolbar popup** (extension): open the reader, open settings (the same panel, reused), and "Coba Sapu Berita di halaman ini" plus "Sarankan situs ini" on article pages of unsupported sites.
- **Offer card** on articles from unsupported sites, only when "Tawarkan…" is on, with "Jangan tawarkan di situs ini".

## Notes from the 0.7.0 panel (what the target fixes)

- The look controls have no group title, while the two switch groups do.
- Feedback appears twice: the header button and the row near the bottom.
- "Kirim perubahan…" sits under Umum, but it belongs with the editor and feedback.
- The text size dots are not a slider. A− and A+ are the only way to change the size.
- "Cek update" reads as if it were about app versions only. In a store install it only fetches site fixes, which most people would want to keep on.
- There is no "about" or link to the install page, privacy page, or changelog. The version line is plain text.
