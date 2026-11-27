import type { Article, ArticleMeta, OfficialView } from '../types.ts';
import { SIZE_STEPS, type Font, type Lang, type Settings, type Switch, type Theme } from '../settings.ts';
import { strings, type Strings } from './i18n.ts';
import { analyzeLoadedLogo, corsLogoUrl, opticalHeight, plateNeeds, recolourNeeds } from './logo.ts';
import { PLATFORM_NAMES, type Platform } from '../clean/embeds.ts';
import { OVERLAY_CSS } from './styles.ts';
import { attachGallery, GALLERY_CSS } from './gallery.ts';
import type { ReportKind, UpdateOffer } from '../update.ts';
import { heightFromMessage, playerFor } from './players.ts';
import { quietPage } from './quiet.ts';
import { parseNewsDate } from './dates.ts';
import { textKey } from '../dom.ts';
import { createFeedbackPage, type FeedbackPage } from './feedback.ts';
import { BROOM_PATHS } from './broom.ts';
import { createBackStack, type BackLayer } from './backstack.ts';
import { nextBarOffset, settledBarOffset } from './barscroll.ts';
import { applyPersonalContent, editPersonal, personalFor, personalMeta, resetPersonal, type PersonalRule } from '../personal.ts';
import { startEditor, type Editor } from './editor.ts';

declare const __SAPU_VERSION__: string | undefined;
const VERSION = typeof __SAPU_VERSION__ === 'string' ? __SAPU_VERSION__ : 'dev';

const HOST_CLASS = 'sapuberita-overlay';
/** Body text size per settings step (px). Phones get 1.5px less via CSS. */
const SIZES = [16, 17.5, 19, 21, 23.5];

export interface OverlayHandle {
  /** Swap in a newer version of the article (e.g. after extra pages were merged). Keeps the scroll position. */
  update(article: Article, loadingMore?: boolean): void;
  /** Stop showing the "loading more pages" note without changing the article. */
  doneLoading(): void;
  show(): void;
  hide(): void;
  /** Show the reader with Pengaturan open (the extension's popup). */
  openSettings(): void;
  destroy(): void;
  /** Show the "new version available" bar (once per article view; the reader can dismiss it). */
  offerUpdate(offer: UpdateOffer): void;
}

export interface OverlayOptions {
  settings: Settings;
  /** Called after every settings change, to persist it. */
  onSettingsChange?: (settings: Settings) => void;
  loadingMore?: boolean;
  /** Start with only the floating button visible (settings.autoOpen off). */
  startHidden?: boolean;
  /**
   * Offer the "open automatically" switch. Off for the bookmark and the Shortcut: running them is the
   * request to open, so the setting would do nothing there.
   */
  autoOpenSetting?: boolean;
  /**
   * Offer the "check for updates" switch. Off for the bookmark and the Shortcut: they download the newest
   * version, site fixes included, every time they run.
   */
  updatesSetting?: boolean;
  /** "Update otomatis" only brings site fixes here (a store install: the store brings new versions). */
  updatesFixesOnly?: boolean;
  /** Links at the foot of the settings panel: the install page, the privacy page, the release notes. */
  links?: { home: string; privacy: string; changes: string };
  /** Link target for "read on the original site". */
  originalUrl?: string;
  /** Where feedback goes: the form's prefilled link (opened when sending directly fails), and direct sending. */
  report?: {
    link: (article: Article, input: ReportInput) => string | undefined;
    /** Resolves true once the answers went out. */
    send?: (article: Article, input: ReportInput) => Promise<boolean>;
  };
  /** The article as the official rule alone makes it (made on demand): the editor retires entries it covers and resets to it. */
  official?: () => Promise<OfficialView | undefined>;
  /** Open the editor in "new site" mode right away (the bookmark on a site without a rule, docs/FEEDBACK.md §5). */
  newSite?: boolean;
  /** Which wrapper this is (web, ios, android…), listed in the details sent with a report. */
  platform?: string;
  /** The reader chose "not now" on the update bar. */
  onSnoozeUpdate?: (version: string) => void;
  /** Load the faces this font setting needs (see render/fonts.ts). Called on every render; must be cheap. */
  loadFonts?: (font: Font) => void;
}

/** One piece of feedback: what kind, the readable note, and a machine-readable detail (an edited rule as JSON). */
export interface ReportInput {
  kind: ReportKind;
  note: string;
  detail?: string;
}

