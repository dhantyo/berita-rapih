// The extension's opt-in page check ("Tawarkan Sapu Berita di situs berita lain"), shared by the popup and the
// background script. Off by default. Turned on in the popup, it asks the browser for access to all sites; with it,
// offer.js runs on pages of sites without a rule and, on an article, asks the background script to load the reader,
// which shows the offer card. Turned off, the script is unregistered and the access given back.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const chrome: any;

const KEY = 'offer';
const SCRIPT_ID = 'sapu-offer';
export const ALL_SITES = { origins: ['<all_urls>'] };

export interface OfferPrefs {
  on: boolean;
  /** Hosts where the reader chose "Jangan tawarkan di situs ini". */
  silenced: string[];
}

export async function offerPrefs(): Promise<OfferPrefs> {
  const v = (await chrome.storage.local.get(KEY))[KEY] as Partial<OfferPrefs> | undefined;
  return { on: !!v?.on, silenced: Array.isArray(v?.silenced) ? v.silenced.filter((h): h is string => typeof h === 'string') : [] };
}

export async function saveOfferPrefs(prefs: OfferPrefs): Promise<void> {
  await chrome.storage.local.set({ [KEY]: prefs });
}

export async function silenceHost(host: string): Promise<void> {
  const prefs = await offerPrefs();
  if (!prefs.silenced.includes(host)) await saveOfferPrefs({ ...prefs, silenced: [...prefs.silenced, host].slice(-200) });
}

/** The supported sites already get the reader itself; the page check runs everywhere else. */
const supportedMatches = (): string[] => chrome.runtime.getManifest().content_scripts?.[0]?.matches ?? [];

/** Register or unregister offer.js so it matches the setting and the permission (called on every change and at startup). */
export async function syncOfferScript(): Promise<void> {
  if (!chrome.scripting?.registerContentScripts) return;
  const prefs = await offerPrefs();
  const allowed: boolean = await chrome.permissions.contains(ALL_SITES);
  const registered = (await chrome.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID] })).length > 0;
  if (prefs.on && allowed && !registered) {
    await chrome.scripting.registerContentScripts([
      { id: SCRIPT_ID, matches: ['<all_urls>'], excludeMatches: supportedMatches(), js: ['offer.js'], runAt: 'document_idle' },
    ]);
  } else if ((!prefs.on || !allowed) && registered) {
    await chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });
  }
}

/** Load the reader into a tab in one of its modes: the popup's "Coba" (tryHere) or the page check's offer. */
export async function injectReader(tabId: number, mode: 'try' | 'offer'): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (m: string) => {
      (window as Window & { __sapuMode?: string }).__sapuMode = m;
    },
    args: [mode],
  });
  await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
}
