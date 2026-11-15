import { beforeEach, describe, expect, it } from 'vitest';
import { buildEditNote, compactRule, computeMarks, entryCovers, findHeaderSources, iou, markAt, removalFor, snapBest, spanned, statusOf } from '../src/render/editmodel.ts';
import { hideMatching, matchLeaves } from '../src/render/provenance.ts';
import { snapCandidates } from '../src/render/editor.ts';
import { applyPersonalContent, type PersonalRule } from '../src/personal.ts';

const P = (n: number) => `Paragraf ${n} yang cukup panjang untuk dikenali sebagai bagian artikel ini.`;
// A miniature article page: header, a body with a promo box and an ad, a photo, a sidebar.
const PAGE = `
<header><h1 class="title">Judul Berita Hari Ini</h1>
  <div class="credit"><span>Penulis:</span> <a class="author" href="/a">Hari Setiadi</a></div>
  <time datetime="2026-11-15T10:30:00+07:00">Minggu, 15 November 2026 10:30 WIB</time></header>
<article class="post"><div class="body">
  <p>${P(1)}</p>
  <figure><img src="https://img.example/foto/a.jpg?w=700"><figcaption>Keterangan foto yang cukup panjang untuk artikel ini.</figcaption></figure>
  <p>${P(2)}</p>
  <div class="promo"><p>Baca juga: berita lain yang sangat menarik untuk dibaca.</p><p>Berita lain lagi yang juga menarik untuk dibaca.</p></div>
  <p>${P(3)}</p>
  <div class="ads"><img src="https://img.example/iklan.jpg"></div>
</div></article>
<aside class="side"><p>Terpopuler hari ini di seluruh situs berita ini.</p></aside>`;

// What the clean view took: the paragraphs, the photo with its caption; not the promo, the ad or the sidebar.
const cleanView = () => {
  const c = document.createElement('div');
  c.innerHTML = `<p>${P(1)}</p><figure><img src="https://img.example/foto/a.jpg"><figcaption>Keterangan foto yang cukup panjang untuk artikel ini.</figcaption></figure><p>${P(2)}</p><p>${P(3)}</p>`;
  return c;
};

beforeEach(() => {
  document.body.innerHTML = PAGE;
});

describe('snapBest', () => {
  const r = (left: number, top: number, right: number, bottom: number) => ({ left, top, right, bottom });
  it('picks the box that best fits the dragged rectangle', () => {
    const para = { item: 'p', rect: r(10, 10, 110, 40) };
    const box = { item: 'box', rect: r(0, 0, 120, 120) };
    const sibling = { item: 'next', rect: r(10, 50, 110, 80) };
    expect(snapBest(r(8, 8, 118, 118), [para, box, sibling])).toBe('box');
    expect(snapBest(r(10, 10, 112, 42), [para, box, sibling])).toBe('p');
    expect(snapBest(r(10, 48, 110, 82), [para, box, sibling])).toBe('next');
  });
  it('keeps the earlier candidate on a tie, and nothing when nothing overlaps', () => {
    const a = { item: 'current', rect: r(0, 0, 50, 50) };
    const twin = { item: 'wrapper', rect: r(0, 0, 50, 50) };
    expect(snapBest(r(0, 0, 50, 50), [a, twin])).toBe('current');
    expect(snapBest(r(500, 500, 600, 600), [a, twin])).toBeUndefined();
  });
  it('iou and spanned', () => {
    expect(iou(r(0, 0, 10, 10), r(0, 0, 10, 10))).toBe(1);
    expect(iou(r(0, 0, 10, 10), r(10, 10, 20, 20))).toBe(0);
    expect(iou(r(0, 0, 10, 10), r(5, 0, 15, 10))).toBeCloseTo(1 / 3);
    expect(spanned(30, 40, 10, 5)).toEqual({ left: 10, top: 5, right: 30, bottom: 40 });
  });
});

