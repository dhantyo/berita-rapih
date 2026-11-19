import bundledRules from 'sapuberita:rules';
import {
  fetchSameOriginDocument,
  loadRules,
  refreshRulesIfStale,
  renderOverlay,
  run,
  type OverlayHandle,
  type OverlayOptions,
  type RunResult,
} from '../index.ts';
import { normalizeSettings, outletDomain, outletStore, type Settings, type SettingsStore } from '../settings.ts';
import type { Article, OfficialView, RuleSet } from '../types.ts';
import type { ReportInput } from '../render/overlay.ts';
import { adblockSelectors, findRule } from '../rules/match.ts';
import { matchPersonalSite, personalForPage } from '../personal.ts';
import { genericRuleFor, needsNewSitePrompt } from '../newsite.ts';
import { showFailCard, showNewSitePrompt, type NewSitePrompt } from '../render/newsiteprompt.ts';
import { strings } from '../render/i18n.ts';
import { ensureFonts } from '../render/fonts.ts';
import { cachedManifest, formPost, isSnoozed, latestManifest, offerFor, reportLink, sendForm, snoozeOffer, type Platform, type ReportFields } from '../update.ts';

/** Release channel (update.json + rules.json), set at build time via esbuild `define`; empty = no updates. */
declare const __CHANNEL_URL__: string;
/** Report link template with {url} {title} {site} {version} {platform}; update.json may override it. */
declare const __REPORT_URL__: string;
declare const __SAPU_VERSION__: string | undefined;
/** Geist, base64 (fonts/geist.woff2), inlined at build time. */
declare const __GEIST__: string;
const VERSION = typeof __SAPU_VERSION__ === 'string' ? __SAPU_VERSION__ : 'dev';
const CHANNEL = __CHANNEL_URL__ || undefined;

export interface BootResult {
  result: RunResult;
  rendered: boolean;
  /** A rule (official or the reader's own) covers this page's site. */
  supported: boolean;
  /** The reader on this page, once there is one (the extension's popup opens it or its settings). */
  overlay: () => OverlayHandle | null;
  /** Read this page as a new site right away (the popup's "Coba Sapu Berita di halaman ini"). */
  tryHere: () => void;
}

export interface BootOptions {
  debug?: boolean;
  /** Where reader settings live. Defaults to a cookie shared by the outlet's subdomains plus localStorage (best effort). */
  store?: SettingsStore;
  /** Ignore the "open automatically" setting (the user explicitly asked, e.g. via the iOS Shortcut). */
  forceOpen?: boolean;
  /** Which wrapper is running: picks the update link and labels bug reports. */
  platform?: Platform;
  /** This code was just downloaded from the release channel (Apple loader): never offer an update. */
  selfUpdating?: boolean;
  /** Installed from a browser store, which updates it: no update offer, but the daily rules check stays a setting. */
  storeInstall?: boolean;
  /** The extension's popup asked to read this page as a new site: skip the offer card and go straight in. */
  tryHere?: boolean;
  /** The extension's opt-in page check found an article on a site without a rule: show the offer card by itself. */
  offer?: boolean;
  /** "Jangan tawarkan di situs ini" on the offer card (offer mode only). */
  onSilence?: () => void;
}

/**
 * Shared browser boot for every wrapper: load rules and settings, run the pipeline on the live page,
 * draw the overlay. Page 1 is drawn as soon as it's extracted; merged pages replace it when they arrive.
 */
