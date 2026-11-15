/**
 * The bookmark's offer on a site without a rule (docs/FEEDBACK.md §5): a small card, top right where the Sapu
 * button sits, in its own shadow host. "Coba atur sendiri" starts the new-site flow (entries/boot.ts).
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

export function showNewSitePrompt(doc: Document, t: Strings, theme: Settings['theme'], onTry: () => void): NewSitePrompt {
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
  card.setAttribute('aria-label', t.nsPrompt);
  const text = doc.createElement('p');
  text.className = 'ns-text';
  text.setAttribute('role', 'status');
  text.textContent = t.nsPrompt;
  const actions = doc.createElement('div');
  actions.className = 'ns-actions';
  const make = (label: string, cls: string, id: string, click: () => void) => {
    const b = doc.createElement('button');
    b.type = 'button';
    b.className = `btn ${cls}`.trim();
    b.dataset.ns = id;
    b.textContent = label;
    b.addEventListener('click', click);
    return b;
  };
  const tryBtn = make(t.nsTry, 'primary', 'try', onTry);
  const closeBtn = make(t.nsClose, '', 'close', () => close());
  actions.append(tryBtn, closeBtn);
  card.append(text, actions);
  shadow.append(style, card);

  // Top layer, like the reader: above whatever the page puts on top.
  const popover = host as HTMLElement & { showPopover?: () => void };
  doc.documentElement.append(host);
  host.style.cssText = 'position:fixed;inset:auto;top:0;right:0;width:0;height:0;margin:0;padding:0;border:0;overflow:visible;background:transparent;z-index:2147483647';
  if (typeof popover.showPopover === 'function') {
    host.setAttribute('popover', 'manual');
    popover.showPopover();
  }
  tryBtn.focus({ preventScroll: true });

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };
  doc.addEventListener('keydown', onKey, true);
  function close() {
    doc.removeEventListener('keydown', onKey, true);
    host.remove();
  }
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
