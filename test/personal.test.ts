import { describe, expect, it } from 'vitest';
import {
  applyPersonal, applyPersonalContent, editPersonal, generalisePath, isRedundant, matchPersonalSite, migrateLegacy, normalizePersonal,
  personalForPage, retireRedundant, ruleFromPersonal, type PersonalRule,
} from '../src/personal.ts';
import { extractMetadata } from '../src/extract/metadata.ts';
import { normalizeSettings } from '../src/settings.ts';
import { findRule } from '../src/rules/match.ts';
import { run } from '../src/index.ts';
import type { ResolvedRule, RuleSet } from '../src/types.ts';

const rule = (over: Partial<ResolvedRule> = {}): ResolvedRule => ({
  id: 'demo', name: 'Demo', body: ['article'], lead: [], trail: [], bodyAll: false, remove: ['.ad'], dropParagraphs: [],
  pagination: { method: 'none' }, logo: [], generic: false, ...over,
});
const personal = (over: Partial<PersonalRule> = {}): PersonalRule => ({ site: 'demo', add: [], remove: [], updated: '2026-11-15', ...over });
const rules: RuleSet = {
  version: 1,
  common: { version: 1, dropParagraphs: [], remove: [], quality: { minChars: 20, maxLinkDensity: 0.9 } },
  sites: [{ id: 'demo', name: 'Demo', domains: ['demo.test'], articleUrl: '^/read/\\d+', body: ['article'], pagination: { method: 'none' } }],
  paginationOnly: [],
  adblock: {},
};
const PAGE =
  '<h1 class="t">Judul di halaman</h1><span class="by">Oleh Siti</span><span class="ed">Budi</span><time class="d" datetime="2026-11-10T08:00:00+07:00">Senin</time>' +
  '<article><p>Paragraf pertama yang panjang tentang kejadian hari ini di Jakarta.</p><div class="promo">Simak video berikut ini:</div>' +
  '<p>Paragraf kedua yang juga cukup panjang supaya artikelnya punya isi yang jelas.</p></article>';

describe('applyPersonal', () => {
  it('adds removal selectors once and leaves fingerprints to the content', () => {
    const out = applyPersonal(rule(), personal({ remove: ['.promo', '.ad', 't:simak video'] }));
    expect(out.remove).toEqual(['.ad', '.promo']);
    expect(applyPersonal(rule(), personal())).toEqual(rule());
  });
});

describe('fields', () => {
  it('read from the live page before page data', () => {
    document.head.innerHTML = '<script type="application/ld+json">{"@type":"NewsArticle","headline":"Dari data","author":{"name":"Orang Lain"},"datePublished":"2020-01-01"}</script>';
    document.body.innerHTML = PAGE;
    const meta = extractMetadata(document, { title: 'h1.t', byline: '.by', editor: '.ed', date: 'time.d' });
    expect(meta).toMatchObject({ title: 'Judul di halaman', byline: 'Oleh Siti', editor: 'Budi', published: '2026-11-10T08:00:00+07:00' });
    expect(extractMetadata(document).title).toBe('Dari data');
    expect(extractMetadata(document, { title: '.missing' }).title).toBe('Dari data');
  });
});

describe('run with a personal rule', () => {
  const ctx = (url: string, p?: PersonalRule) => ({
    doc: document, url: new URL(url), rules, fetchDocument: async () => document, log: () => {}, personal: p,
  });

  it('removes selectors and hides fingerprints for the outlet', async () => {
    document.head.innerHTML = '';
    document.body.innerHTML = PAGE;
    const plain = await run(ctx('https://demo.test/read/1/x'));
    expect(plain.ok && plain.article.content.textContent).toContain('Simak video');
    const mine = await run(ctx('https://demo.test/read/1/x', personal({ remove: ['.promo'] })));
    expect(mine.ok && mine.article.content.textContent).not.toContain('Simak video');
    const fp = await run(ctx('https://demo.test/read/1/x', personal({ remove: ['t:simak video berikut ini'] })));
    expect(fp.ok && fp.article.content.querySelector('[data-user-hidden]')?.textContent).toContain('Simak video');
  });

  it('defines a new site where no official rule matches', async () => {
    document.body.innerHTML = PAGE;
    const p = personal({ site: 'baru.test', remove: ['.promo'], newSite: { domains: ['baru.test'], articleUrl: generalisePath('/artikel/123/judul-berita'), body: ['article'] } });
    expect((await run(ctx('https://baru.test/artikel/9/lain-lagi'))).ok).toBe(false);
    const r = await run(ctx('https://www.baru.test/artikel/9/lain-lagi', p));
    expect(r.ok && r.article.ruleId).toBe('baru.test');
    expect(r.ok && r.article.content.textContent).not.toContain('Simak video');
    expect((await run(ctx('https://baru.test/tentang', p))).ok).toBe(false);
  });
});

