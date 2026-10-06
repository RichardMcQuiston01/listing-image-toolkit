/**
 * Removes a plain background from an image, in the browser, with no
 * dependencies. Made for machine renders and logos shot or exported on a
 * solid colour (usually white): the background colour is read from the
 * image's border, then pixels close to it are made transparent.
 *
 * Pure functions over RGBA pixel arrays (the layout of ImageData.data), so
 * they're unit tested without a canvas.
 */

export interface BackgroundRemovalOptions {
  /** 0–100: how far a colour may be from the background and still be removed. */
  readonly tolerance: number;
  /**
   * true: only remove background connected to the image's edges, so a white
   * area *inside* the subject (a label, a panel) survives. false: remove that
   * colour everywhere.
   */
  readonly edgesOnly: boolean;
}

export interface BackgroundRemovalResult {
  /** A new RGBA array; the input is not modified. */
  readonly pixels: Uint8ClampedArray;
  /** The background colour that was detected, [r, g, b]. */
  readonly background: readonly [number, number, number];
  /** How many pixels became fully transparent. */
  readonly removedCount: number;
}

export const DEFAULT_BACKGROUND_REMOVAL: BackgroundRemovalOptions = {
  tolerance: 12,
  edgesOnly: true,
};

/** Largest possible RGB distance, from black to white. */
const MAX_DISTANCE: number = Math.sqrt(3 * 255 * 255);
/** Pixels this transparent or more are treated as already removed. */
const TRANSPARENT_ALPHA = 16;

function colourDistance(
  pixels: Uint8ClampedArray,
  offset: number,
  [r, g, b]: readonly [number, number, number]
): number {
  const dr: number = (pixels[offset] ?? 0) - r;
  const dg: number = (pixels[offset + 1] ?? 0) - g;
  const db: number = (pixels[offset + 2] ?? 0) - b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function median(values: number[]): number {
  if (values.length === 0) return 255;
  values.sort((left, right) => left - right);
  return values[Math.floor(values.length / 2)] ?? 255;
}

/**
 * The background colour: the per-channel median of the opaque pixels on the
 * image's border. A median ignores the odd part of the subject that touches
 * the edge. White when the border is already transparent.
 */
export function detectBackgroundColour(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): [number, number, number] {
  const reds: number[] = [];
  const greens: number[] = [];
  const blues: number[] = [];
  const sample = (x: number, y: number): void => {
    const offset: number = (y * width + x) * 4;
    if ((pixels[offset + 3] ?? 0) < TRANSPARENT_ALPHA) return;
    reds.push(pixels[offset] ?? 0);
    greens.push(pixels[offset + 1] ?? 0);
    blues.push(pixels[offset + 2] ?? 0);
  };
  for (let x = 0; x < width; x += 1) {
    sample(x, 0);
    if (height > 1) sample(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    sample(0, y);
    if (width > 1) sample(width - 1, y);
  }
  return [median(reds), median(greens), median(blues)];
}

/**
 * Makes the background transparent. Pixels within the tolerance become fully
 * transparent; a thin band just outside it, bordering removed pixels, is
 * made partly transparent, so anti-aliased edges don't keep a pale halo.
 */
export function removeBackground(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  options: BackgroundRemovalOptions
): BackgroundRemovalResult {
  const pixels = new Uint8ClampedArray(source);
  const pixelCount: number = width * height;
  const background = detectBackgroundColour(source, width, height);
  const tolerance: number = Math.min(100, Math.max(0, options.tolerance));
  const threshold: number = (tolerance / 100) * MAX_DISTANCE;
  // The soft edge: wide enough to catch anti-aliased pixels (a blend of the
  // subject and the background), which only ever touch removed pixels.
  const feather: number = Math.max(threshold, MAX_DISTANCE * 0.25);

  const distances = new Float32Array(pixelCount);
  for (let index = 0; index < pixelCount; index += 1) {
    distances[index] = colourDistance(source, index * 4, background);
  }
  const isBackground = (index: number): boolean =>
    (distances[index] ?? Infinity) <= threshold ||
    (source[index * 4 + 3] ?? 255) < TRANSPARENT_ALPHA;

  const removed = new Uint8Array(pixelCount);
  if (options.edgesOnly) {
    // Flood fill from every background pixel on the border.
    const queue = new Int32Array(pixelCount);
    let head = 0;
    let tail = 0;
    const visit = (index: number): void => {
      if (removed[index] === 1 || !isBackground(index)) return;
      removed[index] = 1;
      queue[tail] = index;
      tail += 1;
    };
    for (let x = 0; x < width; x += 1) {
      visit(x);
      visit((height - 1) * width + x);
    }
    for (let y = 0; y < height; y += 1) {
      visit(y * width);
      visit(y * width + width - 1);
    }
    while (head < tail) {
      const index: number = queue[head] ?? 0;
      head += 1;
      const x: number = index % width;
      if (x > 0) visit(index - 1);
      if (x < width - 1) visit(index + 1);
      if (index >= width) visit(index - width);
      if (index < pixelCount - width) visit(index + width);
    }
  } else {
    for (let index = 0; index < pixelCount; index += 1) {
      if (isBackground(index)) removed[index] = 1;
    }
  }

  let removedCount = 0;
  for (let index = 0; index < pixelCount; index += 1) {
    if (removed[index] === 1) {
      pixels[index * 4 + 3] = 0;
      removedCount += 1;
    }
  }

  // Soften the edge: pixels next to removed ones that are close to the
  // background fade with their distance from it.
  for (let index = 0; index < pixelCount; index += 1) {
    if (removed[index] === 1) continue;
    const distance: number = distances[index] ?? Infinity;
    if (distance > threshold + feather) continue;
    const x: number = index % width;
    const touchesRemoved: boolean =
      (x > 0 && removed[index - 1] === 1) ||
      (x < width - 1 && removed[index + 1] === 1) ||
      (index >= width && removed[index - width] === 1) ||
      (index < pixelCount - width && removed[index + width] === 1);
    if (!touchesRemoved) continue;
    const keep: number = Math.min(
      1,
      Math.max(0, (distance - threshold) / feather)
    );
    pixels[index * 4 + 3] = Math.round((source[index * 4 + 3] ?? 255) * keep);
  }

  return { pixels, background, removedCount };
}
