/**
 * Cropping maths for images (watermarks, product renders). Pure functions
 * over a rectangle in image pixels, so they're unit tested without a canvas;
 * the pointer handling is left to the UI that uses them.
 */

import { detectBackgroundColour } from './background-removal';

export interface CropRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ImageSize {
  readonly width: number;
  readonly height: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** A corner or edge of the crop box being dragged. */
export type CropHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export const CROP_HANDLES: readonly CropHandle[] = [
  'nw',
  'n',
  'ne',
  'e',
  'se',
  's',
  'sw',
  'w',
];

/** The crop box never gets smaller than this, in image pixels. */
export const MIN_CROP_SIZE = 8;

/** Pixels this transparent or more count as empty. */
const TRANSPARENT_ALPHA = 16;
/** Largest possible RGB distance, from black to white. */
const MAX_DISTANCE: number = Math.sqrt(3 * 255 * 255);

export function fullCrop(size: ImageSize): CropRect {
  return { x: 0, y: 0, width: size.width, height: size.height };
}

export function isFullCrop(rect: CropRect, size: ImageSize): boolean {
  return (
    rect.x === 0 &&
    rect.y === 0 &&
    rect.width === size.width &&
    rect.height === size.height
  );
}

/** Whole pixels, at least MIN_CROP_SIZE (or the image, if smaller), inside the image. */
export function clampCrop(rect: CropRect, size: ImageSize): CropRect {
  const minWidth: number = Math.min(MIN_CROP_SIZE, size.width);
  const minHeight: number = Math.min(MIN_CROP_SIZE, size.height);
  const width: number = clamp(Math.round(rect.width), minWidth, size.width);
  const height: number = clamp(Math.round(rect.height), minHeight, size.height);
  return {
    x: clamp(Math.round(rect.x), 0, size.width - width),
    y: clamp(Math.round(rect.y), 0, size.height - height),
    width,
    height,
  };
}

/** Moves the box without resizing it, stopping at the image's edges. */
export function moveCrop(
  rect: CropRect,
  dx: number,
  dy: number,
  size: ImageSize
): CropRect {
  return clampCrop({ ...rect, x: rect.x + dx, y: rect.y + dy }, size);
}

/**
 * Drags one handle by (dx, dy). The opposite edge or corner stays put. With
 * an aspect ratio (width / height), the box keeps it: corners follow the
 * dimension that moved more, and an edge handle grows the other dimension
 * about the box's centre.
 */
export function resizeCrop(
  rect: CropRect,
  handle: CropHandle,
  dx: number,
  dy: number,
  size: ImageSize,
  aspect: number | null
): CropRect {
  let left: number = rect.x;
  let top: number = rect.y;
  let right: number = rect.x + rect.width;
  let bottom: number = rect.y + rect.height;
  if (handle.includes('w')) left = clamp(left + dx, 0, right - MIN_CROP_SIZE);
  if (handle.includes('e'))
    right = clamp(right + dx, left + MIN_CROP_SIZE, size.width);
  if (handle.includes('n')) top = clamp(top + dy, 0, bottom - MIN_CROP_SIZE);
  if (handle.includes('s'))
    bottom = clamp(bottom + dy, top + MIN_CROP_SIZE, size.height);
  const resized: CropRect = {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
  return clampCrop(
    aspect === null ? resized : fitAspect(resized, handle, aspect, size),
    size
  );
}

/** A new box dragged out from `start` to `end`, e.g. by pressing outside the current one. */
export function cropFromPoints(
  start: Point,
  end: Point,
  size: ImageSize,
  aspect: number | null
): CropRect {
  const startX: number = clamp(start.x, 0, size.width);
  const startY: number = clamp(start.y, 0, size.height);
  const endX: number = clamp(end.x, 0, size.width);
  const endY: number = clamp(end.y, 0, size.height);
  const handle =
    `${endY < startY ? 'n' : 's'}${endX < startX ? 'w' : 'e'}` as CropHandle;
  const rect: CropRect = {
    x: Math.min(startX, endX),
    y: Math.min(startY, endY),
    width: Math.max(Math.abs(endX - startX), MIN_CROP_SIZE),
    height: Math.max(Math.abs(endY - startY), MIN_CROP_SIZE),
  };
  return clampCrop(
    aspect === null ? rect : fitAspect(rect, handle, aspect, size),
    size
  );
}

/** The largest box of this aspect ratio, centred on the current one, inside the image. */
export function cropToAspect(
  rect: CropRect,
  aspect: number,
  size: ImageSize
): CropRect {
  const centreX: number = rect.x + rect.width / 2;
  const centreY: number = rect.y + rect.height / 2;
  let width: number = rect.width;
  let height: number = width / aspect;
  if (height > rect.height) {
    height = rect.height;
    width = height * aspect;
  }
  return clampCrop(
    { x: centreX - width / 2, y: centreY - height / 2, width, height },
    size
  );
}

/**
 * Applies the aspect ratio to a box being resized by `handle`, anchored on
 * the opposite side, then shrinks it (keeping the anchor) to fit the image.
 */
function fitAspect(
  rect: CropRect,
  handle: CropHandle,
  aspect: number,
  size: ImageSize
): CropRect {
  const horizontal: boolean = /[ew]/.test(handle);
  const vertical: boolean = /[ns]/.test(handle);
  let width: number = rect.width;
  let height: number = rect.height;
  const widthLeads: boolean =
    horizontal && (!vertical || width / height >= aspect);
  if (widthLeads) height = width / aspect;
  else width = height * aspect;

  const right: number = rect.x + rect.width;
  const bottom: number = rect.y + rect.height;
  const centreX: number = rect.x + rect.width / 2;
  const centreY: number = rect.y + rect.height / 2;
  const maxWidth: number = handle.includes('w')
    ? right
    : handle.includes('e')
      ? size.width - rect.x
      : 2 * Math.min(centreX, size.width - centreX);
  const maxHeight: number = handle.includes('n')
    ? bottom
    : handle.includes('s')
      ? size.height - rect.y
      : 2 * Math.min(centreY, size.height - centreY);
  const shrink: number = Math.min(1, maxWidth / width, maxHeight / height);
  width *= shrink;
  height *= shrink;

  const x: number = handle.includes('w')
    ? right - width
    : handle.includes('e')
      ? rect.x
      : centreX - width / 2;
  const y: number = handle.includes('n')
    ? bottom - height
    : handle.includes('s')
      ? rect.y
      : centreY - height / 2;
  return { x, y, width, height };
}

/**
 * The smallest box holding everything that isn't empty: transparent pixels
 * when the image's border is mostly transparent, otherwise pixels close to
 * the border's colour (`tolerance` 0–100, as in background removal). null
 * when the whole image is empty.
 */
export function findContentBounds(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  tolerance: number
): CropRect | null {
  const transparentBorder: boolean =
    borderTransparentShare(pixels, width, height) > 0.5;
  const [red, green, blue] = detectBackgroundColour(pixels, width, height);
  const threshold: number = (clamp(tolerance, 0, 100) / 100) * MAX_DISTANCE;
  const isContent = (offset: number): boolean => {
    if ((pixels[offset + 3] ?? 0) < TRANSPARENT_ALPHA) return false;
    if (transparentBorder) return true;
    const dr: number = (pixels[offset] ?? 0) - red;
    const dg: number = (pixels[offset + 1] ?? 0) - green;
    const db: number = (pixels[offset + 2] ?? 0) - blue;
    return Math.sqrt(dr * dr + dg * dg + db * db) > threshold;
  };

  let left: number = width;
  let top: number = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!isContent((y * width + x) * 4)) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  if (right < 0) return null;
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

/** Grows the box by `padding` pixels on every side, staying inside the image. */
export function padCrop(
  rect: CropRect,
  padding: number,
  size: ImageSize
): CropRect {
  const left: number = Math.max(0, rect.x - padding);
  const top: number = Math.max(0, rect.y - padding);
  const right: number = Math.min(size.width, rect.x + rect.width + padding);
  const bottom: number = Math.min(size.height, rect.y + rect.height + padding);
  return clampCrop(
    { x: left, y: top, width: right - left, height: bottom - top },
    size
  );
}

function borderTransparentShare(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): number {
  let transparent = 0;
  let total = 0;
  const sample = (x: number, y: number): void => {
    total += 1;
    if ((pixels[(y * width + x) * 4 + 3] ?? 0) < TRANSPARENT_ALPHA)
      transparent += 1;
  };
  for (let x = 0; x < width; x += 1) {
    sample(x, 0);
    if (height > 1) sample(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    sample(0, y);
    if (width > 1) sample(width - 1, y);
  }
  return total === 0 ? 0 : transparent / total;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
