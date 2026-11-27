// The extension's toolbar popup (apps/extension/popup.html). What it shows depends on the page in the current tab:
//   - a supported site: open the clean view, or open it with Pengaturan;
//   - another site whose page looks like an article: "Coba Berita Rapih di halaman ini" and "Sarankan situs ini";
//   - anything else: says so.
// Below that, always: the opt-in page check (ext-offer.ts), which lives here because only an extension page may ask
// the browser for permissions. Clicking the toolbar button grants activeTab, which lets the popup look at the page.
import { OVERLAY_CSS } from '../render/styles.ts';
import { BROOM_PATHS } from '../render/broom.ts';
import { strings, type Strings } from '../render/i18n.ts';
import { normalizeSettings } from '../settings.ts';
import { ensureFonts } from '../render/fonts.ts';
import { looksLikeArticle } from '../looks-like-article.ts';
import { reportLink } from '../update.ts';
import { ALL_SITES, injectReader, offerPrefs, saveOfferPrefs, syncOfferScript, type OfferPrefs } from './ext-offer.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const chrome: any;
declare const __SAPU_VERSION__: string;
declare const __REPORT_URL__: string;
declare const __GEIST__: string;

type Tab = { id: number; url?: string; title?: string };
type PageKind = { kind: 'supported'; open: boolean } | { kind: 'article' } | { kind: 'other' } | { kind: 'restricted' };

const h = <K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, ...kids: Array<Node | string>) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.append(...kids);
  return el;
};
const broom = () => {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('aria-hidden', 'true');
  for (const d of BROOM_PATHS) {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', 'currentColor');
    p.setAttribute('stroke-width', '1.6');
    p.setAttribute('stroke-linecap', 'round');
    p.setAttribute('stroke-linejoin', 'round');
    svg.append(p);
  }
  return svg;
};

/** What the page in this tab is, asking the reader's content script first, then looking at the page itself. */
async function inspect(tab: Tab): Promise<PageKind> {
  try {
    const r = (await chrome.tabs.sendMessage(tab.id, { sapu: 'status' })) as { supported?: boolean; open?: boolean } | undefined;
    if (r?.supported) return { kind: 'supported', open: !!r.open };
  } catch {
    // No reader on this page: a site without a rule.
  }
  try {
    const [res] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: looksLikeArticle, args: [] });
    return res?.result ? { kind: 'article' } : { kind: 'other' };
  } catch {
    return { kind: 'restricted' }; // the browser's own pages, the store, PDFs
  }
}

