/**
 * A new site (docs/FEEDBACK.md §5), bookmark only: the pure parts. When the bookmark runs on a host with no
 * rule it offers to set the site up; the editor then decides what the article is, and this module turns that
 * into a personal rule with `newSite` and into the draft `rules/sites/<id>.json` that "Kirim usulan" sends.
 */
import { collapse } from './dom.ts';
import { hostMatches } from './rules/match.ts';
import { isFingerprint, type PersonalRule } from './personal.ts';
import { selectorPart, stableSelector } from './render/pagepicker.ts';
import type { ResolvedRule, RuleSet, RunResult } from './types.ts';
import { mainDomain } from './domain.ts';

export { mainDomain };

/** The rule id for a domain (schema: ^[a-z0-9-]+$): its first label, "inilah.com" -> "inilah". */
export const siteIdFor = (domain: string): string => domain.split('.')[0]!.replace(/[^a-z0-9-]/gi, '').toLowerCase() || 'situs';

/** The rule for a page of a site without one: no selectors, so the pipeline reads it with Readability. */
export function genericRuleFor(host: string): ResolvedRule {
  return {
    id: host.toLowerCase(), name: host.toLowerCase(), body: [], lead: [], trail: [], bodyAll: false, remove: [],
    dropParagraphs: [], pagination: { method: 'none' }, logo: [], generic: true,
  };
}

/**
 * Whether the bookmark should offer to set this site up: only the bookmark/Shortcut build (forceOpen) asked to
 * open, the pipeline found no rule for the host (not-article), and no rule of the reader's own covers the host
 * (a page of a set-up site that is no article, like its home page, is not "unsupported").
 */
export function needsNewSitePrompt(o: { forceOpen?: boolean; result: RunResult; url: URL; personal: readonly PersonalRule[]; rules: RuleSet }): boolean {
  if (!o.forceOpen || o.result.ok || o.result.reason !== 'not-article') return false;
  const host = o.url.hostname.toLowerCase();
  if (o.rules.sites.some((s) => s.domains.some((d) => hostMatches(host, d)))) return false;
  return !o.personal.some((p) => p.newSite?.domains.some((d) => hostMatches(host, d)));
}

/** `#id` for an element whose id reads as a name, not a per-article number. */
export const idSelector = (el: Element): string | undefined => (/^[a-z][\w-]{2,}$/i.test(el.id) && !/\d{3,}/.test(el.id) ? `#${el.id}` : undefined);

const nameOf = (el: Element): string | undefined => stableSelector(el) ?? idSelector(el);

function commonAncestor(els: readonly Element[]): Element | null {
  let cur: Element | null = els[0] ?? null;
  while (cur && !els.every((e) => cur!.contains(e))) cur = cur.parentElement;
  return cur;
}

/**
 * The body of a new site from what the reader kept and left out: the smallest element holding every green
 * part that a stable selector can name, and selectors for the red parts inside it (a selector counts only
 * when it hits none of the green parts).
 */
export function bodyFromMarks(green: readonly Element[], red: readonly Element[], doc: Document): { body: string; remove: string[] } | undefined {
  const common = commonAncestor(green);
  if (!common) return undefined;
  let el: Element | null = green.length === 1 && common === green[0] ? common.parentElement : common;
  let body: string | undefined;
  for (; el && el !== doc.body && el !== doc.documentElement; el = el.parentElement) {
    body = nameOf(el);
    if (body) break;
  }
  if (!el || !body) return undefined;
  const region = el;
  const remove: string[] = [];
  for (const r of red) {
    if (r === region || !region.contains(r)) continue;
    for (const sel of [nameOf(r), selectorPart(r).includes('.') ? selectorPart(r) : undefined]) {
      if (!sel) continue;
      let hits: Element[];
      try {
        hits = [...region.querySelectorAll(sel)];
      } catch {
        continue;
      }
      if (hits.includes(r) && !hits.some((m) => green.some((g) => m.contains(g)))) {
        if (!remove.includes(sel)) remove.push(sel);
        break;
      }
    }
  }
  return { body, remove };
}

/** The personal rule with the new site it defines; the red selectors join its removals. */
export function withNewSite(p: PersonalRule, url: URL, body: { body: string; remove: string[] }, articleUrl: string): PersonalRule {
  return {
    ...p,
    remove: [...p.remove.filter((s) => !body.remove.includes(s)), ...body.remove],
    newSite: { domains: [mainDomain(url.hostname)], articleUrl, body: [body.body] },
  };
}

/** The draft `rules/sites/<id>.json` for a personal rule that defines a site (fields per rules/schema.json). */
export function draftRule(p: PersonalRule, url: URL, siteName?: string, date = new Date().toISOString().slice(0, 10)): Record<string, unknown> | undefined {
  const n = p.newSite;
  if (!n) return undefined;
  const id = siteIdFor(n.domains[0]!);
  return {
    id,
    name: collapse(siteName ?? '') || id.charAt(0).toUpperCase() + id.slice(1),
    domains: n.domains,
    articleUrl: n.articleUrl,
    body: n.body,
    remove: p.remove.filter((s) => !isFingerprint(s)),
    pagination: { method: 'none' },
    samples: [url.origin + url.pathname],
    verified: date,
    notes: "Drafted by a reader with Berita Rapih's editor",
  };
}

/** One human line, then the draft rule as compact JSON; removals are trimmed (oldest first) to fit a link. */
export function buildNewSiteNote(p: PersonalRule, url: URL, summary: string, siteName?: string, maxChars = 1400): string {
  const rule = draftRule(p, url, siteName);
  if (!rule) return '';
  const remove = [...(rule.remove as string[])];
  let json = JSON.stringify({ ...rule, remove });
  while (json.length > maxChars && remove.length) {
    remove.shift();
    json = JSON.stringify({ ...rule, remove });
  }
  const fields = p.fields && Object.keys(p.fields).length ? `\n${JSON.stringify({ fields: p.fields })}` : '';
  return `${collapse(summary)}\n${json}${fields}`;
}
