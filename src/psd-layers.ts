/**
 * Picks the importable layers out of a parsed PSD (ag-psd's layer tree, read
 * with `useImageData: true`), e.g. to import watermarks and product renders
 * from a design file. Pure, over a minimal layer shape, so it's unit tested
 * without a canvas. ag-psd itself is an optional peer dependency: this module
 * only reads the tree it produces.
 */

/** What an imported layer is used as: a watermark/logo, or a product (machine) render. */
export type BrandAssetKind = 'watermark' | 'machine_image';

/** Name patterns that suggest a layer's kind; see suggestAssetKind(). */
export interface AssetKindHints {
  /** A layer whose own name matches this is a watermark. */
  readonly watermark: RegExp;
  /** Otherwise, a layer whose name or group names match this is a machine render. */
  readonly machine: RegExp;
}

/** The parts of an ag-psd layer this module reads. */
export interface PsdLayerLike {
  readonly name?: string;
  readonly hidden?: boolean;
  readonly left?: number;
  readonly top?: number;
  readonly imageData?: {
    readonly width: number;
    readonly height: number;
    readonly data: ArrayLike<number>;
  };
  readonly mask?: unknown;
  readonly children?: readonly PsdLayerLike[];
}

export interface ImportableLayer {
  /** Index path in the layer tree, e.g. "2/0": stable within one file. */
  readonly id: string;
  readonly name: string;
  /** Enclosing group names, outermost first. */
  readonly groupPath: readonly string[];
  /** Hidden itself or inside a hidden group. */
  readonly hidden: boolean;
  /** Has a layer mask, which isn't applied on import. */
  readonly hasMask: boolean;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  /** RGBA, 8 bits per channel, the layer's own bounds. */
  readonly pixels: Uint8ClampedArray;
  readonly suggestedKind: BrandAssetKind;
}

/** A sensible upper bound for asset names (defaultAssetName() trims to it). */
export const MAX_ASSET_NAME_LENGTH = 80;

/** Pixels this transparent or more count as empty. */
const TRANSPARENT_ALPHA = 16;

/**
 * The default hints. The machine pattern includes some laser-machine model
 * names (xTool F1/F2/P2S); pass your own AssetKindHints for other products.
 */
export const DEFAULT_ASSET_KIND_HINTS: AssetKindHints = {
  watermark: /watermark|logo|stamp|badge|signature|brand/i,
  machine: /render|machine|xtool|\bf1\b|\bf2\b|p2s|ultra|laser/i,
};

/** Watermark unless the layer or its groups look like a machine render. */
export function suggestAssetKind(
  name: string,
  groupPath: readonly string[],
  hints: AssetKindHints = DEFAULT_ASSET_KIND_HINTS
): BrandAssetKind {
  const text: string = [...groupPath, name].join(' ');
  if (hints.watermark.test(name)) return 'watermark';
  if (hints.machine.test(text)) return 'machine_image';
  return 'watermark';
}

/**
 * Lists the layers worth importing, top of the Layers panel first (as in
 * Photoshop; ag-psd lists bottom first). Groups are walked, not imported;
 * layers with no pixels, or only transparent ones, are skipped.
 */
export function collectImportableLayers(
  children: readonly PsdLayerLike[] | undefined,
  hints: AssetKindHints = DEFAULT_ASSET_KIND_HINTS
): ImportableLayer[] {
  const found: ImportableLayer[] = [];
  const walk = (
    layers: readonly PsdLayerLike[],
    groupPath: readonly string[],
    parentHidden: boolean,
    idPrefix: string
  ): void => {
    for (let index = layers.length - 1; index >= 0; index -= 1) {
      const layer: PsdLayerLike | undefined = layers[index];
      if (layer === undefined) continue;
      const id: string =
        idPrefix === '' ? String(index) : `${idPrefix}/${index}`;
      const name: string = (layer.name ?? '').trim();
      const hidden: boolean = parentHidden || layer.hidden === true;
      if (layer.children !== undefined) {
        walk(layer.children, [...groupPath, name || 'Group'], hidden, id);
        continue;
      }
      const image = layer.imageData;
      if (image === undefined || image.width <= 0 || image.height <= 0)
        continue;
      const pixels: Uint8ClampedArray = toRgba8(image.data);
      if (!hasVisiblePixels(pixels)) continue;
      found.push({
        id,
        name: name || `Layer ${found.length + 1}`,
        groupPath,
        hidden,
        hasMask: layer.mask !== undefined,
        left: layer.left ?? 0,
        top: layer.top ?? 0,
        width: image.width,
        height: image.height,
        pixels,
        suggestedKind: suggestAssetKind(name, groupPath, hints),
      });
    }
  };
  walk(children ?? [], [], false, '');
  return found;
}

/** "F2 render", or "Machines / F2 render" when it sits in a group, within the name limit. */
export function defaultAssetName(
  layer: Pick<ImportableLayer, 'name' | 'groupPath'>
): string {
  const parent: string | undefined =
    layer.groupPath[layer.groupPath.length - 1];
  const name: string =
    parent === undefined ? layer.name : `${parent} / ${layer.name}`;
  return name.slice(0, MAX_ASSET_NAME_LENGTH).trim();
}

function hasVisiblePixels(pixels: Uint8ClampedArray): boolean {
  for (let offset = 3; offset < pixels.length; offset += 4) {
    if ((pixels[offset] ?? 0) >= TRANSPARENT_ALPHA) return true;
  }
  return false;
}

/** ag-psd gives 8-bit data as Uint8(Clamped)Array; anything else is converted. */
function toRgba8(data: ArrayLike<number>): Uint8ClampedArray {
  if (data instanceof Uint8ClampedArray) return data;
  if (data instanceof Uint8Array) {
    return new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);
  }
  // 16-bit (0–65535) or 32-bit float (0–1) channels.
  const scale: number = data instanceof Uint16Array ? 255 / 65535 : 255;
  const converted = new Uint8ClampedArray(data.length);
  for (let index = 0; index < data.length; index += 1) {
    converted[index] = Math.round((data[index] ?? 0) * scale);
  }
  return converted;
}

/**
 * Worth ticking by default: visible, and not a layer covering the whole
 * canvas (a background or photo, rarely a watermark or render).
 */
export function isLikelyAsset(
  layer: Pick<ImportableLayer, 'hidden' | 'left' | 'top' | 'width' | 'height'>,
  canvas: { readonly width: number; readonly height: number }
): boolean {
  const coversCanvas: boolean =
    layer.left <= 0 &&
    layer.top <= 0 &&
    layer.left + layer.width >= canvas.width &&
    layer.top + layer.height >= canvas.height;
  return !layer.hidden && !coversCanvas;
}
