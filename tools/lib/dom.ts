// Node-side DOM for tests, fixture capture and the canary. happy-dom with scripts and subresources disabled.
import { Window } from 'happy-dom';
import { readFileSync } from 'node:fs';
import type { Context, RuleSet } from '../../src/types.ts';

export const USER_AGENT =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';

/** A live-ish Document (with defaultView, needed by DOMPurify) built from HTML, nothing executed or loaded. */
export function documentFromHtml(html: string, url: string): Document {
  const win = new Window({
    url,
    settings: {
      disableJavaScriptEvaluation: true,
      disableJavaScriptFileLoading: true,
      disableCSSFileLoading: true,
      disableIframePageLoading: true,
      disableComputedStyleRendering: true,
    },
  });
  // src/dom.ts parseHtml() uses the global DOMParser (as in a browser).
  (globalThis as { DOMParser?: unknown }).DOMParser ??= win.DOMParser;
  win.document.write(html);
  return win.document as unknown as Document;
}

/**
 * A bot check instead of the page: AWS WAF (`x-amzn-waf-action: challenge`, Tribun since 2026-11-21, answered with
 * 202 and an empty body), Cloudflare (`cf-mitigated: challenge`), or any other 2xx with nothing in it. A browser
 * passes these by running the site's script; the tools don't try to.
 */
export function isChallenge(res: Pick<Response, 'status' | 'headers'>, body: string): boolean {
  if (res.headers.get('x-amzn-waf-action') || res.headers.get('cf-mitigated') === 'challenge') return true;
  return res.status === 202 || !body.trim();
}

export async function fetchHtml(url: string): Promise<{ html: string; finalUrl: string }> {
  // A site that stalls the connection must not hang the canary.
  const res = await fetch(url, { headers: { 'user-agent': USER_AGENT, 'accept-language': 'id-ID,id;q=0.9' }, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const html = await res.text();
  if (isChallenge(res, html)) throw new Error(`HTTP ${res.status} challenge for ${url}`);
  return { html, finalUrl: res.url || url };
}

/** Context whose fetchDocument hits the network (canary) or a fixture map (tests). */
export function nodeContext(
  doc: Document,
  url: string,
  rules: RuleSet,
  pages: 'network' | Record<string, string> = 'network',
): Context {
  const origin = new URL(url).origin;
  return {
    doc,
    url: new URL(url),
    rules,
    fetchDocument: async (u) => {
      if (u.origin !== origin) throw new Error(`cross-origin: ${u.href}`);
      if (pages === 'network') {
        const { html, finalUrl } = await fetchHtml(u.href);
        return documentFromHtml(html, finalUrl);
      }
      const file = pages[u.href];
      if (!file) throw new Error(`no fixture for ${u.href}`);
      return documentFromHtml(readFileSync(file, 'utf8'), u.href);
    },
    log: () => {},
  };
}
