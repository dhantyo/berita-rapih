/**
 * Does this page look like a single news article? Used by the extension on sites Berita Rapih has no rule for: the
 * toolbar popup (via chrome.scripting.executeScript) and the opt-in page check (offer.js). It must stay
 * self-contained, with no imports and no outside references, because the popup sends its source into the page.
 */
export function looksLikeArticle(doc: Document = document): boolean {
  // Structured data says so (most news CMSes write it for search engines).
  const ARTICLE = /^(NewsArticle|Article|ReportageNewsArticle|AnalysisNewsArticle|OpinionNewsArticle|BlogPosting|LiveBlogPosting)$/;
  const typeOf = (node: unknown): boolean => {
    if (!node || typeof node !== 'object') return false;
    if (Array.isArray(node)) return node.some(typeOf);
    const o = node as Record<string, unknown>;
    const t = o['@type'];
    if ((typeof t === 'string' && ARTICLE.test(t)) || (Array.isArray(t) && t.some((x) => typeof x === 'string' && ARTICLE.test(x)))) return true;
    return typeOf(o['@graph']);
  };
  for (const s of Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))) {
    try {
      if (typeOf(JSON.parse(s.textContent || ''))) return true;
    } catch {
      // a broken block: ignore it
    }
  }
  // Open Graph marks it an article and gives it a publish time.
  const og = doc.querySelector('meta[property="og:type"]')?.getAttribute('content')?.toLowerCase();
  if (og === 'article' && doc.querySelector('meta[property="article:published_time"]')) return true;
  // Otherwise: a body of real paragraphs (five or more of 80+ characters, together 1,200+).
  const long = Array.from(doc.querySelectorAll('p')).map((p) => (p.textContent || '').trim().length).filter((n) => n >= 80);
  return long.length >= 5 && long.reduce((a, b) => a + b, 0) >= 1200;
}
