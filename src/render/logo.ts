// Look at the outlet logo's actual pixels so the masthead can (1) recolour it per theme when its own
// colour wouldn't show, and (2) size it optically, trimmed of the empty padding logos ship with.
// Needs the logo's server to allow CORS reads (all five main outlets do, checked 2026-11-11);
// otherwise analyzeLogo resolves undefined and the masthead falls back to plates.

export interface LogoAnalysis {
  naturalWidth: number;
  naturalHeight: number;
  /** Bounding box of the drawn pixels (alpha > 10%), in natural pixels. */
  box: { x: number; y: number; w: number; h: number };
  /** Opaque rectangle (app-icon badge or JPG, corners may be rounded away): never recolour. */
  badge: boolean;
  /**
   * Parts drawn in a clearly different tone and enclosed by the rest (a white "d" knocked out of a black
   * disc): flattening to one colour would erase them, so the logo keeps its own colours.
   */
  knockout?: boolean;
  /** Share of the box that is drawn (alpha > 50%): a logo with a small tagline or thin strokes has little. */
  fill?: number;
  /** Relative luminance (WCAG, linear) of the median drawn pixel: the logo's "ink". */
  inkLuminance: number;
  /** Luminance of the darker / lighter parts (35th / 65th percentile): a two-colour logo is judged by the part that would vanish. */
  darkPart: number;
  lightPart: number;
}

/** Alpha (0-255) from which a pixel counts as drawn. Low on purpose: downscaling smears a one-pixel edge to a few percent. */
const FAINT = 6;

const cache = new Map<string, LogoAnalysis | undefined>();

/**
 * URL for loading the *displayed* logo in CORS mode, so one download serves both display and analysis.
 * The extra parameter keeps a non-CORS copy already in the page's cache from tainting the read.
 */
export function corsLogoUrl(src: string): string {
  if (src.startsWith('data:')) return src; // inline SVG logos are already local
  return src + (src.includes('?') ? '&' : '?') + 'sapu=1';
}

/** Analyse an already-loaded logo <img> (loaded with crossOrigin="anonymous"). Cached per src. */
export function analyzeLoadedLogo(img: HTMLImageElement): LogoAnalysis | undefined {
  if (cache.has(img.src)) return cache.get(img.src);
  const result = measure(img);
  cache.set(img.src, result);
  return result;
}

function measure(img: HTMLImageElement): LogoAnalysis | undefined {
  // SVGs without intrinsic size report 0; draw them at a sane default.
  const nw = img.naturalWidth || 300;
  const nh = img.naturalHeight || 100;
  const scale = Math.min(1, 240 / nw); // analysis resolution: plenty for a logo
  const w = Math.max(1, Math.round(nw * scale));
  const h = Math.max(1, Math.round(nh * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return undefined;
  ctx.drawImage(img, 0, 0, w, h);
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, w, h).data;
  } catch {
    return undefined; // tainted: the server didn't allow the read
  }

  let minX = w, minY = h, maxX = -1, maxY = -1, opaque = 0;
  const lum: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = data[i + 3]!;
      if (a > FAINT) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
      if (a > 128) {
        opaque++;
        lum.push(relativeLuminance(data[i]!, data[i + 1]!, data[i + 2]!));
      }
    }
  }
  if (maxX < 0 || !lum.length) return undefined;
  const knockout = findKnockout(data, w, h, minX, minY, maxX, maxY);
  lum.sort((p, q) => p - q);
  return {
    naturalWidth: nw,
    naturalHeight: nh,
    box: logoBox({ minX, minY, maxX, maxY }, w, h, nw, nh),
    badge: opaque / (w * h) > 0.97 || isSolidRectangle(data, w, minX, minY, maxX, maxY),
    knockout,
    fill: opaque / Math.max(1, (maxX - minX + 1) * (maxY - minY + 1)),
    inkLuminance: lum[Math.floor(lum.length / 2)]!,
    darkPart: lum[Math.floor(lum.length * 0.35)]!,
    lightPart: lum[Math.floor(lum.length * 0.65)]!,
  };
}

/**
 * A logo shipped as an opaque plate whose corners are rounded away (BeritaSatu: white lettering on black):
 * its whole outline is drawn, unlike a wordmark whose letters only touch the box here and there.
 */
export function isSolidRectangle(data: Uint8ClampedArray, w: number, minX: number, minY: number, maxX: number, maxY: number): boolean {
  // The outermost pixels are anti-aliased edge (faint after downscaling), so the ring sits one pixel inside.
  const x0 = minX + 1, x1 = maxX - 1, y0 = minY + 1, y1 = maxY - 1;
  if (x1 <= x0 || y1 <= y0) return false;
  let ring = 0, edge = 0, inside = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const on = data[(y * w + x) * 4 + 3]! > 128;
      if (on) inside++;
      if (x === x0 || x === x1 || y === y0 || y === y1) {
        edge++;
        if (on) ring++;
      }
    }
  }
  return ring / edge > 0.9 && inside / ((x1 - x0 + 1) * (y1 - y0 + 1)) > 0.75;
}

/** Two drawn pixels differ enough in tone that one reads as cut out of the other. */
const CUTOUT_CONTRAST = 3;
/** Share of drawn pixels that must be knocked out for the logo to count as having a knocked-out glyph. */
const KNOCKOUT_SHARE = 0.015;

