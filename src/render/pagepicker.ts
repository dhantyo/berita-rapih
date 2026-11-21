/**
 * Parts of the original page the clean view left out, added back by the reader (docs/FEEDBACK.md §3): copied
 * into the clean view at the matching place, remembered for the outlet by a selector made of stable class
 * names. Choosing the part is the editor's (render/editor.ts); this module makes the selector and does the copy.
 *
 * Why not a "unique selector" library (@medv/finder and the like): those aim for a selector unique to
 * this page, which usually means nth-child positions and per-article ids, and those break on the next
 * article. Here the selector only has to find the same kind of block on other articles of the outlet.
 */
import { collapse, textKey } from '../dom.ts';
import { sanitize } from '../clean/sanitize.ts';
import { prepareMedia } from '../clean/index.ts';
import { convertEmbeds } from '../clean/embeds.ts';
import { ampRun, imageKeys } from './provenance.ts';

/** Class names that describe what a block is, not its state or a build hash. */
const STABLE_CLASS = /^[a-z][\w-]{2,}$/i;
const UNSTABLE_CLASS = /\d{3,}|[0-9a-f]{6,}|^i-amphtml|^(active|show|shown|open|selected|current|lazy|loaded|visible|hidden|js-|is-|has-)/i;
/** One step of a selector: the tag with up to two stable class names. */
export function selectorPart(el: Element): string {
  const classes = [...el.classList].filter((c) => STABLE_CLASS.test(c) && !UNSTABLE_CLASS.test(c)).slice(0, 2);
  return el.tagName.toLowerCase() + classes.map((c) => `.${c}`).join('');
}

/**
 * A selector that finds this block first on its page, built from tags and stable classes only (no ids,
 * no positions), climbing at most three ancestors. Undefined when the block has no such handle.
 */
export function stableSelector(el: Element): string | undefined {
  const doc = el.ownerDocument;
  let sel = selectorPart(el);
  let cur: Element | null = el;
  for (let i = 0; i < 4 && cur; i++) {
    if (sel.includes('.')) {
      try {
        if (doc.querySelector(sel) === el) return sel;
      } catch {
        return undefined;
      }
    }
    cur = cur.parentElement;
    if (!cur || cur === doc.body || cur === doc.documentElement) break;
    sel = `${selectorPart(cur)} > ${sel}`;
  }
  return undefined;
}

const TEXT_BLOCKS = 'p, h2, h3, h4, li, figcaption, blockquote';
const MEDIA = 'img, picture, video, iframe, amp-img';

/** Text blocks in the clean view, keyed by how they start, to anchor added parts next to their neighbours. */
function readerAnchors(content: Element): Map<string, Element> {
  const anchors = new Map<string, Element>();
  for (const el of content.querySelectorAll(TEXT_BLOCKS)) {
    const key = textKey(el.textContent).slice(0, 60);
    if (key.length >= 20 && !anchors.has(key)) anchors.set(key, el);
  }
  return anchors;
}

/** Photos in the clean view by every address they are known by. */
function readerImages(content: Element): Map<string, Element> {
  const out = new Map<string, Element>();
  for (const img of content.querySelectorAll('img')) {
    if (img.closest('[data-user-hidden]')) continue;
    for (const k of imageKeys(img)) if (!out.has(k)) out.set(k, img);
  }
  return out;
}

/** The top-level block of the article that holds `el`. */
function topBlock(el: Element, content: Element): Element {
  let cur = el;
  while (cur.parentElement && cur.parentElement !== content) cur = cur.parentElement;
  return cur;
}

/** The clean-view block an added part goes after: the last article text or photo that precedes it on the page. */
function anchorFor(source: Element, content: Element): Element | null {
  const anchors = readerAnchors(content);
  const images = readerImages(content);
  let found: Element | null = null;
  for (const el of source.ownerDocument.body.querySelectorAll(`${TEXT_BLOCKS}, img`)) {
    if (!(el.compareDocumentPosition(source) & Node.DOCUMENT_POSITION_FOLLOWING)) break; // at or past the part
    const hit = el.tagName === 'IMG' ? imageKeys(el).map((k) => images.get(k)).find(Boolean) : anchors.get(textKey(el.textContent).slice(0, 60));
    if (hit && !hit.closest('[data-user-added]')) found = hit;
  }
  return found && topBlock(found, content);
}

/** The part's own text start, when it has enough text to be recognised. */
const textStart = (el: Element) => {
  const key = textKey(el.textContent).slice(0, 60);
  return key.length >= 20 ? key : '';
};

