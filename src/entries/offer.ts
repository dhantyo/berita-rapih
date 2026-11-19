// The opt-in page check (ext-offer.ts): registered on every site without a rule once the reader turned it on.
// It stays tiny on purpose: on a page that looks like an article, and isn't silenced, it asks the background script
// to load the reader, which shows the offer card. Nothing else runs on other pages.
import { looksLikeArticle } from '../looks-like-article.ts';
import { offerPrefs } from './ext-offer.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const chrome: any;

void (async () => {
  if (window.top !== window || !looksLikeArticle(document)) return;
  const prefs = await offerPrefs();
  if (!prefs.on || prefs.silenced.includes(location.hostname)) return;
  chrome.runtime.sendMessage({ sapu: 'offer' });
})();
