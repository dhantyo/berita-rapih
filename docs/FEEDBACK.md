# Feedback, the article editor, and personal rules (design)

Status: built (0.6). This is the contract the implementation follows; update it when a decision changes.

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

Opens on the **original page** with overlays (drawn in the reader's shadow root, page untouched; the reader's masthead is hidden while editing). Code: src/render/editor.ts (screen), editmodel.ts (snap, marks, header sources, note), provenance.ts (matching).

- **Green** (tokens `--ed-green/red/blue`, one set per theme, readable on a light or dark page): leaves the reader takes (paragraphs, captions, photos).
- **Red, struck through**: parts inside the article the reader removes: page text or photos with no counterpart in the clean view (rule `remove`, adblock, drop patterns, user removals), grouped up to the biggest box with no green inside, plus whatever the rule's remove selectors (common + site + adblock) hit inside the article.
- **Blue labels**: header sources: Judul, Penulis, Editor, Tanggal, Foto utama, Logo. A label sits on the visible element whose text equals the shown value (or the element the reader chose); a value no visible element shows appears in the bar as "Penulis: … · dari data halaman" instead.
- No colour: everything else (ignored).

Provenance (decisions): both sides are cut into *leaves* (a text block with no block inside it, or an image). A clean leaf matches a page leaf by text key (`textKey`, as fingerprints), else by the same start / the page block written inside it (a dateline joined into the first paragraph; the dateline is green with it), else, for photos, by "host/path" of any address the image is known by (src, lazy-load attributes, srcset). Exact matches go first, each preferring the page leaf after the previous one, so a twin of the text elsewhere on the page is not taken. The article region is the deepest element holding 80% of the green text; reds are only looked for inside it (and never on header elements). Inline script text (ad slots) is not text.

Interaction:
- **Asli ⇄ Bersih** at the top: Bersih shows the reader with every edit applied; edits apply immediately in both.
- Tap a part: it is selected (outline, four corner handles) and the bottom bar says what it is ("Ikut tampil / Tidak tampil", its short text or "(foto)") with **Masukkan** and/or **Buang**, and **Selesai**. Masukkan on a part the reader had removed drops that removal first, and adds it (stable selector, else a one-off copy in this article) only if it is still missing; Buang on a part the reader had added drops that addition first. A removal is saved as a selector only when that selector picks out exactly this part on the page, else as text fingerprints of its leaves; a pick may not hold more than 60% of the article.
- **Drag a corner** (pointer events, touch works) to resize; on release the selection snaps to the ancestor, descendant or sibling (of it or of its ancestors) whose box, clipped to the visible area, has the highest intersection-over-union with the dragged rectangle (the current element wins ties; nothing below 0.15 overlap). The arrow keys on a focused handle go up/down one level. No Lebih luas / Lebih kecil buttons.
- Header fields: tap the blue chip (Judul, Penulis, Editor, Tanggal), then tap where it is written; its selector is saved in `fields` (anchored on a class or id, with a position among same-tag siblings where needed) and the reader header follows at once. If the official rule already reads the same value, the entry is retired quietly.
- **Lainnya**: **Kembalikan** (confirm first; drops the personal rule and shows the article as the official rule alone makes it) and **Kirim usulan** (opens the report link with a one-line summary and the rule as compact JSON).
- Auto-retire (§4) runs when the editor opens and after every edit, against the article the official rule alone produces (a second pipeline run, made once on demand: `opts.official`).
- Escape closes (cancels a field pick or a pending reset first); the layer is a labelled region, handles and chips are buttons.

## 4. Personal rules (per outlet)

Edits are saved as a **personal rule** for the outlet, merged over the official site rule before extraction:

```ts
interface PersonalRule {
  site: string;            // rule id (or hostname for a new site)
  add: string[];           // selectors: parts to include (placed by page position)
  remove: string[];        // selectors and/or text fingerprints ("t:…", "i:…") of parts to drop
  fields?: { title?: string; byline?: string; editor?: string; date?: string };  // selectors
  newSite?: { domains: string[]; articleUrl: string; body: string[] };          // §5 only
  updated: string;         // ISO date
}
```

- Stored in settings (`personal: PersonalRule[]`, bounded), migrating today's `hidden` / `added` lists into it. Kept out of the shared bookmark cookie (it can grow); on the bookmark it's per subdomain (localStorage).
- Applied in the pipeline (extraction), not only at render: `add` → like lead/trail by page position, `remove` → extra remove selectors / fingerprints, `fields` → read before JSON-LD fallbacks.
  Implementation (src/personal.ts): selector `remove` → the rule's `remove` (`applyPersonal`); fingerprints and `add` act on the finished article (`applyPersonalContent`), in `run()` and again in the overlay whenever the lists change, so the editor and Kembalikan stay instant (a selector removal made after extraction is also hidden in the clean view by matching, `hideMatching`); `fields` → `extractMetadata(doc, fields)`. A `remove` entry starting `t:`/`i:` is a fingerprint, anything else a selector. Old `hidden`/`added` settings are folded into personal rules on load and no longer written.
- **Kirim usulan** sends the rule as JSON in the report (`note`), ready to apply to `rules/sites/<id>.json`.
- **Auto-retire**: an entry whose effect the official rule already has (selector already in its `remove`, part already in the clean view, field already right) is dropped quietly.
- Aa shows "Versi pribadi aktif di situs ini" with **Kembalikan** (reset) when a personal rule exists.

## 5. A new site (bookmark only)

When the bookmark runs on a site without a rule, instead of doing nothing it offers **"Situs ini belum didukung. Coba atur sendiri?"**. It extracts with the generic fallback (Readability), then opens the editor in "new site" mode to fix body, removals and header fields. Saving creates a personal rule with `newSite` (domain = this host's main domain, `articleUrl` = a pattern generalised from this path, `body` = selectors of the kept parts). The bookmark then opens articles on that site with it. **Kirim usulan** sends it as a draft `rules/sites/<id>.json`. The Android app and the extension only run on the sites they list, so this is bookmark-only until the site ships.