export async function boot(options: BootOptions = {}): Promise<BootResult> {
  const t0 = performance.now();
  const debug = (msg: string, data?: unknown) => {
    if (options.debug) console.debug('[sapuberita]', msg, data ?? '');
  };
  const url = new URL(location.href);
  const platform = options.platform ?? 'web';
  const checkForUpdates = async (shown: OverlayHandle) => {
    if (!CHANNEL) return;
    refreshRulesIfStale(new URL('rules.json', CHANNEL).href);
    if (options.selfUpdating || options.storeInstall) return;
    const offer = offerFor(await latestManifest(CHANNEL), VERSION, platform);
    if (offer && !isSnoozed(offer.version)) shown.offerUpdate(offer);
  };
  const store = options.store ?? outletStore(outletDomain(url.hostname, (bundledRules as RuleSet).sites.flatMap((s) => s.domains)));
  const settingsReady = store.load().then(normalizeSettings, () => normalizeSettings(undefined));
  let overlay: OverlayHandle | null = null;
  // The article without the reader's own rule, made once and only when the editor asks (it is a second run).
  let officialView: Promise<OfficialView | undefined> | undefined;
  // New-site mode (docs/FEEDBACK.md §5): no official rule, so "the official article" is the generic (Readability) one.
  let newSiteMode = false;
  const official = () =>
    (officialView ??= (async () => {
      const rule = findRule(rules, url) ?? (newSiteMode ? genericRuleFor(url.hostname) : null);
      if (!rule) return undefined;
      const r = await run({ doc: document, url, rules, generic: newSiteMode, fetchDocument: (u) => fetchSameOriginDocument(u, url.origin), log: debug });
      return r.ok ? { article: r.article, rule, removeSelectors: [...rules.common.remove, ...rule.remove, ...adblockSelectors(rules, url.hostname)] } : undefined;
    })());
  let pending: Promise<void> = Promise.resolve();
  // Feedback goes to a form (update.json can swap it without an app update); a Google Form takes it directly.
  const feedbackTemplate = () => cachedManifest()?.form || __REPORT_URL__;
  const reportFields = (a: Article, r: ReportInput): ReportFields => ({
    url: url.href, title: a.meta.title, site: url.hostname, version: VERSION, platform, ...r,
  });
  const overlayOptions = (settings: Settings, loadingMore: boolean): OverlayOptions => ({
    settings,
    loadingMore,
    startHidden: !settings.autoOpen && !options.forceOpen,
    autoOpenSetting: !options.forceOpen,
    updatesSetting: !options.selfUpdating,
    updatesFixesOnly: !!options.storeInstall,
    // The release channel is the install page (GitHub Pages); the release notes live on GitHub.
    links: CHANNEL ? { home: CHANNEL, privacy: new URL('privacy.html', CHANNEL).href, changes: 'https://github.com/dhantyo/sapu-berita/releases' } : undefined,
    originalUrl: url.href,
    official,
    platform,
    onSettingsChange: (s) => void store.save(s),
    onSnoozeUpdate: snoozeOffer,
    loadFonts: (f) => ensureFonts(document, f, __GEIST__, CHANNEL && new URL('fonts/', CHANNEL).href),
    report: {
      link: (a, r) => {
        const template = feedbackTemplate();
        return template ? reportLink(template, reportFields(a, r)) : undefined;
      },
      send: async (a, r) => {
        const template = feedbackTemplate();
        const post = template ? formPost(template, reportFields(a, r)) : undefined;
        return post ? sendForm(post) : false;
      },
    },
  });

  // The reader's own rule for this outlet is part of extraction, so settings load first (a local read, not a delay).
  const settings0 = await settingsReady;
  // Cached remote rules if newer than the bundled ones; refreshed below only if the reader allows updates.
  const rules = loadRules(bundledRules);
  const personal = personalForPage(settings0.personal, findRule(rules, url)?.id, url);
  const result = await run(
    {
      doc: document,
      url,
      rules,
      personal,
      fetchDocument: (u) => fetchSameOriginDocument(u, url.origin),
      log: debug,
    },
    (r, loadingMore) => {
      // Settings load is async (extension storage); queue renders behind it, in order.
      pending = pending.then(async () => {
        const settings = await settingsReady;
        if (r.ok) {
          if (overlay) overlay.update(r.article, loadingMore);
          else {
            overlay = renderOverlay(document, r.article, overlayOptions(settings, loadingMore));
            if (settings.updates) void checkForUpdates(overlay);
          }
          const now = Math.round(performance.now());
          debug(`${loadingMore ? 'page 1' : 'final'} rendered ${now} ms after navigation (${Math.round(now - t0)} ms of work)`, {
            pages: r.article.pages,
            swept: r.article.swept,
          });
          // Dev builds: expose timings to page-side tooling (DevTools, test automation). Content-script
          // console output isn't visible to every tool, page attributes are.
          if (options.debug) {
            document.documentElement.setAttribute(loadingMore ? 'data-sb-page1-ms' : 'data-sb-final-ms', String(now));
            document.documentElement.setAttribute('data-sb-start-ms', String(Math.round(t0)));
          }
        } else if (overlay) {
          // Merging failed after page 1 was shown: keep page 1 rather than yanking the overlay away.
          overlay.doneLoading();
          debug('merging failed, keeping page 1:', r.reason);
        }
      });
    },
  );
  await pending;

  if (!result.ok && !overlay) debug('skipped:', `${result.reason} ${result.detail ?? ''}`);

  /** Read the page with Readability as a site without a rule, and open the editor in new-site mode on it. */
  const startNewSite = async (prompt?: NewSitePrompt) => {
    if (overlay) return overlay.show();
    newSiteMode = true;
    const r = await run({ doc: document, url, rules, personal, generic: true, fetchDocument: (u) => fetchSameOriginDocument(u, url.origin), log: debug });
    if (!r.ok) {
      if (prompt) prompt.fail();
      else showFailCard(document, strings(settings0.lang), settings0.theme, false);
      return;
    }
    prompt?.close();
    overlay = renderOverlay(document, r.article, { ...overlayOptions(await settingsReady, false), startHidden: false, newSite: true });
  };

  // A site without a rule: the bookmark (forceOpen) offers to set it up (docs/FEEDBACK.md §5); so does the
  // extension's opt-in page check (offer); the extension's popup goes straight in (tryHere).
  if (!overlay && needsNewSitePrompt({ forceOpen: options.forceOpen || options.offer || options.tryHere, result, url, personal: settings0.personal, rules })) {
    if (options.tryHere) void startNewSite();
    else {
      const prompt: NewSitePrompt = showNewSitePrompt(document, strings(settings0.lang), settings0.theme, () => {
        prompt.working();
        void startNewSite(prompt);
      }, options.offer ? options.onSilence : undefined);
    }
  } else if (!overlay && !result.ok && !options.offer && (options.forceOpen || (platform === 'android' && result.reason !== 'not-article'))) {
    // Asked to open this page (bookmark, Shortcut, or an article link opened in the Android app) and couldn't: say so,
    // and let the report carry why. The extension runs on every page by itself, so it stays quiet; so does the app on
    // an outlet's other pages (its home page, a section), which it also opens.
    const template = feedbackTemplate();
    const fail = result;
    showFailCard(document, strings(settings0.lang), settings0.theme, fail.reason === 'not-article', template ? () => {
      const link = reportLink(template, {
        url: url.href, title: document.title, site: url.hostname, version: VERSION, platform, kind: 'report',
        note: '', detail: `reason: ${fail.reason}${fail.detail ? ` (${fail.detail.slice(0, 300)})` : ''}`,
      });
      window.open(link, '_blank', 'noopener');
    } : undefined);
  }
  const supported = !!findRule(rules, url) || !!matchPersonalSite(personal, url, rules);
  return { result, rendered: overlay !== null, supported, overlay: () => overlay, tryHere: () => void startNewSite() };
}