/** Draw the article over the page inside a Shadow DOM. The original page stays underneath, untouched. */
export function renderOverlay(doc: Document, initial: Article, opts: OverlayOptions): OverlayHandle {
  doc.querySelector(`.${HOST_CLASS}`)?.remove();

  let article = initial;
  let settings = { ...opts.settings };
  let loading = opts.loadingMore ?? false;
  let panelOpen = false;
  let updateOffer: UpdateOffer | null = null;

  const host = doc.createElement('div');
  host.className = HOST_CLASS;
  // Top layer (Popover API): above everything the page does, whatever its z-index, including
  // full-screen interstitial ads that load after us. Older engines fall back to z-index.
  const topLayer = typeof (host as HTMLElement & { showPopover?: unknown }).showPopover === 'function';
  // Reading: a full-viewport, transparent popover carrier in the top layer (UA popover box neutralised).
  const READING_HOST = 'inset:0;width:100%;height:100%;max-width:none;max-height:none;margin:0;padding:0;border:0;background:transparent;overflow:visible;color:inherit';
  // Original page showing: a zero-size fixed carrier that only holds the floating reopen button.
  const IDLE_HOST = 'position:fixed;top:0;left:0;width:0;height:0;margin:0;padding:0;border:0;overflow:visible;z-index:2147483647';
  const shadow = host.attachShadow({ mode: 'open' });
  const style = h(doc, 'style');
  style.textContent = GALLERY_CSS + OVERLAY_CSS;

  const root = h(doc, 'div', { class: 'root', role: 'dialog', 'aria-modal': 'true' });
  const reopen = h(doc, 'button', { type: 'button', class: 'reopen' });
  // The editor draws its boxes, outline and bar here, over the original page, in the reader's theme.
  const pageLayer = h(doc, 'div', { class: 'pagepick tokens' });
  pageLayer.hidden = true;
  shadow.append(style, root, reopen, pageLayer);
  doc.documentElement.append(host);

  // ── Rendering ───────────────────────────────────────────────────────────
  // The chrome is rebuilt on every settings change (language, toggles); the article body
  // element itself is reused, so the reader's scroll position and images survive.
  const render = () => {
    const t = strings(settings.lang);
    const top = root.scrollTop;
    root.dataset.theme = settings.theme;
    pageLayer.dataset.theme = settings.theme;
    root.dataset.font = settings.font;
    root.dataset.links = settings.links ? 'on' : 'off';
    root.dataset.summaries = settings.summaries ? 'on' : 'off';
    root.dataset.embeds = settings.embeds ? 'on' : 'off';
    opts.loadFonts?.(settings.font);
    root.style.setProperty('--fs', `${SIZES[settings.size]}px`);
    root.setAttribute('lang', settings.lang);
    root.setAttribute('aria-label', viewMeta().title);

    const progress = h(doc, 'div', { class: 'progress', 'aria-hidden': 'true' });
    const oldPanel = root.querySelector('.panel') as HTMLElement | null;
    const panelTop = oldPanel?.scrollTop ?? 0;
    const before = oldPanel ? controlStates(oldPanel) : undefined;
    root.replaceChildren(
      masthead(t, progress),
      articleView(t),
      settingsPanel(t),
    );
    if (feedback) root.append(feedback.el);
    if (panelTop) (root.querySelector('.panel') as HTMLElement).scrollTop = panelTop;
    if (before && panelOpen) carryMotion(root.querySelector('.panel') as HTMLElement, before);
    reopen.replaceChildren(broom(16), doc.createTextNode(t.reopen));
    reopen.title = t.reopenLong;
    reopen.setAttribute('aria-label', t.reopenLong);
    applyPersonalContent(article.content, personalFor(settings.personal, siteKey()), doc);
    root.scrollTop = top;
    placeBar(false); // the bar was rebuilt: put it back where it was, without a slide
    progressBar = progress;
    updateProgress();
  };

  /** The header values as shown: the page's own, unless the reader pointed at where they are written. */
  const viewMeta = (): ArticleMeta => ({ ...article.meta, ...personalMeta(doc, personalFor(settings.personal, siteKey())?.fields) });

  const masthead = (t: Strings, progress: HTMLElement) => {
    const name = article.meta.siteName ?? doc.location?.hostname ?? '';
    const home = homepageOf(opts.originalUrl);
    const outlet = h(doc, 'a', { class: 'outlet', href: home ?? '', title: t.home(name), 'aria-label': t.home(name) });
    if (article.meta.logo) {
      outlet.append(logoMark(article.meta.logo, name, outlet));
    } else {
      outlet.append(h(doc, 'span', { class: 'outlet-name' }, name));
    }

    const aa = h(doc, 'button', {
      type: 'button', class: 'btn gear', 'aria-label': t.settings, 'aria-haspopup': 'dialog',
      'aria-expanded': String(panelOpen), 'aria-controls': 'sb-panel',
    }, gear());
    aa.addEventListener('click', (e) => {
      e.stopPropagation();
      setPanel(!panelOpen);
    });

    const original = h(doc, 'button', { type: 'button', class: 'btn', title: t.originalLong }, t.original);
    original.addEventListener('click', hide);

    return h(doc, 'header', { class: 'bar' }, outlet, h(doc, 'div', { class: 'tools' }, aa, original), progress);
  };

  /**
   * The outlet logo, made to sit in our masthead:
   * - analysed (pixels) → trimmed of padding, sized optically, recoloured per theme only if its own colour wouldn't show;
   * - not analysable (server forbids pixel reads) → shown whole on a plate: the site's own dark header colour, or white in dark themes.
   * Hidden until settled so it never jumps.
   */
  const logoMark = (src: string, name: string, outlet: HTMLElement) => {
    // One download for display and analysis: CORS mode. If the server refuses CORS, try the outlet's other
    // official logo (it may live on a server that allows it: Merdeka); failing that, reload plainly as a plate.
    const img = doc.createElement('img');
    img.alt = name;
    img.crossOrigin = 'anonymous';
    const mark = h(doc, 'span', { class: 'logo', 'data-state': 'pending' }, img);
    const showName = () => outlet.append(h(doc, 'span', { class: 'outlet-name' }, name));

    const plate = () => {
      if (mark.dataset.state !== 'pending') return;
      mark.dataset.state = 'plate';
      mark.dataset.plate = article.meta.logoGround ? 'dark' : 'light';
      if (article.meta.logoGround) mark.style.setProperty('--logo-ground', article.meta.logoGround);
      const shown = doc.createElement('img');
      shown.alt = name;
      shown.addEventListener('error', () => outlet.replaceChildren(h(doc, 'span', { class: 'outlet-name' }, name)), { once: true });
      shown.addEventListener('load', () => {
        const aspect = shown.naturalWidth / Math.max(1, shown.naturalHeight);
        if (aspect < 1.6) {
          outlet.classList.add('square');
          shown.alt = '';
          showName();
        } else {
          // Not trimmable (pixels unreadable), but still sized optically instead of one fixed small height.
          shown.style.height = `${opticalHeight(aspect)}px`;
        }
      }, { once: true });
      shown.src = src;
      img.replaceWith(shown);
    };

    const others = [...(article.meta.logoFallbacks ?? [])];
    const fail = () => {
      const other = mark.dataset.state === 'pending' ? others.shift() : undefined;
      if (other) {
        img.src = corsLogoUrl(other);
        return;
      }
      plate();
    };
    img.addEventListener('error', fail);
    img.addEventListener('load', () => {
      if (mark.dataset.state !== 'pending') return;
      const a = analyzeLoadedLogo(img);
      if (!a) return fail();
      const aspect = a.box.w / a.box.h;
      const square = aspect < 1.6;
      const height = square ? 30 : opticalHeight(aspect, undefined, a.fill);
      const scale = height / a.box.h;
      // Crop to the drawn pixels: a window the size of the box, the full image shifted inside it.
      mark.style.width = `${a.box.w * scale}px`;
      mark.style.height = `${height}px`;
      img.style.width = `${a.naturalWidth * scale}px`;
      img.style.height = `${a.naturalHeight * scale}px`;
      img.style.left = `${-a.box.x * scale}px`;
      img.style.top = `${-a.box.y * scale}px`;
      const needs = recolourNeeds(a);
      mark.dataset.onLight = needs.onLight ? 'ink' : 'own';
      mark.dataset.onDark = needs.onDark ? 'white' : 'own';
      const plates = plateNeeds(a);
      if (plates.onLight) mark.dataset.plateOnLight = 'true';
      if (plates.onDark) mark.dataset.plateOnDark = 'true';
      mark.dataset.badge = String(a.badge);
      mark.dataset.fill = String(a.fill?.toFixed(2));
      mark.dataset.state = 'fitted';
      if (square) {
        outlet.classList.add('square');
        img.alt = '';
        showName();
      }
    });
    img.src = corsLogoUrl(src);
    return mark;
  };

  const articleView = (t: Strings) => {
    const m = viewMeta();
    const head = h(doc, 'header');
    head.append(h(doc, 'h1', {}, ...titleNodes(doc, m.titleMarkup ?? m.title)));
    const deck = deckText(m.description, article.content);
    if (deck) head.append(h(doc, 'p', { class: 'deck' }, deck));

    const meta = h(doc, 'p', { class: 'meta' });
    if (m.section) meta.append(h(doc, 'span', { class: 'section' }, m.section));
    if (m.byline) {
      // Each reporter's name is unbreakable on its own; the row may wrap between names, never inside one.
      const by = h(doc, 'span', { class: 'byline' }, `${t.by} `);
      m.byline.split(/\s*,\s*/).forEach((name, i) => {
        if (i) by.append(', ');
        by.append(h(doc, 'span', { class: 'name' }, name));
      });
      meta.append(by);
    }
    if (m.editor && m.editor !== m.byline) meta.append(h(doc, 'span', { class: 'name editor' }, `${t.editor} ${m.editor}`));
    const date = formatDate(m.published, t);
    if (date) meta.append(h(doc, 'span', { class: 'date' }, date));
    if (meta.childNodes.length) head.append(meta);

    if (settings.hero && m.image && !startsWithImage(article.content)) {
      head.append(h(doc, 'figure', { class: 'hero' }, h(doc, 'img', { src: m.image, alt: '' })));
    }

    article.content.classList.add('content');
    localizeEmbeds(article.content, t);
    if (settings.embeds) livenEmbeds(article.content, isDark());
    const parts: Node[] = [head, article.content];
    if (updateOffer) parts.unshift(updateBar(t, updateOffer));
    if (loading) parts.push(h(doc, 'p', { class: 'status', role: 'status' }, h(doc, 'span', { class: 'spinner', 'aria-hidden': 'true' }), t.loadingMore));

    // The article goes on, but the site wouldn't let its other pages load: say so, and link to them.
    if (article.unloaded) {
      parts.push(h(doc, 'p', { class: 'unloaded' }, t.unloaded, ' ', h(doc, 'a', { href: article.unloaded }, t.unloadedLink, arrow())));
    }
    if (settings.sweepLine) {
      const bits: Node[] = [];
      if (article.swept > 0) bits.push(h(doc, 'span', { class: 'mark' }, broom(15), t.swept(article.swept)));
      if (article.pages > 1) bits.push(h(doc, 'span', {}, t.merged(article.pages)));
      if (opts.originalUrl) {
        bits.push(h(doc, 'a', { href: opts.originalUrl }, t.readOriginal, arrow()));
      }
      if (bits.length) parts.push(h(doc, 'footer', { class: 'sweep' }, ...bits));
      else parts.push(h(doc, 'div', { class: 'end' }));
    } else {
      parts.push(h(doc, 'div', { class: 'end' }));
    }
    return h(doc, 'main', { class: 'column' }, ...parts);
  };

  const isDark = () =>
    settings.theme === 'dark' || (settings.theme === 'auto' && !!doc.defaultView?.matchMedia?.('(prefers-color-scheme: dark)').matches);

  // Embedded players ask for their height by message; grow the matching frame to fit the post.
  // Most messages on a news page come from ad frames: find the sending player before reading anything.
  doc.defaultView?.addEventListener('message', (e) => {
    if (!e.source) return;
    const frame = [...root.querySelectorAll<HTMLIFrameElement>('iframe.player')].find((f) => f.contentWindow === e.source);
    if (!frame || frame.style.aspectRatio) return;
    const height = heightFromMessage(e.data);
    if (height) frame.style.height = `${height}px`;
  });
  // A site whose security policy forbids frames from the platform: drop that player, the card shows again.
  doc.addEventListener('securitypolicyviolation', (e) => {
    if (!/frame-src|child-src|default-src/.test(e.effectiveDirective)) return;
    for (const frame of root.querySelectorAll<HTMLIFrameElement>('iframe.player')) {
      if (e.blockedURI && frame.src.startsWith(e.blockedURI)) frame.remove();
    }
  });

  const updateBar = (t: Strings, offer: UpdateOffer) => {
    const later = h(doc, 'button', { type: 'button', class: 'later' }, t.dismiss);
    later.addEventListener('click', () => {
      updateOffer = null;
      root.querySelector('.update')?.remove();
      opts.onSnoozeUpdate?.(offer.version);
    });
    return h(doc, 'aside', { class: 'update', role: 'status' },
      h(doc, 'span', { class: 'text' }, t.updateAvailable(offer.version)),
      h(doc, 'span', { class: 'actions' },
        h(doc, 'a', { class: 'btn', href: offer.url, target: '_blank', rel: 'noopener' }, t.updateAction),
        later));
  };

  // Settings, ordered by how often each part is used (docs/SETTINGS.md): how the article looks, what shows in it,
  // this site, how Sapu behaves, then the rarely changed rest. Every section has a title; each thing appears once.
  const settingsPanel = (t: Strings) => {
    const panel = h(doc, 'section', { class: 'panel', id: 'sb-panel', role: 'dialog', 'aria-label': t.settings, 'data-open': String(panelOpen) });
    panel.addEventListener('click', (e) => e.stopPropagation());
    panel.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const stops = [...panel.querySelectorAll<HTMLElement>('button, input, a[href]')]
        .filter((el) => !(el as HTMLButtonElement).disabled && el.tabIndex >= 0 && el.offsetParent !== null);
      const active = (panel.getRootNode() as ShadowRoot | Document).activeElement;
      const first = stops[0];
      const last = stops[stops.length - 1];
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first?.focus();
      }
    });
    swipeToClose(panel);
    const close = h(doc, 'button', { type: 'button', class: 'icon-btn', 'aria-label': t.close }, cross());
    close.addEventListener('click', () => setPanel(false));
    // The one way into feedback, at the top so nobody has to scroll for it.
    const feedbackTop = h(doc, 'button', { type: 'button', class: 'btn head-feedback' }, t.fbShort);
    feedbackTop.addEventListener('click', (e) => {
      e.stopPropagation();
      openFeedback();
    });
    panel.append(h(doc, 'div', { class: 'panel-head' },
      h(doc, 'div', { class: 'grabber', 'aria-hidden': 'true' }),
      h(doc, 'h2', {}, t.settings), h(doc, 'div', { class: 'head-actions' }, feedbackTop, close)));

    const section = (title: Node | string, ...children: Node[]) =>
      h(doc, 'div', { class: 'sec' }, h(doc, 'h3', { class: 'sec-title' }, title), ...children);
    const rows = (...keys: Switch[]) => h(doc, 'div', { class: 'rows' }, ...keys.map((k) => toggle(k)));

    // ── Tampilan ──
    // Text size: a notched slider as wide as the pickers below it, with A− and A+ as one-step buttons.
    // Dragging resizes the article live; the setting is saved (and the panel redrawn) when the thumb is let go.
    const last = SIZE_STEPS - 1;
    const pct = (v: number) => `${(v / last) * 100}%`;
    const range = h(doc, 'input', {
      type: 'range', min: '0', max: String(last), step: 'any', value: String(settings.size),
      'aria-label': t.textSize, 'aria-valuetext': t.sizeStep(settings.size + 1, SIZE_STEPS),
    }) as HTMLInputElement;
    const ticks = h(doc, 'div', { class: 'ticks', 'aria-hidden': 'true' });
    for (let i = 0; i <= last; i++) ticks.append(h(doc, 'i', { 'data-on': String(i <= settings.size) }));
    /** Draw the slider at v (fractional while moving) and size the article to the nearest step. */
    const show = (v: number) => {
      const step = Math.round(v);
      range.value = String(v);
      range.style.setProperty('--p', pct(v));
      range.setAttribute('aria-valuetext', t.sizeStep(step + 1, SIZE_STEPS));
      root.style.setProperty('--fs', `${SIZES[step]}px`);
      [...ticks.children].forEach((tick, i) => tick.setAttribute('data-on', String(i <= v + 0.01)));
    };
    show(settings.size);
    let glideFrame = 0;
    /** Ease the thumb to a step, then save it (which redraws the panel at the same spot). */
    const glide = (to: number) => {
      to = Math.max(0, Math.min(last, to));
      doc.defaultView?.cancelAnimationFrame(glideFrame);
      const from = Number(range.value);
      const win = doc.defaultView;
      if (!win || reducedMotion() || Math.abs(to - from) < 0.01) {
        show(to);
        if (to !== settings.size) change({ size: to }, '.size input');
        return;
      }
      const start = win.performance.now();
      const dur = 160 + 60 * Math.min(2, Math.abs(to - from));
      const frame = (now: number) => {
        const k = Math.min(1, (now - start) / dur);
        show(from + (to - from) * (1 - (1 - k) ** 3)); // ease-out cubic
        if (k < 1) glideFrame = win.requestAnimationFrame(frame);
        else if (to !== settings.size) change({ size: to }, '.size input');
      };
      glideFrame = win.requestAnimationFrame(frame);
    };
    range.addEventListener('input', () => show(Number(range.value)));
    range.addEventListener('change', () => glide(Math.round(Number(range.value))));
    range.addEventListener('keydown', (e) => {
      const at = Math.round(Number(range.value));
      const to = { ArrowRight: at + 1, ArrowUp: at + 1, ArrowLeft: at - 1, ArrowDown: at - 1, Home: 0, End: last }[e.key];
      if (to === undefined) return;
      e.preventDefault();
      glide(to);
    });
    const stepBtn = (by: number, label: string, text: string, cls: string) => {
      const b = h(doc, 'button', { type: 'button', class: `size-btn ${cls}`, 'aria-label': label, tabindex: '-1' }, text) as HTMLButtonElement;
      b.disabled = settings.size + by < 0 || settings.size + by > last;
      b.addEventListener('click', () => glide(Math.round(Number(range.value)) + by));
      return b;
    };
    const sizeRow = h(doc, 'div', { class: 'size' },
      stepBtn(-1, t.smaller, 'A', 'small'), h(doc, 'div', { class: 'slider' }, ticks, range), stepBtn(1, t.larger, 'A', 'big'));

    // Font: each option previews itself in its own face. Theme: a swatch of each ground.
    const faces: Record<Font, string> = { serif: 'var(--serif)', sans: 'var(--sans)', legible: 'var(--legible)' };
    const font = segmented<Font>(t.font, settings.font, [
      ['sans', t.fontSans], ['serif', t.fontSerif], ['legible', t.fontLegible],
    ], (v) => change({ font: v }, `[data-value="${v}"]`), (btn, v) => (btn.style.fontFamily = faces[v]));
    const grounds: Record<Exclude<Theme, 'auto'>, string> = {
      light: 'rgb(255 255 255)', sepia: 'rgb(247 241 228)', dark: 'rgb(18 18 18)',
    };
    const theme = segmented<Theme>(t.theme, settings.theme, [
      ['auto', t.themeAuto], ['light', t.themeLight], ['sepia', t.themeSepia], ['dark', t.themeDark],
    ], (v) => fade(() => change({ theme: v }, `[data-value="${v}"]`)), (btn, v) => {
      const sw = h(doc, 'span', { class: 'swatch', 'aria-hidden': 'true' });
      if (v === 'auto') {
        sw.classList.add('split');
        sw.append(splitSwatch());
      } else sw.style.background = grounds[v];
      btn.prepend(sw);
    });
    panel.append(section(t.secLook, field(t.textSize, sizeRow), field(t.font, font), field(t.theme, theme)));

    // ── Di dalam artikel: in the order the parts appear on the page ──
    panel.append(section(t.inArticle, rows('hero', 'summaries', 'links', 'embeds', 'sweepLine')));

    // ── Situs ini: the editor, and the reader's own version of this site ──
    const host = doc.location?.hostname?.replace(/^(www|m)\./, '') ?? '';
    const edit = h(doc, 'button', { type: 'button', class: 'nav-row' },
      h(doc, 'span', { class: 'text' }, t.edTitle, h(doc, 'span', { class: 'hint' }, t.editArticleHint)), chevronIcon());
    edit.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditor();
    });
    const site: Node[] = [edit];
    if (personalFor(settings.personal, siteKey())) {
      const reset = h(doc, 'button', { type: 'button', class: 'btn' }, t.edReset);
      let sure = false;
      reset.addEventListener('click', () => {
        if (!sure) {
          sure = true; // asked once: the next tap resets
          reset.textContent = t.edResetYes;
          reset.setAttribute('aria-label', t.edResetAsk);
          return;
        }
        void resetRule();
      });
      site.push(h(doc, 'div', { class: 'personal-row' }, h(doc, 'span', { class: 'text' }, t.personalOn), reset));
    }
    panel.append(section(h(doc, 'span', {}, t.secSite, host ? h(doc, 'span', { class: 'sec-host' }, host) : ''), ...site));

    // ── Umum: how Sapu behaves (the bookmark has no "open automatically": running it is the request to open) ──
    const general: Switch[] = [];
    if (opts.autoOpenSetting !== false) general.push('autoOpen');
    general.push('hideBar', 'sendEdits');
    panel.append(section(t.general, rows(...general)));

    // ── Lainnya: set once, rarely changed ──
    const more: Node[] = [field(t.language, segmented<Lang>(t.language, settings.lang, [
      ['id', 'Indonesia'], ['en', 'English'],
    ], (v) => change({ lang: v }, `[data-value="${v}"]`)), true)];
    if (opts.updatesSetting !== false) more.push(h(doc, 'div', { class: 'rows' }, toggle('updates', opts.updatesFixesOnly ? t.updatesHintFixes : undefined)));
    const foot = h(doc, 'p', { class: 'panel-foot' });
    const links = opts.links;
    if (links) {
      for (const [href, label] of [[links.home, t.linkHome], [links.privacy, t.linkPrivacy], [links.changes, t.linkChanges]] as const) {
        foot.append(h(doc, 'a', { href, target: '_blank', rel: 'noopener' }, label));
      }
    }
    // Version, so bug reports say which build they came from.
    foot.append(h(doc, 'span', { class: 'version' }, `Berita Rapih ${VERSION}`));
    more.push(foot);
    panel.append(section(t.secMore, ...more));
    return panel;
  };

  const field = (label: string, control: Node, inline = false) =>
    h(doc, 'div', { class: inline ? 'field inline' : 'field' }, h(doc, 'span', { class: 'label' }, label), control);

  function segmented<V extends string>(
    label: string, current: V, options: Array<[V, string]>, onPick: (v: V) => void,
    decorate?: (btn: HTMLElement, v: V) => void,
  ) {
    const seg = h(doc, 'div', { class: 'seg', role: 'radiogroup', 'aria-label': label });
    const values = options.map(([v]) => v);
    seg.style.setProperty('--n', String(values.length));
    seg.style.setProperty('--i', String(Math.max(0, values.indexOf(current))));
    for (const [value, text] of options) {
      const btn = h(doc, 'button', {
        type: 'button', role: 'radio', 'aria-checked': String(value === current), 'data-value': value, tabindex: value === current ? '0' : '-1',
      }, text);
      decorate?.(btn, value);
      btn.addEventListener('click', () => onPick(value));
      seg.append(btn);
    }
    seg.addEventListener('keydown', (e) => {
      const by = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!by) return;
      e.preventDefault();
      const at = values.indexOf(current);
      onPick(values[(at + by + values.length) % values.length]!);
    });
    return seg;
  }

  /** One on/off row; its label and hint come from the strings named after the switch. */
  function toggle(key: Switch, hint?: string) {
    const t = strings(settings.lang);
    const label = t[key];
    const text = h(doc, 'span', { class: 'text' }, label, h(doc, 'span', { class: 'hint' }, hint ?? t[`${key}Hint`]));
    const on = settings[key];
    const sw = h(doc, 'button', { type: 'button', class: 'switch', role: 'switch', 'aria-checked': String(on), 'aria-label': label, 'data-switch': key });
    // Answering here also answers the editor's one-time question (sendEdits).
    sw.addEventListener('click', () => change({ [key]: !on, ...(key === 'sendEdits' ? { sendEditsAsked: true } : {}) }, `[data-switch="${key}"]`));
    const row = h(doc, 'div', { class: 'switch-row' }, text, sw);
    row.addEventListener('click', (e) => {
      if (e.target !== sw) sw.click();
    });
    return row;
  }

  // ── State changes ───────────────────────────────────────────────────────
  /** Apply a settings change, re-render, keep keyboard focus on the control that was used. */
  const change = (patch: Partial<Settings>, refocus?: string) => {
    settings = { ...settings, ...patch };
    render();
    if (refocus) (root.querySelector(`.panel ${refocus}`) as HTMLElement | null)?.focus();
    opts.onSettingsChange?.(settings);
  };

  const siteKey = () => article.ruleId ?? doc.location?.hostname ?? '';

  // ── Note over the reader ─────────────────────────────────────────────────
  /** A short message at the bottom of the screen for a few seconds (role=status, so it is read out too). */
  const toast = (text: string) => {
    shadow.querySelector('.toast')?.remove();
    const el = h(doc, 'div', { class: 'toast tokens', role: 'status', 'data-theme': settings.theme }, broom(15), h(doc, 'span', {}, text));
    shadow.append(el);
    doc.defaultView?.setTimeout(() => {
      el.classList.add('leaving');
      doc.defaultView?.setTimeout(() => el.remove(), 260);
    }, 3200);
  };

  // ── Motion across re-renders ────────────────────────────────────────────
  // The panel is rebuilt on every change, so a switch or picker would simply appear in its new state. Remember
  // where each one was, draw the new one there first, then let its CSS transition carry it to where it is now.
  const reducedMotion = () => !!doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const controlStates = (panel: HTMLElement) => ({
    segs: new Map([...panel.querySelectorAll<HTMLElement>('.seg')].map((el) => [el.getAttribute('aria-label') ?? '', el.style.getPropertyValue('--i')])),
    switches: new Map([...panel.querySelectorAll('[data-switch]')].map((el) => [el.getAttribute('data-switch') ?? '', el.getAttribute('aria-checked') ?? ''])),
  });
  const carryMotion = (panel: HTMLElement, was: ReturnType<typeof controlStates>) => {
    if (reducedMotion()) return;
    const win = doc.defaultView;
    for (const el of panel.querySelectorAll<HTMLElement>('.seg')) {
      const from = was.segs.get(el.getAttribute('aria-label') ?? '');
      const to = el.style.getPropertyValue('--i');
      if (!from || from === to) continue;
      el.style.setProperty('--i', from);
      win?.getComputedStyle(el, '::before').transform; // settle the old position before moving
      el.style.setProperty('--i', to);
    }
    for (const el of panel.querySelectorAll<HTMLElement>('[data-switch]')) {
      const from = was.switches.get(el.getAttribute('data-switch') ?? '');
      const to = el.getAttribute('aria-checked') ?? '';
      if (!from || from === to) continue;
      el.setAttribute('aria-checked', from);
      win?.getComputedStyle(el, '::after').transform;
      el.setAttribute('aria-checked', to);
    }
  };
  /** Run a change as a crossfade of the whole view (View Transitions: Chrome 111+, Safari 18+); elsewhere it just happens. */
  const fade = (update: () => void) => {
    const start = (doc as Document & { startViewTransition?: (cb: () => void) => unknown }).startViewTransition;
    if (typeof start === 'function' && !reducedMotion()) start.call(doc, update);
    else update();
  };

  // ── Atur isi artikel: the editor (render/editor.ts), on the original page ──
  let editor: Editor | null = null;
  const replacePersonal = (p: PersonalRule | undefined) => {
    const rest = resetPersonal(settings.personal, siteKey());
    change({ personal: p ? editPersonal(rest, siteKey(), () => p) : rest });
  };
  /** Kembalikan: no personal rule, and the article as the official rule makes it (the extraction had the rule applied). */
  const resetRule = async () => {
    const official = await opts.official?.();
    if (official) article = { ...official.article, content: official.article.content.cloneNode(true) as HTMLElement };
    replacePersonal(undefined);
    editor?.refresh();
  };
  const openEditor = () => {
    if (editor) return;
    // The editor takes over the feedback page's (or the panel's) history entry: Back closes it.
    const from = feedbackLayer ?? panelLayer;
    feedbackLayer = panelLayer = undefined;
    editorLayer = from ? from.hand(() => closeEditorFromBack()) : backStack.push(() => closeEditorFromBack());
    closeFeedback(false);
    if (panelOpen) setPanel(false);
    editor = startEditor({
      doc, host, layer: pageLayer, root, t: strings(settings.lang), site: siteKey(),
      content: () => article.content,
      meta: () => viewMeta(),
      personal: () => personalFor(settings.personal, siteKey()),
      edit: (edit) => change({ personal: editPersonal(settings.personal, siteKey(), edit) }),
      replace: replacePersonal,
      reset: resetRule,
      newSite: opts.newSite && !personalFor(settings.personal, siteKey())?.newSite,
      official: async () => opts.official?.(),
      send: async (input) => (opts.report?.send ? opts.report.send(article, input) : false),
      consent: () => (settings.sendEditsAsked ? (settings.sendEdits ? 'yes' : 'no') : 'ask'),
      setConsent: (yes) => change({ sendEdits: yes, sendEditsAsked: true }),
      notify: (text) => toast(text),
      showClean: () => show(),
      showOriginal: () => {
        hide();
        reopen.style.display = 'none';
      },
      onClose: () => {
        if (!editorClosingFromBack) editorLayer?.release();
        editorLayer = undefined;
        editorClosingFromBack = false;
        editor = null;
        show();
        (root.querySelector('.gear') as HTMLElement | null)?.focus({ preventScroll: true });
      },
    });
  };

  // ── Back (render/backstack.ts): the panel, the feedback page and the editor each own a history entry ──
  const backStack = createBackStack(doc.defaultView!);
  let panelLayer: BackLayer | undefined;
  let feedbackLayer: BackLayer | undefined;
  let editorLayer: BackLayer | undefined;
  let editorClosingFromBack = false;
  const closeEditorFromBack = () => {
    editorClosingFromBack = true;
    editor?.close();
  };

  // ── Beri masukan: the feedback page (render/feedback.ts), a full view over the article ──
  let feedback: FeedbackPage | null = null;
  const openFeedback = () => {
    // Opened from the settings panel: take over its history entry, so Back closes the feedback page.
    const fromPanel = panelLayer;
    const backToPanel = panelOpen;
    panelLayer = undefined;
    feedbackLayer = fromPanel ? fromPanel.hand(() => closeFeedback(true, true)) : backStack.push(() => closeFeedback(true, true));
    if (panelOpen) setPanel(false);
    const t = strings(settings.lang);
    const themes = { auto: t.themeAuto, light: t.themeLight, sepia: t.themeSepia, dark: t.themeDark };
    const fonts = { serif: t.fontSerif, sans: t.fontSans, legible: t.fontLegible };
    feedback = createFeedbackPage({
      doc, t,
      hostname: doc.location?.hostname ?? '',
      details: () => [
        [t.fbDLink, opts.originalUrl ?? doc.location?.href ?? ''],
        [t.fbDSite, doc.location?.hostname ?? ''],
        [t.fbDVersion, VERSION],
        [t.fbDPlatform, opts.platform ?? ''],
        [t.fbDTheme, themes[settings.theme]],
        [t.fbDSize, `${settings.size + 1}/${SIZE_STEPS}`],
        [t.fbDFont, fonts[settings.font]],
        [t.fbDRule, article.ruleId ?? ''],
        [t.fbDPages, String(article.pages)],
      ],
      reportLink: (input) => opts.report?.link(article, input),
      send: async (input) => (opts.report?.send ? opts.report.send(article, input) : false),
      // Feedback lives where the settings panel was: its back arrow returns there.
      close: () => {
        closeFeedback(!backToPanel);
        if (backToPanel) setPanel(true);
      },
      finish: () => closeFeedback(),
      editArticle: () => openEditor(),
      pushBack: (onBack) => backStack.push(onBack),
    });
    root.append(feedback.el);
    feedback.focus();
  };
  const closeFeedback = (refocus = true, fromBack = false) => {
    if (!fromBack) feedbackLayer?.release();
    feedbackLayer = undefined;
    feedback?.el.remove();
    feedback = null;
    if (refocus) (root.querySelector('.gear') as HTMLElement | null)?.focus({ preventScroll: true });
  };

  /**
   * On phones the panel is a tray from the bottom, so it closes like one: drag it down from the top of its
   * content (or flick it) and it follows the finger, then closes past a threshold or springs back.
   */
  const swipeToClose = (panel: HTMLElement) => {
    const phone = () => !!doc.defaultView?.matchMedia?.('(max-width: 600px)').matches;
    let startY = 0;
    let startT = 0;
    let dy = 0;
    let dragging = false;
    panel.addEventListener('touchstart', (e) => {
      if (!phone() || panel.scrollTop > 0 || e.touches.length !== 1) return;
      startY = e.touches[0]!.clientY;
      startT = Date.now();
      dy = 0;
      dragging = true;
    }, { passive: true });
    panel.addEventListener('touchmove', (e) => {
      if (!dragging) return;
      dy = e.touches[0]!.clientY - startY;
      if (dy <= 0) {
        panel.style.transform = '';
        return; // dragging up scrolls the tray's content as usual
      }
      e.preventDefault();
      panel.style.transition = 'none';
      panel.style.transform = `translateY(${dy}px)`;
    }, { passive: false });
    const end = () => {
      if (!dragging) return;
      dragging = false;
      panel.style.transition = '';
      panel.style.transform = '';
      const flick = dy > 40 && dy / Math.max(1, Date.now() - startT) > 0.6;
      if (dy > 110 || flick) setPanel(false);
    };
    panel.addEventListener('touchend', end);
    panel.addEventListener('touchcancel', end);
  };

  const setPanel = (open: boolean, fromBack = false) => {
    if (open && !panelOpen) panelLayer = backStack.push(() => setPanel(false, true));
    if (!open && panelOpen) {
      if (!fromBack) panelLayer?.release();
      panelLayer = undefined;
    }
    panelOpen = open;
    const panel = root.querySelector('.panel') as HTMLElement | null;
    panel?.setAttribute('data-open', String(open));
    const aa = root.querySelector('.gear');
    aa?.setAttribute('aria-expanded', String(open));
    if (open) setBarHidden(false);
    if (open) (panel?.querySelector('button[aria-checked="true"], .icon-btn') as HTMLElement | null)?.focus();
    else (aa as HTMLElement | null)?.focus();
  };

  // A tap outside the open panel (or the feedback panel in its place) closes it.
  root.addEventListener('click', (e) => {
    if (panelOpen) setPanel(false);
    else if (feedback && !e.composedPath().includes(feedback.el)) closeFeedback();
  });
  attachGallery(root, () => strings(settings.lang));
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && feedback) {
      e.stopPropagation();
      feedback.back();
    } else if (e.key === 'Escape' && panelOpen) {
      e.stopPropagation();
      setPanel(false);
    }
  });

  // Reading progress: a hairline of lidi ochre under the masthead.
  let progressBar: HTMLElement | null = null;
  let frame = 0;
  // The bar follows the scroll (render/barscroll.ts): barOffset px of it are pushed up out of view.
  let barOffset = 0;
  let lastTop = 0;
  let settleTimer: ReturnType<typeof setTimeout> | undefined;
  const barHeight = () => (root.querySelector('.bar') as HTMLElement | null)?.offsetHeight || 56;
  /** Draw the bar at barOffset; `glide` animates there (settling, or shown for the panel), otherwise it tracks the finger. */
  const placeBar = (glide: boolean) => {
    const bar = root.querySelector('.bar') as HTMLElement | null;
    if (!bar) return;
    bar.classList.toggle('tracking', !glide);
    bar.style.transform = barOffset ? `translateY(${-barOffset}px)` : '';
    bar.toggleAttribute('data-hidden', barOffset >= barHeight());
  };
  const setBarHidden = (hidden: boolean) => {
    barOffset = hidden ? barHeight() : 0;
    placeBar(true);
  };
  const followScroll = (top: number) => {
    if (!settings.hideBar || panelOpen) {
      if (barOffset) setBarHidden(false);
      return;
    }
    const height = barHeight();
    barOffset = nextBarOffset(barOffset, lastTop, top, height);
    placeBar(false);
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      const settled = settledBarOffset(barOffset, root.scrollTop, height);
      if (settled === barOffset) return;
      barOffset = settled;
      placeBar(true);
    }, 140);
  };
  const updateProgress = () => {
    frame = 0;
    const top = root.scrollTop;
    followScroll(top);
    lastTop = top;
    const max = root.scrollHeight - root.clientHeight;
    progressBar?.style.setProperty('transform', `scaleX(${max > 0 ? Math.min(1, root.scrollTop / max) : 0})`);
  };
  root.addEventListener('scroll', () => {
    if (!frame) frame = requestAnimationFrame(updateProgress);
  }, { passive: true });

  // ── Visibility ──────────────────────────────────────────────────────────
  const prevOverflow = doc.documentElement.style.overflow;
  const popover = host as HTMLElement & { showPopover?: () => void; hidePopover?: () => void };
  let unquiet: (() => void) | undefined;
  const show = () => {
    unquiet ??= quietPage(doc);
    root.style.display = '';
    reopen.style.display = 'none';
    doc.documentElement.style.overflow = 'hidden';
    if (topLayer && !host.matches(':popover-open')) {
      host.setAttribute('popover', 'manual');
      host.style.cssText = READING_HOST;
      // Re-append first so we're also last in DOM order (ties go to the later element).
      doc.documentElement.append(host);
      popover.showPopover?.();
    }
  };
  const hide = () => {
    closeFeedback(false);
    unquiet?.();
    unquiet = undefined;
    if (panelOpen) setPanel(false);
    root.style.display = 'none';
    reopen.style.display = '';
    doc.documentElement.style.overflow = prevOverflow;
    // Out of the top layer, so the full-viewport carrier never blocks the original page. A closed
    // popover is display:none, which would hide the reopen button, so drop the attribute too.
    if (topLayer) {
      if (host.matches(':popover-open')) popover.hidePopover?.();
      host.removeAttribute('popover');
      host.style.cssText = IDLE_HOST;
    }
  };
  reopen.addEventListener('click', show);

  render();
  if (opts.startHidden) hide();
  else show();
  if (opts.newSite) openEditor();

  return {
    update: (a, loadingMore = false) => {
      article = a;
      loading = loadingMore;
      render();
    },
    doneLoading: () => {
      loading = false;
      root.querySelector('.status')?.remove();
    },
    show,
    hide,
    openSettings: () => {
      show();
      setPanel(true);
    },
    offerUpdate: (offer) => {
      updateOffer = offer;
      render();
    },
    destroy: () => {
      editor?.close();
      hide();
      host.remove();
    },
  };
}

