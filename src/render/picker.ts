/**
 * Fingerprints of clean-view blocks (docs/FEEDBACK.md §4): what identifies a block across articles of one
 * outlet, so a removal made in the editor stays removed on every article there. The picking itself is the
 * editor's (render/editor.ts).
 */
import { collapse, textKey } from '../dom.ts';

/** Blocks a reader can pick or that a remembered pick can match. */
const BLOCK = 'p, li, ul, ol, figure, blockquote, h2, h3, h4, h5, h6, table, div, section, aside, img';

/** What identifies a block across articles of one outlet: its opening text, else its image. */
export function fingerprint(el: Element): string | undefined {
  const text = textKey(el.textContent).slice(0, 80);
  if (text.length >= 8) return `t:${text}`;
  const src = el.tagName === 'IMG' ? el.getAttribute('src') : el.querySelector('img')?.getAttribute('src');
  if (!src) return undefined;
  try {
    const u = new URL(src, el.baseURI);
    return `i:${u.hostname}${u.pathname}`.slice(0, 120);
  } catch {
    return undefined;
  }
}

/** Mark the blocks matching remembered fingerprints as hidden (and unmark the rest). Returns how many. */
export function applyHidden(content: Element, keys: ReadonlySet<string>): number {
  let n = 0;
  for (const el of content.querySelectorAll(BLOCK)) {
    const hide = keys.size > 0 && !el.parentElement?.closest('[data-user-hidden]') && keys.has(fingerprint(el) ?? '');
    el.toggleAttribute('data-user-hidden', hide);
    if (hide) n++;
  }
  return n;
}

/** The text a report shows for a pick: what the block says, or that it is a photo. */
export function describe(el: Element): string {
  const text = collapse(el.textContent);
  return text ? text.slice(0, 200) : el.querySelector('img') || el.tagName === 'IMG' ? '(foto)' : '';
}
