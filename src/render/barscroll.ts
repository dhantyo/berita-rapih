// "Hide the bar while scrolling": decides from two scroll positions whether the top bar is tucked away.

/** Scroll distance (px) the article must pass before the bar may hide: roughly the bar's own height. */
export const BAR_HIDE_AFTER = 56;

/** Down past the masthead hides the bar; any upward scroll, or being back near the top, shows it. */
export function barHiddenAfterScroll(hidden: boolean, prevTop: number, top: number, hideAfter = BAR_HIDE_AFTER): boolean {
  if (top <= hideAfter) return false;
  if (top < prevTop) return false;
  if (top > prevTop) return true;
  return hidden;
}