/**
 * Turn each social-post card into the platform's own player, once (the article body is reused across renders,
 * so a player keeps playing when settings change). The card stays underneath: switching embeds off shows it again.
 */
function livenEmbeds(content: Element, dark: boolean): void {
  const doc = content.ownerDocument;
  for (const fig of content.querySelectorAll<HTMLElement>('figure[data-embed]')) {
    if (fig.querySelector('iframe.player')) continue;
    const href = fig.querySelector('a[data-embed-link]')?.getAttribute('href');
    const player = href && playerFor(fig.dataset.embed as Platform, href, dark);
    if (!player) continue;
    const frame = doc.createElement('iframe');
    frame.className = 'player';
    frame.src = player.src;
    frame.title = PLATFORM_NAMES[fig.dataset.embed as Platform] ?? 'Media';
    frame.loading = 'lazy';
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen; clipboard-write';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin'; // YouTube refuses to play without a referrer
    if (player.aspect) frame.style.aspectRatio = player.aspect;
    else frame.style.height = `${player.height ?? 500}px`;
    fig.prepend(frame);
  }
}

/** The outlet's homepage: the root of the site the article is on (regional sites stay regional). */
function homepageOf(articleUrl: string | undefined): string | undefined {
  if (!articleUrl) return undefined;
  try {
    return new URL('/', articleUrl).href;
  } catch {
    return undefined;
  }
}

