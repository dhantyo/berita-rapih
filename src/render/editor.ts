/**
 * "Atur isi artikel" (docs/FEEDBACK.md §3): the editor. It opens on the original page and paints what the
 * reader takes (green), what it leaves out (red) and where the header comes from (blue labels) in a layer
 * in the reader's shadow root; the page itself is never touched. Tap a part to select it, drag a corner to
 * make the selection bigger or smaller (it snaps to the page element that fits), then Masukkan / Buang.
 * Edits are saved as the outlet's personal rule (src/personal.ts) and show at once, here and in "Bersih".
 *
 * The logic that needs no screen (provenance, snapping, note) lives in editmodel.ts / provenance.ts.
 */
import { collapse } from '../dom.ts';
import { readField, retireRedundant, withEntry, type PersonalField, type PersonalRule } from '../personal.ts';
import type { OfficialView } from '../types.ts';
import type { Strings } from './i18n.ts';
import { buildEditNote, computeMarks, entryCovers, findHeaderSources, markAt, removalFor, shareOf, snapBest, spanned, statusOf, type HeaderMeta, type HeaderSource, type Marks, type Rect } from './editmodel.ts';
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
  reportUrl: (note: string) => string | undefined;
  showClean: () => void;
  showOriginal: () => void;
  /** "New site" mode (docs/FEEDBACK.md §5): the kept parts define the body of a site without a rule; Selesai saves it. */
  newSite?: boolean;
  /** The editor has ended (the reader shows again). */
  onClose: () => void;
}

export interface Editor {
  close: () => void;
  /** Redraw after the article or the rule changed from outside. */
  refresh: () => void;
}

