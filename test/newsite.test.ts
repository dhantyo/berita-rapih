import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv from 'ajv';
import { beforeEach, describe, expect, it } from 'vitest';
import { bodyFromMarks, buildNewSiteNote, draftRule, genericRuleFor, mainDomain, needsNewSitePrompt, siteIdFor, withNewSite } from '../src/newsite.ts';
import { computeMarks } from '../src/render/editmodel.ts';
import { generalisePath, matchPersonalSite, personalForPage, resetPersonal, editPersonal, type PersonalRule } from '../src/personal.ts';
import { findRule } from '../src/rules/match.ts';
import { run } from '../src/index.ts';
import type { RuleSet, RunResult } from '../src/types.ts';

const schema = JSON.parse(readFileSync(join(__dirname, '..', 'rules', 'schema.json'), 'utf8'));
const validate = new Ajv({ allErrors: true, strict: false }).compile(schema);

const rules: RuleSet = {
  version: 1,
  common: { version: 1, dropParagraphs: [], remove: [], quality: { minChars: 20, maxLinkDensity: 0.9 } },
  sites: [{ id: 'demo', name: 'Demo', domains: ['demo.test'], articleUrl: '^/read/\\d+', body: ['article'], pagination: { method: 'none' } }],
  paginationOnly: [],
  adblock: {},
};
const NOT_ARTICLE: RunResult = { ok: false, reason: 'not-article' };
const u = (s: string) => new URL(s);

describe('mainDomain', () => {
  it('takes the last two labels, three under a known second level of .id', () => {
    expect(mainDomain('www.inilah.com')).toBe('inilah.com');
    expect(mainDomain('m.news.hops.id')).toBe('hops.id');
    expect(mainDomain('inilah.com')).toBe('inilah.com');
    expect(mainDomain('www.dpr.go.id')).toBe('dpr.go.id');
    expect(mainDomain('news.kampus.ac.id')).toBe('kampus.ac.id');
    expect(mainDomain('blog.toko.co.id')).toBe('toko.co.id');
    expect(mainDomain('WWW.Example.Com.')).toBe('example.com');
    expect(mainDomain('localhost')).toBe('localhost');
    expect(mainDomain('127.0.0.1')).toBe('127.0.0.1');
  });
  it('makes a schema-safe id', () => {
    expect(siteIdFor('inilah.com')).toBe('inilah');
    expect(siteIdFor('dpr.go.id')).toBe('dpr');
  });
});

describe('boot decision: when the prompt shows', () => {
  const base = { forceOpen: true, result: NOT_ARTICLE, url: u('https://www.inilah.com/a/1'), personal: [] as PersonalRule[], rules };
  it('only in the bookmark build, on not-article, on a host with no rule', () => {
    expect(needsNewSitePrompt(base)).toBe(true);
    expect(needsNewSitePrompt({ ...base, forceOpen: false })).toBe(false); // extension and Android app
    expect(needsNewSitePrompt({ ...base, forceOpen: undefined })).toBe(false);
    expect(needsNewSitePrompt({ ...base, result: { ok: false, reason: 'no-content' } })).toBe(false);
    expect(needsNewSitePrompt({ ...base, result: { ok: false, reason: 'low-quality' } })).toBe(false);
  });
  it('not on an outlet that has an official rule (its home page is no article, not unsupported)', () => {
    expect(needsNewSitePrompt({ ...base, url: u('https://demo.test/') })).toBe(false);
  });
  it('not on a site the reader already set up', () => {
    const mine: PersonalRule = { site: 'www.inilah.com', add: [], remove: [], updated: '2026-11-15', newSite: { domains: ['inilah.com'], articleUrl: '^/a/\\d+/?$', body: ['div.body'] } };
    expect(needsNewSitePrompt({ ...base, personal: [mine] })).toBe(false);
    expect(needsNewSitePrompt({ ...base, personal: [{ ...mine, newSite: undefined }] })).toBe(true);
  });
});

// A page of a site without a rule: header, article with a related box and an ad, a sidebar.
const P = (n: number) => `Paragraf ${n} yang cukup panjang untuk dikenali sebagai bagian dari isi artikel ini.`;
const PAGE = `
<header><h1>Judul Berita</h1></header>
<main><div class="detail-wrap"><div class="detail-text">
  <p>${P(1)}</p><p>${P(2)}</p>
  <div class="related"><p>Baca juga: berita lain yang menarik untuk dibaca hari ini.</p></div>
  <p>${P(3)}</p><p>${P(4)}</p>
</div></div><aside class="side"><p>Terpopuler hari ini di seluruh situs berita ini.</p></aside></main>`;

