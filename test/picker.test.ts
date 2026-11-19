import { describe as group, expect, it } from 'vitest';
import { applyHidden, describe, fingerprint } from '../src/render/picker.ts';

const article = (html: string) => {
  const root = document.createElement('div');
  root.className = 'root';
  const content = document.createElement('div');
  content.className = 'content';
  content.innerHTML = html;
  root.append(content);
  document.body.replaceChildren(root);
  return { root, content };
};
const BODY =
  '<p>Paragraf pertama yang panjang tentang kejadian hari ini di Jakarta dan sekitarnya.</p>' +
  '<div class="promo"><p>Simak video berikut ini:</p><img src="https://img.example/promo.jpg"></div>' +
  '<p>Paragraf kedua yang juga cukup panjang supaya artikelnya punya isi yang jelas.</p>' +
  '<p>Paragraf ketiga menutup cerita dengan kutipan narasumber yang panjang sekali.</p>';

group('fingerprint', () => {
  it('uses the opening text, else the image', () => {
    const { content } = article('<p>Simak video berikut ini:</p><figure><img src="https://img.example/a.jpg?w=700"></figure>');
    expect(fingerprint(content.querySelector('p')!)).toBe('t:simak video berikut ini');
    expect(fingerprint(content.querySelector('figure')!)).toBe('i:img.example/a.jpg');
  });
});

group('applyHidden', () => {
  it('hides the same junk on another article of the outlet', () => {
    const { content } = article(BODY);
    const key = fingerprint(content.querySelector('.promo')!)!;
    const other = article(BODY.replace('kejadian hari ini', 'kejadian kemarin')).content;
    expect(applyHidden(other, new Set([key]))).toBe(1);
    expect(other.querySelector('.promo')!.hasAttribute('data-user-hidden')).toBe(true);
    expect(applyHidden(other, new Set())).toBe(0);
    expect(other.querySelector('[data-user-hidden]')).toBeNull();
  });
});

group('describe', () => {
  it('quotes the block, or says it is a photo', () => {
    const { content } = article('<p>Baca juga: berita lain</p><figure><img src="a.jpg"></figure>');
    expect(describe(content.querySelector('p')!)).toBe('Baca juga: berita lain');
    expect(describe(content.querySelector('figure')!)).toBe('(foto)');
  });
});

group('splitBreaks (paragraphs separated by blank lines, Tribrata News)', () => {
  it('turns <br><br> into separate paragraphs and keeps single line breaks', async () => {
    const { splitBreaks } = await import('../src/clean/breaks.ts');
    const root = document.createElement('div');
    root.innerHTML = '<p><i><a href="/">Tribratanews.polri.go.id</a></i> – Manado – Satu.<br><br>Dua.<br> <br>Tiga, baris satu<br>baris dua.</p><p>Biasa.</p>';
    expect(splitBreaks(root)).toBe(1);
    expect([...root.querySelectorAll('p')].map((p) => p.textContent?.trim())).toEqual([
      'Tribratanews.polri.go.id – Manado – Satu.', 'Dua.', 'Tiga, baris satubaris dua.', 'Biasa.',
    ]);
    expect(root.querySelectorAll('p')[2]!.querySelector('br')).not.toBeNull();
    expect(root.querySelector('p a')?.getAttribute('href')).toBe('/');
  });
});

group('splitBreaks on a body with no <p> (Sindonews, Medcom)', () => {
  const texts = (root: HTMLElement) => [...root.children].map((c) => c.tagName + ':' + c.textContent?.trim());
  const make = async (html: string) => {
    const { splitBreaks } = await import('../src/clean/breaks.ts');
    const root = document.createElement('div');
    root.innerHTML = html;
    splitBreaks(root);
    return root;
  };
  it('wraps bare text separated by single <br>', async () => {
    expect(texts(await make('Satu.<br>Dua.<br>\n<br>Tiga.'))).toEqual(['P:Satu.', 'P:Dua.', 'P:Tiga.']);
  });
  it('wraps bare text separated by double <br>', async () => {
    expect(texts(await make('Satu.<br><br>Dua.<br /><br />'))).toEqual(['P:Satu.', 'P:Dua.']);
  });
  it('keeps inline elements inside their paragraph and leaves blocks alone', async () => {
    const root = await make('<strong>JAKARTA</strong> - Satu <a href="/x">tautan</a> di sini.<br><br><figure>F</figure>Dua <em>miring</em>.<h2>Judul</h2>Tiga.');
    expect(texts(root)).toEqual(['P:JAKARTA - Satu tautan di sini.', 'FIGURE:F', 'P:Dua miring.', 'H2:Judul', 'P:Tiga.']);
    expect(root.querySelector('p a')?.getAttribute('href')).toBe('/x');
  });
  it('leaves short loose text in a container that already has <p> children unchanged', async () => {
    const html = '<p>Satu.</p>Teks lepas<br>lagi<p>Dua.</p>';
    expect((await make(html)).innerHTML).toBe(html);
  });
  it('wraps a long loose first paragraph next to real ones (Detik phone pages)', async () => {
    const root = await make('<strong>Jakarta</strong> - Wisata paramotor tandem biasanya menyuguhkan pemandangan alam.<p></p><p>Bagi traveler yang suka bermain.</p>');
    expect(texts(root).filter((x) => x !== 'P:')).toEqual(['P:Jakarta - Wisata paramotor tandem biasanya menyuguhkan pemandangan alam.', 'P:Bagi traveler yang suka bermain.']);
    expect(root.querySelector('p > strong')?.textContent).toBe('Jakarta');
  });
});