/**
 * Finds pixels enclosed on all four sides (before any gap) by drawn pixels of a clearly different tone:
 * the "d" inside Rekomendit's disc. Ordinary one-colour lettering has none (its rays run out into
 * transparency), and neighbouring brand colours (blue next to red) don't contrast enough.
 */
export function findKnockout(
  data: Uint8ClampedArray, w: number, h: number, minX: number, minY: number, maxX: number, maxY: number,
): boolean {
  const lum = new Float32Array(w * h).fill(-1); // -1: not drawn
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3]! > 128) lum[y * w + x] = relativeLuminance(data[i]!, data[i + 1]!, data[i + 2]!);
    }
  }
  const reach = (x: number, y: number, dx: number, dy: number, own: number) => {
    for (let k = 1; k <= 120; k++) {
      const nx = x + dx * k, ny = y + dy * k;
      if (nx < minX || nx > maxX || ny < minY || ny > maxY) return false;
      const l = lum[ny * w + nx]!;
      if (l < 0) return false;
      if (contrast(l, own) >= CUTOUT_CONTRAST) return true;
    }
    return false;
  };
  let drawn = 0, cut = 0;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const own = lum[y * w + x]!;
      if (own < 0) continue;
      drawn++;
      if (reach(x, y, 1, 0, own) && reach(x, y, -1, 0, own) && reach(x, y, 0, 1, own) && reach(x, y, 0, -1, own)) cut++;
    }
  }
  return drawn > 0 && cut / drawn >= KNOCKOUT_SHARE;
}

/**
 * Drawn-pixel bounds (inclusive, in analysis pixels) to a natural-pixel box. The analysis canvas is a
 * downscaled, anti-aliased copy, so an edge row can come out fainter than the threshold and get lost
 * (Viva's descenders, Tirto's baseline); the box therefore takes one analysis pixel of margin on every
 * side, clamped to the image. Each axis uses its own scale since the canvas size is rounded.
 */
export function logoBox(
  b: { minX: number; minY: number; maxX: number; maxY: number },
  w: number, h: number, nw: number, nh: number,
): LogoAnalysis['box'] {
  const sx = nw / w, sy = nh / h;
  const x0 = Math.max(0, b.minX - 1) * sx, y0 = Math.max(0, b.minY - 1) * sy;
  const x1 = Math.min(w, b.maxX + 2) * sx, y1 = Math.min(h, b.maxY + 2) * sy;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** WCAG relative luminance from 8-bit sRGB. */
function relativeLuminance(r: number, g: number, b: number): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** Grounds of the overlay themes (relative luminance): light 255, sepia 247/241/228, dark 18. */
const LIGHT_GROUND = 1;
const SEPIA_GROUND = relativeLuminance(247, 241, 228);
const DARK_GROUND = relativeLuminance(18, 18, 18);
const MIN_CONTRAST = 3; // WCAG minimum for graphics

/** Would the logo, in its own colours, be too faint on our light/sepia ground? On our dark ground? */
export function recolourNeeds(a: LogoAnalysis): { onLight: boolean; onDark: boolean } {
  if (a.badge || a.knockout) return { onLight: false, onDark: false };
  // On a light ground the lighter part is the one at risk; on a dark ground, the darker part
  // (Tribunnews: its blue would vanish on black even though the red "news" survives).
  return {
    onLight: Math.min(contrast(a.lightPart, LIGHT_GROUND), contrast(a.lightPart, SEPIA_GROUND)) < MIN_CONTRAST,
    onDark: contrast(a.darkPart, DARK_GROUND) < MIN_CONTRAST,
  };
}

/**
 * Optical size: give every logo about the same visual weight (equal area of drawn pixels) instead of
 * equal height, so a long wordmark isn't huge and a compact one isn't tiny.
 */
export const LOGO_SIZE = { area: 3200, min: 20, max: 34, maxWidth: 210 };

/** Fill (drawn share of the box) below which a logo counts as sparse, and the most area it may gain for it. */
const SPARSE_FILL = 0.3;
const MAX_SPARSE_BOOST = 1.35;

export function opticalHeight(aspect: number, opts = LOGO_SIZE, fill?: number): number {
  // A sparse logo (a wordmark with a small tagline, thin strokes: Jawa Pos) carries less ink in the same box
  // and reads small, so it gets up to a third more area.
  const sparse = fill && fill < SPARSE_FILL ? Math.min(MAX_SPARSE_BOOST, Math.sqrt(SPARSE_FILL / fill)) : 1;
  const h = Math.min(opts.max, Math.max(opts.min, Math.sqrt((opts.area * sparse) / Math.max(0.2, aspect))));
  // The width cap wins over the minimum height: a very long logo gets shorter rather than overflowing the bar.
  return Math.min(h, opts.maxWidth / aspect);
}

/**
 * A knocked-out logo can't be flattened, so when its body would vanish on the theme's ground it sits on a
 * plate instead (Rekomendit's black disc and lettering on the dark theme).
 */
export function plateNeeds(a: LogoAnalysis): { onLight: boolean; onDark: boolean } {
  if (a.badge || !a.knockout) return { onLight: false, onDark: false };
  return {
    onLight: Math.min(contrast(a.lightPart, LIGHT_GROUND), contrast(a.lightPart, SEPIA_GROUND)) < MIN_CONTRAST,
    onDark: contrast(a.darkPart, DARK_GROUND) < MIN_CONTRAST,
  };
}
