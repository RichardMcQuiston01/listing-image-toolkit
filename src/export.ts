/**
 * Export sizing for the image templates: Etsy's upload guidance, the
 * "optimised for Etsy" downscale, the JPG quality search and the size
 * readout. Pure (the encoder is passed in), so it's unit tested.
 */

import type { CanvasSize, Rect } from './render';

/** Etsy: files over 1 MB "may not finish uploading", on a slow connection. */
export const ETSY_UPLOAD_GUIDANCE_BYTES = 1_000_000;

/** Etsy recommends at least 2000 px on the shortest side. */
export const ETSY_RECOMMENDED_SHORT_SIDE = 2000;

/** The normal JPG export quality. */
export const DEFAULT_JPEG_QUALITY = 0.92;

/** Tried in order for the optimised export; the first under the budget wins. */
export const OPTIMISED_JPEG_QUALITIES: readonly number[] = [
  0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6,
];

/**
 * Scales `size` so its shorter side is `shortSide`, keeping the ratio. Never
 * enlarges: a canvas already that small is returned as is.
 */
export function scaleToShortSide(
  size: CanvasSize,
  shortSide: number
): CanvasSize {
  const currentShortSide: number = Math.min(size.width, size.height);
  if (currentShortSide <= shortSide) return size;
  const factor: number = shortSide / currentShortSide;
  return {
    width: Math.max(1, Math.round(size.width * factor)),
    height: Math.max(1, Math.round(size.height * factor)),
  };
}

export interface QualityChoice<T> {
  readonly encoded: T;
  readonly quality: number;
  /** false when even the lowest quality is over the budget (the smallest result is returned). */
  readonly withinBudget: boolean;
}

/**
 * Encodes at each quality in turn (highest first) and returns the first
 * result within `budgetBytes`, or the smallest one if none is.
 */
export async function pickQualityWithinBudget<
  T extends { readonly size: number },
>(
  encode: (quality: number) => Promise<T>,
  qualities: readonly number[],
  budgetBytes: number
): Promise<QualityChoice<T>> {
  let smallest: QualityChoice<T> | null = null;
  for (const quality of qualities) {
    const encoded: T = await encode(quality);
    if (encoded.size <= budgetBytes)
      return { encoded, quality, withinBudget: true };
    if (smallest === null || encoded.size < smallest.encoded.size) {
      smallest = { encoded, quality, withinBudget: false };
    }
  }
  if (smallest === null)
    throw new Error('pickQualityWithinBudget needs at least one quality');
  return smallest;
}

/** "850 KB", "2.4 MB": decimal units, matching Etsy's "1 MB". */
export function formatFileSize(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${Math.round(bytes / 1000)} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

/** Etsy's suggested search-grid thumbnail is 570×456, i.e. 5:4. */
export const ETSY_THUMBNAIL_ASPECT: number = 570 / 456;

/**
 * The largest rectangle of `aspect` (width / height) centred on the canvas:
 * what a centre crop to that shape would keep.
 */
export function centredCropRect(size: CanvasSize, aspect: number): Rect {
  let width: number = size.width;
  let height: number = width / aspect;
  if (height > size.height) {
    height = size.height;
    width = height * aspect;
  }
  return {
    x: (size.width - width) / 2,
    y: (size.height - height) / 2,
    width,
    height,
  };
}
