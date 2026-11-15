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

/** Class names that describe what a block is, not its state or a build hash. */
const STABLE_CLASS = /^[a-z][\w-]{2,}$/i;
const UNSTABLE_CLASS = /\d{3,}|[0-9a-f]{6,}|^(active|show|shown|open|selected|current|lazy|loaded|visible|hidden|js-|is-|has-)/i;
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

/** Text blocks in the clean view, keyed by how they start, to anchor added parts next to their neighbours. */
function readerAnchors(content: Element): Map<string, Element> {
  const anchors = new Map<string, Element>();
  for (const el of content.querySelectorAll('p, h2, h3, h4, li, figcaption, blockquote')) {
    const key = textKey(el.textContent).slice(0, 60);
    if (key.length >= 20 && !anchors.has(key)) anchors.set(key, el);
  }
  return anchors;
}

/** The clean-view block an added part goes after: the last article text that precedes it on the page. */
function anchorFor(source: Element, content: Element): Element | null {
  const anchors = readerAnchors(content);
  let found: Element | null = null;
  for (const el of source.ownerDocument.body.querySelectorAll('p, h2, h3, h4, li, figcaption, blockquote')) {
    if (!(el.compareDocumentPosition(source) & Node.DOCUMENT_POSITION_FOLLOWING)) break; // at or past the part
    const hit = anchors.get(textKey(el.textContent).slice(0, 60));
    if (hit) found = hit;
  }
  // Insert at the top level of the article.
  while (found && found.parentElement && found.parentElement !== content) found = found.parentElement;
  return found;
}

/** Copy a part of the original page into the clean view, cleaned like the article, at its place. */
export function insertFromPage(source: Element, content: HTMLElement): Element | undefined {
  const doc = content.ownerDocument;
  const holder = doc.createElement('div');
  holder.append(source.cloneNode(true));
  const cleaned = sanitize(holder);
  if (!collapse(cleaned.textContent) && !cleaned.querySelector('img')) return undefined;
  // One element stays as it is; anything else (the sanitizer may unwrap a container) goes in one block.
  const only = cleaned.childElementCount === 1 && !collapse([...cleaned.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(''));
  let clean: Element;
  if (only) clean = cleaned.firstElementChild!;
  else {
    clean = doc.createElement('div');
    clean.append(...cleaned.childNodes);
  }
  clean.setAttribute('data-user-added', '');
  const after = anchorFor(source, content);
  if (after) after.after(clean);
  else content.prepend(clean);
  return clean;
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
    // Skip what the clean view already has (the site rule may have been fixed since).
    const key = source && textKey(source.textContent).slice(0, 60);
    if (!source || (key && key.length >= 20 && readerAnchors(content).has(key))) continue;
    if (insertFromPage(source, content)) n++;
  }
  return n;
}