async function main() {
  const style = document.createElement('style');
  style.textContent = `${OVERLAY_CSS}
    html, body { margin: 0; }
    body { min-width: 320px; max-width: 420px; }
    .popup { box-sizing: border-box; min-height: 100vh; padding: var(--sp-4); background: var(--panel); color: var(--ink); }
    .popup :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    .pop-head { display: flex; align-items: center; gap: var(--sp-2); margin: 0 0 var(--sp-3); }
    .pop-head svg { color: var(--accent); }
    .pop-head h1 { margin: 0; font: 650 var(--fs-lg)/1.2 var(--sans); letter-spacing: -0.015em; }
    .pop-host { margin-left: auto; font: var(--fs-cap)/1.3 var(--sans); color: var(--muted); max-width: 45%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .pop-text { margin: 0 0 var(--sp-3); font: var(--fs-ui)/1.45 var(--sans); }
    .pop-actions { display: flex; flex-direction: column; gap: var(--sp-2); }
    .pop-actions .btn { width: 100%; height: 40px; }
    .pop-actions .btn.primary { color: var(--panel); }
    .pop-sec { margin-top: var(--sp-4); padding-top: var(--sp-2); border-top: 1px solid var(--rule); }
    .pop-silenced { margin: var(--sp-1) 0 0; font: var(--fs-cap)/1.4 var(--sans); color: var(--muted); }
    .pop-silenced button { margin: 0 0 0 2px; padding: 0 4px; border: 0; background: none; color: var(--ink); cursor: pointer; font: inherit; text-decoration: underline; text-underline-offset: 0.2em; }
    .pop-version { margin: var(--sp-3) 0 0; font: var(--fs-cap)/1.3 var(--sans); color: var(--muted); }`;
  document.head.append(style);

  const stored = (await chrome.storage.local.get('settings')).settings;
  const settings = normalizeSettings(stored);
  const t: Strings = strings(settings.lang);
  ensureFonts(document, 'sans', __GEIST__); // the reader's own face, bundled
  document.documentElement.lang = settings.lang;
  const root = h('div', { class: 'popup tokens', 'data-theme': settings.theme });
  document.body.append(root);

  // popup.html?tab=<id> shows the popup for another tab: only for automated checks (a popup opened as a page is its own active tab).
  const forced = Number(new URLSearchParams(location.search).get('tab'));
  const [tab] = forced ? [(await chrome.tabs.get(forced)) as Tab] : ((await chrome.tabs.query({ active: true, currentWindow: true })) as Tab[]);
  let host = '';
  try {
    host = tab?.url ? new URL(tab.url).hostname.replace(/^(www|m)\./, '') : '';
  } catch {
    host = '';
  }
  const page: PageKind = tab ? await inspect(tab) : { kind: 'restricted' };

  const button = (label: string, cls: string, run: () => void) => {
    const b = h('button', { type: 'button', class: `btn ${cls}`.trim() }, label);
    b.addEventListener('click', run);
    return b;
  };
  const say = (text: string, ...actions: HTMLElement[]) => [h('p', { class: 'pop-text' }, text), ...(actions.length ? [h('div', { class: 'pop-actions' }, ...actions)] : [])];
  const send = (sapu: 'open' | 'settings') => () => void chrome.tabs.sendMessage(tab!.id, { sapu }).finally(() => window.close());

  let body: HTMLElement[];
  if (page.kind === 'supported') {
    body = page.open
      ? say(t.popSupported, button(t.popOpen, 'primary', send('open')), button(t.popSettings, '', send('settings')))
      : say(t.popNotOpen);
  } else if (page.kind === 'article') {
    const suggest = () => {
      const template = __REPORT_URL__;
      if (template) {
        void chrome.tabs.create({
          url: reportLink(template, { url: tab!.url ?? '', title: tab!.title ?? '', site: host, version: __SAPU_VERSION__, platform: 'extension', kind: 'site', note: host, detail: '' }),
        });
      }
      window.close();
    };
    body = say(t.popArticle,
      button(t.popTry, 'primary', () => void injectReader(tab!.id, 'try').finally(() => window.close())),
      ...(__REPORT_URL__ ? [button(t.popSuggest, '', suggest)] : []));
  } else {
    body = say(page.kind === 'restricted' ? t.popRestricted : t.popNotArticle);
  }

  // The opt-in page check.
  const offerSection = h('div', { class: 'pop-sec' });
  const drawOffer = (prefs: OfferPrefs) => {
    const sw = h('button', { type: 'button', class: 'switch', role: 'switch', 'aria-checked': String(prefs.on), 'aria-label': t.offerOthers });
    const row = h('div', { class: 'switch-row' }, h('span', { class: 'text' }, t.offerOthers, h('span', { class: 'hint' }, t.offerOthersHint)), sw);
    const flip = () => {
      if (!prefs.on) {
        // Ask first, in the click itself: browsers only show the permission prompt for a user gesture.
        void chrome.permissions.request(ALL_SITES).then(async (granted: boolean) => {
          if (!granted) return;
          const next = { ...prefs, on: true };
          await saveOfferPrefs(next);
          await syncOfferScript();
          drawOffer(next);
        });
      } else {
        const next = { ...prefs, on: false };
        void saveOfferPrefs(next).then(syncOfferScript).then(() => chrome.permissions.remove(ALL_SITES)).finally(() => drawOffer(next));
      }
    };
    row.addEventListener('click', flip);
    const parts: Node[] = [row];
    if (prefs.silenced.length) {
      const list = h('p', { class: 'pop-silenced' }, `${t.offerSilenced}: `);
      prefs.silenced.forEach((s, i) => {
        const undo = h('button', { type: 'button', 'aria-label': t.offerUnsilence(s) }, s);
        undo.addEventListener('click', () => {
          const next = { ...prefs, silenced: prefs.silenced.filter((x) => x !== s) };
          void saveOfferPrefs(next).then(() => drawOffer(next));
        });
        list.append(...(i ? [', '] : []), undo);
      });
      parts.push(list);
    }
    offerSection.replaceChildren(...parts);
  };
  drawOffer(await offerPrefs());

  root.append(
    h('div', { class: 'pop-head' }, broom(), h('h1', {}, 'Berita Rapih'), h('span', { class: 'pop-host' }, host)),
    ...body,
    offerSection,
    h('p', { class: 'pop-version' }, `Berita Rapih ${__SAPU_VERSION__}`),
  );
}

void main();
