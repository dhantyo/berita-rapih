/**
 * The editor's logic without its screen (docs/FEEDBACK.md §3): what is green and red on the page, which
 * element a dragged rectangle snaps to, where the header labels go, and the note "Kirim usulan" sends.
 * Layout comes in as plain numbers or a `visible` predicate, so all of it runs in tests.
 */
import { collapse, safeQueryAll, textKey } from '../dom.ts';
import { isFingerprint, type PersonalField, type PersonalRule } from '../personal.ts';
import { fingerprint } from './picker.ts';
import { leavesOf, matchLeaves, imageKeys, imageKey, outermost } from './provenance.ts';
import { parseNewsDate } from './dates.ts';

// ── Geometry ─────────────────────────────────────────────────────────────────────────────────────────

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export const area = (r: Rect): number => Math.max(0, r.right - r.left) * Math.max(0, r.bottom - r.top);

export function intersection(a: Rect, b: Rect): Rect {
  return { left: Math.max(a.left, b.left), top: Math.max(a.top, b.top), right: Math.min(a.right, b.right), bottom: Math.min(a.bottom, b.bottom) };
}

/** Intersection over union: 1 for the same box, 0 for boxes that do not touch. */
export function iou(a: Rect, b: Rect): number {
  const inter = area(intersection(a, b));
  const union = area(a) + area(b) - inter;
  return union > 0 ? inter / union : 0;
}

/** The rectangle spanned by two points, whichever corner each is. */
export const spanned = (ax: number, ay: number, bx: number, by: number): Rect => ({
  left: Math.min(ax, bx), top: Math.min(ay, by), right: Math.max(ax, bx), bottom: Math.max(ay, by),
});

/**
 * The candidate whose box fits the dragged rectangle best (highest IoU). A tie goes to the earlier candidate,
 * so list the current one first. Nothing when no candidate overlaps enough.
 */
export function snapBest<T>(drag: Rect, candidates: ReadonlyArray<{ item: T; rect: Rect }>, minIou = 0.15): T | undefined {
  let best: T | undefined;
  let bestScore = minIou;
  for (const c of candidates) {
    const score = iou(drag, c.rect);
    if (score > bestScore + 0.005) {
      best = c.item;
      bestScore = score;
    }
  }
  return best;
}

// ── Green and red ────────────────────────────────────────────────────────────────────────────────────

export interface Marks {
  /** Page leaves the clean view takes (paragraphs, captions, photos). */
  green: Element[];
  /** Page parts inside the article the clean view leaves out, outermost first (a "Baca juga" box, a promo). */
  red: Element[];
  /** The page element around all the green text. */
  region: Element | null;
  /** page leaf → the clean-view element it became */
  cleanOf: Map<Element, Element>;
}

export interface MarkOptions {
  /** Selectors the rule removes (common + site + adblock): what they hit inside the article is red too. */
  removeSelectors?: readonly string[];
  /** Page elements that are header sources (title, author, date…): never red. */
  header?: readonly Element[];
  /** Whether an element shows on the page (layout). Defaults to everything. */
  visible?: (el: Element) => boolean;
  /** Page elements that are not the page's (the reader's own host). */
  skipLive?: (el: Element) => boolean;
}

/**
 * The deepest element holding most (80%) of the text: the article's box. A stray match elsewhere on the page
 * (a menu item with the same words as a clean-view line) must not stretch the region to the whole page.
 */
function mainRegion(leaves: Element[]): Element | null {
  const weight = new Map<Element, number>();
  let total = 0;
  for (const el of leaves) {
    const w = Math.max(1, (el.textContent ?? '').length);
    total += w;
    for (let a: Element | null = el; a; a = a.parentElement) weight.set(a, (weight.get(a) ?? 0) + w);
  }
  let best: Element | null = null;
  let bestDepth = -1;
  for (const [el, w] of weight) {
    if (w < total * 0.8) continue;
    let depth = 0;
    for (let a = el.parentElement; a; a = a.parentElement) depth++;
    if (depth > bestDepth) {
      best = el;
      bestDepth = depth;
    }
  }
  return best;
}

/**
 * Match the clean view back to the live page. Green: leaves with a counterpart in the clean view. Red: inside
 * the region around the green text, text or photos with no counterpart (the rule or a personal removal took
 * them out), grouped up to the biggest box that holds no green; plus what the rule's remove selectors hit.
 */
