import { describe, expect, it } from 'vitest';
import { looksLikeArticle } from '../src/looks-like-article.ts';

const doc = (html: string) => new DOMParser().parseFromString(html, 'text/html');
const para = (n: number) => `<p>${'Kalimat panjang dalam artikel berita yang berisi cukup banyak kata untuk dihitung. '.repeat(2)}${n}</p>`;

describe('looksLikeArticle', () => {
  it('trusts JSON-LD NewsArticle, also inside @graph and type lists', () => {
    expect(looksLikeArticle(doc('<script type="application/ld+json">{"@type":"NewsArticle"}</script>'))).toBe(true);
    expect(looksLikeArticle(doc('<script type="application/ld+json">{"@graph":[{"@type":"WebPage"},{"@type":["Article"]}]}</script>'))).toBe(true);
  });
  it('trusts og:type article with a publish time', () => {
    expect(looksLikeArticle(doc('<meta property="og:type" content="article"><meta property="article:published_time" content="2026-11-19">'))).toBe(true);
  });
  it('falls back to a body of long paragraphs', () => {
    expect(looksLikeArticle(doc(`<article>${[1, 2, 3, 4, 5, 6, 7, 8].map(para).join('')}</article>`))).toBe(true);
  });
  it('says no to a home page, a WebPage and broken JSON-LD', () => {
    expect(looksLikeArticle(doc('<script type="application/ld+json">{"@type":"WebSite"}</script><ul><li>Berita 1</li></ul>'))).toBe(false);
    expect(looksLikeArticle(doc('<script type="application/ld+json">{oops</script>'))).toBe(false);
    expect(looksLikeArticle(doc(`<div>${[1, 2].map(para).join('')}</div>`))).toBe(false);
  });
  it('is self-contained, so the popup can send its source into a page', () => {
    // eslint-disable-next-line no-new-func
    const copy = new Function(`return (${looksLikeArticle.toString()})`)() as typeof looksLikeArticle;
    expect(copy(doc('<script type="application/ld+json">{"@type":"NewsArticle"}</script>'))).toBe(true);
  });
});