describe('provenance', () => {
  it('matches clean paragraphs and the photo back to the page (text key, image address)', () => {
    const { pairs } = matchLeaves(cleanView(), document);
    const texts = [...pairs.keys()].map((el) => (el.tagName === 'IMG' ? 'IMG' : el.textContent!.slice(0, 10)));
    expect(texts).toEqual(['Paragraf 1', 'IMG', 'Keterangan', 'Paragraf 2', 'Paragraf 3']);
  });

  it('green: what the reader takes. red: what the article region has that the clean view left out', () => {
    const header = findHeaderSources(document, { title: 'Judul Berita Hari Ini', byline: 'Hari Setiadi' }, undefined).flatMap((s) => (s.el ? [s.el] : []));
    const marks = computeMarks(cleanView(), document, { header });
    expect(marks.green).toHaveLength(5);
    expect(marks.region).toBe(document.querySelector('.body'));
    // The promo is one red box (its two paragraphs grouped), the ad another; the sidebar is outside the article.
    expect(marks.red).toEqual([document.querySelector('.promo'), document.querySelector('.ads')]);
    expect(markAt(document.querySelector('.promo p')!, marks)?.kind).toBe('out');
    expect(markAt(document.querySelector('.body p')!, marks)).toEqual({ el: document.querySelector('.body p'), kind: 'in' });
    expect(markAt(document.querySelector('.side p')!, marks)).toBeUndefined();
  });

  it('red also covers what the rules remove selectors hit, never the header', () => {
    const marks = computeMarks(cleanView(), document, { removeSelectors: ['.ads', '.title'], header: [document.querySelector('h1')!] });
    expect(marks.red).toContain(document.querySelector('.ads'));
    expect(marks.red).not.toContain(document.querySelector('h1'));
  });

  it('a part the reader hid turns red', () => {
    const clean = cleanView();
    clean.querySelectorAll('p')[1]!.setAttribute('data-user-hidden', '');
    const marks = computeMarks(clean, document);
    expect(marks.red.some((el) => el.textContent!.includes('Paragraf 2'))).toBe(true);
    expect(marks.green.some((el) => el.textContent!.includes('Paragraf 2'))).toBe(false);
  });

  it('statusOf counts the green and non-green leaves of a part', () => {
    const marks = computeMarks(cleanView(), document);
    expect(statusOf(document.querySelector('.promo')!, marks)).toEqual({ inside: 0, outside: 2 });
    expect(statusOf(document.querySelector('.body')!, marks)).toEqual({ inside: 5, outside: 3 });
    expect(statusOf(document.querySelector('.body p')!, marks)).toEqual({ inside: 1, outside: 0 });
  });

  it('a selector removal made after extraction hides what it hits in the clean view', () => {
    const clean = cleanView();
    expect(hideMatching(clean, document, ['.body > p:nth-of-type(1)'])).toBe(1);
    expect(clean.querySelector('p')!.hasAttribute('data-user-hidden')).toBe(true);
    const rule: PersonalRule = { site: 'x', add: [], remove: ['figure'], updated: '2026-11-15' };
    applyPersonalContent(clean, rule, document);
    expect(clean.querySelector('p')!.hasAttribute('data-user-hidden')).toBe(false); // reset by the new rule
    expect(clean.querySelector('figcaption')!.hasAttribute('data-user-hidden')).toBe(true); // and the new one applied
  });

  it('a dateline the clean view joined into the first paragraph is green with it', () => {
    document.body.innerHTML = '<div class="b"><strong>Jakarta</strong> -<p>' + P(1) + '</p><p>' + P(2) + '</p></div>';
    const clean = document.createElement('div');
    clean.innerHTML = '<p><b>Jakarta</b> - ' + P(1) + '</p><p>' + P(2) + '</p>';
    const { pairs } = matchLeaves(clean, document);
    expect(pairs.get(document.querySelector('strong')!)).toBe(clean.querySelector('p'));
    expect(pairs.size).toBe(3);
    expect(computeMarks(clean, document).red).toEqual([]);
  });
  it('a twin of a removed text elsewhere on the page keeps its clean-view part', () => {
    document.body.insertAdjacentHTML('beforeend', `<div class="promo2"><p>${P(1)}</p></div>`);
    const clean = cleanView();
    hideMatching(clean, document, ['.promo2']);
    expect(clean.querySelector('p')!.hasAttribute('data-user-hidden')).toBe(false);
  });
});