export function computeMarks(clean: Element, page: Document, o: MarkOptions = {}): Marks {
  const visible = o.visible ?? (() => true);
  const { pairs, live } = matchLeaves(clean, page, { skipClean: (el) => el.hasAttribute('data-user-hidden'), skipLive: o.skipLive });
  const green = live.filter((l) => pairs.has(l.el)).map((l) => l.el);
  const textGreen = green.filter((el) => el.tagName !== 'IMG');
  const region = mainRegion(textGreen.length ? textGreen : green);
  const marks: Marks = { green, red: [], region, cleanOf: pairs };
  if (!region) return marks;

  const header = [...(o.header ?? [])];
  const isHeader = (el: Element) => header.some((h) => h === el || h.contains(el) || el.contains(h));
  const greenUp = new Set<Element>();
  for (const g of green) for (let a = g.parentElement; a; a = a.parentElement) greenUp.add(a);
  const headerUp = new Set<Element>();
  for (const h of header) for (let a: Element | null = h; a; a = a.parentElement) headerUp.add(a);

  const bounded = region !== page.body && region !== page.documentElement;
  const reds: Element[] = [];
  if (bounded) {
    for (const l of live) {
      if (pairs.has(l.el) || l.el === region || !region.contains(l.el) || isHeader(l.el) || !visible(l.el)) continue;
      let cur: Element = l.el;
      while (cur.parentElement && cur.parentElement !== region && region.contains(cur.parentElement) && !greenUp.has(cur.parentElement) && !headerUp.has(cur.parentElement)) {
        cur = cur.parentElement;
      }
      reds.push(cur);
    }
  }
  for (const sel of o.removeSelectors ?? []) {
    for (const el of safeQueryAll(bounded ? region : page, sel)) {
      if (el === region || greenUp.has(el) || isHeader(el) || !visible(el)) continue;
      if (!bounded && !(el.textContent ?? '').trim() && !el.querySelector('img')) continue;
      reds.push(el);
    }
  }
  marks.red = outermost(reds).filter((el) => !greenUp.has(el));
  return marks;
}

/** The mark (green leaf or red group) that holds `target`, the innermost when marks nest. */
export function markAt(target: Element, marks: Marks): { el: Element; kind: 'in' | 'out' } | undefined {
  let best: { el: Element; kind: 'in' | 'out' } | undefined;
  const consider = (el: Element, kind: 'in' | 'out') => {
    if (el.contains(target) && (!best || best.el.contains(el))) best = { el, kind };
  };
  for (const g of marks.green) consider(g, 'in');
  for (const r of marks.red) consider(r, 'out');
  return best;
}

/** How much of a part is in the clean view: counts of its leaves that are green and that are not. */
export function statusOf(part: Element, marks: Marks): { inside: number; outside: number } {
  const green = new Set(marks.green);
  let inside = 0;
  let outside = 0;
  for (const l of leavesOf(part)) (green.has(l.el) ? inside++ : outside++);
  return { inside, outside };
}

// ── Header sources ───────────────────────────────────────────────────────────────────────────────────

export type HeaderKey = 'title' | 'byline' | 'editor' | 'date' | 'image' | 'logo';

export interface HeaderMeta {
  title?: string;
  byline?: string;
  editor?: string;
  published?: string;
  image?: string;
  logo?: string;
}

export interface HeaderSource {
  key: HeaderKey;
  /** What the reader shows for it. */
  value: string;
  /** The visible page element it is written on; none when the value comes from hidden page data. */
  el?: Element;
}

const TEXT_TAGS = 'h1,h2,h3,h4,a,span,p,div,time,strong,b,small,li,em,address,cite,figcaption,td,dd';