/**
 * What of a page part the clean view already shows: its text (by how it starts), and which of its photos are still
 * missing. A photo whose caption made it into the clean view while the photo itself didn't is the common case.
 */
export function shownIn(source: Element, content: Element): { text: boolean; missing: Element[] } {
  const key = textStart(source);
  const images = readerImages(content);
  // Each photo once: a plain image, or the last (largest) of an AMP run of sizes.
  const all = /^(IMG|AMP-IMG)$/.test(source.tagName) ? [source] : [...source.querySelectorAll('img, amp-img')];
  const pics = new Set<Element>();
  for (const el of all) {
    const run = ampRun(el);
    if (run.length) pics.add(run[run.length - 1]!);
    else if (el.tagName === 'IMG') pics.add(el);
  }
  const missing = [...pics].filter((img) => {
    const keys = imageKeys(img);
    return keys.length > 0 && !keys.some((k) => images.has(k));
  });
  // A part with no text of its own (a bare photo) has no text to miss.
  return { text: key ? readerAnchors(content).has(key) : !collapse(source.textContent), missing };
}

/** A copy of page elements, made to show outside the page and cleaned like the article. */
function cleanedCopy(parts: Element[], doc: Document, wrap: boolean): HTMLElement {
  const holder = doc.createElement('div');
  // Bare photos go in a block of their own: the sanitizer may drop a lone image at the top of its input.
  const box = wrap ? holder.appendChild(doc.createElement('div')) : holder;
  for (const part of parts) box.append(part.cloneNode(true));
  convertEmbeds(holder);
  let base: URL | undefined;
  try {
    base = new URL(parts[0]!.ownerDocument.baseURI);
  } catch {
    base = undefined;
  }
  if (base) prepareMedia(holder, base);
  return sanitize(holder);
}

/** One element stays as it is; anything else (the sanitizer may unwrap a container) goes in one block. */
function asBlock(cleaned: HTMLElement, doc: Document): Element {
  const only = cleaned.childElementCount === 1 && !collapse([...cleaned.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(''));
  if (only) return cleaned.firstElementChild!;
  const block = doc.createElement('div');
  block.append(...cleaned.childNodes);
  return block;
}

/**
 * Copy a part of the original page into the clean view, cleaned like the article, at its place. When the clean view
 * already has the part's text (a photo's caption), only its missing photos are copied, next to that text.
 */
export function insertFromPage(source: Element, content: HTMLElement, only?: Element[]): Element | undefined {
  const doc = content.ownerDocument;
  const cleaned = cleanedCopy(only?.length ? only : [source], doc, !!only?.length || /^(IMG|AMP-IMG|PICTURE)$/.test(source.tagName));
  if (!collapse(cleaned.textContent) && !cleaned.querySelector(MEDIA)) return undefined;
  const clean = asBlock(cleaned, doc);
  clean.setAttribute('data-user-added', '');
  if (only?.length) {
    // Next to the text the clean view already has: before it when the photo comes first on the page (a caption).
    const key = textStart(source);
    const text = key ? readerAnchors(content).get(key) : undefined;
    if (text) {
      const photoFirst = !!(only[0]!.compareDocumentPosition(firstText(source) ?? source) & Node.DOCUMENT_POSITION_FOLLOWING);
      const figure = text.closest('figure');
      if (figure && content.contains(figure) && photoFirst) figure.prepend(clean);
      else if (photoFirst) topBlock(text, content).before(clean);
      else topBlock(text, content).after(clean);
      return clean;
    }
  }
  const after = anchorFor(source, content);
  if (after) after.after(clean);
  else content.prepend(clean);
  return clean;
}

/** The first element of a part that holds text of its own. */
function firstText(el: Element): Element | undefined {
  return [...el.querySelectorAll('*')].find((e) => !e.querySelector('*') && collapse(e.textContent).length > 0);
}

/** Re-add remembered parts (selectors) from the live page; earlier copies are replaced. */
export function applyAdded(content: HTMLElement, selectors: Iterable<string>, page: Document): number {
  for (const el of content.querySelectorAll('[data-user-added]')) el.remove();
  let n = 0;
  for (const sel of selectors) {
    let source: Element | null = null;
    try {
      source = page.querySelector(sel);
    } catch {
      continue;
    }
    if (!source) continue;
    // Skip what the clean view already has (the site rule may have been fixed since), photos included.
    const shown = shownIn(source, content);
    if (shown.text && !shown.missing.length) continue;
    if (insertFromPage(source, content, shown.text ? shown.missing : undefined)) n++;
  }
  return n;
}
