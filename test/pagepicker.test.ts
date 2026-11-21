import { describe, expect, it } from 'vitest';
import { applyAdded, insertFromPage, shownIn, stableSelector } from '../src/render/pagepicker.ts';
import { entryCovers } from '../src/render/editmodel.ts';

const PARA = (n: number) => `Paragraf ${n} yang cukup panjang untuk dikenali sebagai bagian artikel ini.`;
// The original page: the article, a gallery the clean view left out between paragraphs 2 and 3, a sidebar.
const PAGE =
  `<main><article class="post"><div class="post-body"><p>${PARA(1)}</p><p>${PARA(2)}</p>` +
  `<div class="photo-gallery js-slider-123"><img src="https://img.example/1.jpg"><img src="https://img.example/2.jpg"></div>` +
  `<p>${PARA(3)}</p></div></article><aside class="sidebar"><div class="box"><p>Terpopuler hari ini</p></div></aside></main>`;

const setup = () => {
  document.body.innerHTML = PAGE;
  const content = document.createElement('div');
  content.innerHTML = `<p>${PARA(1)}</p><p>${PARA(2)}</p><p>${PARA(3)}</p>`;
  return content;
};

describe('stableSelector', () => {
  it('uses stable class names, never ids, positions or state/hash classes', () => {
    setup();
    expect(stableSelector(document.querySelector('.photo-gallery')!)).toBe('div.photo-gallery');
    const p = document.querySelector('.box p')!;
    expect(stableSelector(p)).toBe('div.box > p');
  });

  it('gives up on a block with no stable handle', () => {
    document.body.innerHTML = '<div><div><div><div><span id="x9">teks</span></div></div></div></div>';
    expect(stableSelector(document.querySelector('span')!)).toBeUndefined();
  });
});

describe('adding a part from the page', () => {
  it('lands next to the article text it follows on the page', () => {
    const content = setup();
    insertFromPage(document.querySelector('.photo-gallery')!, content);
    expect([...content.children].map((c) => (c.tagName === 'P' ? c.textContent!.slice(0, 11) : c.tagName))).toEqual([
      'Paragraf 1 ', 'Paragraf 2 ', 'DIV', 'Paragraf 3 ',
    ]);
    expect(content.querySelectorAll('[data-user-added] img').length).toBe(2);
    expect(content.querySelector('[data-user-added]')!.getAttribute('class')).toBeNull(); // cleaned like the article
  });

  it('re-adds remembered parts once, and skips what the clean view already has', () => {
    const content = setup();
    expect(applyAdded(content, ['div.photo-gallery'], document)).toBe(1);
    expect(applyAdded(content, ['div.photo-gallery'], document)).toBe(1); // replaced, not doubled
    expect(content.querySelectorAll('[data-user-added]').length).toBe(1);
    expect(applyAdded(content, ['div.post-body > p'], document)).toBe(0); // paragraph 1 is already there
    expect(applyAdded(content, ['div.nope'], document)).toBe(0);
  });
});