/** "15 11 2026" style pieces a page writes a date with: year, and the time as the page's Jakarta clock. */
function dateParts(iso: string): { year: string; time: string } | undefined {
  const d = parseNewsDate(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? '';
  return { year: get('year'), time: `${get('hour')} ${get('minute')}` };
}

const firstVisible = (els: Element[], visible: (el: Element) => boolean) => els.find(visible);

/** Deepest elements (none has a child that also qualifies) among those that match. */
function deepest(els: Element[]): Element[] {
  const set = new Set(els);
  return els.filter((e) => ![...set].some((o) => o !== e && e.contains(o)));
}

/**
 * Where each header value is written on the page: the element the reader chose (a personal field selector),
 * else the visible element whose text equals the value. A value no visible element shows has no `el`.
 */
export function findHeaderSources(
  page: Document,
  meta: HeaderMeta,
  fields: PersonalRule['fields'],
  visible: (el: Element) => boolean = () => true,
  skip: (el: Element) => boolean = () => false,
): HeaderSource[] {
  const out: HeaderSource[] = [];
  const all = [...page.querySelectorAll(TEXT_TAGS)].filter((e) => !skip(e));
  const byText = (value: string) => {
    const key = textKey(value);
    if (key.length < 2) return [];
    return deepest(all.filter((e) => e.textContent!.length < value.length * 3 + 40 && textKey(e.textContent) === key));
  };
  const text: Array<[HeaderKey, string | undefined, PersonalField]> = [
    ['title', meta.title, 'title'], ['byline', meta.byline, 'byline'], ['editor', meta.editor, 'editor'],
  ];
  for (const [key, value, field] of text) {
    if (!value) continue;
    const chosen = fields?.[field] ? safeQueryAll(page, fields[field]!)[0] : undefined;
    out.push({ key, value, el: chosen && visible(chosen) ? chosen : firstVisible(byText(value), visible) });
  }
  if (meta.published) {
    const chosen = fields?.date ? safeQueryAll(page, fields.date)[0] : undefined;
    let el = chosen && visible(chosen) ? chosen : undefined;
    const parts = dateParts(meta.published);
    if (!el && parts) {
      const t = parseNewsDate(meta.published).getTime();
      const times = [...page.querySelectorAll('time[datetime]')].filter((e) => Math.abs(parseNewsDate(e.getAttribute('datetime')!).getTime() - t) < 60_000);
      el = firstVisible(times, visible);
      if (!el) {
        const hits = all.filter((e) => {
          const k = textKey(e.textContent);
          return k.length < 90 && k.includes(parts.year) && k.includes(parts.time);
        });
        el = firstVisible(deepest(hits), visible);
      }
    }
    out.push({ key: 'date', value: meta.published, el });
  }
  const pics = (value: string | undefined, key: HeaderKey) => {
    if (!value) return;
    const want = imageKey(value, page.baseURI);
    const imgs = want ? [...page.querySelectorAll('img')].filter((i) => !skip(i) && imageKeys(i, page.baseURI).includes(want)) : [];
    out.push({ key, value, el: firstVisible(imgs, visible) });
  };
  pics(meta.image, 'image');
  pics(meta.logo, 'logo');
  return out;
}

// ── Personal rule helpers the editor needs ───────────────────────────────────────────────────────────

/** Whether the live element is something this entry (selector or fingerprint) refers to. */
export function entryCovers(entry: string, part: Element, page: Document): boolean {
  if (isFingerprint(entry)) {
    return fingerprint(part) === entry || leavesOf(part).some((l) => fingerprint(l.el) === entry);
  }
  return safeQueryAll(page, entry).some((x) => x === part || x.contains(part) || part.contains(x));
}

/** What to save for removing this part: a selector when one picks out exactly it, else its text fingerprint. */
export function removalFor(part: Element, selector: string | undefined, page: Document): string | undefined {
  if (selector && safeQueryAll(page, selector).length === 1) return selector;
  return fingerprint(part);
}

/** The share of the article's text a part holds (a pick may not swallow the article). */
export const shareOf = (part: Element, clean: Element): number => collapse(part.textContent).length / (collapse(clean.textContent).length || 1);

// ── The note "Kirim usulan" sends ────────────────────────────────────────────────────────────────────

/** The personal rule as compact JSON, ready to apply to rules/sites/<id>.json; trimmed (oldest first) to fit a link. */
export function compactRule(p: PersonalRule, maxChars = 1400): string {
  const body = { site: p.site, add: [...p.add], remove: [...p.remove], ...(p.fields ? { fields: p.fields } : {}) };
  let json = JSON.stringify(body);
  while (json.length > maxChars && (body.remove.length || body.add.length)) {
    if (body.remove.length >= body.add.length) body.remove.shift();
    else body.add.shift();
    json = JSON.stringify(body);
  }
  return json;
}

/** One human line, then the JSON. */
export const buildEditNote = (p: PersonalRule, summary: string): string => `${collapse(summary)}\n${compactRule(p)}`;
