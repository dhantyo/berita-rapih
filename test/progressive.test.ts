// Page 1 must be reported before pagination's network requests, then the merged result.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { run, type RunResult } from '../src/index.ts';
import { assembleRuleSet } from '../tools/lib/rules.ts';
import { documentFromHtml, nodeContext } from '../tools/lib/dom.ts';
import { savedPagesPresent } from './saved-pages.ts';

const rules = assembleRuleSet();
const FIXTURE = join(import.meta.dirname, 'fixtures', 'tribun', 'pernyataan-lengkap-gibran-usai-sampaikan-niat-mundur-sebagai');

describe.skipIf(!savedPagesPresent())('progressive rendering', () => {
  it('reports page 1 first, then the merged article', async () => {
    const fx = JSON.parse(readFileSync(join(FIXTURE, 'fixture.json'), 'utf8'));
    const pages = Object.fromEntries(Object.entries(fx.pages as Record<string, string>).map(([u, f]) => [u, join(FIXTURE, f)]));
    const doc = documentFromHtml(readFileSync(join(FIXTURE, 'page.html'), 'utf8'), fx.url);

    const calls: Array<{ result: RunResult; loadingMore: boolean }> = [];
    const final = await run(nodeContext(doc, fx.url, rules, pages), (result, loadingMore) =>
      calls.push({ result, loadingMore }),
    );

    expect(calls.map((c) => c.loadingMore)).toEqual([true, false]);
    const [first, last] = calls.map((c) => (c.result.ok ? c.result.article : null));
    expect(first?.pages).toBe(1);
    expect(last?.pages).toBe(3);
    const len = (a: typeof first) => a?.content.textContent?.length ?? 0;
    expect(len(last)).toBeGreaterThan(len(first));
    expect(final).toBe(calls[1]!.result);
  });

  it('reports once for articles that need no extra pages', async () => {
    const dir = join(import.meta.dirname, 'fixtures', 'cnnindonesia', 'kubu-silmy-karim-klaim-perkara-pemerasan-akan-sulit-dibuktik');
    const fx = JSON.parse(readFileSync(join(dir, 'fixture.json'), 'utf8'));
    const doc = documentFromHtml(readFileSync(join(dir, 'page.html'), 'utf8'), fx.url);
    const flags: boolean[] = [];
    await run(nodeContext(doc, fx.url, rules, {}), (_r, more) => flags.push(more));
    expect(flags).toEqual([false]);
  });
});

describe('other pages refused (Cloudflare on Pikiran Rakyat)', () => {
  const html = '<html><head><title>Judul</title><meta property="og:title" content="Judul berita yang panjang"></head><body>' +
    '<section class="read__content">' + '<p>Paragraf pertama yang cukup panjang untuk lolos pemeriksaan kualitas artikel ini.</p>'.repeat(8) + '</section>' +
    '<div class="paging__all"><a href="?page=all">Lihat Semua</a></div></body></html>';
  const url = 'https://www.pikiran-rakyat.com/news/pr-0110559757/judul-berita';

  it('keeps page 1 and links to the full page when the request is refused', async () => {
    const doc = documentFromHtml(html, url);
    const result = await run({ doc, url: new URL(url), rules, fetchDocument: async () => { throw new Error('HTTP 403'); }, log: () => {} });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.article.pages).toBe(1);
    expect(result.article.unloaded).toBe(`${url}?page=all`);
  });

  it('says nothing when the full page loads but has no more text (the site ignores the param)', async () => {
    const doc = documentFromHtml(html, url);
    const result = await run({ doc, url: new URL(url), rules, fetchDocument: async () => documentFromHtml(html, url), log: () => {} });
    expect(result.ok && result.article.unloaded).toBeFalsy();
  });
});
