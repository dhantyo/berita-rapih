/**
 * Personal rules (docs/FEEDBACK.md §4): the reader's own edits for one outlet, merged over the official
 * site rule before extraction. Pure functions plus small list helpers the editor and the settings call.
 *
 * Where each part applies:
 *   remove selectors  -> rule.remove (applyPersonal), so the pipeline drops them
 *   remove fingerprints ("t:…", "i:…") and add selectors -> the finished article (applyPersonalContent),
 *                        at run() and again by the overlay when the lists change (Tandai, Pilih, Kembalikan)
 *   fields            -> read from the live page before the JSON-LD fallbacks (extractMetadata)
 *   newSite           -> a whole SiteRule (ruleFromPersonal) for a site without an official rule
 */
import type { ArticleMeta, ResolvedRule, RuleSet, SiteRule } from './types.ts';
import { collapse, safeQuery, textKey } from './dom.ts';
import { hostMatches, resolveSite } from './rules/match.ts';
import { applyHidden } from './render/picker.ts';
import { applyAdded } from './render/pagepicker.ts';

export type PersonalField = 'title' | 'byline' | 'editor' | 'date';
export const PERSONAL_FIELDS: readonly PersonalField[] = ['title', 'byline', 'editor', 'date'];

export interface PersonalRule {
  /** Rule id (or hostname for a new site). */
  site: string;
  /** Selectors: parts of the original page to include, placed by page position (render/pagepicker.ts). */
  add: string[];
  /** Selectors and/or text fingerprints ("t:…", "i:…", render/picker.ts) of parts to drop. */
  remove: string[];
  /** Selectors read from the live page before the JSON-LD fallbacks. */
  fields?: Partial<Record<PersonalField, string>>;
  /** A site without an official rule (bookmark only). */
  newSite?: { domains: string[]; articleUrl: string; body: string[] };
  /** ISO date of the last edit. */
  updated: string;
}

export const MAX_PERSONAL_RULES = 40;
export const MAX_ENTRIES = 100;
const MAX_LEN = 200;

/** "t:…" / "i:…" removals are fingerprints (picker.ts); anything else is a CSS selector. */
export const isFingerprint = (s: string): boolean => /^[ti]:/.test(s);

const today = () => new Date().toISOString().slice(0, 10);

// ── Applying a rule ──────────────────────────────────────────────────────────────────────────────────

/** The official rule with the personal removal selectors added (fingerprints and `add` act on the content). */
export function applyPersonal(rule: ResolvedRule, p: PersonalRule): ResolvedRule {
  const extra = p.remove.filter((s) => !isFingerprint(s) && !rule.remove.includes(s));
  return extra.length ? { ...rule, remove: [...rule.remove, ...extra] } : rule;
}

/** Add the personal parts at their place and mark the fingerprinted blocks hidden. Safe to repeat. */
export function applyPersonalContent(content: HTMLElement, p: PersonalRule | undefined, page: Document): void {
  if (!p) return;
  applyAdded(content, p.add, page);
  applyHidden(content, new Set(p.remove.filter(isFingerprint)));
}

/** What a field selector reads on the page: a date's machine value when it has one, else the visible text. */
export function readField(doc: ParentNode, selector: string, field?: PersonalField): string | undefined {
  const el = safeQuery(doc, selector);
  if (!el) return undefined;
  if (field === 'date') {
    const machine = el.getAttribute('datetime') ?? el.getAttribute('content') ?? el.querySelector('time')?.getAttribute('datetime');
    if (machine) return machine.trim();
  }
  const text = collapse(el.getAttribute('content') ?? el.textContent);
  return text || undefined;
}

type MetaOverrides = Partial<Pick<ArticleMeta, 'title' | 'byline' | 'editor' | 'published'>>;

/** Metadata overrides from the personal field selectors (what is on the page wins over page data). */
export function personalMeta(doc: ParentNode, fields: PersonalRule['fields']): MetaOverrides {
  const out: MetaOverrides = {};
  for (const f of PERSONAL_FIELDS) {
    const sel = fields?.[f];
    const value = sel ? readField(doc, sel, f) : undefined;
    if (value) out[f === 'date' ? 'published' : f] = value;
  }
  return out;
}

// ── A new site ───────────────────────────────────────────────────────────────────────────────────────

/** A full site rule from a personal rule that defines a site. Plain extraction: no pagination, no variants. */
export function ruleFromPersonal(p: PersonalRule): SiteRule | undefined {
  const n = p.newSite;
  if (!n || !n.body.length || !n.domains.length) return undefined;
  return {
    id: p.site,
    name: p.site,
    domains: n.domains,
    articleUrl: n.articleUrl,
    body: n.body,
    remove: p.remove.filter((s) => !isFingerprint(s)),
    pagination: { method: 'none' },
  };
}