describe('the new site from what is kept', () => {
  beforeEach(() => {
    document.body.innerHTML = PAGE;
  });
  const clean = () => {
    const c = document.createElement('div');
    c.innerHTML = [1, 2, 3, 4].map((n) => `<p>${P(n)}</p>`).join('');
    return c;
  };
  const marksOf = () => computeMarks(clean(), document, { removeSelectors: [], header: [], visible: () => true, skipLive: () => false });

  it('names the smallest element holding the green parts, and the red parts inside it', () => {
    const marks = marksOf();
    const got = bodyFromMarks(marks.green, marks.red, document);
    expect(got?.body).toBe('div.detail-text');
    expect(got?.remove).toContain('div.related');
  });

  it('names an unclassed box by the class above it', () => {
    document.body.innerHTML = `<main class="page"><div><p>${P(1)}</p><p>${P(2)}</p></div></main>`;
    const ps = [...document.querySelectorAll('p')];
    expect(bodyFromMarks(ps, [], document)?.body).toBe('main.page > div'); // a name with the class one level up
  });

  it('a single green block names its parent, and nothing nameable gives nothing', () => {
    document.body.innerHTML = `<div class="only"><p>${P(1)}</p></div>`;
    expect(bodyFromMarks([document.querySelector('p')!], [], document)?.body).toBe('div.only');
    document.body.innerHTML = `<div><div><p>${P(1)}</p></div></div>`;
    expect(bodyFromMarks([document.querySelector('p')!], [], document)).toBeUndefined();
  });

  it('a removal selector that would hit a green part is not used', () => {
    document.body.innerHTML = `<div class="b"><div class="blk"><p>${P(1)}</p></div><div class="blk"><p>Iklan sisipan yang panjang sekali untuk dibaca.</p></div></div>`;
    const [keep, junk] = [...document.querySelectorAll('.blk')];
    const got = bodyFromMarks([keep!.querySelector('p')!], [junk!], document);
    expect(got?.remove).toEqual([]); // div.blk would also remove the kept part's box
  });

  it('saves a personal rule that matches the next article of the site and reads it', async () => {
    const url = u('https://www.inilah.com/berita/2026/11/15/1234567/judul-yang-cukup-panjang-ini');
    const marks = marksOf();
    const body = bodyFromMarks(marks.green, marks.red, document)!;
    const p = withNewSite({ site: url.hostname, add: [], remove: [], updated: '2026-11-15' }, url, body, generalisePath(url.pathname));
    expect(p.newSite?.domains).toEqual(['inilah.com']);
    const list = editPersonal([], url.hostname, () => p);
    expect(list).toHaveLength(1);

    // another article on the same site: found by boot (personalForPage), matched, extracted by the saved selectors
    const next = u('https://www.inilah.com/berita/2026/11/16/7654321/artikel-lain-lagi-hari-ini');
    const mine = personalForPage(list, findRule(rules, next)?.id, next);
    expect(mine?.site).toBe(url.hostname);
    expect(matchPersonalSite(mine, next, rules)?.body).toEqual(['div.detail-text']);
    expect(matchPersonalSite(mine, u('https://www.inilah.com/'), rules)).toBeNull();
    const result = await run({ doc: document, url: next, rules, personal: mine, fetchDocument: async () => document, log: () => {} });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.article.source).toBe('rule');
      expect(result.article.ruleId).toBe(url.hostname);
      expect(result.article.content.textContent).toContain('Paragraf 4');
      expect(result.article.content.textContent).not.toContain('Baca juga');
      expect(result.article.content.textContent).not.toContain('Terpopuler');
    }
    // Kembalikan removes the whole rule, the new site included
    expect(resetPersonal(list, url.hostname)).toEqual([]);
  });

  it('the generic mode reads an unsupported site with Readability', async () => {
    document.body.innerHTML = `<article>${[1, 2, 3, 4, 5].map((n) => `<p>${P(n)} ${P(n)}</p>`).join('')}</article>`;
    const url = u('https://www.inilah.com/x/123');
    const off = await run({ doc: document, url, rules, fetchDocument: async () => document, log: () => {} });
    expect(off).toMatchObject({ ok: false, reason: 'not-article' });
    const on = await run({ doc: document, url, rules, generic: true, fetchDocument: async () => document, log: () => {} });
    expect(on.ok).toBe(true);
    if (on.ok) {
      expect(on.article.source).toBe('readability');
      expect(on.article.ruleId).toBe('www.inilah.com');
    }
    expect(genericRuleFor('WWW.Inilah.com').generic).toBe(true);
  });
});

