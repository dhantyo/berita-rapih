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

Code: src/newsite.ts (pure: domain, body from marks, draft rule, prompt decision), src/render/newsiteprompt.ts (the card), editor.ts (`newSite` mode), entries/boot.ts (the flow).

- **The offer.** Only the bookmark / Shortcut build (`forceOpen`). When `run()` says `not-article` because no rule matches the host, and no rule of the reader's own covers it (`needsNewSitePrompt`; a home page of a site already set up is not "unsupported"), a card appears top right, where the Sapu button sits, in its own shadow host: **"Situs ini belum didukung Sapu Berita."** with **Coba atur sendiri** and **Tutup**. No attempt to guess whether the page is an article: the reader ran the bookmark on purpose. The extension and the Android app never pass `forceOpen`, and only run on listed hosts, so they never show it.
- **Coba atur sendiri.** `run()` again with `generic: true`: a synthetic generic rule for the host (`genericRuleFor`, id = hostname) makes the pipeline read the page with Readability. The reader opens and the editor starts at once in new-site mode (title "Atur situs baru", the bar says which site is being set up). Everything in §3 works; the official view ("Bersih" retire, Kembalikan) is the generic article.
- **Selesai** saves the site: `domains` = the host's main domain (last two labels, three under co/ac/or/go/web/my/sch/net/biz.id; no public-suffix list), `articleUrl` = `generalisePath(pathname)`, `body` = a stable selector of the smallest element holding every green part that `stableSelector` (or a plain id) can name (climbing past unnamed boxes), and the red parts inside it that a selector names without hitting any green part are added to `remove`. Field picks stay in `fields`. Stored with `editPersonal` under the hostname. If nothing is green, or no ancestor can be named, the editor stays open and says so. **Escape** abandons the setup and drops what was saved on the way.
- **Next articles.** boot finds the rule with `personalForPage` (a new-site rule for this host), `matchPersonalSite` matches the path, and the reader opens normally; no Readability, the saved selectors extract. Aa shows "Versi pribadi aktif" and **Kembalikan** drops the whole personal rule, the new site included (the offer returns).
- **Kirim usulan** sends a draft `rules/sites/<id>.json` in the note (id = first label of the domain; `name` from og:site_name; `pagination: none`; `samples` = this URL; `verified` = today; notes "Drafted by a reader with Sapu Berita's editor"), then the field picks on a line of their own. Fingerprint removals are left out (they are for one article); removals are trimmed to fit the link. Validated against rules/schema.json in test/newsite.test.ts. Works from the editor before Selesai too (the draft is made from what is green now).
- **Limits.** The rule is per browser origin (localStorage of the subdomain), like every personal rule; the junk Readability left out is not removed by the saved rule unless a selector names it, so a page that needs more should be sent as a suggestion. Live check: tools/live-newsite.ts (era.id).

### Usability notes (from a hands-on pass, 0.6.1)

- A tap picks the smallest coloured part under the finger (geometry first), not the DOM target: pages lay invisible wrappers over their text.
- Removal fingerprints come from the clean view's block (its text can differ from the page's, e.g. a joined dateline).
- Scrolling uses `scrollingElement.scrollTop`, since some pages replace `window.scrollTo`; the opening anchor skips fixed/sticky copies of the headline.
- Red parts taller than 160px without readable text are drawn as a slim dashed band; descriptions ignore scripts and page code.
- The anchor also clears the site's own fixed/sticky header (`coveredTop`: what sits under our top bar), checked again at 900 and 1700 ms because such headers slide in once the page is scrolled; skipped once the reader touches, scrolls or types.
- Bars: the top bar holds the title (hidden at phone width), Asli/Bersih and **Selesai**. The bottom bar shows one state: idle (hint, colour key, *Sumber:* chips, **Lainnya** in the corner) or a pick (description, Buang/Tampilkan, **Batal**). Lainnya and the chips are hidden while something is picked.

### Back (render/backstack.ts)

Each layer (Aa panel, feedback page, editor) owns one history entry (`pushState`, URL unchanged); `popstate` closes the top layer. Closing by a button calls `history.back()` and the next `popstate` is ignored (`ownPops`). Moving on from one layer to the next (panel → feedback → editor) hands over the same entry (`hand`), so Back always closes what is showing and one more Back leaves the site as before. A feedback sub-page pushes its own entry, so Back returns to the choices first. If `pushState` throws (sandboxed frames), Back simply isn't wired.

On a phone (≤ 600px) the Aa tray follows a downward drag when scrolled to its top and closes past 110px or on a flick.
