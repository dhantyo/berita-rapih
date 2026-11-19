/**
 * Small cards at the bottom of the page, outside the reader: the bookmark's offer on a site without a rule
 * (docs/FEEDBACK.md §5; "Coba atur sendiri" starts the new-site flow, entries/boot.ts), and the note that a page
 * the reader was asked to open couldn't be read.
 */
import { OVERLAY_CSS } from './styles.ts';
import type { Settings } from '../settings.ts';
import type { Strings } from './i18n.ts';

export const PROMPT_CLASS = 'sapuberita-newsite';

export interface NewSitePrompt {
  /** Replace the card's text (and drop "Coba atur sendiri"): reading the page failed. */
  fail(): void;
  /** Show that the page is being read. */
  working(): void;
  close(): void;
}

/** A small card at the bottom of the page, in its own shadow host and the top layer: text and up to two buttons. */
function mountCard(doc: Document, theme: Settings['theme'], label: string) {
  doc.querySelector(`.${PROMPT_CLASS}`)?.remove();
  const host = doc.createElement('div');
  host.className = PROMPT_CLASS;
  const shadow = host.attachShadow({ mode: 'open' });
  const style = doc.createElement('style');
  style.textContent = OVERLAY_CSS;
  const card = doc.createElement('div');
  card.className = 'nsprompt tokens';
  card.dataset.theme = theme;
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', label);
  const text = doc.createElement('p');
  text.className = 'ns-text';
  text.setAttribute('role', 'status');
  text.textContent = label;
  const actions = doc.createElement('div');
  actions.className = 'ns-actions';
  card.append(text, actions);
  shadow.append(style, card);
  const make = (title: string, cls: string, id: string, click: () => void) => {
    const b = doc.createElement('button');
    b.type = 'button';
    b.className = `btn ${cls}`.trim();
    b.dataset.ns = id;
    b.textContent = title;
    b.addEventListener('click', click);
    actions.append(b);
    return b;
  };

  // Top layer, like the reader: above whatever the page puts on top.
  const popover = host as HTMLElement & { showPopover?: () => void };
  doc.documentElement.append(host);
  host.style.cssText = 'position:fixed;inset:auto;top:0;right:0;width:0;height:0;margin:0;padding:0;border:0;overflow:visible;background:transparent;z-index:2147483647';
  if (typeof popover.showPopover === 'function') {
    host.setAttribute('popover', 'manual');
    popover.showPopover();
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };
  doc.addEventListener('keydown', onKey, true);
  function close() {
    doc.removeEventListener('keydown', onKey, true);
    host.remove();
  }
  return { text, make, close };
}

export function showNewSitePrompt(doc: Document, t: Strings, theme: Settings['theme'], onTry: () => void): NewSitePrompt {
  const { text, make, close } = mountCard(doc, theme, t.nsPrompt);
  const tryBtn = make(t.nsTry, 'primary', 'try', onTry);
  const closeBtn = make(t.nsClose, '', 'close', () => close());
  tryBtn.focus({ preventScroll: true });
  return {
    close,
    working: () => {
      text.textContent = t.nsWorking;
      tryBtn.disabled = true;
    },
    fail: () => {
      text.textContent = t.nsFail;
      tryBtn.remove();
      closeBtn.focus({ preventScroll: true });
    },
  };
}

/**
 * The reader was asked to open this page (the bookmark, the Shortcut, the Android app) and couldn't. Say so instead
 * of silently showing the original, and offer a report that carries why (FailReason) when it's worth one.
 */
export function showFailCard(doc: Document, t: Strings, theme: Settings['theme'], notArticle: boolean, onReport?: () => void): { close(): void } {
  const { make, close } = mountCard(doc, theme, notArticle ? t.failNotArticle : t.failText);
  const report = onReport && !notArticle ? make(t.failReport, 'primary', 'report', () => { onReport(); close(); }) : undefined;
  const closeBtn = make(t.nsClose, '', 'close', () => close());
  (report ?? closeBtn).focus({ preventScroll: true });
  return { close };
}
