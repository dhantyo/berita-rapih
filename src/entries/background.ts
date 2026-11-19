// The extension's background script (a service worker in Chrome and Edge, an event page in Firefox). It only serves
// the opt-in page check: keeps offer.js registered to match the setting, and loads the reader when offer.js finds an
// article on a site without a rule.
import { injectReader, syncOfferScript } from './ext-offer.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const chrome: any;

const sync = () => void syncOfferScript().catch(() => {});
chrome.runtime.onInstalled.addListener(sync);
chrome.runtime.onStartup.addListener(sync);
// Access taken back in the browser's own settings: stop the page check.
chrome.permissions?.onRemoved?.addListener(sync);

chrome.runtime.onMessage.addListener((msg: { sapu?: string } | undefined, sender: { tab?: { id?: number } }) => {
  if (msg?.sapu === 'offer' && sender.tab?.id != null) void injectReader(sender.tab.id, 'offer').catch(() => {});
});