describe('the draft rules/sites/<id>.json', () => {
  const url = u('https://www.inilah.com/berita/2026/11/15/1234567/judul-yang-cukup-panjang-ini?utm=x#a');
  const p: PersonalRule = {
    site: 'www.inilah.com', add: [], updated: '2026-11-15',
    remove: ['div.related', 't:baca juga sesuatu', 'section.promo > div.box'],
    fields: { byline: 'span.author' },
    newSite: { domains: ['inilah.com'], articleUrl: generalisePath(url.pathname), body: ['div.detail-text'] },
  };

  it('has the fields of the schema and validates against it', () => {
    const rule = draftRule(p, url, 'Inilah.com', '2026-11-15')!;
    expect(rule).toEqual({
      id: 'inilah', name: 'Inilah.com', domains: ['inilah.com'], articleUrl: p.newSite!.articleUrl, body: ['div.detail-text'],
      remove: ['div.related', 'section.promo > div.box'], // fingerprints are for one article, not for the rule
      pagination: { method: 'none' }, samples: ['https://www.inilah.com/berita/2026/11/15/1234567/judul-yang-cukup-panjang-ini'],
      verified: '2026-11-15', notes: "Drafted by a reader with Sapu Berita's editor",
    });
    expect(validate(rule), JSON.stringify(validate.errors)).toBe(true);
    // the article pattern is a working regex that matches the sample
    expect(new RegExp(rule.articleUrl as string).test(url.pathname)).toBe(true);
  });

  it('falls back to a name made from the domain, and defaults the date to today', () => {
    const rule = draftRule(p, url)!;
    expect(rule.name).toBe('Inilah');
    expect(rule.verified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(validate(rule), JSON.stringify(validate.errors)).toBe(true);
  });

  it('is nothing for a personal rule that defines no site', () => {
    expect(draftRule({ ...p, newSite: undefined }, url)).toBeUndefined();
    expect(buildNewSiteNote({ ...p, newSite: undefined }, url, 'x')).toBe('');
  });

  it('goes in the note: one line, then the JSON (and the field picks), trimmed to fit', () => {
    const note = buildNewSiteNote(p, url, 'Usulan situs baru: inilah');
    const [line, json, fields] = note.split('\n');
    expect(line).toBe('Usulan situs baru: inilah');
    expect(validate(JSON.parse(json!)), JSON.stringify(validate.errors)).toBe(true);
    expect(JSON.parse(fields!)).toEqual({ fields: { byline: 'span.author' } });
    const many = { ...p, remove: Array.from({ length: 80 }, (_, i) => `div.junk-${i}-aaaaaaaaaa`) };
    const trimmed = buildNewSiteNote(many, url, 's', undefined, 600).split('\n')[1]!;
    expect(trimmed.length).toBeLessThanOrEqual(600);
    expect(validate(JSON.parse(trimmed))).toBe(true);
  });
});

describe('the card for a page the reader could not open', () => {
  it('offers a report for a failed article, only Tutup for a page that is not an article', async () => {
    const { showFailCard } = await import('../src/render/newsiteprompt.ts');
    const { strings } = await import('../src/render/i18n.ts');
    const t = strings('id');
    let reported = 0;
    showFailCard(document, t, 'light', false, () => reported++);
    const root = () => document.querySelector('.sapuberita-newsite')!.shadowRoot!;
    expect(root().querySelector('.ns-text')!.textContent).toBe(t.failText);
    (root().querySelector('[data-ns="report"]') as HTMLButtonElement).click();
    expect(reported).toBe(1);
    expect(document.querySelector('.sapuberita-newsite')).toBeNull();

    showFailCard(document, t, 'light', true, () => reported++);
    expect(root().querySelector('.ns-text')!.textContent).toBe(t.failNotArticle);
    expect(root().querySelector('[data-ns="report"]')).toBeNull();
    (root().querySelector('[data-ns="close"]') as HTMLButtonElement).click();
    expect(document.querySelector('.sapuberita-newsite')).toBeNull();
  });
});