describe('adding a photo back', () => {
  const CAPTION = 'Badak Jawa di Taman Nasional Ujung Kulon, foto dari arsip kantor berita';
  const page = (photo: string) =>
    `<article><p>${PARA(1)}</p><figure class="inline-photo">${photo}<figcaption>${CAPTION}</figcaption></figure><p>${PARA(2)}</p></article>`;
  const reader = () => {
    const content = document.createElement('div');
    // The clean view kept the caption but lost the photo (the reader's report on an AMP article).
    content.innerHTML = `<p>${PARA(1)}</p><p>${CAPTION}</p><p>${PARA(2)}</p>`;
    return content;
  };

  it('adds the photo when only its caption made it into the clean view', () => {
    document.body.innerHTML = page('<img src="https://img.example/badak.jpg">');
    const content = reader();
    expect(applyAdded(content, ['figure.inline-photo'], document)).toBe(1);
    const tags = [...content.children].map((c) => c.tagName + (c.querySelector('img') || c.tagName === 'IMG' ? '+img' : ''));
    expect(tags.map((x) => x.endsWith('+img'))).toEqual([false, true, false, false]); // the photo sits right above its caption
    expect(content.querySelector('img')!.getAttribute('src')).toBe('https://img.example/badak.jpg');
    expect(content.textContent!.split(CAPTION).length).toBe(2); // the caption isn't doubled
    expect(applyAdded(content, ['figure.inline-photo'], document)).toBe(1); // replaced, not doubled
    expect(content.querySelectorAll('img').length).toBe(1);
  });

  it('skips a photo the clean view already shows', () => {
    document.body.innerHTML = page('<img src="https://img.example/badak.jpg">');
    const content = reader();
    content.children[1]!.before(Object.assign(document.createElement('img'), { src: 'https://img.example/badak.jpg' }));
    expect(applyAdded(content, ['figure.inline-photo'], document)).toBe(0);
  });

  it('turns lazy-loaded and AMP photos into images that load', () => {
    document.body.innerHTML = page('<img src="data:image/gif;base64,R0lGOD" data-src="https://img.example/lazy.jpg">');
    let content = reader();
    applyAdded(content, ['figure.inline-photo'], document);
    expect(content.querySelector('img')!.getAttribute('src')).toBe('https://img.example/lazy.jpg');

    document.body.innerHTML = page('<amp-img src="https://img.example/amp.jpg" alt="Badak" width="16" height="9"><img src="https://img.example/amp.jpg" class="i-amphtml-fill-content"></amp-img>');
    content = reader();
    expect(applyAdded(content, ['figure.inline-photo'], document)).toBe(1);
    expect([...content.querySelectorAll('img')].map((i) => i.getAttribute('src'))).toEqual(['https://img.example/amp.jpg']);
  });

  it('adds a bare photo once', () => {
    document.body.innerHTML = page('<img class="pic-main" src="https://img.example/badak.jpg">');
    const content = reader();
    expect(applyAdded(content, ['img.pic-main'], document)).toBe(1);
    expect(applyAdded(content, ['img.pic-main'], document)).toBe(1);
    expect(content.querySelectorAll('img').length).toBe(1);
  });
});

describe('AMP photos drawn in several sizes', () => {
  const RUN =
    '<div class="pic"><amp-img src="https://img.example/9_800.webp" alt="Badak"><amp-img fallback src="https://img.example/9_800.jpg" alt="Badak"></amp-img></amp-img>' +
    '<amp-img src="https://img.example/9_906.webp" alt="Badak"><amp-img fallback src="https://img.example/9_906.jpg" alt="Badak"></amp-img></amp-img></div>';

  it('counts the run as one photo, shown when any size is', () => {
    document.body.innerHTML = `<article><p>${PARA(1)}</p><figure class="photo">${RUN}</figure></article>`;
    const content = document.createElement('div');
    content.innerHTML = `<p>${PARA(1)}</p><img src="https://img.example/9_906.webp">`;
    expect(shownIn(document.querySelector('figure')!, content).missing).toEqual([]);
    content.querySelector('img')!.remove();
    const missing = shownIn(document.querySelector('figure')!, content).missing;
    expect(missing.map((m) => m.getAttribute('src'))).toEqual(['https://img.example/9_906.webp']); // the largest, once
    expect(applyAdded(content, ['figure.photo'], document)).toBe(1);
    expect([...content.querySelectorAll('img')].map((i) => i.getAttribute('src'))).toEqual(['https://img.example/9_906.webp']);
  });

  it('a removal by one size covers the photo the page shows in another', () => {
    document.body.innerHTML = `<article>${RUN}</article>`;
    const shown = document.querySelector('amp-img')!; // the 800 size
    expect(entryCovers('i:img.example/9_906.webp', shown, document)).toBe(true);
    expect(entryCovers('i:img.example/7_906.webp', shown, document)).toBe(false);
  });
});