/** The personal site rule, resolved, when it covers this URL. */
export function matchPersonalSite(p: PersonalRule | undefined, url: URL, rules: RuleSet): ResolvedRule | null {
  const site = p && ruleFromPersonal(p);
  if (!site) return null;
  try {
    const host = url.hostname.toLowerCase();
    if (!site.domains.some((d) => hostMatches(host, d)) || !new RegExp(site.articleUrl).test(url.pathname)) return null;
  } catch {
    return null; // a bad pattern is no match, not a crash
  }
  return resolveSite(site, url.pathname, rules);
}

/**
 * The personal rule that belongs to this page: the one for the official rule's id, else a new-site rule for
 * this host, else one filed under the hostname.
 */
export function personalForPage(list: readonly PersonalRule[], ruleId: string | undefined, url: URL): PersonalRule | undefined {
  const host = url.hostname.toLowerCase();
  return (
    (ruleId ? list.find((p) => p.site === ruleId) : undefined) ??
    list.find((p) => p.newSite?.domains.some((d) => hostMatches(host, d))) ??
    list.find((p) => p.site === host)
  );
}

/**
 * An article path as a regex for a rule's `articleUrl`: digits become \d+, slugs [a-z0-9-]+, short section
 * words stay. "/berita/d-8746131/judul-panjang" -> "^/berita/d-\d+/[a-z0-9-]+/?$".
 */
export function generalisePath(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const out = parts.map((seg, i) => {
    const last = i === parts.length - 1;
    const ext = last ? /(\.[a-z]{3,5})$/i.exec(seg)?.[1] : undefined;
    const name = ext ? seg.slice(0, -ext.length) : seg;
    const tail = ext ? esc(ext) : '';
    if (/^\d+$/.test(name)) return `\\d+${tail}`;
    const prefixed = /^([a-z]{1,4}-)(\d+)$/i.exec(name); // detik "d-8746131"
    if (prefixed) return `${esc(prefixed[1]!)}\\d+${tail}`;
    const words = name.split('-').length;
    // The last segment is the slug; earlier ones are slugs only when they read like a sentence.
    const slug = (last && (words > 1 || /\d/.test(name) || name.length > 24)) || words >= 4 || name.length > 40 || /\d/.test(name);
    if (!slug) return esc(seg);
    return (/^[a-z0-9-]+$/.test(name) ? '[a-z0-9-]+' : '[\\w-]+') + tail;
  });
  return `^/${out.join('/')}${out.length ? '/?' : ''}$`;
}

// ── Auto-retire ──────────────────────────────────────────────────────────────────────────────────────

export type PersonalEntry =
  | { kind: 'remove'; value: string }
  | { kind: 'add'; value: string }
  | { kind: 'field'; field: PersonalField; value: string };

const startKey = (el: Element) => textKey(el.textContent).slice(0, 60);
const BLOCKS = 'p, li, ul, ol, figure, blockquote, h2, h3, h4, h5, h6, table, div, section, aside, img';

/**
 * Whether the official rule already does what this entry asks, so the entry can be dropped quietly.
 * `cleanView` is the article as the official rule alone extracts it (no personal rule applied);
 * `page` and `meta` (the official metadata) let added parts and fields be checked against the page.
 */
export function isRedundant(
  entry: PersonalEntry,
  official: ResolvedRule,
  cleanView: Element | null,
  page?: ParentNode,
  meta?: Partial<ArticleMeta>,
): boolean {
  if (entry.kind === 'remove') {
    if (!isFingerprint(entry.value)) return official.remove.includes(entry.value);
    // A fingerprinted part the clean view no longer contains has nothing left to hide.
    if (!cleanView) return false;
    const key = entry.value.slice(2);
    const text = entry.value.startsWith('t:');
    for (const el of cleanView.querySelectorAll(BLOCKS)) {
      if (text ? textKey(el.textContent).slice(0, 80) === key : (el.tagName === 'IMG' ? el : el.querySelector('img'))?.getAttribute('src')?.includes(key.replace(/^[^/]*/, '')))
        return false;
    }
    return true;
  }
  if (entry.kind === 'add') {
    if (official.lead.includes(entry.value) || official.trail.includes(entry.value) || official.body.includes(entry.value)) return true;
    const source = page && cleanView ? safeQuery(page, entry.value) : null;
    const key = source ? startKey(source) : '';
    return key.length >= 20 && textKey(cleanView!.textContent).includes(key);
  }
  const current = meta?.[entry.field === 'date' ? 'published' : entry.field];
  const read = page ? readField(page, entry.value, entry.field) : undefined;
  return !!current && !!read && textKey(current) === textKey(read);
}

