// The feedback page (docs/FEEDBACK.md §1, §2): one full view inside the reader with four choices, and the
// guided text reports. The page is built here; overlay.ts only opens it, hosts it in the reader root and
// hands it the few things it needs (details, the report link, the editor).
import type { Strings } from './i18n.ts';
import type { ReportInput } from './overlay.ts';

/** One label/value pair of the automatic details shown to the reader before sending. */
export type Detail = [label: string, value: string];

export interface NoteParts {
  /** First line, e.g. "Usulan situs: detik.com". */
  headline?: string;
  /** Chips the reader ticked, in order. */
  chips?: string[];
  /** What the reader typed. */
  text?: string;
  details?: Detail[];
}

export interface NoteLabels {
  problems: string;
  story: string;
  details: string;
}

const MAX_TEXT = 2000;

const MAX_VALUE = 300;

const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim();

/**
 * The report note: readable lines the maintainers can scan, and nothing the reader didn't see.
 * Empty parts are left out. Typed text keeps its line breaks (blank runs collapsed) but is capped,
 * since the whole note travels inside a link.
 */
export function buildNote(parts: NoteParts, labels: NoteLabels): string {
  const lines: string[] = [];
  if (parts.headline) lines.push(oneLine(parts.headline));
  const chips = (parts.chips ?? []).map(oneLine).filter(Boolean);
  if (chips.length) lines.push(`${labels.problems}: ${chips.join(', ')}`);
  const text = (parts.text ?? '').replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, MAX_TEXT).trim();
  if (text) lines.push(chips.length ? `${labels.story}: ${text}` : text);
  const details = (parts.details ?? []).filter(([, v]) => v.trim());
  if (details.length) {
    if (lines.length) lines.push('');
    lines.push(`${labels.details}:`);
    for (const [k, v] of details) lines.push(`- ${k}: ${oneLine(v).slice(0, MAX_VALUE)}`);
  }
  return lines.join('\n');
}

export interface FeedbackContext {
  doc: Document;
  t: Strings;
  /** This article's hostname, prefilled in "Usulkan situs". */
  hostname: string;
  /** The automatic details, read when the report page opens. */
  details: () => Detail[];
  /** The form's prefilled link; none when this build has no feedback destination. */
  reportLink: (input: ReportInput) => string | undefined;
  /** Send directly; false when it could not go out from this page (then the link is offered). */
  send: (input: ReportInput) => Promise<boolean>;
  /** Back out of the feedback page (to where it was opened from: the settings panel, or the article). */
  close: () => void;
  /** Done after sending: straight back to the article. Falls back to close. */
  finish?: () => void;
  /** "Atur isi artikel": leave this page and open the editor on the original page. */
  editArticle: () => void;
  /** A sub page opened: Back returns to the choices (render/backstack.ts). */
  pushBack?: (onBack: () => void) => { release(): void };
}

export interface FeedbackPage {
  el: HTMLElement;
  /** Back one step: sub page → choices → article. Used by Escape. */
  back: () => void;
  focus: () => void;
}

type View = 'choices' | 'report' | 'site' | 'idea' | 'sent';

