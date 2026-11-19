// "Hide the bar while scrolling": the top bar follows the scroll like a phone browser's address bar. Scrolling down
// slides it away by exactly the distance scrolled, scrolling up brings it back the same way, and when the scroll
// stops halfway it settles to fully shown or fully hidden.

/**
 * How far (px) the bar is pushed up after a scroll from prevTop to top. 0 = fully shown, height = fully hidden.
 * Near the top of the article it is never hidden by more than the distance scrolled, so the masthead can't vanish
 * while the reader is still looking at the headline.
 */
export function nextBarOffset(offset: number, prevTop: number, top: number, height: number): number {
  if (top <= 0) return 0;
  const next = Math.max(0, Math.min(height, offset + (top - prevTop)));
  return Math.min(next, top);
}

/** Where a half-hidden bar comes to rest once the scroll stops: hidden if mostly hidden and past the masthead. */
export function settledBarOffset(offset: number, top: number, height: number): number {
  if (offset <= 0 || offset >= height) return offset;
  return offset > height / 2 && top > height ? height : 0;
}
