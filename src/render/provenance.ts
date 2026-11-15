/**
 * Where each part of the clean view came from on the live page (docs/FEEDBACK.md §3).
 *
 * Both sides are cut into "leaves": a text block with no block inside it (a paragraph, a list item, a caption,
 * a div that only holds text) or an image. A clean-view leaf is matched to a live-page leaf by the text key
 * (dom.ts textKey, the same key the removal fingerprints use) or, for images, by where the picture lives. Pure DOM
 * work with no layout, so it runs the same in tests.
 */
import { safeQueryAll, textKey } from '../dom.ts';

/** Elements that make their parent more than "a block of text". */
const BLOCK_SEL = 'p,h1,h2,h3,h4,h5,h6,li,ul,ol,div,section,article,aside,header,footer,main,nav,table,thead,tbody,tr,td,th,blockquote,figure,figcaption,pre,dl,dt,dd,form,hr,details,summary';
/** Never part of what a reader reads. */
const SKIP_SEL = 'script,style,noscript,template,svg,iframe,head,video,audio,canvas,select,option,textarea,object,embed';
const LAZY = ['data-src', 'data-original', 'data-lazy-src', 'data-srcset', 'srcset'];

export interface Leaf {
  el: Element;
  kind: 'text' | 'image';
  /** Text key, or for an image the "host/path" keys of every address it is known by. */
  keys: string[];
}

/** Where a picture lives, without the size query: "host/path", lowercase. */
export function imageKey(src: string | null | undefined, base: string): string | undefined {
  const first = (src ?? '').trim().split(/\s+/)[0];
  if (!first || first.startsWith('data:')) return undefined;
  try {
    const u = new URL(first, base);
    return `img:${u.hostname}${u.pathname}`.toLowerCase();
  } catch {
    return undefined;
  }
}

export function imageKeys(img: Element, base?: string): string[] {
  const b = base ?? img.baseURI ?? 'about:blank';
  const raw = [img.getAttribute('src'), (img as HTMLImageElement).currentSrc, ...LAZY.map((a) => img.getAttribute(a)?.split(',')[0])];
  return [...new Set(raw.map((s) => imageKey(s, b)).filter((k): k is string => !!k))];
}

/** An element's text without what is not read: inline scripts, styles, noscript (an ad slot holds its code as text). */
export function textOf(el: Element): string {
  if (!el.querySelector('script,style,noscript,template')) return el.textContent ?? '';
  const out: string[] = [];
  const walk = (n: Node) => {
    if (n.nodeType === 3) out.push(n.textContent ?? '');
    else if (n.nodeType === 1 && !/^(script|style|noscript|template)$/i.test((n as Element).tagName)) n.childNodes.forEach(walk);
  };
  walk(el);
  return out.join('');
}

/** The text and image leaves under `root` (or `root` itself), in document order. */
export function leavesOf(root: Element, skip?: (el: Element) => boolean, base?: string): Leaf[] {
  const out: Leaf[] = [];
  const walk = (el: Element) => {
    if (el.matches(SKIP_SEL) || skip?.(el)) return;
    if (el.tagName === 'IMG') {
      const keys = imageKeys(el, base);
      if (keys.length) out.push({ el, kind: 'image', keys });
      return;
    }
    if (!el.querySelector(BLOCK_SEL)) {
      const key = textKey(textOf(el));
      if (key.length >= 2) out.push({ el, kind: 'text', keys: [key] });
      for (const img of el.querySelectorAll('img')) {
        const keys = imageKeys(img, base);
        if (keys.length) out.push({ el: img, kind: 'image', keys });
      }
      return;
    }
    for (const child of el.children) walk(child);
  };
  walk(root);
  return out;
}

export interface MatchOptions {
  /** Live elements whose leaves are matched last, so a twin of their text elsewhere gets the clean leaf first. */
  last?: readonly Element[];
  skipClean?: (el: Element) => boolean;
  skipLive?: (el: Element) => boolean;
}

export interface Matched {
  /** live leaf → clean leaf */
  pairs: Map<Element, Element>;
  live: Leaf[];
}

