// Extension content script (apps/extension; Firefox package in dist/extension-firefox). Runs automatically on supported
// sites; the popup and the opt-in page check (ext-offer.ts) also load it on other sites, with a mode set first.
import type { Settings, SettingsStore } from '../settings.ts';
import { boot, type BootResult } from './boot.ts';
import { silenceHost } from './ext-offer.ts';

declare const chrome: {
  runtime?: {
    getManifest(): { update_url?: string };
    onMessage?: { addListener(fn: (msg: { sapu?: string } | undefined, sender: unknown, reply: (r: unknown) => void) => boolean | void): void };
  };
  storage?: { local: { get(key: string): Promise<Record<string, unknown>>; set(items: Record<string, unknown>): Promise<void> } };
};

const KEY = 'settings';

/** Extension storage is shared by every site, unlike localStorage, so settings follow the reader everywhere. */
const extensionStore: SettingsStore = {
  async load() {
    if (!chrome.storage) return undefined;
    return (await chrome.storage.local.get(KEY))[KEY] as Partial<Settings> | undefined;
  },
  async save(settings) {
    await chrome.storage?.local.set({ [KEY]: settings });
  },
};

// Installed from a store (Chrome Web Store and Edge Add-ons add update_url; every normal Firefox install comes from
// addons.mozilla.org): the store updates it, so don't offer the manual-update bar.
const fromStore = !!chrome.runtime?.getManifest?.().update_url || /Firefox\//.test(navigator.userAgent);

const w = window as Window & { __sapuMode?: 'try' | 'offer'; __sapuBooted?: Promise<BootResult> };
const mode = w.__sapuMode;
delete w.__sapuMode;

if (w.__sapuBooted) {
  // Loaded again into a page that already has the reader (the popup's "Coba" after the offer card): just go in.
  if (mode === 'try') void w.__sapuBooted.then((b) => b.tryHere());
} else {
  const booted = boot({
    debug: true, store: extensionStore, platform: 'extension', storeInstall: fromStore,
    tryHere: mode === 'try', offer: mode === 'offer', onSilence: () => void silenceHost(location.hostname),
  });
  w.__sapuBooted = booted;

  // The toolbar popup asks what this page is, and can open the reader or its settings.
  chrome.runtime?.onMessage?.addListener((msg, _sender, reply) => {
    if (!msg?.sapu || !['status', 'open', 'settings'].includes(msg.sapu)) return;
    void booted.then((b) => {
      const overlay = b.overlay();
      if (msg.sapu === 'open') overlay?.show();
      if (msg.sapu === 'settings') overlay?.openSettings();
      reply({ supported: b.supported, open: !!overlay });
    });
    return true; // the reply comes asynchronously
  });
}