describe('newSite', () => {
  const p = personal({ site: 'baru.test', remove: ['.x', 't:abc'], newSite: { domains: ['baru.test'], articleUrl: '^/a/\\d+', body: ['.isi'] } });
  it('builds a full site rule', () => {
    expect(ruleFromPersonal(p)).toMatchObject({ id: 'baru.test', domains: ['baru.test'], body: ['.isi'], remove: ['.x'], pagination: { method: 'none' } });
    expect(ruleFromPersonal(personal())).toBeUndefined();
  });
  it('matches by host and path, and is found per page', () => {
    expect(matchPersonalSite(p, new URL('https://m.baru.test/a/5'), rules)?.id).toBe('baru.test');
    expect(matchPersonalSite(p, new URL('https://m.baru.test/b/5'), rules)).toBeNull();
    expect(matchPersonalSite(p, new URL('https://lain.test/a/5'), rules)).toBeNull();
    const list = [personal(), p];
    expect(personalForPage(list, 'demo', new URL('https://demo.test/read/1'))?.site).toBe('demo');
    expect(personalForPage(list, undefined, new URL('https://baru.test/a/1'))?.site).toBe('baru.test');
    expect(personalForPage(list, undefined, new URL('https://lain.test/'))).toBeUndefined();
    expect(findRule(rules, new URL('https://baru.test/a/5'))).toBeNull();
  });
});

describe('generalisePath', () => {
  const cases: Array<[string, string, string]> = [
    ['/berita/d-8746131/judul-berita-yang-panjang', '/berita/d-8800000/lain-lagi-ya', '^/berita/d-\\d+/[a-z0-9-]+/?$'],
    ['/read/2026/11/10/08461411/prabowo-bertemu-presiden', '/read/2026/11/11/08461999/ini-berita-lain', '^/read/\\d+/\\d+/\\d+/\\d+/[a-z0-9-]+/?$'],
    ['/nasional/7909546/slug-artikel-tribun', '/nasional/7900000/slug-lain-lagi', '^/nasional/\\d+/[a-z0-9-]+/?$'],
    ['/2026/berita-utama/judul-satu.html', '/2027/berita-utama/judul-dua.html', '^/\\d+/berita-utama/[a-z0-9-]+\\.html/?$'],
  ];
  it.each(cases)('%s', (path, other, expected) => {
    const re = generalisePath(path);
    expect(re).toBe(expected);
    expect(new RegExp(re).test(path)).toBe(true);
    expect(new RegExp(re).test(other)).toBe(true);
  });
  it('does not match a section page', () => {
    expect(new RegExp(generalisePath('/nasional/7909546/slug-artikel-tribun')).test('/nasional')).toBe(false);
  });
});

describe('migration', () => {
  it('folds hidden and added into personal rules and stops writing them', () => {
    const s = normalizeSettings({ hidden: ['demo:t:simak video', 'demo:i:img.example/a.jpg', 'x:t:lain'], added: ['demo:div.galeri'] });
    expect(s.hidden).toEqual([]);
    expect(s.added).toEqual([]);
    const demo = s.personal.find((p) => p.site === 'demo')!;
    expect(demo.remove).toEqual(['t:simak video', 'i:img.example/a.jpg']);
    expect(demo.add).toEqual(['div.galeri']);
    expect(s.personal.find((p) => p.site === 'x')!.remove).toEqual(['t:lain']);
    // Idempotent: loading the migrated settings again changes nothing.
    expect(normalizeSettings(s).personal.map((p) => [p.site, p.add, p.remove])).toEqual(s.personal.map((p) => [p.site, p.add, p.remove]));
  });
  it('keeps existing personal rules and ignores junk', () => {
    const list = migrateLegacy(normalizePersonal([personal({ remove: ['.a'] }), 5, { site: 7 }]), ['demo:t:b', 'broken'], []);
    expect(list).toHaveLength(1);
    expect(list[0]!.remove).toEqual(['.a', 't:b']);
  });
  it('bounds the lists', () => {
    const many = Array.from({ length: 150 }, (_, i) => `demo:t:blok nomor ${i}`);
    expect(normalizeSettings({ hidden: many }).personal[0]!.remove.length).toBeLessThanOrEqual(100);
  });
});

