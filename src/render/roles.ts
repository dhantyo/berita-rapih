/**
 * What a block of the article is shown as, when the reader said so in the editor (docs/FEEDBACK.md §3): a
 * subheading, a photo caption, a quote, or plain text (undoing the site's own heading or caption). The reader's
 * choice is kept as a selector of the page part or a fingerprint of the block (personal rule `as`), and shown by
 * marking the clean-view block with `data-user-as`, which the reader styles like the real thing. Marking instead of
 * rebuilding keeps it reversible: every apply starts by clearing the marks.
 */
import { safeQueryAll } from '../dom.ts';
import { isFingerprint, type PersonalRole, type PersonalRule } from '../personal.ts';
import { fingerprint } from './picker.ts';
import { leavesOf, matchLeaves, outermost } from './provenance.ts';

export const ROLES: readonly PersonalRole[] = ['text', 'heading', 'caption', 'quote'];
const ROLE_SEL: Record<Exclude<PersonalRole, 'text'>, string> = { heading: 'h2, h3, h4, h5, h6', caption: 'figcaption', quote: 'blockquote' };
const ANY_ROLE = Object.values(ROLE_SEL).join(', ');

/** What the article itself makes a clean-view block (ignoring the reader's marks). */
export function officialRole(el: Element, content: Element): PersonalRole {
  const box = el.closest(ANY_ROLE);
  if (!box || !content.contains(box)) return 'text';
  for (const [role, sel] of Object.entries(ROLE_SEL)) if (box.matches(sel)) return role as PersonalRole;
  return 'text';
}

/** What a clean-view block shows as now: the reader's mark, else what the article makes it. */
export function shownRole(el: Element, content: Element): PersonalRole {
  const marked = el.closest('[data-user-as]');
  return marked && content.contains(marked) ? (marked.getAttribute('data-user-as') as PersonalRole) : officialRole(el, content);
}

/** The clean-view blocks an entry (selector or fingerprint) points at. */
export function blocksFor(entry: string, content: Element, page: Document): Element[] {
  if (isFingerprint(entry)) {
    return leavesOf(content, (el) => el.hasAttribute('data-user-hidden')).filter((l) => fingerprint(l.el) === entry).map((l) => l.el);
  }
  const hits = outermost(safeQueryAll(page, entry));
  if (!hits.length) return [];
  const { pairs } = matchLeaves(content, page, { first: hits, skipClean: (el) => el.hasAttribute('data-user-hidden') });
  const out: Element[] = [];
  for (const [live, clean] of pairs) if (hits.some((h) => h === live || h.contains(live))) out.push(clean);
  return [...new Set(out)];
}

/** Mark the blocks the reader gave another role; earlier marks are cleared first. Returns how many were marked. */
export function applyRoles(content: Element, as: PersonalRule['as'], page: Document): number {
  for (const el of content.querySelectorAll('[data-user-as]')) {
    if (el.getAttribute('data-user-as') === 'heading') {
      el.removeAttribute('role');
      el.removeAttribute('aria-level');
    }
    el.removeAttribute('data-user-as');
  }
  let n = 0;
  for (const role of ROLES) {
    for (const entry of as?.[role] ?? []) {
      for (const block of blocksFor(entry, content, page)) {
        // Plain text undoes the box the block sits in (a heading, a caption, a quote box), not just its line.
        const target = role === 'text' ? (block.closest(ANY_ROLE) ?? block) : block;
        if (!content.contains(target) || target === content) continue;
        target.setAttribute('data-user-as', role);
        if (role === 'heading') {
          target.setAttribute('role', 'heading');
          target.setAttribute('aria-level', '2');
        }
        n++;
      }
    }
  }
  return n;
}

/** Whether the article itself already shows every block the entry points at in this role. */
export function roleRedundant(role: PersonalRole, entry: string, content: Element, page: Document): boolean {
  const blocks = blocksFor(entry, content, page);
  return blocks.length > 0 && blocks.every((b) => officialRole(b, content) === role);
}