type Mode = 'original' | 'clean';
const CORNERS = ['tl', 'tr', 'bl', 'br'] as const;
const HEADER_CHIPS: readonly PersonalField[] = ['title', 'byline', 'editor', 'date'];

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
  let marks: Marks = { green: [], red: [], region: null, cleanOf: new Map() };
  let sources: HeaderSource[] = [];
  let selected: Element | null = null;
  const narrower: Element[] = [];
  let fieldMode: PersonalField | null = null;
  let confirming = false;
  let moreOpen = false;
  let message = '';
  let official: OfficialView | undefined;
  let closed = false;
  let frame = 0;

  // ── Layout helpers ──
  const ours = (el: Element) => el === host || host.contains(el) || el.closest?.('.sapuberita-overlay') != null;
  const visible = (el: Element) => {
    const r = el.getBoundingClientRect();
    return r.width >= 1 && r.height >= 1 && r.right > 0 && r.left < doc.documentElement.clientWidth + 1;
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
    sources = findHeaderSources(doc, ctx.meta(), ctx.personal()?.fields, visible, ours);
    const mine = ctx.personal()?.remove.filter((s) => !/^[ti]:/.test(s)) ?? [];
    marks = computeMarks(ctx.content(), doc, {
      removeSelectors: [...(official?.removeSelectors ?? []), ...mine],
      header: sources.flatMap((s) => (s.el ? [s.el] : [])),
      visible,
      skipLive: ours,
    });
    if (selected && !selected.isConnected) selected = null;
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

  const place = () => {
    frame = 0;
    if (mode !== 'original' || closed) return;
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
    if (selected?.isConnected) {
      const r = clipped(selected);
      selNode.hidden = r.right - r.left < 2 || r.bottom - r.top < 2;
      Object.assign(selNode.style, { left: `${r.left - 3}px`, top: `${r.top - 3}px`, width: `${r.right - r.left + 6}px`, height: `${r.bottom - r.top + 6}px` });
    } else selNode.hidden = true;
  };
  const follow = () => {
    if (!frame && !closed) frame = win.requestAnimationFrame(place);
  };

  // ── Selection ──
  const usable = (el: Element | null): el is Element =>
    !!el && el !== doc.body && el !== doc.documentElement && !ours(el) && !/^(script|style|html|head)$/i.test(el.tagName);

  const select = (el: Element | null) => {
    selected = el;
    message = '';
    renderBar();
    // The bar (now possibly taller, with actions) must not cover what was picked: scroll it up into view,
    // without pushing its top under the editor's top bar.
    if (el) {
      const r = el.getBoundingClientRect();
      const free = viewBottom() - 12;
      const topLimit = top.getBoundingClientRect().bottom + 12;
      if (r.bottom > free && r.top > topLimit) {
        const scroller = doc.scrollingElement ?? doc.documentElement;
        scroller.scrollTop += Math.min(r.bottom - free, r.top - topLimit);
      }
    }
    place();
  };

  const onTap = (e: MouseEvent) => {
    if (e.composedPath().includes(host) || mode !== 'original') return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const target = e.target as Element | null;
    if (!usable(target)) return;
    if (fieldMode) return assignField(target);
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
      if (!selected) return;
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

  // ── Header fields ──
  const assignField = (target: Element) => {
    const field = fieldMode!;
    const name = t.edFieldNames[field];
    const sel = fieldSelector(target);
    if (!sel || !readField(doc, sel, field)) {
      message = t.edFieldFail;
      return renderBar();
    }
    fieldMode = null;
    ctx.edit((p) => ({ ...p, fields: { ...p.fields, [field]: sel } }));
    afterEdit(t.edFieldSaved(name));
  };

  // ── Masukkan / Buang ──
  const afterEdit = (msg: string) => {
    message = msg;
    compute();
    redraw();
    renderBar();
    void retire();
  };

  const canRemove = (s: { inside: number }) => !!selected && s.inside > 0 && shareOf(selected, ctx.content()) <= MAX_SHARE;
  const canAdd = (s: { outside: number }) => !!selected && s.outside > 0 && collapse(selected.textContent).length <= MAX_CHARS;

  const removePart = () => {
    const part = selected;
    if (!part) return;
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
    const shape = (r?: PersonalRule) => JSON.stringify([r?.add, r?.remove, r?.fields]);
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
    top.replaceChildren(h(doc, 'span', { class: 'ed-title' }, ctx.newSite ? t.nsTitle : t.edTitle), seg);
  };

  const fieldChips = () => {
    const wrap = h(doc, 'div', { class: 'ed-chips' });
    const lone = (key: string) => sources.find((s) => s.key === key);
    for (const f of HEADER_CHIPS) {
      const src = lone(f === 'date' ? 'date' : f);
      const name = t.edFieldNames[f];
      const hidden = src && !src.el;
      const chip = h(doc, 'button', { type: 'button', class: 'ed-chip', 'aria-pressed': String(fieldMode === f), 'data-ed': `field-${f}`, title: src?.value ?? '' }, name);
      if (hidden) chip.append(h(doc, 'span', { class: 'ed-chip-value' }, `${collapse(src.value).slice(0, 28)} · ${t.edFromData}`));
      chip.addEventListener('click', () => {
        fieldMode = fieldMode === f ? null : f;
        selected = fieldMode ? null : selected;
        message = '';
        renderBar();
        place();
      });
      wrap.append(chip);
    }
    for (const key of ['image', 'logo'] as const) {
      const src = lone(key);
      if (src && !src.el) wrap.append(h(doc, 'span', { class: 'ed-chip static' }, `${t.edFieldNames[key]} · ${t.edFromData}`));
    }
    return wrap;
  };

  const renderBar = () => {
    renderTop();
    const active = (layer.getRootNode() as ShadowRoot | Document).activeElement?.getAttribute?.('data-ed');
    const done = button(t.edDone, 'primary', 'done', finish);
    const lines: HTMLElement[] = [];
    if (mode === 'clean') {
      bar.dataset.mode = 'clean';
      bar.replaceChildren(h(doc, 'div', { class: 'ed-line' }, h(doc, 'p', { class: 'ed-text' }, t.edCleanHint), done));
    } else {
      bar.dataset.mode = 'original';
      const line = h(doc, 'div', { class: 'ed-line' });
      const text = h(doc, 'p', { class: 'ed-text' });
      if (fieldMode) {
        text.textContent = t.edPickField(t.edFieldNames[fieldMode]);
      } else if (selected) {
        const s = statusOf(selected, marks);
        const kind = s.inside && s.outside ? 'mix' : s.inside ? 'in' : 'out';
        const what = readable(selected) ? describe(cleanCopy(selected)) : selected.querySelector('img') || selected.tagName === 'IMG' ? t.edPhoto : t.edNoText;
        text.append(
          h(doc, 'span', { class: `ed-state ${kind}` }, kind === 'in' ? t.edIn : kind === 'out' ? t.edOut : t.edMixed),
          h(doc, 'span', { class: 'ed-what' }, what),
        );
      } else {
        text.textContent = ctx.newSite ? t.nsHint(doc.location?.hostname ?? '') : t.edHint;
        // The colour key, so green, red and blue never need guessing.
        text.append(h(doc, 'span', { class: 'ed-key' }, ...t.edKey.map(([k, label]) => h(doc, 'span', { class: `ed-key-item ${k}` }, label))));
      }
      line.append(text, done);
      lines.push(line);

      if (confirming) {
        lines.push(h(doc, 'p', { class: 'ed-ask' }, t.edResetAsk),
          h(doc, 'div', { class: 'ed-actions' },
            button(t.edResetYes, 'primary', 'reset-yes', () => void doReset()),
            button(t.edResetNo, '', 'reset-no', () => { confirming = false; renderBar(); })));
      } else {
        if (fieldMode) {
          lines.push(h(doc, 'div', { class: 'ed-actions' }, button(t.edFieldCancel, '', 'field-cancel', () => { fieldMode = null; renderBar(); })));
        } else if (selected) {
          const s = statusOf(selected, marks);
          const actions = h(doc, 'div', { class: 'ed-actions' });
          if (canAdd(s)) actions.append(button(t.edAdd, 'ed-add', 'add', addPart));
          if (canRemove(s)) actions.append(button(t.edRemove, 'ed-remove', 'remove', removePart));
          if (!actions.childElementCount && s.inside && !canRemove(s)) actions.append(h(doc, 'span', { class: 'ed-note' }, t.edTooBig));
          if (actions.childElementCount) lines.push(actions);
        }
        const p = ctx.personal();
        const more = button(t.edMore, 'quiet ed-more', 'more', () => { moreOpen = !moreOpen; renderBar(); }, { 'aria-expanded': String(moreOpen) });
        lines.push(h(doc, 'div', { class: 'ed-sources' }, h(doc, 'div', { class: 'ed-label-row' }, h(doc, 'span', {}, t.edSources), more), fieldChips()));
        if (moreOpen) {
          const send = h(doc, 'a', { class: 'btn', target: '_blank', rel: 'noopener', 'data-ed': 'send' }, t.edSend);
          const note = () => {
            if (!p) return '';
            const names = Object.keys(p.fields ?? {}).map((f) => t.edFieldNames[f as PersonalField]);
            const site = p.newSite ? p : newSiteRule(p);
            if (site?.newSite) return buildNewSiteNote(site, new URL(doc.location.href), t.nsSummary(ctx.site, site.remove.length, names), siteName());
            return buildEditNote(p, t.edSummary(ctx.site, p.add.length, p.remove.length, names));
          };
          const sync = () => {
            const href = p ? ctx.reportUrl(note()) : undefined;
            if (href) {
              send.setAttribute('href', href);
              send.removeAttribute('aria-disabled');
            } else {
              send.removeAttribute('href');
              send.setAttribute('aria-disabled', 'true');
            }
          };
          sync();
          send.addEventListener('click', (e) => {
            sync();
            if (send.getAttribute('aria-disabled') === 'true') e.preventDefault();
          });
          const reset = button(t.edReset, '', 'reset', () => { confirming = true; renderBar(); });
          reset.toggleAttribute('disabled', !p);
          lines.push(h(doc, 'div', { class: 'ed-actions' }, reset, send),
            ...(p ? [h(doc, 'p', { class: 'ed-note' }, t.edCount(p.add.length, p.remove.length, Object.keys(p.fields ?? {}).length))] : []));
        }
      }
      bar.replaceChildren(...lines);
    }
    status.textContent = message;
    if (message) bar.prepend(h(doc, 'p', { class: 'ed-msg', 'aria-hidden': 'true' }, message));
    if (active) layer.querySelector<HTMLElement>(`[data-ed="${active}"]`)?.focus({ preventScroll: true });
  };

  const doReset = async () => {
    confirming = false;
    await ctx.reset();
    selected = null;
    afterEdit(t.edResetDone);
  };

  // ── Modes ──
  const setMode = (next: Mode) => {
    if (next === mode) return;
    mode = next;
    boxLayer.hidden = next === 'clean';
    selNode.hidden = true;
    layer.dataset.mode = next;
    if (next === 'clean') ctx.showClean();
    else {
      ctx.showOriginal();
      compute();
      redraw();
    }
    renderBar();
    layer.querySelector<HTMLElement>(`[data-ed="view-${next}"]`)?.focus({ preventScroll: true });
  };

  /** The site this page defines, from what is green and red now (new-site mode); undefined when it cannot be named. */
  const newSiteRule = (p: PersonalRule): PersonalRule | undefined => {
    if (!ctx.newSite) return undefined;
    const body = bodyFromMarks(marks.green, marks.red, doc);
    return body ? withNewSite(p, new URL(doc.location.href), body, generalisePath(doc.location.pathname)) : undefined;
  };
  const siteName = () => doc.querySelector<HTMLMetaElement>('meta[property="og:site_name"]')?.content;
  const hadSite = !!ctx.personal()?.newSite;

  /** Selesai. In new-site mode it first saves the site; with nothing to save it stays open and says why. */
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
    close();
  }

  function close() {
    if (closed) return;
    closed = true;
    doc.removeEventListener('click', onTap, true);
    for (const type of ['mousedown', 'pointerdown', 'touchstart', 'auxclick']) doc.removeEventListener(type, block, true);
    doc.removeEventListener('keydown', onKey, true);
    win.removeEventListener('scroll', follow, { capture: true });
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
    } else if (fieldMode) {
      fieldMode = null;
      renderBar();
    } else {
      // Leaving a new site half set up drops what was saved on the way (it would show as a personal version that does nothing).
      if (ctx.newSite && !hadSite) ctx.replace(undefined);
      close();
    }
  };

  doc.addEventListener('click', onTap, true);
  for (const type of ['mousedown', 'pointerdown', 'touchstart', 'auxclick']) doc.addEventListener(type, block, true);
  doc.addEventListener('keydown', onKey, true);
  win.addEventListener('scroll', follow, { capture: true, passive: true });
  win.addEventListener('resize', follow);
  // Late layout (images loading, ads moving things) shifts boxes without a scroll.
  const timer = win.setInterval(() => (mode === 'original' ? place() : undefined), 700);

  ctx.showOriginal();
  layer.dataset.mode = 'original';
  compute();
  redraw();
  renderBar();
  layer.querySelector<HTMLElement>('[data-ed="view-clean"]')?.focus({ preventScroll: true });
  // Start at the article: scroll so its title (or first green part) sits just under the top bar.
  const anchorEl = sources.find((s) => s.key === 'title')?.el ?? marks.green[0];
  // After the page is back from behind the reader (its scrolling is restored a frame later), and again once
  // late ads above the article have pushed it down.
  // The anchor must be in the page's flow: sites repeat the headline in a fixed/sticky bar (Kompas), and that
  // copy always looks "on screen".
  const floating = (el: Element) => {
    for (let n: Element | null = el; n && n !== doc.body; n = n.parentElement) {
      if (/^(fixed|sticky)$/.test(win.getComputedStyle(n).position)) return true;
    }
    return false;
  };
  const inFlow = [sources.find((s) => s.key === 'title')?.el, ...marks.green].find(
    (el): el is Element => !!el && el.getBoundingClientRect().height > 0 && !floating(el),
  );
  const toArticle = () => {
    const anchorEl = inFlow;
    if (closed || !anchorEl?.isConnected) return;
    const r = anchorEl.getBoundingClientRect();
    if (r.top < 60 || r.top > win.innerHeight * 0.45) {
      // Set the position directly: some pages replace window.scrollTo (Kompas), which then does nothing.
      const y = Math.max(0, win.scrollY + r.top - 70);
      (doc.scrollingElement ?? doc.documentElement).scrollTop = y;
    }
  };
  win.requestAnimationFrame(() => win.requestAnimationFrame(toArticle));
  win.setTimeout(() => !selected && toArticle(), 900);
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