export function createFeedbackPage(ctx: FeedbackContext): FeedbackPage {
  const { doc, t } = ctx;
  const el = h(doc, 'section', { class: 'feedback', role: 'region', 'aria-label': t.fbTitle });
  let view: View = 'choices';
  const labels: NoteLabels = { problems: t.fbNoteProblems, story: t.fbNoteStory, details: t.fbNoteDetails };

  const titles: Record<View, string> = {
    choices: t.fbTitle, report: t.fbReportTitle, site: t.fbSiteTitle, idea: t.fbIdeaTitle, sent: t.fbSentTitle,
  };

  let sub: { release(): void } | undefined;
  const show = (next: View) => {
    if (next !== 'choices' && !sub) sub = ctx.pushBack?.(() => {
      sub = undefined; // popped by Back
      show('choices');
    });
    view = next;
    const back = h(doc, 'button', { type: 'button', class: 'icon-btn', 'aria-label': t.fbBack }, backArrow(doc));
    back.addEventListener('click', goBack);
    const bar = h(doc, 'header', { class: 'fb-bar' }, back, h(doc, 'h2', {}, titles[next]));
    const body = h(doc, 'div', { class: 'fb-body' });
    if (next === 'choices') body.append(choices());
    else if (next === 'report') body.append(reportPage());
    else if (next === 'site') body.append(sitePage());
    else if (next === 'idea') body.append(ideaPage());
    else body.append(sentPage());
    el.replaceChildren(bar, body);
    el.scrollTop = 0;
    focusFirst();
  };

  const goBack = () => {
    if (view === 'choices') return ctx.close();
    if (view === 'sent') return (ctx.finish ?? ctx.close)();
    sub?.release();
    sub = undefined;
    show('choices');
  };

  const focusFirst = () => (el.querySelector('.fb-body textarea, .fb-body input, .fb-body button, .fb-bar button') as HTMLElement | null)?.focus({ preventScroll: true });

  const choice = (title: string, desc: string, to: View | (() => void)) => {
    const b = h(doc, 'button', { type: 'button', class: 'fb-choice' },
      h(doc, 'span', { class: 'fb-choice-text' }, h(doc, 'span', { class: 'fb-choice-title' }, title), h(doc, 'span', { class: 'fb-choice-desc' }, desc)),
      chevron(doc));
    b.addEventListener('click', () => (typeof to === 'function' ? to() : show(to)));
    return b;
  };
  const choices = () => h(doc, 'div', {},
    h(doc, 'p', { class: 'fb-lead' }, t.fbHomeLead),
    h(doc, 'div', { class: 'fb-choices' },
    choice(t.fbEditTitle, t.fbEditDesc, ctx.editArticle),
    choice(t.fbReportTitle, t.fbReportDesc, 'report'),
    choice(t.fbSiteTitle, t.fbSiteDesc, 'site'),
    choice(t.fbIdeaTitle, t.fbIdeaDesc, 'idea')));

  /**
   * "Kirim": disabled until `ready()`. It sends directly; where the page blocks that (the bookmark runs as
   * the news site, under its security policy), it offers the form prefilled in a new tab instead.
   */
  const sender = (ready: () => boolean, input: () => ReportInput) => {
    const b = h(doc, 'button', { type: 'button', class: 'btn primary fb-send' }, t.fbSend) as HTMLButtonElement;
    const fallback = h(doc, 'p', { class: 'fb-fallback', role: 'status' });
    let busy = false;
    const sync = () => {
      b.disabled = busy || !ready();
    };
    b.addEventListener('click', async () => {
      if (b.disabled) return;
      const answer = input();
      busy = true;
      b.textContent = t.fbSending;
      sync();
      const ok = await ctx.send(answer);
      busy = false;
      b.textContent = t.fbSend;
      sync();
      if (ok) return show('sent');
      const href = ctx.reportLink(answer);
      fallback.replaceChildren(t.fbSendFail);
      if (href) fallback.append(' ', h(doc, 'a', { href, target: '_blank', rel: 'noopener' }, t.fbOpenForm));
    });
    sync();
    return { a: h(doc, 'div', { class: 'fb-send-wrap' }, b, fallback), sync };
  };

  // ── Terkirim ──
  const sentPage = () => {
    const back = h(doc, 'button', { type: 'button', class: 'btn' }, t.fbBackToArticle);
    back.addEventListener('click', () => (ctx.finish ?? ctx.close)());
    return h(doc, 'div', { class: 'fb-sent' }, h(doc, 'p', { class: 'fb-lead' }, t.fbSentLead), back);
  };

  const textarea = (label: string, rows: number, onInput: () => void) => {
    const id = `fb-${Math.random().toString(36).slice(2, 8)}`;
    const ta = h(doc, 'textarea', { id, class: 'fb-text', rows: String(rows), maxlength: String(MAX_TEXT) }) as HTMLTextAreaElement;
    ta.addEventListener('input', onInput);
    return { ta, field: h(doc, 'div', { class: 'fb-field' }, h(doc, 'label', { for: id }, label), ta) };
  };

  // ── Laporkan masalah ──
  const reportPage = () => {
    const picked = new Set<number>();
    const chipRow = h(doc, 'div', { class: 'fb-chips' });
    const details = ctx.details();
    const note = () => buildNote({ chips: [...picked].sort((a, b) => a - b).map((i) => t.fbChips[i]!), text: ta.value, details }, labels);
    const { ta, field } = textarea(t.fbStory, 5, () => send.sync());
    const send = sender(() => picked.size > 0 || ta.value.trim().length > 0, () => ({ kind: 'report', note: note() }));
    t.fbChips.forEach((label, i) => {
      const chip = h(doc, 'button', { type: 'button', class: 'fb-chip', 'aria-pressed': 'false' }, label);
      chip.addEventListener('click', () => {
        if (picked.has(i)) picked.delete(i);
        else picked.add(i);
        chip.setAttribute('aria-pressed', String(picked.has(i)));
        send.sync();
      });
      chipRow.append(chip);
    });
    const list = h(doc, 'dl', { class: 'fb-details' });
    for (const [k, v] of details) list.append(h(doc, 'dt', {}, k), h(doc, 'dd', {}, v));
    return h(doc, 'div', {},
      h(doc, 'p', { class: 'fb-lead' }, t.fbReportLead),
      chipRow, field,
      // Nothing hidden, but folded: the form stays the main thing on the page.
      h(doc, 'details', { class: 'fb-box' }, h(doc, 'summary', {}, t.fbSentWithCount(details.length)), list),
      sendRow(send.a));
  };

  const sendRow = (a: HTMLElement) =>
    h(doc, 'div', { class: 'fb-send-row' }, a, h(doc, 'p', { class: 'fb-note' }, t.fbSendNote));

  // ── Usulkan situs ──
  const sitePage = () => {
    const id = `fb-${Math.random().toString(36).slice(2, 8)}`;
    const input = h(doc, 'input', { id, class: 'fb-text', type: 'text', inputmode: 'url', autocapitalize: 'off', autocomplete: 'off', spellcheck: 'false', value: ctx.hostname }) as HTMLInputElement;
    input.addEventListener('input', () => send.sync());
    const { ta, field } = textarea(t.fbSiteExtra, 4, () => send.sync());
    const send = sender(() => input.value.trim().length > 0, () => ({ kind: 'site', note: buildNote({ headline: t.fbNoteSite(input.value), text: ta.value }, labels) }));
    return h(doc, 'div', {},
      h(doc, 'div', { class: 'fb-field' }, h(doc, 'label', { for: id }, t.fbSiteLabel), input),
      field, sendRow(send.a));
  };

  // ── Ide atau saran ──
  const ideaPage = () => {
    const { ta, field } = textarea(t.fbIdeaLabel, 7, () => send.sync());
    const send = sender(() => ta.value.trim().length > 0, () => ({ kind: 'idea', note: buildNote({ headline: t.fbNoteIdea, text: ta.value }, labels) }));
    return h(doc, 'div', {}, field, sendRow(send.a));
  };

  show('choices');
  return { el, back: goBack, focus: focusFirst };
}

// ── Tiny DOM helpers (same as overlay.ts; kept local so this module doesn't import it back) ──
function h(doc: Document, tag: string, attrs: Record<string, string> = {}, ...children: Array<Node | string>): HTMLElement {
  const node = doc.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  for (const c of children) node.append(c);
  return node;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
function stroke(doc: Document, d: string): SVGSVGElement {
  const svg = doc.createElementNS(SVG_NS, 'svg');
  for (const [k, v] of Object.entries({
    width: '20', height: '20', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    'stroke-width': '1.6', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true',
  })) svg.setAttribute(k, v);
  const path = doc.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', d);
  svg.append(path);
  return svg;
}
const backArrow = (doc: Document) => stroke(doc, 'M19 12H5M11 6l-6 6 6 6');
const chevron = (doc: Document) => {
  const c = stroke(doc, 'M9 6l6 6-6 6');
  c.classList.add('fb-chevron');
  return c;
};
