/**
 * "Is there a newer Berita Rapih?" One small JSON file (update.json), published with every release next to
 * the site rules, is fetched at most once a day. No identifiers are sent; the reader can turn it off.
 *
 *   { "version": "0.1.0-beta.2", "notes": "https://…/releases/tag/v0.1.0-beta.2",
 *     "android": "https://…/berita-rapih-0.1.0-beta.2.apk", "extension": "https://…/releases/tag/…",
 *     "apple": "https://…/docs/install-apple.md", "form": "https://docs.google.com/forms/…/viewform?…" }
 */

export type Platform = 'android' | 'apple' | 'extension' | 'web';

export interface UpdateManifest {
  version: string;
  notes?: string;
  android?: string;
  extension?: string;
  apple?: string;
  /** Overrides the built-in feedback link template (reportLink). Releases before 0.7 read `report` instead. */
  form?: string;
}

export interface UpdateOffer {
  version: string;
  /** Where the reader goes to update on this platform. */
  url: string;
}

const CACHE_KEY = 'sapuberita:update';
const CHECK_EVERY_MS = 24 * 60 * 60 * 1000;

interface Cached {
  checkedAt: number;
  manifest: UpdateManifest;
}

/**
 * The release manifest, fetched at most once a day (cached copy otherwise). Null when offline and
 * never fetched, or when no channel is configured (local builds).
 */
export async function latestManifest(channelUrl: string | undefined): Promise<UpdateManifest | null> {
  const cached = readCache();
  if (!channelUrl || (cached && Date.now() - cached.checkedAt < CHECK_EVERY_MS)) return cached?.manifest ?? null;
  return (await refresh(channelUrl)) ?? cached?.manifest ?? null;
}

/** The cached manifest, without touching the network. */
export function cachedManifest(): UpdateManifest | null {
  return readCache()?.manifest ?? null;
}

async function refresh(channelUrl: string): Promise<UpdateManifest | null> {
  try {
    const res = await fetch(new URL('update.json', channelUrl).href, { cache: 'no-cache' });
    if (!res.ok) return null;
    const manifest = (await res.json()) as UpdateManifest;
    if (typeof manifest.version !== 'string') return null;
    writeCache({ checkedAt: Date.now(), manifest });
    return manifest;
  } catch {
    return null; // offline, blocked or rate-limited: try again another day
  }
}

/** An update worth showing on this platform, or null. */
export function offerFor(manifest: UpdateManifest | null, current: string, platform: Platform): UpdateOffer | null {
  if (!manifest || !parse(current) || compareVersions(manifest.version, current) <= 0) return null;
  const url = platform === 'web' ? manifest.notes : manifest[platform] ?? manifest.notes;
  return url ? { version: manifest.version, url } : null;
}

/**
 * Semver order: 0.1.0-beta.1 < 0.1.0-beta.2 < 0.1.0 < 0.1.1. Unparseable input sorts lowest, so a
 * broken manifest never nags anyone. "dev" (local builds) is never offered an update.
 */
export function compareVersions(a: string, b: string): number {
  const pa = parse(a);
  const pb = parse(b);
  if (!pa || !pb) return pa ? 1 : pb ? -1 : 0;
  for (let i = 0; i < 3; i++) if (pa.core[i] !== pb.core[i]) return pa.core[i]! - pb.core[i]!;
  if (!pa.pre.length || !pb.pre.length) return pa.pre.length ? -1 : pb.pre.length ? 1 : 0;
  for (let i = 0; i < Math.max(pa.pre.length, pb.pre.length); i++) {
    const x = pa.pre[i];
    const y = pb.pre[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (x === y) continue;
    const nx = /^\d+$/.test(x) ? Number(x) : NaN;
    const ny = /^\d+$/.test(y) ? Number(y) : NaN;
    if (!isNaN(nx) && !isNaN(ny)) return nx - ny;
    if (!isNaN(nx)) return -1;
    if (!isNaN(ny)) return 1;
    return x < y ? -1 : 1;
  }
  return 0;
}

function parse(v: string): { core: number[]; pre: string[] } | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(v.trim());
  return m ? { core: [Number(m[1]), Number(m[2]), Number(m[3])], pre: m[4] ? m[4].split('.') : [] } : null;
}

export type ReportKind = 'report' | 'idea' | 'site' | 'edit';

export type ReportFields = Record<'url' | 'title' | 'site' | 'version' | 'platform', string> & {
  kind?: ReportKind;
  note?: string;
  /** Machine-readable part, e.g. an edited rule as JSON. */
  detail?: string;
};

/** Fill a feedback link template. Placeholders: {url} {title} {site} {version} {platform} {kind} {note} {detail}. */
export function reportLink(template: string, fields: ReportFields): string {
  return template.replace(/\{(url|title|site|version|platform|kind|note|detail)\}/g, (_, k: keyof ReportFields) => encodeURIComponent(fields[k] ?? ''));
}

/**
 * A Google Form template (its prefilled "viewform" link) can also take the answers directly: the same
 * `entry.*` fields posted to its formResponse address. Undefined for any other destination.
 */
export function formPost(template: string, fields: ReportFields): { action: string; body: URLSearchParams } | undefined {
  let u: URL;
  try {
    u = new URL(reportLink(template, fields));
  } catch {
    return undefined;
  }
  if (u.hostname !== 'docs.google.com' || !/^\/forms\/d\/e\/[\w-]+\/viewform$/.test(u.pathname)) return undefined;
  const body = new URLSearchParams();
  for (const [k, v] of u.searchParams) if (k.startsWith('entry.')) body.append(k, v);
  return { action: `${u.origin}${u.pathname.replace(/viewform$/, 'formResponse')}`, body };
}

/**
 * Post the answers. The response is opaque (no-cors), so this only knows the request went out; it fails
 * when the network is down or the page's security policy forbids the request (the bookmark runs as the page).
 */
export async function sendForm(post: { action: string; body: URLSearchParams }, fetchFn: typeof fetch = fetch): Promise<boolean> {
  try {
    await fetchFn(post.action, { method: 'POST', mode: 'no-cors', credentials: 'omit', body: post.body });
    return true;
  } catch {
    return false;
  }
}

const SNOOZE_KEY = 'sapuberita:update-snoozed';
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;

/** "Not now": don't show this version again for three days (on this site; storage is per site on iOS). */
export function snoozeOffer(version: string): void {
  try {
    localStorage.setItem(SNOOZE_KEY, JSON.stringify({ version, at: Date.now() }));
  } catch {
    // ignore
  }
}

export function isSnoozed(version: string): boolean {
  try {
    const s = JSON.parse(localStorage.getItem(SNOOZE_KEY) ?? 'null') as { version: string; at: number } | null;
    return !!s && s.version === version && Date.now() - s.at < SNOOZE_MS;
  } catch {
    return false;
  }
}

function readCache(): Cached | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Cached) : null;
  } catch {
    return null;
  }
}

function writeCache(value: Cached): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(value));
  } catch {
    // Private mode or quota: we'll just check again next time.
  }
}
