# Feedback, the article editor, and personal rules (design)

Status: being built (0.6). This is the contract the implementation follows; update it when a decision changes.

## 1. One entry point

The Aa panel has a single row, **"Ada masukan?" → Beri masukan**, replacing the separate Tandai / Pilih di halaman asli / Laporkan rows. It opens a **feedback page** inside the reader (a full view over the article, back arrow to return) with four choices:

| Choice | Goes to |
|---|---|
| **Atur isi artikel** — "Ada yang hilang atau tidak perlu" | The editor (§3) |
| **Laporkan masalah** | Guided report (§2) |
| **Usulkan situs** | Text form prefilled with this site; on an unsupported site (bookmark only) the editor in "new site" mode (§5) |
| **Ide atau saran** | Text form |

## 2. Guided text reports

- Quick chips first (one or more): *Tampilan rusak · Judul/penulis/tanggal salah · Foto/video · Tidak muncul · Lambat · Lainnya*; then a text box ("Ceritakan sedikit", optional).
- Filled automatically and shown to the user before sending (nothing hidden): link, site, Sapu Berita version, platform, theme, text size, font, rule id, pages merged, and why extraction failed when it did.
- Sending opens the report link (`{url} {title} {site} {version} {platform} {note}`; `note` carries chips + text + details). Destination: `SAPU_REPORT_URL` form when set, else the GitHub "Broken article" issue form.
- Screenshots: the reader can't take one; the form (Tally) lets the user attach one.
- Problems that happen when the reader never opens (install, Android links, "Cannot Run Script") are reported from the install page and the Android app with the same form.

## 3. The editor ("Atur isi artikel")

Opens on the **original page** with overlays (drawn in the reader's shadow root, page untouched):

- **Green** (accent-independent green, both themes): content the reader takes.
- **Red, struck through**: parts inside the article the reader removes (rule `remove`, adblock, drop patterns, user removals).
- **Blue labels**: header sources — Judul, Penulis, Editor, Tanggal, Foto utama, Logo — drawn on the page element when one is visible; when the value comes from hidden page data (JSON-LD/meta), the label shows the value with "dari data halaman" instead.
- No colour: everything else (ignored).

Provenance: each block of the clean view is matched back to its source element on the live page by text (same key as Tandai fingerprints) and by the rule's selectors; removed parts are found by applying the rule's `remove` selectors inside the matched body on the live page.

Interaction:
- A toggle at the top: **Asli ⇄ Bersih** (preview the clean view at any time; edits apply immediately).
- Tap a part: toggles it in (green) or out (red). A bottom bar shows the current part with **Masukkan / Buang** and Selesai.
- **Drag the corners** of the selection outline to resize; on release the selection snaps to the element whose box best fits the dragged rectangle (bigger or smaller block). No Lebih luas / Lebih kecil buttons.
- Header fields: tap a blue label (Penulis, Editor, Judul, Tanggal), then tap where it's written on the page; the field is read from there from then on.

## 4. Personal rules (per outlet)

Edits are saved as a **personal rule** for the outlet, merged over the official site rule before extraction:

```ts
interface PersonalRule {
  site: string;            // rule id (or hostname for a new site)
  add: string[];           // selectors: parts to include (placed by page position, like Pilih di halaman asli)
  remove: string[];        // selectors and/or text fingerprints ("t:…", "i:…") of parts to drop
  fields?: { title?: string; byline?: string; editor?: string; date?: string };  // selectors
  newSite?: { domains: string[]; articleUrl: string; body: string[] };          // §5 only
  updated: string;         // ISO date
}
```

- Stored in settings (`personal: PersonalRule[]`, bounded), migrating today's `hidden` / `added` lists into it. Kept out of the shared bookmark cookie (it can grow); on the bookmark it's per subdomain (localStorage).
- Applied in the pipeline (extraction), not only at render: `add` → like lead/trail by page position, `remove` → extra remove selectors / fingerprints, `fields` → read before JSON-LD fallbacks.
- **Kirim usulan** sends the rule as JSON in the report (`note`), ready to apply to `rules/sites/<id>.json`.
- **Auto-retire**: an entry whose effect the official rule already has (selector already in its `remove`, part already in the clean view, field already right) is dropped quietly.
- Aa shows "Versi pribadi aktif di situs ini" with **Kembalikan** (reset) when a personal rule exists.

## 5. A new site (bookmark only)

When the bookmark runs on a site without a rule, instead of doing nothing it offers **"Situs ini belum didukung. Coba atur sendiri?"**. It extracts with the generic fallback (Readability), then opens the editor in "new site" mode to fix body, removals and header fields. Saving creates a personal rule with `newSite` (domain = this host's main domain, `articleUrl` = a pattern generalised from this path, `body` = selectors of the kept parts). The bookmark then opens articles on that site with it. **Kirim usulan** sends it as a draft `rules/sites/<id>.json`. The Android app and the extension only run on the sites they list, so this is bookmark-only until the site ships.
