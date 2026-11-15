import { describe, expect, it } from 'vitest';
import { barHiddenAfterScroll } from '../src/render/barscroll.ts';

describe('barHiddenAfterScroll', () => {
  it('stays visible while still within the masthead', () => {
    expect(barHiddenAfterScroll(false, 0, 40)).toBe(false);
    expect(barHiddenAfterScroll(false, 40, 56)).toBe(false);
  });
  it('hides when scrolling down past the masthead', () => {
    expect(barHiddenAfterScroll(false, 50, 120)).toBe(true);
    expect(barHiddenAfterScroll(true, 120, 800)).toBe(true);
  });
  it('comes back on any upward scroll', () => {
    expect(barHiddenAfterScroll(true, 800, 799)).toBe(false);
    expect(barHiddenAfterScroll(true, 800, 750)).toBe(false);
  });
  it('comes back at the top, even when moving down from a bounce', () => {
    expect(barHiddenAfterScroll(true, 200, 0)).toBe(false);
    expect(barHiddenAfterScroll(true, -20, 10)).toBe(false);
  });
  it('keeps its state when the position did not change', () => {
    expect(barHiddenAfterScroll(true, 300, 300)).toBe(true);
    expect(barHiddenAfterScroll(false, 300, 300)).toBe(false);
  });
});
