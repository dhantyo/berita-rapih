// The site a host belongs to, without a public-suffix list (too big to bundle into the reader).

/** Second-level zones under a country domain: kontan.co.id, dpr.go.id, thesun.co.uk, abc.net.au. */
const SECOND_LEVEL = /^(co|com|ac|or|org|go|gov|web|my|sch|net|edu|mil|biz|ne|gob|nic|ponpes|desa)$/;

/** The host's main domain: the last two labels, or three when the second-to-last is a zone under a country domain. */
export function mainDomain(host: string): string {
  const h = host.toLowerCase().replace(/\.$/, '');
  if (/^[\d.]+$/.test(h) || h.includes(':')) return h; // an address
  const labels = h.split('.');
  if (labels.length <= 2) return h;
  const zone = labels[labels.length - 1]!.length === 2 && SECOND_LEVEL.test(labels[labels.length - 2]!);
  return labels.slice(zone ? -3 : -2).join('.');
}
