import { describe, expect, it } from 'vitest';
import { LOGO_SIZE, findKnockout, isSolidRectangle, opticalHeight, plateNeeds, recolourNeeds, type LogoAnalysis } from '../src/render/logo.ts';

const logo = (inkLuminance: number, badge = false, darkPart = inkLuminance, lightPart = inkLuminance): LogoAnalysis => ({
  naturalWidth: 300, naturalHeight: 60, box: { x: 0, y: 0, w: 300, h: 60 }, badge, inkLuminance, darkPart, lightPart,
});

// Ink luminances measured on the live logos (2026-11-11), converted to WCAG relative luminance.
describe('per-theme recolouring', () => {
  it('turns a white logo (Kompas) to ink on light grounds only', () => {
    expect(recolourNeeds(logo(1))).toEqual({ onLight: true, onDark: false });
  });
  it('turns a dark logo (Sriwijaya Post) white on the dark ground only', () => {
    expect(recolourNeeds(logo(0.015))).toEqual({ onLight: false, onDark: true });
  });
  it('leaves a mid-tone logo (Liputan6 orange) alone everywhere', () => {
    expect(recolourNeeds(logo(0.2))).toEqual({ onLight: false, onDark: false });
  });
  it('never recolours an opaque badge (CNN square)', () => {
    expect(recolourNeeds(logo(0.03, true))).toEqual({ onLight: false, onDark: false });
  });
});

describe('two-colour logos', () => {
  it('turns Tribunnews white on dark: its blue part would vanish even though the red part survives', () => {
    // median pulled up by red "news"; the darker 35% is the blue wordmark
    expect(recolourNeeds(logo(0.12, false, 0.06, 0.2)).onDark).toBe(true);
  });
});

describe('optical sizing', () => {
  it('gives long wordmarks less height than compact ones, within bounds', () => {
    const long = opticalHeight(6);
    const compact = opticalHeight(2.5);
    expect(long).toBeLessThan(compact);
    expect(long).toBeGreaterThanOrEqual(LOGO_SIZE.min);
    expect(compact).toBeLessThanOrEqual(LOGO_SIZE.max);
  });
  it('caps width for very long logos', () => {
    expect(opticalHeight(12) * 12).toBeLessThanOrEqual(LOGO_SIZE.maxWidth + 0.001);
  });
});

// Pixel-level checks on tiny synthetic RGBA logos (no browser needed).
describe('pixel analysis', () => {
  const W = 40, H = 16;
  const canvas = (paint: (x: number, y: number) => [number, number, number, number]) => {
    const d = new Uint8ClampedArray(W * H * 4);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) d.set(paint(x, y), (y * W + x) * 4);
    return d;
  };
  const bounds = [0, 0, W - 1, H - 1] as const;

  it('reads an opaque plate with rounded-away corners as a badge (BeritaSatu: white lettering on black)', () => {
    const corner = (x: number, y: number) => (x < 2 || x > W - 3) && (y < 2 || y > H - 3);
    const data = canvas((x, y) => (corner(x, y) ? [0, 0, 0, 0] : x % 7 < 3 && y > 4 && y < 11 ? [255, 255, 255, 255] : [0, 0, 0, 255]));
    expect(isSolidRectangle(data, W, ...bounds)).toBe(true);
  });
  it('does not read a wordmark touching the box edges here and there as a badge', () => {
    const data = canvas((x, y) => (x % 8 < 3 && y % 4 < 3 ? [0, 0, 0, 255] : [0, 0, 0, 0]));
    expect(isSolidRectangle(data, W, ...bounds)).toBe(false);
  });
  it('finds a white glyph knocked out of a black disc (Rekomendit "d") but not plain one-colour lettering', () => {
    const disc = canvas((x, y) => {
      const dx = x - 20, dy = y - 8;
      if (dx * dx + dy * dy > 49) return [0, 0, 0, 0];
      return Math.abs(dx) < 3 && Math.abs(dy) < 3 ? [255, 255, 255, 255] : [0, 0, 0, 255];
    });
    expect(findKnockout(disc, W, H, ...bounds)).toBe(true);
    const letters = canvas((x, y) => (x % 8 < 5 && y > 2 && y < 13 ? [0, 0, 0, 255] : [0, 0, 0, 0]));
    expect(findKnockout(letters, W, H, ...bounds)).toBe(false);
  });
  it('keeps a knocked-out logo in its own colours and plates it where its body would vanish', () => {
    const rekomendit = { ...logo(0.0, false), knockout: true };
    expect(recolourNeeds(rekomendit)).toEqual({ onLight: false, onDark: false });
    expect(plateNeeds(rekomendit)).toEqual({ onLight: false, onDark: true });
    expect(plateNeeds(logo(0.0))).toEqual({ onLight: false, onDark: false });
  });
});

describe('sparse logos', () => {
  it('gives a logo with little ink in its box (tagline, thin strokes) more height, within the cap', () => {
    expect(opticalHeight(4.4, LOGO_SIZE, 0.2)).toBeGreaterThan(opticalHeight(4.4, LOGO_SIZE, 0.4));
    expect(opticalHeight(4.4, LOGO_SIZE, 0.05)).toBeLessThanOrEqual(LOGO_SIZE.max);
    expect(opticalHeight(4.4, LOGO_SIZE, 0.4)).toBe(opticalHeight(4.4));
  });
});
