import { describe, expect, it } from 'vitest';
import { nextBarOffset, settledBarOffset } from '../src/render/barscroll.ts';

const H = 56;

describe('nextBarOffset', () => {
  it('slides away by exactly the distance scrolled down', () => {
    expect(nextBarOffset(0, 400, 420, H)).toBe(20);
    expect(nextBarOffset(20, 420, 450, H)).toBe(50);
  });
  it('stops at fully hidden', () => {
    expect(nextBarOffset(50, 450, 900, H)).toBe(H);
  });
  it('comes back by exactly the distance scrolled up', () => {
    expect(nextBarOffset(H, 900, 880, H)).toBe(36);
    expect(nextBarOffset(36, 880, 800, H)).toBe(0);
  });
  it('is never hidden by more than the distance from the top', () => {
    expect(nextBarOffset(0, 0, 30, H)).toBe(30);
    expect(nextBarOffset(H, 200, 40, H)).toBe(0);
  });
  it('is fully shown at the top, even after a bounce', () => {
    expect(nextBarOffset(H, 200, 0, H)).toBe(0);
    expect(nextBarOffset(H, -20, -5, H)).toBe(0);
  });
});

describe('settledBarOffset', () => {
  it('leaves a fully shown or fully hidden bar alone', () => {
    expect(settledBarOffset(0, 500, H)).toBe(0);
    expect(settledBarOffset(H, 500, H)).toBe(H);
  });
  it('finishes hiding when mostly hidden', () => {
    expect(settledBarOffset(40, 500, H)).toBe(H);
  });
  it('comes back when mostly shown', () => {
    expect(settledBarOffset(20, 500, H)).toBe(0);
  });
  it('comes back near the top of the article', () => {
    expect(settledBarOffset(40, 50, H)).toBe(0);
  });
});