/** Social-post cards (clean/embeds.ts): link labels in the reader's language, a play mark on video thumbnails. */
function localizeEmbeds(content: Element, t: Strings): void {
  for (const a of content.querySelectorAll<HTMLAnchorElement>('a[data-embed-link]')) {
    const platform = PLATFORM_NAMES[a.dataset.embedLink as Platform] ?? a.dataset.embedLink ?? '';
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener');
    if (a.querySelector('img')) {
      a.setAttribute('aria-label', t.playOn(platform));
      if (!a.querySelector('.play')) {
        const play = icon(44, ['M9 7.5v9l7.5-4.5z']);
        play.classList.add('play');
        a.append(play);
      }
    } else {
      a.replaceChildren(t.openOn(platform), arrow());
    }
  }
}

/** The description as a deck, unless it just repeats the first lines of the article (common on Indonesian sites). */
export function deckText(description: string | undefined, content: Element): string | undefined {
  if (!description || description.length < 40) return undefined;
  // The opening paragraphs, not a video card or photo caption that may come first. (A description that is
  // junk, like an app ad, is dropped earlier by the site rules; see run() in index.ts.)
  const paragraphs = [...content.querySelectorAll('p')].filter((p) => !p.closest('figure, blockquote'));
  const opening = textKey(paragraphs.map((p) => p.textContent ?? '').join(' ').slice(0, 600) || (content.textContent ?? '').slice(0, 600));
  return opening.includes(textKey(description).slice(0, 60)) ? undefined : description;
}

