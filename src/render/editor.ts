/**
 * "Atur isi artikel" (docs/FEEDBACK.md §3): the editor. It opens on the original page and paints what the
 * reader takes (green), what it leaves out (red) and where the header comes from (blue labels) in a layer
 * in the reader's shadow root; the page itself is never touched. The reader picks first: tap a part (on the
 * original page, or in the clean view), drag a corner to make it bigger or smaller (it snaps to the page
 * element that fits), then say what it is: article text, not article text, or the title, author, date or
 * main photo. The pick follows when switching between the two views.
 * Edits are saved as the outlet's personal rule (src/personal.ts) and show at once, here and in "Bersih".
 * The first Selesai with changes asks once whether edits may be sent to the maintainers.
 *
 * The logic that needs no screen (provenance, snapping, note) lives in editmodel.ts / provenance.ts.
 */
import { collapse } from '../dom.ts';
import { readField, retireRedundant, withEntry, type PersonalField, type PersonalRule } from '../personal.ts';
import type { OfficialView } from '../types.ts';
import type { Strings } from './i18n.ts';
import { compactRule, computeMarks, entryCovers, findHeaderSources, markAt, removalFor, shareOf, snapBest, spanned, statusOf, type HeaderKey, type HeaderMeta, type HeaderSource, type Marks, type Rect } from './editmodel.ts';
import type { ReportInput } from './overlay.ts';
import { describe, fingerprint } from './picker.ts';
import { insertFromPage, selectorPart, stableSelector } from './pagepicker.ts';
import { leavesOf } from './provenance.ts';
import { bodyFromMarks, buildNewSiteNote, idSelector, withNewSite } from '../newsite.ts';
import { generalisePath } from '../personal.ts';

/** Parts bigger than this are not "a part" of the article (as in the old pick tools). */
const MAX_CHARS = 6000;
/** A pick may never swallow most of the article. */
const MAX_SHARE = 0.6;

