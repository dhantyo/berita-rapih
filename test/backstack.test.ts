import { describe, expect, it } from 'vitest';
import { createBackStack } from '../src/render/backstack.ts';

/** A window whose history is a plain stack; back() fires popstate like a browser would. */
function fakeWindow() {
  const entries: unknown[] = [null];
  let listener: (() => void) | undefined;
  const win = {
    addEventListener: (_type: string, fn: () => void) => { listener = fn; },
    history: {
      get state() { return entries[entries.length - 1]; },
      pushState: (state: unknown) => { entries.push(state); },
      back: () => { entries.pop(); listener?.(); },
    },
  };
  /** The reader pressing Back. */
  const pressBack = () => { entries.pop(); listener?.(); };
  return { win: win as unknown as Window, entries, pressBack };
}

describe('back stack', () => {
  it('Back closes the top layer only', () => {
    const { win, entries, pressBack } = fakeWindow();
    const stack = createBackStack(win);
    const closed: string[] = [];
    stack.push(() => closed.push('panel'));
    stack.push(() => closed.push('sub'));
    expect(entries).toHaveLength(3);
    pressBack();
    expect(closed).toEqual(['sub']);
    pressBack();
    expect(closed).toEqual(['sub', 'panel']);
  });

  it('closing by a button removes its entry without closing anything else', () => {
    const { win, entries, pressBack } = fakeWindow();
    const stack = createBackStack(win);
    const closed: string[] = [];
    stack.push(() => closed.push('panel'));
    const sub = stack.push(() => closed.push('sub'));
    sub.release();
    expect(entries).toHaveLength(2);
    expect(closed).toEqual([]);
    sub.release(); // twice is harmless
    expect(entries).toHaveLength(2);
    pressBack();
    expect(closed).toEqual(['panel']);
  });

  it('hand passes the same entry to the next layer', () => {
    const { win, entries, pressBack } = fakeWindow();
    const stack = createBackStack(win);
    const closed: string[] = [];
    const panel = stack.push(() => closed.push('panel'));
    const feedback = panel.hand(() => closed.push('feedback'));
    feedback.hand(() => closed.push('editor'));
    expect(entries).toHaveLength(2);
    pressBack();
    expect(closed).toEqual(['editor']);
  });

  it('without pushState nothing is wired', () => {
    const { win } = fakeWindow();
    (win.history as unknown as { pushState: () => void }).pushState = () => { throw new Error('sandboxed'); };
    const layer = createBackStack(win).push(() => {});
    expect(() => layer.release()).not.toThrow();
  });
});