/** The rule without its redundant entries; undefined when nothing is left of it. */
export function retireRedundant(
  p: PersonalRule,
  official: ResolvedRule,
  cleanView: Element | null,
  page?: ParentNode,
  meta?: Partial<ArticleMeta>,
): PersonalRule | undefined {
  const keep = (kind: 'remove' | 'add') => (v: string) => !isRedundant({ kind, value: v }, official, cleanView, page, meta);
  const fields = Object.fromEntries(
    Object.entries(p.fields ?? {}).filter(([f, v]) => !isRedundant({ kind: 'field', field: f as PersonalField, value: v }, official, cleanView, page, meta)),
  ) as PersonalRule['fields'];
  const out: PersonalRule = { ...p, add: p.add.filter(keep('add')), remove: p.remove.filter(keep('remove')), fields };
  if (!Object.keys(fields ?? {}).length) delete out.fields;
  return isEmpty(out) ? undefined : out;
}

const isEmpty = (p: PersonalRule) => !p.add.length && !p.remove.length && !Object.keys(p.fields ?? {}).length && !p.newSite;

// ── Lists (what settings store and the editor edits) ─────────────────────────────────────────────────

export const personalFor = (list: readonly PersonalRule[], site: string): PersonalRule | undefined => list.find((p) => p.site === site);

/**
 * Edit (or create) the rule for a site and return the new list, newest edit last. `edit` returns the
 * changed rule; an emptied rule is dropped; lists stay bounded. Does not mutate its input.
 */
export function editPersonal(list: readonly PersonalRule[], site: string, edit: (p: PersonalRule) => PersonalRule): PersonalRule[] {
  const current = personalFor(list, site) ?? { site, add: [], remove: [], updated: today() };
  const next = normalizeOne({ ...edit({ ...current, add: [...current.add], remove: [...current.remove] }), site, updated: today() });
  const rest = list.filter((p) => p.site !== site);
  return next && !isEmpty(next) ? [...rest, next].slice(-MAX_PERSONAL_RULES) : rest;
}

/** Append a value to a list once, newest last. */
export const withEntry = (values: readonly string[], value: string): string[] => [...values.filter((v) => v !== value), value];

/** Reset ("Kembalikan"): the list without this site's rule. */
export const resetPersonal = (list: readonly PersonalRule[], site: string): PersonalRule[] => list.filter((p) => p.site !== site);

// ── Validation and migration ─────────────────────────────────────────────────────────────────────────

const strings = (v: unknown, max = MAX_ENTRIES): string[] =>
  Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string' && s.length > 0 && s.length <= MAX_LEN).slice(-max) : [];

function normalizeOne(raw: unknown): PersonalRule | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Partial<PersonalRule>;
  if (typeof r.site !== 'string' || !r.site || r.site.length > MAX_LEN) return undefined;
  const out: PersonalRule = {
    site: r.site,
    add: strings(r.add),
    remove: strings(r.remove),
    updated: typeof r.updated === 'string' ? r.updated.slice(0, 10) : today(),
  };
  const fields: NonNullable<PersonalRule['fields']> = {};
  for (const f of PERSONAL_FIELDS) {
    const v = r.fields?.[f];
    if (typeof v === 'string' && v && v.length <= MAX_LEN) fields[f] = v;
  }
  if (Object.keys(fields).length) out.fields = fields;
  const n = r.newSite;
  if (n && typeof n.articleUrl === 'string' && n.articleUrl.length <= MAX_LEN) {
    const domains = strings(n.domains, 5);
    const body = strings(n.body, 8);
    if (domains.length && body.length) out.newSite = { domains, articleUrl: n.articleUrl, body };
  }
  return out;
}

/** Accept anything stored (old versions, hand-edited storage) and return valid, bounded rules. */
export function normalizePersonal(raw: unknown): PersonalRule[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Map<string, PersonalRule>();
  for (const item of raw) {
    const p = normalizeOne(item);
    if (p && !isEmpty(p)) seen.set(p.site, p);
  }
  return [...seen.values()].slice(-MAX_PERSONAL_RULES);
}

/**
 * Fold the old settings lists into personal rules: `hidden` ("<site>:<fingerprint>") becomes remove entries,
 * `added` ("<site>:<selector>") add entries. Existing entries are kept; nothing is duplicated.
 */
export function migrateLegacy(personal: readonly PersonalRule[], hidden: readonly string[], added: readonly string[]): PersonalRule[] {
  let list = [...personal];
  const fold = (keys: readonly string[], field: 'add' | 'remove') => {
    for (const key of keys) {
      const cut = key.indexOf(':');
      if (cut <= 0 || cut === key.length - 1) continue;
      const site = key.slice(0, cut);
      const value = key.slice(cut + 1);
      list = editPersonal(list, site, (p) => ({ ...p, [field]: withEntry(p[field], value) }));
    }
  };
  fold(hidden, 'remove');
  fold(added, 'add');
  return list;
}
