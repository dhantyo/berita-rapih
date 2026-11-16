// Extension content script (apps/extension; Firefox package in dist/extension-firefox). Runs automatically on supported sites.
import type { Settings, SettingsStore } from '../settings.ts';
import { boot } from './boot.ts';

declare const chrome: {
  runtime?: { getManifest(): { update_url?: string } };
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
const fromStore = !!chrome.runtime?.getManifest?.().update_url || /Firefox\//.test(navigator.userAgent);

void boot({ debug: true, store: extensionStore, platform: 'extension', storeInstall: fromStore });
