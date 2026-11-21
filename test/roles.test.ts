import { describe, expect, it } from 'vitest';
import { applyPersonalContent, normalizePersonal, retireRedundant, type PersonalRule } from '../src/personal.ts';
import { applyRoles, roleRedundant } from '../src/render/roles.ts';
import { fingerprint } from '../src/render/picker.ts';
import type { ResolvedRule } from '../src/types.ts';

const PARA = (n: number) => `Paragraf ${n} yang cukup panjang untuk dikenali sebagai bagian artikel ini.`;
const SUB = 'Harga tiket dan fasilitas paramotor';
const CAP = 'Suasana Cikarang pagi ini (Foto: dok. pembaca)';
const PAGE =
  `<article><p>${PARA(1)}</p><p class="subjudul">${SUB}</p><p>${PARA(2)}</p>` +
  `<img src="https://img.example/a.jpg"><div class="keterangan">${CAP}</div><h3 class="callout">Simak juga berita lainnya hari ini di kanal kami</h3></article>`;
const reader = () => {
  document.body.innerHTML = PAGE;
  const content = document.createElement('div');
  content.innerHTML = `<p>${PARA(1)}</p><p>${SUB}</p><p>${PARA(2)}</p><img src="https://img.example/a.jpg"><p>${CAP}</p><h3>Simak juga berita lainnya hari ini di kanal kami</h3>`;
  return content;
};
const rule = (as: PersonalRule['as']): PersonalRule => ({ site: 'x', add: [], remove: [], as, updated: '2026-11-21' });

describe('showing a block as another kind', () => {
  it('marks subheadings, captions and quotes by selector or fingerprint, and clears old marks', () => {
    const content = reader();
    const n = applyRoles(content, { heading: ['p.subjudul'], caption: [fingerprint(content.children[4]!)!], text: ['h3.callout'] }, document);
    expect(n).toBe(3);
    expect(content.children[1]!.getAttribute('data-user-as')).toBe('heading');
    expect(content.children[1]!.getAttribute('role')).toBe('heading');
    expect(content.children[4]!.getAttribute('data-user-as')).toBe('caption');
    expect(content.children[5]!.getAttribute('data-user-as')).toBe('text');
    applyRoles(content, undefined, document);
    expect(content.querySelectorAll('[data-user-as], [role]').length).toBe(0);
  });

  it('runs with the rest of the personal rule', () => {
    const content = reader();
    applyPersonalContent(content, rule({ quote: ['p.subjudul'] }), document);
    expect(content.children[1]!.getAttribute('data-user-as')).toBe('quote');
  });

  it('retires a role the article already gives the block', () => {
    const content = reader();
    expect(roleRedundant('heading', 'h3.callout', content, document)).toBe(true);
    expect(roleRedundant('heading', 'p.subjudul', content, document)).toBe(false);
    const official = { remove: [], lead: [], trail: [], body: [] } as unknown as ResolvedRule;
    const left = retireRedundant(rule({ heading: ['h3.callout', 'p.subjudul'] }), official, content, document);
    expect(left?.as).toEqual({ heading: ['p.subjudul'] });
  });

  it('keeps roles through storage and drops junk', () => {
    const [p] = normalizePersonal([{ site: 'x', add: [], remove: [], as: { heading: ['p.a', 7], caption: 'no', bogus: ['p.b'] } }]);
    expect(p!.as).toEqual({ heading: ['p.a'] });
  });
});