/** A copy of a page part without its scripts and styles, whose text is what a reader would see. */
function cleanCopy(el: Element): Element {
  const copy = el.cloneNode(true) as Element;
  for (const junk of copy.querySelectorAll('script, style, noscript, template')) junk.remove();
  return copy;
}
/** Has readable text (not just ad or page code such as googletag.cmd.push(…)). */
function readable(el: Element): boolean {
  const text = collapse(cleanCopy(el).textContent);
  // An ad slot's own label ("Advertisement", "Iklan", "Scroll to continue…") isn't content either.
  if (/^(advertisement|advertisment|iklan|ads?|sponsored|scroll (to|untuk) .{0,40}|gulir .{0,40})$/i.test(text)) return false;
  return text.length >= 3 && !/googletag|function\s*\(|\bvar\s+\w+\s*=|=>|\{\s*\}|window\./.test(text);
}

export interface EditorContext {
  doc: Document;
  /** The reader's host element: taps inside it are ours. */
  host: Element;
  /** Container in the shadow root that carries the reader's theme; the editor draws in it. */
  layer: HTMLElement;
  /** The reader's scroll root (hidden while the page shows). */
  root: HTMLElement;
  t: Strings;
  /** Personal-rule key of this outlet. */
  site: string;
  /** The clean view as shown now. */
  content: () => HTMLElement;
  /** Header values as the reader shows them. */
  meta: () => HeaderMeta;
  personal: () => PersonalRule | undefined;
  /** Change this outlet's personal rule; the reader re-renders at once. */
  edit: (change: (p: PersonalRule) => PersonalRule) => void;
  /** Replace the personal rule (undefined: none left). */
  replace: (p: PersonalRule | undefined) => void;
  /** Kembalikan: drop the personal rule and show the article as the official rule makes it. */
  reset: () => Promise<void>;
  official: () => Promise<OfficialView | undefined>;
  /** Send an edit to the maintainers; false when it could not go out. */
  send: (input: ReportInput) => Promise<boolean>;
  /** Whether the reader lets edits be sent: asked once, then remembered (Settings.sendEdits). */
  consent: () => 'ask' | 'yes' | 'no';
  setConsent: (yes: boolean) => void;
  showClean: () => void;
  showOriginal: () => void;
  /** "New site" mode (docs/FEEDBACK.md §5): the kept parts define the body of a site without a rule; Selesai saves it. */
  newSite?: boolean;
  /** The editor has ended (the reader shows again). */
  onClose: () => void;
  /** A short note over the reader ("terkirim"), shown after the editor has closed. */
  notify?: (text: string) => void;
}

export interface Editor {
  close: () => void;
  /** Redraw after the article or the rule changed from outside. */
  refresh: () => void;
}

type Mode = 'original' | 'clean';
const CORNERS = ['tl', 'tr', 'bl', 'br'] as const;
/** What a picked part can be besides article text, in the order the sheet offers them. */
const FIELD_CHOICES: readonly PersonalField[] = ['title', 'byline', 'date', 'image'];
/** Where each header item is drawn in the clean view (overlay.ts articleView). */
const CLEAN_HEADER: Partial<Record<HeaderKey, string>> = {
  title: '.column > header h1', byline: '.column > header .byline', date: '.column > header .date', image: '.column > header .hero',
};

function h(doc: Document, tag: string, attrs: Record<string, string> = {}, ...children: Array<Node | string>): HTMLElement {
  const node = doc.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  for (const c of children) node.append(c);
  return node;
}

/**
 * A selector for a header field: like stableSelector, but a small element in a plain line (a name in a bold link)
 * may be reached by its position among same-tag siblings, up to a class or an id the line hangs from.
 */
export function fieldSelector(el: Element): string | undefined {
  const doc = el.ownerDocument;
  const simple = stableSelector(el) ?? idSelector(el);
  if (simple) return simple;
  const step = (e: Element): string => {
    const id = idSelector(e);
    if (id) return id;
    const part = selectorPart(e);
    if (part.includes('.')) return part;
    const same = [...(e.parentElement?.children ?? [])].filter((s) => s.tagName === e.tagName);
    return same.length > 1 ? `${part}:nth-of-type(${same.indexOf(e) + 1})` : part;
  };
  let sel = step(el);
  for (let cur = el.parentElement, i = 0; cur && cur !== doc.body && i < 8; cur = cur.parentElement, i++) {
    sel = `${step(cur)} > ${sel}`;
    if (!/[.#]/.test(sel)) continue;
    try {
      if (doc.querySelector(sel) === el) return sel;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/**
 * The page elements a selection can become: itself, its ancestors, its descendants, and the siblings of those
 * (so a paragraph can grow to its box, or move to the photo next to it). Layout filtering is the caller's.
 */
export function snapCandidates(current: Element, ours: (el: Element) => boolean): Element[] {
  const doc = current.ownerDocument;
  const out = new Set<Element>([current]);
  const up: Element[] = [];
  for (let a = current.parentElement; a && a !== doc.body && a !== doc.documentElement && up.length < 10; a = a.parentElement) up.push(a);
  for (const a of up) out.add(a);
  let n = 0;
  for (const d of current.querySelectorAll('*')) {
    if (n++ >= 150) break;
    out.add(d);
  }
  for (const node of [current, ...up.slice(0, 5)]) {
    let k = 0;
    for (const s of node.parentElement?.children ?? []) {
      if (k++ >= 40) break;
      out.add(s);
    }
  }
  return [...out].filter((el) => !ours(el) && el !== doc.body && el !== doc.documentElement && !/^(script|style|link|meta|noscript|head)$/i.test(el.tagName));
}

export function startEditor(ctx: EditorContext): Editor {
  const { doc, layer, host, root, t } = ctx;
  const win = doc.defaultView!;
  let mode: Mode = 'original';
  const mouse = !!win.matchMedia?.('(pointer: fine)').matches;
  const tapWord = (s: string) => (mouse ? s.replace(/\bKetuk\b/g, 'Klik').replace(/\bketuk\b/g, 'klik').replace(/\bTap\b/g, 'Click').replace(/\btap\b/g, 'click') : s);
  let marks: Marks = { green: [], red: [], region: null, cleanOf: new Map() };
  /** clean-view element → the page leaf it came from (the reverse of marks.cleanOf) */
  const pageOf = new Map<Element, Element>();
  let sources: HeaderSource[] = [];
  // ── The pick: a page element, and/or what was tapped in the clean view ──
  /** The picked part of the original page (none when a clean-view part has no source there). */
  let selected: Element | null = null;
  /** The clean-view block tapped in Bersih. */
  let cleanEl: Element | null = null;
  /** A header item (title, author, date, main photo) when that is what was picked. */
  let headerKey: HeaderKey | null = null;
  const narrower: Element[] = [];
  let confirming = false;
  let asking = false;
  let moreOpen = false;
  let message = '';
  let official: OfficialView | undefined;
  let closed = false;
  let frame = 0;
  let seenOriginal = !!ctx.newSite;
  const shape = (r?: PersonalRule) => JSON.stringify([r?.add, r?.remove, r?.fields, r?.newSite]);
  const startShape = shape(ctx.personal());

  // ── Layout helpers ──
  const ours = (el: Element) => el === host || host.contains(el) || el.closest?.('.sapuberita-overlay') != null;
  const visible = (el: Element) => {
    const r = el.getBoundingClientRect();
    return r.width >= 1 && r.height >= 1 && r.right > 0 && r.left < doc.documentElement.clientWidth + 1;
  };
  // Sites repeat the headline (and more) in fixed/sticky bars; those copies are not where the page says it.
  const floating = (el: Element) => {
    for (let n: Element | null = el; n && n !== doc.body; n = n.parentElement) {
      if (/^(fixed|sticky)$/.test(win.getComputedStyle(n).position)) return true;
    }
    return false;
  };
  /** Where the page stops being covered from above: our top bar, then any of the site's fixed or sticky headers under it. */
  const coveredTop = () => {
    let y = top.getBoundingClientRect().bottom;
    for (const n of doc.elementsFromPoint(win.innerWidth / 2, y + 2)) {
      if (n === doc.body || n === doc.documentElement || ours(n)) continue;
      if (floating(n)) y = Math.max(y, n.getBoundingClientRect().bottom);
    }
    return y;
  };
  const viewBottom = () => Math.min(win.innerHeight, bar.getBoundingClientRect().top || win.innerHeight);
  /** An element's box clipped to what can be seen and touched (above the bar). */
  const clipped = (el: Element): Rect => {
    const r = el.getBoundingClientRect();
    return { left: Math.max(0, r.left), top: Math.max(top.getBoundingClientRect().bottom, r.top), right: Math.min(win.innerWidth, r.right), bottom: Math.min(viewBottom(), r.bottom) };
  };

  // ── Nodes ──
  const boxLayer = h(doc, 'div', { class: 'ed-boxes', 'aria-hidden': 'true' });
  const selNode = h(doc, 'div', { class: 'ed-sel', 'aria-hidden': 'false' });
  const dragNode = h(doc, 'div', { class: 'ed-drag', 'aria-hidden': 'true' });
  const top = h(doc, 'header', { class: 'ed-top' });
  const bar = h(doc, 'div', { class: 'ed-bar', role: 'group', 'aria-label': t.edTitle });
  const status = h(doc, 'p', { class: 'ed-live', role: 'status', 'aria-live': 'polite' });
  layer.dataset.editing = 'on';
  layer.setAttribute('role', 'region');
  layer.setAttribute('aria-label', t.edTitle);
  layer.replaceChildren(boxLayer, selNode, dragNode, top, bar, status);
  layer.hidden = false;
  root.dataset.editing = 'on';

  const handles = CORNERS.map((c, i) => {
    const b = h(doc, 'button', { type: 'button', class: `ed-h ${c}`, 'aria-label': t.edResize(t.edCorners[i]!) });
    selNode.append(b);
    return b;
  });

  // ── Boxes ──
  interface Box {
    el: Element;
    node: HTMLElement;
    kind: 'in' | 'out' | 'src';
    shown: boolean;
  }
  let boxes: Box[] = [];

  const compute = () => {
    sources = findHeaderSources(doc, ctx.meta(), ctx.personal()?.fields, (el) => visible(el) && !floating(el), ours);
    const mine = ctx.personal()?.remove.filter((s) => !/^[ti]:/.test(s)) ?? [];
    marks = computeMarks(ctx.content(), doc, {
      removeSelectors: [...(official?.removeSelectors ?? []), ...mine],
      header: sources.flatMap((s) => (s.el ? [s.el] : [])),
      visible,
      skipLive: ours,
    });
    pageOf.clear();
    for (const [page, clean] of marks.cleanOf) pageOf.set(clean, page);
    if (selected && !selected.isConnected) selected = null;
    if (cleanEl && !cleanEl.isConnected) cleanEl = null;
  };

  const redraw = () => {
    boxLayer.replaceChildren();
    boxes = [];
    const add = (el: Element, kind: Box['kind'], label?: string) => {
      const node = h(doc, 'div', { class: `ed-box ${kind}` });
      if (label) node.append(h(doc, 'span', { class: 'ed-label' }, label));
      boxLayer.append(node);
      boxes.push({ el, node, kind, shown: true });
    };
    for (const g of marks.green) add(g, 'in');
    for (const r of marks.red) add(r, 'out');
    for (const s of sources) if (s.el) add(s.el, 'src', t.edFieldNames[s.key]);
    place();
  };

  // ── Where the pick is in each view ──
  const sourceOf = (key: HeaderKey) => sources.find((s) => s.key === key);
  const headerEl = (key: HeaderKey) => (CLEAN_HEADER[key] ? root.querySelector(CLEAN_HEADER[key]!) : null);
  /** The clean-view elements that show a page part: its leaves' blocks, or the header item it is the source of. */
  const cleanFor = (page: Element): Element[] => {
    const out = leavesOf(page).flatMap((l) => {
      const c = marks.cleanOf.get(l.el);
      return c && !c.closest('[data-user-hidden], [hidden]') ? [c] : [];
    });
    if (out.length) return out;
    const key = sources.find((s) => s.el && (s.el === page || page.contains(s.el)))?.key;
    const head = key ? headerEl(key) : null;
    return head ? [head] : [];
  };
  const cleanTargets = (): Element[] => {
    if (headerKey) {
      const head = headerEl(headerKey);
      return head ? [head] : [];
    }
    if (cleanEl?.isConnected) return [cleanEl];
    return selected ? cleanFor(selected) : [];
  };
  const hasPick = () => !!(selected || cleanEl || headerKey);

  /** The pick's box in the view that shows now, clipped to what can be seen; null when it isn't on screen. */
  const pickRect = (): Rect | null => {
    const els = mode === 'original' ? (selected?.isConnected ? [selected] : []) : cleanTargets();
    const rs = els.map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0 || r.height > 0);
    if (!rs.length) return null;
    const r: Rect = {
      left: Math.max(0, Math.min(...rs.map((x) => x.left))),
      top: Math.max(top.getBoundingClientRect().bottom, Math.min(...rs.map((x) => x.top))),
      right: Math.min(win.innerWidth, Math.max(...rs.map((x) => x.right))),
      bottom: Math.min(viewBottom(), Math.max(...rs.map((x) => x.bottom))),
    };
    return r.right - r.left < 2 || r.bottom - r.top < 2 ? null : r;
  };
  /** The pick's full box (unclipped), for scrolling it into view. */
  const pickBox = (): Rect | null => {
    const els = mode === 'original' ? (selected?.isConnected ? [selected] : []) : cleanTargets();
    const rs = els.map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0 || r.height > 0);
    if (!rs.length) return null;
    return { left: Math.min(...rs.map((x) => x.left)), top: Math.min(...rs.map((x) => x.top)), right: Math.max(...rs.map((x) => x.right)), bottom: Math.max(...rs.map((x) => x.bottom)) };
  };

  const place = () => {
    frame = 0;
    if (closed) return;
    if (mode === 'original') {
      const vw = win.innerWidth;
      const vh = viewBottom();
      for (const b of boxes) {
        const r = b.el.getBoundingClientRect();
        const small = b.kind === 'in' ? 4 : 14;
        const on = r.width >= small && r.height >= small && r.bottom > 0 && r.top < vh + 40 && r.right > 0 && r.left < vw;
        if (!on) {
          if (b.shown) b.node.style.display = 'none';
          b.shown = false;
          continue;
        }
        b.shown = true;
        const slim = b.kind === 'out' && r.height > 160 && !readable(b.el);
        b.node.classList.toggle('slim', slim);
        Object.assign(b.node.style, { display: '', left: `${r.left - 2}px`, top: `${r.top - 2}px`, width: `${r.width + 4}px`, height: `${slim ? 30 : r.height + 4}px` });
        if (b.kind === 'src') b.node.classList.toggle('low', r.top < 26);
      }
    }
    const r = pickRect();
    selNode.hidden = !r;
    if (r) Object.assign(selNode.style, { left: `${r.left - 3}px`, top: `${r.top - 3}px`, width: `${r.right - r.left + 6}px`, height: `${r.bottom - r.top + 6}px` });
  };
  const follow = () => {
    if (!frame && !closed) frame = win.requestAnimationFrame(place);
  };

  /** Scroll the view that shows now so the pick sits between the top bar and the sheet. */
  const reveal = () => {
    const r = pickBox();
    if (!r) return;
    const scroller = mode === 'clean' ? root : (doc.scrollingElement ?? doc.documentElement);
    const topLimit = (mode === 'clean' ? top.getBoundingClientRect().bottom : coveredTop()) + 12;
    const free = viewBottom() - 12;
    if (r.top < topLimit) scroller.scrollTop -= topLimit - r.top;
    else if (r.bottom > free) scroller.scrollTop += Math.min(r.bottom - free, r.top - topLimit);
  };

  // ── Picking ──
  const usable = (el: Element | null): el is Element =>
    !!el && el !== doc.body && el !== doc.documentElement && !ours(el) && !/^(script|style|html|head)$/i.test(el.tagName);

  const pickDone = () => {
    message = '';
    moreOpen = false;
    renderBar();
    // The sheet (taller now) must not cover what was picked.
    reveal();
    place();
  };
  /** Pick a part of the original page. */
  const select = (el: Element | null) => {
    selected = el;
    cleanEl = null;
    headerKey = el ? (sources.find((s) => s.el === el)?.key ?? null) : null;
    if (!el) narrower.length = 0;
    pickDone();
  };
  const clearPick = () => {
    selected = cleanEl = null;
    headerKey = null;
    narrower.length = 0;
  };

  const onTap = (e: MouseEvent) => {
    if (e.composedPath().includes(host) || mode !== 'original') return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (confirming || asking) return;
    const target = e.target as Element | null;
    if (!usable(target)) return;
    // Pages often lay invisible wrappers over their text, so the tapped element can be the whole article body.
    // What the reader means is the coloured part under their finger: the smallest one wins.
    const under = boxes
      .filter((b) => b.kind !== 'src' && b.shown)
      .map((b) => ({ el: b.el, r: b.el.getBoundingClientRect() }))
      .filter(({ r }) => e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom)
      .sort((a, b) => a.r.width * a.r.height - b.r.width * b.r.height)[0]?.el;
    const hit = under ? { el: under } : markAt(target, marks);
    const el = hit?.el ?? (collapse(target.textContent).length <= MAX_CHARS ? target : null);
    if (!el) return;
    narrower.length = 0;
    select(el);
  };
  const block = (e: Event) => {
    if (!e.composedPath().includes(host) && mode === 'original') e.stopImmediatePropagation();
  };

  /** A tap in the clean view: a header item, or an article block traced back to the page part it came from. */
  const onCleanTap = (e: Event) => {
    if (mode !== 'clean' || closed) return;
    const target = e.composedPath()[0] as Element | undefined;
    if (!target || !(target instanceof win.Element) || layer.contains(target) || !root.contains(target)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.type !== 'click' || confirming || asking) return;
    const head = target.closest('.column > header');
    if (head) {
      const key: HeaderKey | null = target.closest('h1') ? 'title' : target.closest('.byline') ? 'byline' : target.closest('.date') ? 'date'
        : target.closest('.hero') ? 'image' : target.closest('.meta > .name') ? 'editor' : null;
      if (!key) return;
      headerKey = key;
      cleanEl = null;
      selected = sourceOf(key)?.el ?? null;
      return pickDone();
    }
    const content = ctx.content();
    if (!content.contains(target)) return;
    for (let n: Element | null = target; n && n !== content; n = n.parentElement) {
      const page = pageOf.get(n);
      if (page) {
        selected = page;
        cleanEl = n;
        headerKey = null;
        return pickDone();
      }
    }
    // Nothing on the page matches it (a part added from the page for this article only).
    const blockEl = target.closest('p, li, figure, blockquote, h2, h3, h4, h5, h6, table, pre');
    if (!blockEl || !content.contains(blockEl)) return;
    selected = null;
    cleanEl = blockEl;
    headerKey = null;
    pickDone();
  };

  // Dragging a corner: the opposite corner stays, the dragged one follows the finger; on release the selection
  // becomes the element whose box fits the rectangle best.
  let anchor: { x: number; y: number } | null = null;
  let dragRect: Rect | null = null;
  const draw = (r: Rect | null) => {
    dragNode.hidden = !r;
    if (r) Object.assign(dragNode.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.right - r.left}px`, height: `${r.bottom - r.top}px` });
  };
  draw(null);
  handles.forEach((hd, i) => {
    hd.addEventListener('pointerdown', (e) => {
      if (!selected || mode !== 'original') return;
      e.preventDefault();
      e.stopPropagation();
      hd.setPointerCapture?.(e.pointerId);
      const r = clipped(selected);
      const c = CORNERS[i]!;
      anchor = { x: c[1] === 'l' ? r.right : r.left, y: c[0] === 't' ? r.bottom : r.top };
      dragRect = r;
      draw(r);
    });
    hd.addEventListener('pointermove', (e) => {
      if (!anchor) return;
      dragRect = spanned(anchor.x, anchor.y, e.clientX, e.clientY);
      draw(dragRect);
    });
    const end = (apply: boolean) => {
      const rect = dragRect;
      anchor = null;
      dragRect = null;
      draw(null);
      if (apply && rect && selected) snapTo(rect);
    };
    hd.addEventListener('pointerup', () => end(true));
    hd.addEventListener('pointercancel', () => end(false));
    // Keyboard: Up = the box around it, Down = back to the smaller one.
    hd.addEventListener('keydown', (e) => {
      if (!selected || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
      e.preventDefault();
      if (e.key === 'ArrowUp') {
        const up = selected.parentElement;
        if (usable(up)) {
          narrower.push(selected);
          select(up);
        }
      } else if (narrower.length) select(narrower.pop()!);
      hd.focus();
    });
  });

  /** Make the selection the element that best fits the dragged rectangle. */
  const snapTo = (rect: Rect) => {
    const cur = selected!;
    const cands = snapCandidates(cur, ours)
      .map((el) => ({ item: el, rect: clipped(el) }))
      .filter((c) => c.rect.right - c.rect.left >= 6 && c.rect.bottom - c.rect.top >= 6);
    const best = snapBest(rect, cands);
    if (best && best !== cur) {
      if (best.contains(cur)) narrower.push(cur);
      select(best);
    } else place();
  };

  // ── What the pick is ──
  const afterEdit = (msg: string) => {
    clearPick();
    message = msg;
    compute();
    redraw();
    renderBar();
    void retire();
  };

  const canRemove = (s: { inside: number }) => !!selected && s.inside > 0 && shareOf(selected, ctx.content()) <= MAX_SHARE;
  const canAdd = (s: { outside: number }) => !!selected && s.outside > 0 && collapse(selected.textContent).length <= MAX_CHARS;
  /** A field can be read from the pick: a photo for Foto utama, a stable way to find it again for any. */
  const fieldOk = (f: PersonalField) => {
    if (!selected) return false;
    if (f === 'image' && selected.tagName !== 'IMG' && !selected.querySelector('img')) return false;
    if (f !== 'image' && !readable(selected)) return false;
    return true;
  };

  const assignField = (field: PersonalField) => {
    const part = selected;
    if (!part) return;
    const name = t.edFieldNames[field];
    const sel = fieldSelector(part);
    if (!sel || !readField(doc, sel, field)) {
      message = t.edFieldFail;
      return renderBar();
    }
    ctx.edit((p) => ({ ...p, fields: { ...p.fields, [field]: sel } }));
    afterEdit(t.edFieldSaved(name));
  };

  const removePart = () => {
    const part = selected;
    if (!part) {
      // A clean-view part with no source on the page (e.g. Kompas's "Gabung Kompas.com PLUS" line, a paragraph the
      // reader rebuilt inside an <i>): remember it by its own text or photo, so it stays gone here and in later
      // articles with the same line. Only a part with neither is hidden for this article alone.
      const key = cleanEl ? fingerprint(cleanEl) : undefined;
      if (key) {
        ctx.edit((p) => ({ ...p, remove: withEntry(p.remove, key) }));
        return afterEdit(t.edRemoved);
      }
      cleanEl?.setAttribute('data-user-hidden', '');
      return afterEdit(t.edRemovedOnce);
    }
    const p0 = ctx.personal();
    // A part the reader once added comes back out by dropping that entry first.
    const added = p0?.add.filter((e) => entryCovers(e, part, doc)) ?? [];
    if (added.length) {
      ctx.edit((p) => ({ ...p, add: p.add.filter((e) => !added.includes(e)) }));
      compute();
    }
    if (statusOf(part, marks).inside === 0) return afterEdit(t.edRemoved);
    const green = leavesOf(part).filter((l) => marks.cleanOf.has(l.el));
    const bySelector = removalFor(part, stableSelector(part), doc);
    // Fingerprints come from the clean view's own block: the reader may have changed its text (Detik's dateline
    // "Jakarta -" is joined into the first paragraph), and hiding matches what the clean view shows.
    const entries = bySelector && !/^[ti]:/.test(bySelector) ? [bySelector] : green.slice(0, 12).map((l) => fingerprint(marks.cleanOf.get(l.el) ?? l.el));
    const keep = entries.filter((e): e is string => !!e);
    if (keep.length && keep.length === Math.min(entries.length, green.length || 1)) {
      ctx.edit((p) => ({ ...p, remove: keep.reduce((list, e) => withEntry(list, e), p.remove) }));
      afterEdit(t.edRemoved);
    } else {
      // Nothing stable to remember it by: out of this article only.
      for (const l of green) marks.cleanOf.get(l.el)?.setAttribute('data-user-hidden', '');
      afterEdit(t.edRemovedOnce);
    }
  };

  const addPart = () => {
    const part = selected;
    if (!part) return;
    const p0 = ctx.personal();
    const covering = p0?.remove.filter((e) => entryCovers(e, part, doc)) ?? [];
    if (covering.length) {
      ctx.edit((p) => ({ ...p, remove: p.remove.filter((e) => !covering.includes(e)) }));
      compute();
    }
    if (statusOf(part, marks).outside === 0) return afterEdit(t.edAdded);
    const selector = stableSelector(part);
    if (selector) {
      ctx.edit((p) => ({ ...p, add: withEntry(p.add, selector) }));
      afterEdit(t.edAdded);
    } else {
      insertFromPage(part, ctx.content());
      afterEdit(t.edAddedOnce);
    }
  };

  // Entries the official rule already covers are dropped quietly (on opening, after each edit).
  const retire = async () => {
    const p = ctx.personal();
    if (!p || !official) return;
    const next = retireRedundant(p, official.rule, official.article.content, doc, official.article.meta);
    if (shape(next) === shape(p)) return;
    ctx.replace(next);
    if (!closed) {
      compute();
      redraw();
      renderBar();
    }
  };

  // ── Bar ──
  const button = (label: string, cls: string, id: string, onClick: () => void, extra: Record<string, string> = {}) => {
    const b = h(doc, 'button', { type: 'button', class: `btn ${cls}`.trim(), 'data-ed': id, ...extra }, label);
    b.addEventListener('click', onClick);
    return b;
  };

  const renderTop = () => {
    const seg = h(doc, 'div', { class: 'ed-seg', role: 'radiogroup', 'aria-label': t.edView });
    for (const [m, label] of [['original', t.edOriginal], ['clean', t.edClean]] as const) {
      const b = h(doc, 'button', { type: 'button', role: 'radio', 'aria-checked': String(mode === m), 'data-ed': `view-${m}` }, label);
      b.addEventListener('click', () => setMode(m));
      seg.append(b);
    }
    const done = button(t.edDone, 'primary ed-done', 'done', finish);
    top.replaceChildren(h(doc, 'span', { class: 'ed-title' }, ctx.newSite ? t.nsTitle : t.edTitle), seg, done);
  };

  /** What the pick is now, in a few words: its state, and its text (or "photo"). */
  const pickSummary = (): HTMLElement => {
    const text = h(doc, 'p', { class: 'ed-text' });
    let state: [string, string] | undefined;
    let what = '';
    if (headerKey) {
      state = ['src', t.edFieldNames[headerKey]];
      what = selected ? describeEl(selected) : collapse(sourceOf(headerKey)?.value ?? '');
    } else if (selected) {
      const s = statusOf(selected, marks);
      const kind = s.inside && s.outside ? 'mix' : s.inside ? 'in' : 'out';
      state = [kind, kind === 'in' ? t.edIn : kind === 'out' ? t.edOut : t.edMixed];
      what = describeEl(selected);
    } else if (cleanEl) {
      state = ['in', t.edIn];
      what = describeEl(cleanEl);
    }
    if (state) text.append(h(doc, 'span', { class: `ed-state ${state[0]}` }, state[1]));
    text.append(h(doc, 'span', { class: 'ed-what' }, what));
    return text;
  };
  const describeEl = (el: Element) => (readable(el) ? describe(cleanCopy(el)) : el.querySelector('img') || el.tagName === 'IMG' ? t.edPhoto : t.edNoText);

  /** "Bagian ini apa?": the choices for the pick, the current one marked. */
  const sheet = (): HTMLElement[] => {
    const out: HTMLElement[] = [];
    const cancel = button(t.edDeselect, 'quiet', 'deselect', () => select(null));
    out.push(h(doc, 'div', { class: 'ed-line' }, pickSummary(), cancel));
    // Not on this view: say so instead of offering choices that would act on something unseen.
    const shown = mode === 'original' ? !!selected : cleanTargets().length > 0;
    if (!shown) {
      out.push(h(doc, 'p', { class: 'ed-note' }, mode === 'original' ? t.edNotInOriginal : t.edNotInClean));
      return out;
    }
    out.push(h(doc, 'p', { class: 'ed-q' }, t.edWhat));
    const s = selected ? statusOf(selected, marks) : { inside: 1, outside: 0 };
    const choice = (id: string, title: string, desc: string, pressed: boolean, enabled: boolean, run: () => void) => {
      const b = h(doc, 'button', { type: 'button', class: `ed-choice ${id}`, 'data-ed': id, 'aria-pressed': String(pressed) },
        h(doc, 'span', { class: 'ed-choice-title' }, title), h(doc, 'span', { class: 'ed-choice-desc' }, desc));
      b.toggleAttribute('disabled', !enabled && !pressed);
      // The current answer again: nothing to change, the sheet just closes.
      b.addEventListener('click', () => (pressed ? select(null) : run()));
      return b;
    };
    if (!headerKey) {
      const isIn = s.inside > 0 && s.outside === 0;
      const isOut = s.inside === 0;
      const choices = h(doc, 'div', { class: 'ed-choices' },
        choice('add', t.edChooseIn, t.edChooseInDesc, isIn, canAdd(s), addPart),
        choice('remove', t.edChooseOut, t.edChooseOutDesc, isOut, selected ? canRemove(s) : !!cleanEl, removePart));
      out.push(choices);
      if (selected && s.inside && !canRemove(s) && !isOut) out.push(h(doc, 'p', { class: 'ed-note' }, t.edTooBig));
      else if (selected && s.outside && !canAdd(s) && !isIn) out.push(h(doc, 'p', { class: 'ed-note' }, t.edTooBig));
    }
    const fields = h(doc, 'div', { class: 'ed-chips ed-fields', role: 'group', 'aria-label': t.edOrField }, h(doc, 'span', { class: 'ed-chips-label' }, t.edOrField));
    for (const f of FIELD_CHOICES) {
      const current = headerKey === f || (!!selected && sourceOf(f)?.el === selected);
      const chip = h(doc, 'button', { type: 'button', class: 'ed-chip', 'aria-pressed': String(current), 'data-ed': `field-${f}` }, t.edFieldNames[f]);
      chip.toggleAttribute('disabled', !current && !fieldOk(f));
      chip.addEventListener('click', () => (current ? select(null) : assignField(f)));
      fields.append(chip);
    }
    if (selected || headerKey) out.push(fields);
    if (headerKey && mode === 'clean') out.push(h(doc, 'p', { class: 'ed-note' }, tapWord(t.edHeaderElsewhere(t.edFieldNames[headerKey]))));
    else if (headerKey && !selected) out.push(h(doc, 'p', { class: 'ed-note' }, t.edFromData));
    return out;
  };

  const renderBar = () => {
    renderTop();
    const active = (layer.getRootNode() as ShadowRoot | Document).activeElement?.getAttribute?.('data-ed');
    const lines: HTMLElement[] = [];
    bar.dataset.mode = mode;
    if (asking) {
      lines.push(h(doc, 'p', { class: 'ed-q' }, t.edAskTitle), h(doc, 'p', { class: 'ed-ask' }, t.edAskBody),
        h(doc, 'div', { class: 'ed-actions' },
          button(t.edAskYes, 'primary', 'ask-yes', () => answer(true)),
          button(t.edAskNo, '', 'ask-no', () => answer(false))),
        h(doc, 'p', { class: 'ed-note' }, t.edAskLater));
    } else if (confirming) {
      lines.push(h(doc, 'p', { class: 'ed-ask' }, t.edResetAsk),
        h(doc, 'div', { class: 'ed-actions' },
          button(t.edResetYes, 'primary', 'reset-yes', () => void doReset()),
          button(t.edResetNo, '', 'reset-no', () => { confirming = false; renderBar(); })));
    } else if (hasPick()) {
      lines.push(...sheet());
    } else {
      const hint = tapWord(ctx.newSite ? t.nsHint(doc.location?.hostname ?? '') : mode === 'clean' ? t.edHintClean : t.edHint);
      const more = button(t.edMore, 'quiet ed-more', 'more', () => { moreOpen = !moreOpen; renderBar(); }, { 'aria-expanded': String(moreOpen) });
      lines.push(h(doc, 'div', { class: 'ed-line' }, h(doc, 'p', { class: 'ed-text' }, hint), more));
      if (moreOpen) {
        const p = ctx.personal();
        const reset = button(t.edReset, '', 'reset', () => { confirming = true; renderBar(); });
        reset.toggleAttribute('disabled', !p);
        lines.push(h(doc, 'div', { class: 'ed-actions' }, reset),
          h(doc, 'p', { class: 'ed-note' }, p ? t.edCount(p.add.length, p.remove.length, Object.keys(p.fields ?? {}).length) : t.edNoChanges));
      }
    }
    bar.replaceChildren(...lines);
    status.textContent = message;
    if (message) bar.prepend(h(doc, 'p', { class: 'ed-msg', 'aria-hidden': 'true' }, message));
    if (active) layer.querySelector<HTMLElement>(`[data-ed="${active}"]`)?.focus({ preventScroll: true });
  };

  const doReset = async () => {
    confirming = false;
    await ctx.reset();
    afterEdit(t.edResetDone);
  };

  // ── Modes ──
  const setMode = (next: Mode) => {
    if (next === mode) return;
    mode = next;
    boxLayer.hidden = next === 'clean';
    layer.dataset.mode = next;
    if (next === 'clean') ctx.showClean();
    else {
      ctx.showOriginal();
      compute();
      redraw();
      // The first visit to the page: start at the article, as the editor used to when it opened there.
      if (!seenOriginal) {
        seenOriginal = true;
        win.requestAnimationFrame(() => win.requestAnimationFrame(toArticle));
      }
    }
    message = '';
    renderBar();
    layer.querySelector<HTMLElement>(`[data-ed="view-${next}"]`)?.focus({ preventScroll: true });
    // The pick stays picked: show it in this view (once the view has laid out).
    win.requestAnimationFrame(() => {
      reveal();
      place();
    });
  };

  /** The site this page defines, from what is green and red now (new-site mode); undefined when it cannot be named. */
  const newSiteRule = (p: PersonalRule): PersonalRule | undefined => {
    if (!ctx.newSite) return undefined;
    const body = bodyFromMarks(marks.green, marks.red, doc);
    return body ? withNewSite(p, new URL(doc.location.href), body, generalisePath(doc.location.pathname)) : undefined;
  };
  const siteName = () => doc.querySelector<HTMLMetaElement>('meta[property="og:site_name"]')?.content;
  const hadSite = !!ctx.personal()?.newSite;

  /** What is sent for this outlet's edits: a readable line, and the rule itself as JSON. */
  const editReport = (p: PersonalRule): ReportInput | undefined => {
    const names = Object.keys(p.fields ?? {}).map((f) => t.edFieldNames[f as PersonalField]);
    if (p.newSite) {
      const full = buildNewSiteNote(p, new URL(doc.location.href), t.nsSummary(ctx.site, p.remove.length, names), siteName());
      const [note = '', ...rest] = full.split('\n');
      return full ? { kind: 'edit', note, detail: rest.join('\n') } : undefined;
    }
    return { kind: 'edit', note: t.edSummary(ctx.site, p.add.length, p.remove.length, names), detail: compactRule(p) };
  };
  const sendEdits = () => {
    const p = ctx.personal();
    const report = p && editReport(p);
    if (report) void ctx.send(report).then((sent) => ctx.notify?.(sent ? t.edSent : t.edSendFailed));
  };
  /** The one-time question, answered: remember it, send if yes, and leave. */
  const answer = (yes: boolean) => {
    asking = false;
    ctx.setConsent(yes);
    if (yes) sendEdits();
    close();
  };

  /**
   * Selesai. In new-site mode it first saves the site; with nothing to save it stays open and says why.
   * With changes, edits go to the maintainers if the reader agreed; the first time, it asks.
   */
  function finish() {
    if (ctx.newSite) {
      const p = ctx.personal() ?? { site: ctx.site, add: [], remove: [], updated: '' };
      const site = newSiteRule(p);
      if (!site) {
        message = marks.green.length ? t.nsNoName : t.nsNoBody;
        return renderBar();
      }
      ctx.edit(() => site);
    }
    const p = ctx.personal();
    if (p && shape(p) !== startShape) {
      const consent = ctx.consent();
      if (consent === 'ask') {
        clearPick();
        confirming = false;
        asking = true;
        message = '';
        renderBar();
        place();
        layer.querySelector<HTMLElement>('[data-ed="ask-yes"]')?.focus({ preventScroll: true });
        return;
      }
      if (consent === 'yes') sendEdits();
    }
    close();
  }

  function close() {
    if (closed) return;
    closed = true;
    doc.removeEventListener('click', onTap, true);
    for (const type of ['mousedown', 'pointerdown', 'touchstart', 'auxclick']) doc.removeEventListener(type, block, true);
    for (const type of ['click', 'auxclick']) shadowRoot.removeEventListener(type, onCleanTap, true);
    doc.removeEventListener('keydown', onKey, true);
    win.removeEventListener('scroll', follow, { capture: true });
    root.removeEventListener('scroll', follow);
    win.removeEventListener('resize', follow);
    win.clearInterval(timer);
    if (frame) win.cancelAnimationFrame(frame);
    layer.replaceChildren();
    layer.hidden = true;
    delete layer.dataset.editing;
    delete layer.dataset.mode;
    layer.removeAttribute('role');
    layer.removeAttribute('aria-label');
    root.removeAttribute('data-editing');
    ctx.onClose();
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    e.stopImmediatePropagation();
    e.preventDefault();
    if (confirming) {
      confirming = false;
      renderBar();
    } else if (asking) {
      // Not answered: the question comes again next time.
      asking = false;
      close();
    } else if (hasPick()) {
      select(null);
    } else {
      // Leaving a new site half set up drops what was saved on the way (it would show as a personal version that does nothing).
      if (ctx.newSite && !hadSite) ctx.replace(undefined);
      close();
    }
  };

  const shadowRoot = root.getRootNode() as ShadowRoot | Document;
  doc.addEventListener('click', onTap, true);
  for (const type of ['mousedown', 'pointerdown', 'touchstart', 'auxclick']) doc.addEventListener(type, block, true);
  // Above the reader's own handlers (links, the photo viewer): in Bersih a tap picks.
  for (const type of ['click', 'auxclick']) shadowRoot.addEventListener(type, onCleanTap, true);
  doc.addEventListener('keydown', onKey, true);
  win.addEventListener('scroll', follow, { capture: true, passive: true });
  root.addEventListener('scroll', follow, { passive: true });
  win.addEventListener('resize', follow);
  // Late layout (images loading, ads moving things) shifts boxes without a scroll.
  const timer = win.setInterval(place, 700);

  ctx.showOriginal();
  layer.dataset.mode = 'original';
  compute();
  redraw();
  if (!ctx.newSite) {
    // Marks are measured on the page above; then straight to Bersih, before anything paints.
    mode = 'clean';
    boxLayer.hidden = true;
    layer.dataset.mode = 'clean';
    ctx.showClean();
  }
  renderBar();
  layer.querySelector<HTMLElement>(`[data-ed="view-${mode === 'clean' ? 'original' : 'clean'}"]`)?.focus({ preventScroll: true });
  // Start at the article: scroll so its title (or first green part) sits just under the top bar.
  // The anchor must be in the page's flow (see floating): the sticky copy of a headline always looks "on screen".
  const inFlow = [sources.find((s) => s.key === 'title')?.el, ...marks.green].find(
    (el): el is Element => !!el && el.getBoundingClientRect().height > 0 && !floating(el),
  );
  const toArticle = () => {
    const anchorEl = inFlow;
    if (closed || mode !== 'original' || !anchorEl?.isConnected) return;
    // Set the position directly: some pages replace window.scrollTo (Kompas), which then does nothing.
    const scroller = doc.scrollingElement ?? doc.documentElement;
    const r = anchorEl.getBoundingClientRect();
    if (r.top < 60 || r.top > win.innerHeight * 0.45) scroller.scrollTop = Math.max(0, win.scrollY + r.top - 70);
    // The site's own sticky header (often shown only once scrolled) may still cover the anchor.
    const covered = coveredTop();
    const after = anchorEl.getBoundingClientRect().top;
    if (after < covered + 8) scroller.scrollTop = Math.max(0, scroller.scrollTop - (covered + 12 - after));
  };
  // Pages settle late (sticky headers slide in once scrolled), so look again, unless the reader has started moving.
  let touched = false;
  const touch = () => { touched = true; };
  for (const type of ['wheel', 'touchstart', 'keydown']) win.addEventListener(type, touch, { once: true, passive: true });
  win.requestAnimationFrame(() => win.requestAnimationFrame(toArticle));
  for (const ms of [900, 1700]) win.setTimeout(() => !hasPick() && !touched && toArticle(), ms);
  void ctx.official().then((view) => {
    if (closed || !view) return;
    official = view;
    compute();
    redraw();
    renderBar();
    void retire();
  });

  return {
    close,
    refresh: () => {
      if (closed) return;
      compute();
      redraw();
      renderBar();
    },
  };
}