/**
 * True if the body opens with its own photo (so the og:image hero would be a duplicate).
 * An image buried later in the article doesn't count: the hero is still the main photo.
 */
export function startsWithImage(content: Element, textBudget = 200): boolean {
  const walker = content.ownerDocument.createTreeWalker(content, 0x1 | 0x4); // elements + text
  let text = 0;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType === 3) text += (node.textContent ?? '').trim().length;
    else if ((node as Element).tagName === 'IMG') return true;
    if (text > textBudget) return false;
  }
  return false;
}

/** A title as text nodes, with `<i>…</i>` (from titleMarkup) as real italics. Never parsed as HTML. */
export function titleNodes(doc: Document, title: string): Array<Node | string> {
  return title.split(/(<i>[\s\S]*?<\/i>)/i).filter(Boolean).map((part) => {
    const m = /^<i>([\s\S]*?)<\/i>$/i.exec(part);
    return m ? h(doc, 'i', {}, m[1]!) : part.replace(/<\/?i>/gi, '');
  });
}

export { parseNewsDate };

function formatDate(iso: string | undefined, t: Strings): string | undefined {
  if (!iso) return undefined;
  const d = parseNewsDate(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const s = d.toLocaleString(t.dateLocale, {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
  });
  return `${s} ${t.timeZoneLabel}`;
}

// ── Tiny DOM + icon helpers (authored SVG, one 1.6 stroke) ────────────────
function h(doc: Document, tag: string, attrs: Record<string, string> = {}, ...children: Array<Node | string>): HTMLElement {
  const node = doc.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  for (const c of children) node.append(c);
  return node;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * The "automatic" theme swatch: light top-left, dark bottom-right, split at 45°. Drawn as two halves that
 * meet on the diagonal (not one colour painted over the other, whose edge would leave a dark fringe on the
 * light side), with the same 1px ring as the other swatches on top of both.
 */
function splitSwatch(): SVGSVGElement {
  // Circle of radius 8.5 around (9, 9); the diagonal runs from bottom-left (2.99, 15.01) to top-right (15.01, 2.99).
  return svgEl('svg', { width: '18', height: '18', viewBox: '0 0 18 18', 'aria-hidden': 'true' },
    svgEl('path', { d: 'M2.99 15.01A8.5 8.5 0 0 1 15.01 2.99Z', fill: 'rgb(255 255 255)' }),
    svgEl('path', { d: 'M15.01 2.99A8.5 8.5 0 0 1 2.99 15.01Z', fill: 'rgb(18 18 18)' }),
    svgEl('circle', { cx: '9', cy: '9', r: '8.5', fill: 'none', class: 'ring' }));
}
function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string>, ...children: SVGElement[]): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.append(...children);
  return el;
}

function icon(size: number, paths: string[]): SVGSVGElement {
  return svgEl('svg', {
    width: String(size), height: String(size), viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    'stroke-width': '1.6', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true',
  }, ...paths.map((d) => svgEl('path', { d })));
}
/** The Sapu mark (render/broom.ts). */
const broom = (size: number) => icon(size, BROOM_PATHS);
const cross = () => icon(18, ['M6 6l12 12', 'M18 6 6 18']);
const chevronIcon = () => icon(18, ['M9 6l6 6-6 6']);
/** Settings: a gear (Lucide "settings", ISC licence). */
const gear = () => icon(19, [
  'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z',
  'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
]);
const arrow = () => icon(14, ['M8 16 16 8', 'M9 8h7v7']);
