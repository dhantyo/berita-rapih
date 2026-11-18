import { describe, expect, it } from 'vitest';
import { buildNote, createFeedbackPage } from '../src/render/feedback.ts';
import { strings } from '../src/render/i18n.ts';
import type { ReportInput } from '../src/render/overlay.ts';

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
  const make = (ok = true) => {
    const calls: string[] = [];
    const sent: ReportInput[] = [];
    const page = createFeedbackPage({
      doc: document, t: strings('id'), hostname: 'www.detik.com',
      details: () => [['Link', 'https://www.detik.com/a']],
      reportLink: (input) => `https://r.example/form?note=${encodeURIComponent(input.note)}`,
      send: async (input) => {
        sent.push(input);
        return ok;
      },
      close: () => calls.push('close'),
      editArticle: () => calls.push('edit'),
    });
    document.body.replaceChildren(page.el);
    return { page, calls, sent };
  };
  const click = (el: Element | null) => (el as HTMLElement).click();
  const settle = () => new Promise((r) => setTimeout(r, 0));

  it('offers four choices, and back returns step by step', () => {
    const { page, calls } = make();
    expect(page.el.querySelectorAll('.fb-choice')).toHaveLength(4);
    click(page.el.querySelectorAll('.fb-choice')[1]!);
    expect(page.el.querySelector('textarea')).not.toBeNull();
    page.back();
    expect(calls).toEqual([]);
    expect(page.el.querySelectorAll('.fb-choice')).toHaveLength(4);
    page.back();
    expect(calls).toEqual(['close']);
  });
  it('opens the editor from "Atur isi artikel"', () => {
    const { page, calls } = make();
    click(page.el.querySelectorAll('.fb-choice')[0]!);
    expect(calls).toEqual(['edit']);
  });
  it('sends the report from chips, text and details; disabled until something is filled in', async () => {
    const { page, sent } = make();
    click(page.el.querySelectorAll('.fb-choice')[1]!);
    const send = page.el.querySelector<HTMLButtonElement>('.fb-send')!;
    expect(send.disabled).toBe(true);
    click(page.el.querySelectorAll('.fb-chip')[2]!);
    const ta = page.el.querySelector('textarea')!;
    ta.value = 'Foto kosong';
    ta.dispatchEvent(new Event('input'));
    expect(send.disabled).toBe(false);
    click(send);
    await settle();
    expect(sent).toHaveLength(1);
    expect(sent[0]!.kind).toBe('report');
    expect(sent[0]!.note).toContain('Masalah: Foto atau video');
    expect(sent[0]!.note).toContain('Cerita: Foto kosong');
    expect(sent[0]!.note).toContain('- Link: https://www.detik.com/a');
    expect(page.el.querySelector('.fb-sent')).not.toBeNull();
  });
  it('offers the form in a new tab when sending from this page fails', async () => {
    const { page } = make(false);
    click(page.el.querySelectorAll('.fb-choice')[3]!);
    const ta = page.el.querySelector('textarea')!;
    ta.value = 'Mode gelap lebih gelap';
    ta.dispatchEvent(new Event('input'));
    click(page.el.querySelector('.fb-send'));
    await settle();
    const link = page.el.querySelector<HTMLAnchorElement>('.fb-fallback a')!;
    expect(decodeURIComponent(link.href)).toContain('Mode gelap lebih gelap');
    expect(link.target).toBe('_blank');
  });
  it('prefills the site suggestion with this hostname', async () => {
    const { page, sent } = make();
    click(page.el.querySelectorAll('.fb-choice')[2]!);
    expect((page.el.querySelector('input') as HTMLInputElement).value).toBe('www.detik.com');
    click(page.el.querySelector('.fb-send'));
    await settle();
    expect(sent[0]).toMatchObject({ kind: 'site', note: 'Usulan situs: www.detik.com' });
  });
});