describe('editPersonal', () => {
  it('creates, edits and drops a rule', () => {
    let list = editPersonal([], 'demo', (p) => ({ ...p, remove: ['.a'] }));
    expect(list).toHaveLength(1);
    list = editPersonal(list, 'demo', (p) => ({ ...p, remove: [] }));
    expect(list).toEqual([]);
  });
});

describe('isRedundant', () => {
  const view = (html: string) => {
    const d = document.createElement('div');
    d.innerHTML = html;
    return d;
  };
  it('removal selector the official rule already has', () => {
    expect(isRedundant({ kind: 'remove', value: '.ad' }, rule(), null)).toBe(true);
    expect(isRedundant({ kind: 'remove', value: '.promo' }, rule(), null)).toBe(false);
  });
  it('fingerprint of a part the clean view no longer has', () => {
    const v = view('<p>Paragraf biasa yang ada di artikel ini.</p>');
    expect(isRedundant({ kind: 'remove', value: 't:simak video berikut ini' }, rule(), v)).toBe(true);
    expect(isRedundant({ kind: 'remove', value: 't:paragraf biasa yang ada di artikel ini' }, rule(), v)).toBe(false);
  });
  it('added part the rule or the clean view already has', () => {
    document.body.innerHTML = '<div class="galeri"><p>Teks galeri yang cukup panjang untuk dikenali.</p></div>';
    expect(isRedundant({ kind: 'add', value: '.galeri' }, rule({ lead: ['.galeri'] }), null)).toBe(true);
    expect(isRedundant({ kind: 'add', value: '.galeri' }, rule(), view('<p>Teks galeri yang cukup panjang untuk dikenali.</p>'), document)).toBe(true);
    expect(isRedundant({ kind: 'add', value: '.galeri' }, rule(), view('<p>Lain.</p>'), document)).toBe(false);
  });
  it('field the page data already gets right', () => {
    document.body.innerHTML = '<span class="by">Siti</span>';
    expect(isRedundant({ kind: 'field', field: 'byline', value: '.by' }, rule(), null, document, { byline: 'Siti' })).toBe(true);
    expect(isRedundant({ kind: 'field', field: 'byline', value: '.by' }, rule(), null, document, { byline: 'Budi' })).toBe(false);
  });
  it('retireRedundant drops what the rule covers and empties to undefined', () => {
    const p = personal({ remove: ['.ad', '.promo'] });
    expect(retireRedundant(p, rule(), null)!.remove).toEqual(['.promo']);
    expect(retireRedundant(personal({ remove: ['.ad'] }), rule(), null)).toBeUndefined();
  });
});

describe('applyPersonalContent', () => {
  it('clears earlier hides and additions once the rule is gone (undo)', () => {
    const doc = new DOMParser().parseFromString('<article><p>Paragraf pertama yang panjang tentang kejadian.</p><p>Simak video berikut ini:</p></article>', 'text/html');
    const content = doc.querySelector('article') as HTMLElement;
    const hidden = personal({ remove: ['t:simak video berikut ini'] });
    applyPersonalContent(content, hidden, doc);
    expect(content.querySelectorAll('[data-user-hidden]').length).toBe(1);
    applyPersonalContent(content, undefined, doc);
    expect(content.querySelectorAll('[data-user-hidden]').length).toBe(0);
  });
  it('a text fingerprint hides a paragraph wrapped in an inline element (Kompas "Gabung Kompas.com PLUS")', () => {
    const doc = new DOMParser().parseFromString(
      '<article><p>Paragraf pertama yang panjang tentang kejadian.</p><i><p>Terima kasih atas dukungan kepada KOMPAS.com untuk terus memberikan fakta jernih dari lapangan. Turut mendukung dengan <a href="#">Gabung Kompas.com PLUS</a></p></i></article>',
      'text/html');
    const content = doc.querySelector('article') as HTMLElement;
    applyPersonalContent(content, personal({ remove: ['t:terima kasih atas dukungan kepada kompas com untuk terus memberikan fakta jernih'] }), doc);
    const hidden = [...content.querySelectorAll('[data-user-hidden]')];
    expect(hidden.length).toBe(1);
    expect(hidden[0]!.textContent).toMatch(/Gabung Kompas.com PLUS/);
  });
});
