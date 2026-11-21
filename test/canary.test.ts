import { describe, expect, it } from 'vitest';
import { isChallenge } from '../tools/lib/dom.ts';

const res = (status: number, headers: Record<string, string> = {}) => ({ status, headers: new Headers(headers) });

describe('a bot check instead of the page', () => {
  it('is recognised', () => {
    expect(isChallenge(res(202, { 'x-amzn-waf-action': 'challenge' }), '')).toBe(true); // Tribun's AWS WAF
    expect(isChallenge(res(200, { 'cf-mitigated': 'challenge' }), '<html>Just a moment…</html>')).toBe(true);
    expect(isChallenge(res(200), '   ')).toBe(true);
  });
  it('a real page is not one', () => {
    expect(isChallenge(res(200, { 'content-type': 'text/html' }), '<html><body><p>Berita</p></body></html>')).toBe(false);
  });
});