/** Match the clean view's leaves to the live page's, each live leaf at most once. */
export function matchLeaves(clean: Element, page: Document, opts: MatchOptions = {}): Matched {
  const root = page.body ?? page.documentElement;
  const base = page.baseURI;
  const live = leavesOf(root, opts.skipLive, base);
  const inLast = (el: Element) => !!opts.last?.some((l) => l === el || l.contains(el));
  const order = opts.last?.length ? [...live.filter((l) => !inLast(l.el)), ...live.filter((l) => inLast(l.el))] : live;
  const byKey = new Map<string, Leaf[]>();
  for (const l of order) for (const k of l.keys) (byKey.get(k) ?? byKey.set(k, []).get(k)!).push(l);
  const used = new Set<Leaf>();
  const pos = new Map<Leaf, number>(live.map((l, i) => [l, i]));
  const cleanLeaves = leavesOf(clean, opts.skipClean, base);
  const hits: Array<Leaf | undefined> = [];
  // Exact matches first, each preferring the live leaf after the one before (articles keep their order, so a
  // twin earlier on the page, a share box or a translation copy, is not taken for the paragraph).
  let cursor = -1;
  cleanLeaves.forEach((c, i) => {
    const cands = c.keys.flatMap((k) => byKey.get(k) ?? []).filter((l) => !used.has(l) && l.kind === c.kind);
    const hit = cands.find((l) => pos.get(l)! > cursor) ?? cands[0];
    if (hit) {
      used.add(hit);
      hits[i] = hit;
      cursor = pos.get(hit)!;
    }
  });
  // Then text the clean view split or joined: the same start, or a live block written inside the clean one. The
  // candidate nearest to where its neighbours matched wins.
  cleanLeaves.forEach((c, i) => {
    if (hits[i] || c.kind !== 'text' || c.keys[0]!.length < 24) return;
    const key = c.keys[0]!;
    const head = key.slice(0, 60);
    const fits = (l: Leaf) => l.kind === 'text' && !used.has(l) && (l.keys[0]!.startsWith(head) || (l.keys[0]!.length >= 24 && key.includes(l.keys[0]!.slice(0, 60))));
    const cands = order.filter(fits);
    if (!cands.length) return;
    const before = hits.slice(0, i).reverse().find(Boolean);
    const after = hits.slice(i + 1).find(Boolean);
    const expected = after ? pos.get(after)! - 1 : before ? pos.get(before)! + 1 : undefined;
    const hit = expected === undefined ? cands[0]! : cands.reduce((best, l) => (Math.abs(pos.get(l)! - expected) < Math.abs(pos.get(best)! - expected) ? l : best));
    used.add(hit);
    hits[i] = hit;
  });
  const pairs = new Map<Element, Element>();
  cleanLeaves.forEach((c, i) => hits[i] && pairs.set(hits[i]!.el, c.el));

  // A dateline the clean view joined into the paragraph that follows ("Jakarta -" + the first paragraph): the
  // short text next to a matched block, written in the block it was joined to, belongs to it.
  const cleanKeyOf = new Map<Element, string>();
  for (const [liveEl, cleanEl] of [...pairs]) {
    const siblings = liveEl.parentElement ? live.filter((l) => l.kind === 'text' && !pairs.has(l.el) && l.el.parentElement === liveEl.parentElement) : [];
    if (!siblings.length) continue;
    const key = cleanKeyOf.get(cleanEl) ?? textKey(cleanEl.textContent);
    cleanKeyOf.set(cleanEl, key);
    for (const l of siblings) if (l.keys[0]!.length <= 40 && key.includes(l.keys[0]!)) pairs.set(l.el, cleanEl);
  }
  return { pairs, live };
}

/** Elements of the list that no other element of the list contains. */
export function outermost<T extends Element>(els: Iterable<T>): T[] {
  const all = [...new Set(els)];
  return all.filter((e) => !all.some((o) => o !== e && o.contains(e)));
}

/**
 * Hide the clean-view parts that come from page elements the selectors hit (a personal "remove" selector
 * applied to a clean view that was extracted before it existed). Returns how many were hidden.
 */
export function hideMatching(content: Element, page: Document, selectors: readonly string[]): number {
  const hits = outermost(selectors.flatMap((s) => safeQueryAll(page, s)));
  if (!hits.length) return 0;
  const { pairs } = matchLeaves(content, page, { last: hits });
  let n = 0;
  for (const [live, clean] of pairs) {
    if (!hits.some((h) => h === live || h.contains(live))) continue;
    clean.setAttribute('data-user-hidden', '');
    n++;
  }
  return n;
}
