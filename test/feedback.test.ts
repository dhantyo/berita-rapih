import { describe, expect, it } from 'vitest';
import { buildNote, createFeedbackPage } from '../src/render/feedback.ts';
import { strings } from '../src/render/i18n.ts';

const labels = { problems: 'Masalah', story: 'Cerita', details: 'Rincian' };

describe('buildNote', () => {
  it('lists chips, the story and the details as readable lines', () => {
    const note = buildNote({
      chips: ['Foto/video', 'Lambat'],
      text: '  Foto tidak\n\n\n\nmuncul  ',
      details: [['Link', 'https://x.id/a'], ['Versi', '0.6.0'], ['Aturan situs', '']],
    }, labels);
    expect(note).toBe('Masalah: Foto/video, Lambat\nCerita: Foto tidak\n\nmuncul\n\nRincian:\n- Link: https://x.id/a\n- Versi: 0.6.0');
  });
  it('leaves out what is empty, and the story label when there are no chips', () => {
    expect(buildNote({ headline: 'Usulan situs: kompas.com', text: 'Tolong' }, labels)).toBe('Usulan situs: kompas.com\nTolong');
    expect(buildNote({ chips: [], text: ' ', details: [] }, labels)).toBe('');
  });
  it('caps very long text', () => {
    expect(buildNote({ text: 'a'.repeat(5000) }, labels)).toHaveLength(2000);
  });
});

describe('feedback page', () => {
  const make = (url = 'https://r.example/new?note=') => {
    const calls: string[] = [];
    const page = createFeedbackPage({
      doc: document, t: strings('id'), hostname: 'www.detik.com',
      details: () => [['Link', 'https://www.detik.com/a']],
      reportUrl: (note) => url + encodeURIComponent(note),
      close: () => calls.push('close'),
      hidePart: () => calls.push('hide'),
      addPart: () => calls.push('add'),
    });
    document.body.replaceChildren(page.el);
    return { page, calls };
  };
  const click = (el: Element | null) => (el as HTMLElement).click();

  it('offers four choices, and back returns step by step', () => {
    const { page, calls } = make();
    expect(page.el.querySelectorAll('.fb-choice')).toHaveLength(4);
    click(page.el.querySelectorAll('.fb-choice')[0]!);
    click(page.el.querySelector('.fb-choices .fb-choice'));
    expect(calls).toEqual(['hide']);
    page.back();
    expect(calls).toEqual(['hide']);
    page.back();
    expect(calls).toEqual(['hide', 'close']);
  });
  it('builds the report link from chips, text and details; inert until something is filled in', () => {
    const { page } = make();
    click(page.el.querySelectorAll('.fb-choice')[1]!);
    const send = page.el.querySelector('.fb-send')!;
    expect(send.getAttribute('aria-disabled')).toBe('true');
    click(page.el.querySelectorAll('.fb-chip')[2]!);
    const ta = page.el.querySelector('textarea')!;
    ta.value = 'Foto kosong';
    ta.dispatchEvent(new Event('input'));
    const href = send.getAttribute('href')!;
    const note = decodeURIComponent(href.split('note=')[1]!);
    expect(note).toContain('Masalah: Foto/video');
    expect(note).toContain('Cerita: Foto kosong');
    expect(note).toContain('- Link: https://www.detik.com/a');
    expect(page.el.querySelector('.fb-details')!.textContent).toContain('https://www.detik.com/a');
  });
  it('prefills the site suggestion with this hostname', () => {
    const { page } = make();
    click(page.el.querySelectorAll('.fb-choice')[2]!);
    expect((page.el.querySelector('input') as HTMLInputElement).value).toBe('www.detik.com');
    expect(decodeURIComponent(page.el.querySelector('.fb-send')!.getAttribute('href')!)).toContain('Usulan situs: www.detik.com');
  });
});