describe('header sources', () => {
  it('puts a label on the visible element with the same text, deepest first', () => {
    const src = Object.fromEntries(findHeaderSources(document, { title: 'Judul Berita Hari Ini', byline: 'Hari Setiadi', published: '2026-11-15T10:30:00+07:00' }, undefined).map((s) => [s.key, s.el]));
    expect(src.title).toBe(document.querySelector('h1'));
    expect(src.byline).toBe(document.querySelector('a.author'));
    expect(src.date).toBe(document.querySelector('time'));
  });
  it('a value no visible element shows has no element; the readers own selector wins', () => {
    const none = findHeaderSources(document, { editor: 'Siti Aminah' }, undefined);
    expect(none).toEqual([{ key: 'editor', value: 'Siti Aminah', el: undefined }]);
    const hiddenOnly = findHeaderSources(document, { byline: 'Hari Setiadi' }, undefined, (el) => el.tagName !== 'A');
    expect(hiddenOnly[0]!.el).toBeUndefined();
    const chosen = findHeaderSources(document, { byline: 'Hari Setiadi' }, { byline: '.credit span' });
    expect(chosen[0]!.el).toBe(document.querySelector('.credit span'));
  });
  it('finds the main photo by its address', () => {
    const src = findHeaderSources(document, { image: 'https://img.example/foto/a.jpg' }, undefined);
    expect(src[0]!.el).toBe(document.querySelector('figure img'));
  });
});

describe('what an entry covers, and what to save for a removal', () => {
  it('selectors and fingerprints refer to the part', () => {
    const promo = document.querySelector('.promo')!;
    expect(entryCovers('div.promo', promo, document)).toBe(true);
    expect(entryCovers('div.promo', promo.querySelector('p')!, document)).toBe(true);
    expect(entryCovers('div.ads', promo, document)).toBe(false);
    expect(entryCovers('t:baca juga berita lain yang sangat menarik untuk dibaca', promo, document)).toBe(true);
  });
  it('a selector only when it picks out exactly that part, else the text fingerprint', () => {
    const second = document.querySelectorAll('.body > p')[1]!;
    expect(removalFor(second, 'div.body > p', document)).toMatch(/^t:paragraf 2/);
    expect(removalFor(document.querySelector('.promo')!, 'div.promo', document)).toBe('div.promo');
  });
});

describe('snap candidates', () => {
  it('are the part, its ancestors, descendants and the siblings around them', () => {
    const p = document.querySelector('.promo p')!;
    const c = snapCandidates(p, () => false);
    expect(c[0]).toBe(p);
    for (const want of ['.promo', '.body', 'article'].map((s) => document.querySelector(s)!)) expect(c).toContain(want);
    expect(c).toContain(document.querySelectorAll('.promo p')[1]);
    expect(c).not.toContain(document.body);
  });
});

describe('the note Kirim usulan sends', () => {
  const rule: PersonalRule = { site: 'detik', add: ['div.gallery'], remove: ['div.promo', 't:simak video'], fields: { byline: 'a.author' }, updated: '2026-11-15' };
  it('is one human line, then the rule as compact JSON', () => {
    const note = buildEditNote(rule, 'Usulan aturan untuk detik:  2 dibuang');
    const [line, json] = note.split('\n');
    expect(line).toBe('Usulan aturan untuk detik: 2 dibuang');
    expect(JSON.parse(json!)).toEqual({ site: 'detik', add: ['div.gallery'], remove: ['div.promo', 't:simak video'], fields: { byline: 'a.author' } });
    expect(json).not.toContain('", "');
  });
  it('is trimmed, oldest entries first, to fit a link', () => {
    const big: PersonalRule = { ...rule, remove: Array.from({ length: 80 }, (_, i) => `div.junk-${i}`), add: [] };
    const json = compactRule(big, 500);
    expect(json.length).toBeLessThanOrEqual(500);
    expect(json).toContain('div.junk-79');
    expect(json).not.toContain('"div.junk-0"');
  });
});
