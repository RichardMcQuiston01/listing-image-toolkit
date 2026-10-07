/**
 * Canvas renderers for the two image templates: a 4:3 listing hero (the
 * "Etsy hero" preset) and an Instagram post.
 *
 * Everything is drawn in the template's native pixel space (4000×3000 for the
 * hero; 1080×1080 or 1080×1350 for Instagram) so the geometry below can be
 * checked directly against the source designs. Rendering happens entirely in
 * the browser: the product photo never leaves the user's machine, and nothing
 * is uploaded anywhere.
 *
 * Colours and fonts default to the original designs and can be overridden
 * per render with the optional `style` on each input.
 */

export type ImageSource = ImageBitmap;

export interface CanvasSize {
  readonly width: number;
  readonly height: number;
}

export const ETSY_HERO_SIZE: CanvasSize = { width: 4000, height: 3000 };
export type InstagramFormat = 'square' | 'portrait';

/** Square 1:1, and the 4:5 portrait Instagram shows uncropped in the feed. */
export const INSTAGRAM_POST_SIZES: Readonly<
  Record<InstagramFormat, CanvasSize>
> = {
  square: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1350 },
};

export type WatermarkCorner = 'bottom-left' | 'bottom-right';
export type PhotoFit = 'cover' | 'contain';

/**
 * Where the product photo sits in its frame. zoom 1 fills the frame (the
 * photo's shorter side meets the frame, cropping the rest); fitZoom() is the
 * zoom that shows the whole photo. panX/panY move the photo's centre away
 * from the frame's centre, as fractions of the frame's width/height, so a
 * placement means the same thing at any canvas size.
 */
export interface PhotoPlacement {
  readonly zoom: number;
  readonly panX: number;
  readonly panY: number;
}

export const DEFAULT_PHOTO_PLACEMENT: PhotoPlacement = {
  zoom: 1,
  panX: 0,
  panY: 0,
};

/**
 * What fills the parts of the photo frame the photo doesn't cover (zoomed
 * out, e.g. "fit whole photo", or moved): plain white, or a blurred copy of
 * the photo itself scaled to fill the frame.
 */
export type PhotoBackdrop = 'white' | 'blur';

export const DEFAULT_PHOTO_BACKDROP: PhotoBackdrop = 'white';

/** Blur radius of the 'blur' backdrop, as a fraction of the frame's longer side. */
export const PHOTO_BACKDROP_BLUR_FRACTION = 0.03;

/** A light white veil over the blurred backdrop, so the photo stays in front. */
export const PHOTO_BACKDROP_VEIL_OPACITY = 0.15;

/**
 * The machine render's size and position on the Etsy hero, saved per machine.
 * scale 1 is the PSD's size (fitted into its top-left box); it grows and
 * shrinks from its top-left corner, so it stays tucked into the corner.
 * offsetX/offsetY nudge it, as fractions of the canvas width/height.
 */
export interface MachineRenderPlacement {
  readonly scale: number;
  readonly offsetX: number;
  readonly offsetY: number;
}

export const DEFAULT_MACHINE_PLACEMENT: MachineRenderPlacement = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};
export const MIN_MACHINE_SCALE = 0.25;
export const MAX_MACHINE_SCALE = 2.5;
export const MAX_PHOTO_ZOOM = 4;

export interface EtsyHeroInput {
  readonly photo: ImageSource | null;
  readonly photoPlacement: PhotoPlacement;
  /** Fill for the frame outside the photo; DEFAULT_PHOTO_BACKDROP ('white') if omitted. */
  readonly photoBackdrop?: PhotoBackdrop;
  readonly headline: string;
  /** Machine render drawn top-left, overlapping the title bar. */
  readonly machineImage: ImageSource | null;
  /** Size and nudge for the machine render; see machineRenderRect(). */
  readonly machinePlacement: MachineRenderPlacement;
  /** e.g. "xTool F1/F2", drawn in the corner opposite the watermarks. */
  readonly machineLabel: string;
  readonly watermarks: readonly ImageSource[];
  readonly watermarkCorner: WatermarkCorner;
  /** Resolved CSS font family for the title — see resolveEtsyTitleFont(). */
  readonly titleFont: TitleFont;
  /** Overrides for the default colours and label font. */
  readonly style?: Partial<EtsyHeroStyle>;
}

/** Colours and fonts of the hero template. */
export interface EtsyHeroStyle {
  /** The title bar across the top. */
  readonly barColor: string;
  /** The title text on the bar. */
  readonly titleColor: string;
  /** The machine/product label in the bottom corner. */
  readonly labelColor: string;
  /** CSS font family for the label. */
  readonly labelFontFamily: string;
}

/** Colours and fonts of the Instagram template. */
export interface InstagramPostStyle {
  readonly background: string;
  /** Shop name and badge text. */
  readonly ink: string;
  readonly badgeFill: string;
  /** The bottom band is a gradient from bandStart (bottom-left) to bandEnd. */
  readonly bandStart: string;
  readonly bandEnd: string;
  readonly headlineColor: string;
  readonly subtitleColor: string;
  readonly priceFill: string;
  readonly priceInk: string;
  /** CSS font family for the shop name, badge, headline and price. */
  readonly headingFontFamily: string;
  /** CSS font family for the subtitle. */
  readonly bodyFontFamily: string;
}

export interface InstagramPostInput {
  readonly photo: ImageSource | null;
  readonly photoPlacement: PhotoPlacement;
  /** Fill for the frame outside the photo; DEFAULT_PHOTO_BACKDROP ('white') if omitted. */
  readonly photoBackdrop?: PhotoBackdrop;
  readonly headline: string;
  readonly subtitle: string;
  /** Pre-formatted, e.g. "$20". Empty hides the price chip. */
  readonly priceText: string;
  readonly shopName: string;
  /** e.g. "MADE TO ORDER". Empty hides the chip. */
  readonly badgeText: string;
  readonly logo: ImageSource | null;
  /** Overrides for the default colours and fonts. */
  readonly style?: Partial<InstagramPostStyle>;
}

export interface TitleFont {
  readonly family: string;
  readonly weight: number;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

// --- Brand palette (sampled from the source designs) -----------------------

const ETSY_BAR_COLOR = '#567D62';
const ETSY_LABEL_COLOR = '#7C9377';
const INSTAGRAM_BACKGROUND = '#FAF7EF';
const INSTAGRAM_INK = '#1F2124';
const INSTAGRAM_BADGE_FILL = '#FBEBBD';
const INSTAGRAM_BAND_START = '#2E3829';
const INSTAGRAM_BAND_END = '#414F3C';
const INSTAGRAM_PRICE_FILL = '#D9AE7B';
const INSTAGRAM_SUBTITLE = 'rgba(232, 234, 224, 0.85)';
const PHOTO_PLACEHOLDER = '#E5E3DC';

export const HEADING_FONT_FAMILY = 'Outfit, system-ui, sans-serif';
export const BODY_FONT_FAMILY = 'Inter, system-ui, sans-serif';
export const LABEL_FONT_FAMILY = '"Zilla Slab", Rockwell, Georgia, serif';

/**
 * The PSD's title is Copperplate Gothic Bold — a commercial font that cannot
 * be bundled, but ships with Windows/Office ("Copperplate Gothic Bold", a
 * regular-weight family) and macOS ("Copperplate", with a bold weight).
 * Cinzel (Google Fonts) is the free fallback.
 */
export const ETSY_TITLE_FONT_CANDIDATES: readonly TitleFont[] = [
  { family: '"Copperplate Gothic Bold"', weight: 400 },
  { family: 'Copperplate', weight: 700 },
  { family: 'Cinzel', weight: 700 },
];

/** Fonts the renderer needs, for document.fonts.load() before drawing. */
export const WEB_FONTS_TO_LOAD: readonly string[] = [
  `700 40px ${HEADING_FONT_FAMILY}`,
  `600 40px ${HEADING_FONT_FAMILY}`,
  `400 40px ${BODY_FONT_FAMILY}`,
  `700 40px ${LABEL_FONT_FAMILY}`,
  '700 40px Cinzel',
];

export const DEFAULT_ETSY_HERO_STYLE: EtsyHeroStyle = {
  barColor: ETSY_BAR_COLOR,
  titleColor: '#FFFFFF',
  labelColor: ETSY_LABEL_COLOR,
  labelFontFamily: LABEL_FONT_FAMILY,
};

export const DEFAULT_INSTAGRAM_POST_STYLE: InstagramPostStyle = {
  background: INSTAGRAM_BACKGROUND,
  ink: INSTAGRAM_INK,
  badgeFill: INSTAGRAM_BADGE_FILL,
  bandStart: INSTAGRAM_BAND_START,
  bandEnd: INSTAGRAM_BAND_END,
  headlineColor: '#FFFFFF',
  subtitleColor: INSTAGRAM_SUBTITLE,
  priceFill: INSTAGRAM_PRICE_FILL,
  priceInk: '#1E1E1E',
  headingFontFamily: HEADING_FONT_FAMILY,
  bodyFontFamily: BODY_FONT_FAMILY,
};

// --- Pure geometry helpers -------------------------------------------------

/** Scale a source of size `source` to fill (cover) or fit inside (contain) `box`, centred. */
export function fitRect(source: CanvasSize, box: Rect, fit: PhotoFit): Rect {
  if (source.width <= 0 || source.height <= 0) {
    return box;
  }
  const scaleX: number = box.width / source.width;
  const scaleY: number = box.height / source.height;
  const scale: number =
    fit === 'cover' ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
  const width: number = source.width * scale;
  const height: number = source.height * scale;
  return {
    x: box.x + (box.width - width) / 2,
    y: box.y + (box.height - height) / 2,
    width,
    height,
  };
}

/** The zoom at which the whole photo fits in `box` (1 or less). */
export function fitZoom(source: CanvasSize, box: Rect): number {
  if (source.width <= 0 || source.height <= 0) return 1;
  const containScale: number = Math.min(
    box.width / source.width,
    box.height / source.height
  );
  const coverScale: number = Math.max(
    box.width / source.width,
    box.height / source.height
  );
  return containScale / coverScale;
}

/** Where to draw a photo of size `source` in `box` for a placement. */
export function placePhoto(
  source: CanvasSize,
  box: Rect,
  placement: PhotoPlacement
): Rect {
  if (source.width <= 0 || source.height <= 0) return box;
  const coverScale: number = Math.max(
    box.width / source.width,
    box.height / source.height
  );
  const scale: number = coverScale * placement.zoom;
  const width: number = source.width * scale;
  const height: number = source.height * scale;
  return {
    x: box.x + (box.width - width) / 2 + placement.panX * box.width,
    y: box.y + (box.height - height) / 2 + placement.panY * box.height,
    width,
    height,
  };
}

/** The 'blur' backdrop's blur radius in pixels for a frame. */
export function photoBackdropBlurRadius(box: Rect): number {
  return Math.max(
    1,
    Math.round(Math.max(box.width, box.height) * PHOTO_BACKDROP_BLUR_FRACTION)
  );
}

/**
 * Where to draw the blurred backdrop copy of a photo: covering `box`, centred,
 * and grown by twice the blur radius on every side, so the blur's faded edges
 * fall outside the frame instead of showing as a pale rim.
 */
export function photoBackdropRect(
  source: CanvasSize,
  box: Rect,
  blurRadius: number
): Rect {
  const margin: number = Math.max(0, blurRadius) * 2;
  return fitRect(
    source,
    {
      x: box.x - margin,
      y: box.y - margin,
      width: box.width + margin * 2,
      height: box.height + margin * 2,
    },
    'cover'
  );
}

/**
 * Keeps a placement usable: zoom between "fit whole photo" and
 * MAX_PHOTO_ZOOM, and the photo's centre within reach. Zoomed out, the centre
 * may go as far as the frame's edge; zoomed in, far enough to bring any part
 * of the photo to the centre of the frame.
 */
export function clampPlacement(
  placement: PhotoPlacement,
  source: CanvasSize,
  box: Rect
): PhotoPlacement {
  const zoom: number = Math.min(
    MAX_PHOTO_ZOOM,
    Math.max(fitZoom(source, box), placement.zoom)
  );
  const drawn: Rect = placePhoto(source, box, { zoom, panX: 0, panY: 0 });
  const limitX: number = Math.max(0.5, drawn.width / box.width / 2);
  const limitY: number = Math.max(0.5, drawn.height / box.height / 2);
  const clamp = (value: number, limit: number): number =>
    Math.min(limit, Math.max(-limit, value));
  return {
    zoom,
    panX: clamp(placement.panX, limitX),
    panY: clamp(placement.panY, limitY),
  };
}

/** Moves the photo by a distance in canvas pixels. */
export function panPhoto(
  placement: PhotoPlacement,
  deltaX: number,
  deltaY: number,
  source: CanvasSize,
  box: Rect
): PhotoPlacement {
  return clampPlacement(
    {
      zoom: placement.zoom,
      panX: placement.panX + deltaX / box.width,
      panY: placement.panY + deltaY / box.height,
    },
    source,
    box
  );
}

/**
 * Zooms by `factor`, keeping the photo point under `anchor` (canvas pixels)
 * where it is, so zooming under the mouse feels natural. Without an anchor it
 * zooms about the frame's centre.
 */
export function zoomPhoto(
  placement: PhotoPlacement,
  factor: number,
  source: CanvasSize,
  box: Rect,
  anchor?: { x: number; y: number }
): PhotoPlacement {
  const zoom: number = Math.min(
    MAX_PHOTO_ZOOM,
    Math.max(fitZoom(source, box), placement.zoom * factor)
  );
  const ratio: number = zoom / placement.zoom;
  const centreX: number = box.x + box.width / 2;
  const centreY: number = box.y + box.height / 2;
  const point = anchor ?? { x: centreX, y: centreY };
  const photoCentreX: number = centreX + placement.panX * box.width;
  const photoCentreY: number = centreY + placement.panY * box.height;
  const nextCentreX: number = point.x - (point.x - photoCentreX) * ratio;
  const nextCentreY: number = point.y - (point.y - photoCentreY) * ratio;
  return clampPlacement(
    {
      zoom,
      panX: (nextCentreX - centreX) / box.width,
      panY: (nextCentreY - centreY) / box.height,
    },
    source,
    box
  );
}

/** The product photo's frame on each template's canvas. */
export function photoFrame(
  template: 'etsy' | 'instagram',
  size: CanvasSize
): Rect {
  return template === 'etsy'
    ? { x: 0, y: 0, width: size.width, height: size.height }
    : instagramPhotoBox(size);
}

/**
 * Lay out several watermarks in a row along the bottom edge. Each is
 * contain-fitted into a `maxSize` square; if the row is wider than
 * `maxRowWidth` everything shrinks uniformly.
 */
export function layoutWatermarks(
  sizes: readonly CanvasSize[],
  canvas: CanvasSize,
  corner: WatermarkCorner,
  maxSize: number,
  margin: number,
  gap: number,
  maxRowWidth: number
): Rect[] {
  const fitted: CanvasSize[] = sizes.map((size) => {
    const rect: Rect = fitRect(
      size,
      { x: 0, y: 0, width: maxSize, height: maxSize },
      'contain'
    );
    return { width: rect.width, height: rect.height };
  });
  const rowWidth: number =
    fitted.reduce((sum, size) => sum + size.width, 0) +
    gap * Math.max(0, fitted.length - 1);
  const shrink: number = rowWidth > maxRowWidth ? maxRowWidth / rowWidth : 1;

  const rects: Rect[] = [];
  let cursor: number =
    corner === 'bottom-left' ? margin : canvas.width - margin;
  for (const size of fitted) {
    const width: number = size.width * shrink;
    const height: number = size.height * shrink;
    const x: number = corner === 'bottom-left' ? cursor : cursor - width;
    rects.push({ x, y: canvas.height - margin - height, width, height });
    cursor =
      corner === 'bottom-left'
        ? cursor + width + gap * shrink
        : cursor - width - gap * shrink;
  }
  return rects;
}

// --- Canvas helpers --------------------------------------------------------

type Context = CanvasRenderingContext2D;

function sizeOf(source: ImageSource): CanvasSize {
  return { width: source.width, height: source.height };
}

function font(weight: number, sizePx: number, family: string): string {
  return `${weight} ${sizePx}px ${family}`;
}

/** Largest size in [minSize, maxSize] at which `text` fits `maxWidth`. */
function fitFontSize(
  ctx: Context,
  text: string,
  weight: number,
  family: string,
  maxWidth: number,
  maxSize: number,
  minSize: number
): number {
  for (
    let size = maxSize;
    size > minSize;
    size -= Math.max(1, Math.round(maxSize / 60))
  ) {
    ctx.font = font(weight, size, family);
    if (ctx.measureText(text).width <= maxWidth) {
      return size;
    }
  }
  return minSize;
}

/** Trims `text` with an ellipsis until it fits at the current ctx.font. */
function truncateToWidth(ctx: Context, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }
  let trimmed: string = text;
  while (
    trimmed.length > 1 &&
    ctx.measureText(`${trimmed}…`).width > maxWidth
  ) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed.trimEnd()}…`;
}

function roundedRectPath(ctx: Context, rect: Rect, radius: number): void {
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.width, rect.height, radius);
}

function setLetterSpacing(ctx: Context, spacing: string): void {
  // Canvas letterSpacing is recent (Chrome 99, Safari 17, Firefox 115);
  // without it the badge just renders a little tighter.
  if ('letterSpacing' in ctx) {
    ctx.letterSpacing = spacing;
  }
}

function drawPhoto(
  ctx: Context,
  photo: ImageSource | null,
  box: Rect,
  placement: PhotoPlacement,
  backdrop: PhotoBackdrop
): void {
  if (photo === null) {
    ctx.fillStyle = PHOTO_PLACEHOLDER;
    ctx.fillRect(box.x, box.y, box.width, box.height);
    return;
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.width, box.height);
  ctx.clip();
  // Anywhere the photo doesn't reach (zoomed out or moved) reads as part of
  // a white product shot, or of a blurred copy of the photo behind it.
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(box.x, box.y, box.width, box.height);
  if (backdrop === 'blur') {
    drawBlurredBackdrop(ctx, photo, box);
  }
  const target: Rect = placePhoto(
    sizeOf(photo),
    box,
    clampPlacement(placement, sizeOf(photo), box)
  );
  ctx.drawImage(photo, target.x, target.y, target.width, target.height);
  ctx.restore();
}

/**
 * A blurred copy of the photo covering `box`. Uses the canvas `filter` where
 * supported (Chrome, Firefox, Safari 18+); elsewhere it draws the photo tiny
 * on a scratch canvas and scales it back up, which smoothing turns into a
 * comparable blur. With neither, the white fill underneath is left as is.
 */
function drawBlurredBackdrop(
  ctx: Context,
  photo: ImageSource,
  box: Rect
): void {
  const radius: number = photoBackdropBlurRadius(box);
  const rect: Rect = photoBackdropRect(sizeOf(photo), box, radius);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (typeof ctx.filter === 'string') {
    ctx.filter = `blur(${radius}px)`;
    ctx.drawImage(photo, rect.x, rect.y, rect.width, rect.height);
    ctx.filter = 'none';
  } else {
    const small: CanvasImageSource | null = downscaledCopy(
      photo,
      Math.max(1, Math.round(rect.width / radius)),
      Math.max(1, Math.round(rect.height / radius))
    );
    if (small === null) {
      ctx.restore();
      return;
    }
    ctx.drawImage(small, rect.x, rect.y, rect.width, rect.height);
  }
  ctx.fillStyle = `rgba(255, 255, 255, ${PHOTO_BACKDROP_VEIL_OPACITY})`;
  ctx.fillRect(box.x, box.y, box.width, box.height);
  ctx.restore();
}

/** The photo drawn at width×height on a scratch canvas; null without one. */
function downscaledCopy(
  photo: ImageSource,
  width: number,
  height: number
): CanvasImageSource | null {
  let canvas: OffscreenCanvas | HTMLCanvasElement;
  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(width, height);
  } else if (typeof document !== 'undefined') {
    canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
  } else {
    return null;
  }
  const smallCtx = canvas.getContext('2d') as
    OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null;
  if (smallCtx === null) return null;
  smallCtx.imageSmoothingEnabled = true;
  smallCtx.imageSmoothingQuality = 'high';
  smallCtx.drawImage(photo, 0, 0, width, height);
  return canvas;
}

/**
 * Picks the first installed title font. Local fonts can't be queried
 * directly, so compare text widths against a generic fallback: if the
 * candidate is missing, the browser falls back and the widths match.
 * Georgia when none of `candidates` is installed.
 */
export function resolveEtsyTitleFont(
  ctx: Context,
  candidates: readonly TitleFont[] = ETSY_TITLE_FONT_CANDIDATES
): TitleFont {
  const sample = 'Laser Cut Jig Pack #1 WMwm';
  for (const candidate of candidates) {
    const isInstalled: boolean = ['monospace', 'serif'].some((generic) => {
      ctx.font = `${candidate.weight} 72px ${generic}`;
      const fallbackWidth: number = ctx.measureText(sample).width;
      ctx.font = `${candidate.weight} 72px ${candidate.family}, ${generic}`;
      return ctx.measureText(sample).width !== fallbackWidth;
    });
    if (isInstalled) {
      return candidate;
    }
  }
  return { family: 'Georgia, serif', weight: 700 };
}

// --- Etsy hero (4000×3000, from EtsyListingOverlay_F2.psd) -----------------

const ETSY_BAR_HEIGHT = 300;
const ETSY_MACHINE_BOX: Rect = { x: 20, y: 20, width: 623, height: 993 };

/**
 * How far the machine render may hang off the canvas, as a fraction of its
 * own width or height. Lets a render with built-in margins (or a deliberately
 * cut-off machine) sit tight in the corner, while most of it stays visible.
 */
export const MACHINE_MAX_OVERHANG = 0.25;

/**
 * Keeps a render placement usable: scale within MIN…MAX, and at least
 * 1 − MACHINE_MAX_OVERHANG of the render on the canvas on each axis.
 */
export function clampMachinePlacement(
  placement: MachineRenderPlacement,
  imageSize: CanvasSize
): MachineRenderPlacement {
  const scale: number = Math.min(
    MAX_MACHINE_SCALE,
    Math.max(MIN_MACHINE_SCALE, placement.scale)
  );
  const base: Rect = fitRect(imageSize, ETSY_MACHINE_BOX, 'contain');
  const width: number = base.width * scale;
  const height: number = base.height * scale;
  const { width: canvasWidth, height: canvasHeight } = ETSY_HERO_SIZE;
  const clampAxis = (
    offset: number,
    start: number,
    size: number,
    extent: number
  ): number => {
    const position: number = start + offset * extent;
    const overhang: number = size * MACHINE_MAX_OVERHANG;
    const lowest: number = -overhang;
    const highest: number = Math.max(lowest, extent - size + overhang);
    const clamped: number = Math.min(highest, Math.max(lowest, position));
    return (clamped - start) / extent;
  };
  return {
    scale,
    offsetX: clampAxis(
      placement.offsetX,
      ETSY_MACHINE_BOX.x,
      width,
      canvasWidth
    ),
    offsetY: clampAxis(
      placement.offsetY,
      ETSY_MACHINE_BOX.y,
      height,
      canvasHeight
    ),
  };
}

/** Where the machine render is drawn on the hero, in canvas pixels. */
export function machineRenderRect(
  imageSize: CanvasSize,
  placement: MachineRenderPlacement
): Rect {
  const clamped: MachineRenderPlacement = clampMachinePlacement(
    placement,
    imageSize
  );
  const base: Rect = fitRect(imageSize, ETSY_MACHINE_BOX, 'contain');
  return {
    x: ETSY_MACHINE_BOX.x + clamped.offsetX * ETSY_HERO_SIZE.width,
    y: ETSY_MACHINE_BOX.y + clamped.offsetY * ETSY_HERO_SIZE.height,
    width: base.width * clamped.scale,
    height: base.height * clamped.scale,
  };
}

/** Moves the render by a distance in canvas pixels. */
export function nudgeMachinePlacement(
  placement: MachineRenderPlacement,
  deltaX: number,
  deltaY: number,
  imageSize: CanvasSize
): MachineRenderPlacement {
  return clampMachinePlacement(
    {
      scale: placement.scale,
      offsetX: placement.offsetX + deltaX / ETSY_HERO_SIZE.width,
      offsetY: placement.offsetY + deltaY / ETSY_HERO_SIZE.height,
    },
    imageSize
  );
}
const ETSY_TITLE_RIGHT = 3880;
const ETSY_TITLE_LEFT_WITH_MACHINE = 779;
const ETSY_TITLE_LEFT_WITHOUT_MACHINE = 120;
const ETSY_EDGE_MARGIN = 20;
const ETSY_WATERMARK_MAX_SIZE = 760;
const ETSY_LABEL_SIZE = 220;

export function renderEtsyHero(ctx: Context, input: EtsyHeroInput): void {
  const { width, height } = ETSY_HERO_SIZE;
  const style: EtsyHeroStyle = { ...DEFAULT_ETSY_HERO_STYLE, ...input.style };
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  drawPhoto(
    ctx,
    input.photo,
    { x: 0, y: 0, width, height },
    input.photoPlacement,
    input.photoBackdrop ?? DEFAULT_PHOTO_BACKDROP
  );

  // Title bar.
  ctx.fillStyle = style.barColor;
  ctx.fillRect(0, 0, width, ETSY_BAR_HEIGHT);

  const titleLeft: number =
    input.machineImage === null
      ? ETSY_TITLE_LEFT_WITHOUT_MACHINE
      : ETSY_TITLE_LEFT_WITH_MACHINE;
  const titleMaxWidth: number = ETSY_TITLE_RIGHT - titleLeft;
  const headline: string = input.headline.trim();
  if (headline.length > 0) {
    const { family, weight } = input.titleFont;
    const size: number = fitFontSize(
      ctx,
      headline,
      weight,
      family,
      titleMaxWidth,
      200,
      90
    );
    ctx.font = font(weight, size, family);
    ctx.fillStyle = style.titleColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      truncateToWidth(ctx, headline, titleMaxWidth),
      titleLeft + titleMaxWidth / 2,
      ETSY_BAR_HEIGHT / 2 + 6
    );
  }

  // Machine render, top-left, deliberately overlapping the bar.
  if (input.machineImage !== null) {
    const target: Rect = machineRenderRect(
      sizeOf(input.machineImage),
      input.machinePlacement
    );
    ctx.drawImage(
      input.machineImage,
      target.x,
      target.y,
      target.width,
      target.height
    );
  }

  // Watermarks in the chosen bottom corner.
  const watermarkRects: Rect[] = layoutWatermarks(
    input.watermarks.map(sizeOf),
    ETSY_HERO_SIZE,
    input.watermarkCorner,
    ETSY_WATERMARK_MAX_SIZE,
    ETSY_EDGE_MARGIN,
    40,
    width * 0.55
  );
  input.watermarks.forEach((watermark, index) => {
    const rect: Rect | undefined = watermarkRects[index];
    if (rect !== undefined) {
      ctx.drawImage(watermark, rect.x, rect.y, rect.width, rect.height);
    }
  });

  // Machine label in the opposite corner.
  const label: string = input.machineLabel.trim();
  if (label.length > 0) {
    const labelOnRight: boolean = input.watermarkCorner === 'bottom-left';
    const size: number = fitFontSize(
      ctx,
      label,
      700,
      style.labelFontFamily,
      width * 0.4,
      ETSY_LABEL_SIZE,
      100
    );
    ctx.font = font(700, size, style.labelFontFamily);
    ctx.textAlign = labelOnRight ? 'right' : 'left';
    ctx.textBaseline = 'alphabetic';
    const x: number = labelOnRight
      ? width - ETSY_EDGE_MARGIN
      : ETSY_EDGE_MARGIN;
    const y: number = height - ETSY_EDGE_MARGIN - size * 0.18;
    // A soft light halo keeps the label legible over dark product photos.
    ctx.lineJoin = 'round';
    ctx.lineWidth = size * 0.08;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.strokeText(label, x, y);
    ctx.fillStyle = style.labelColor;
    ctx.fillText(label, x, y);
  }
}

// --- Instagram post (from the 1080×1080 Claude Design template) ------------
//
// The header and the bottom band are the same in both formats; the 4:5
// portrait gives its extra 270px to the photo. Band contents are positioned
// relative to the band's top edge so they move down with it.

const IG_LOGO_BOX: Rect = { x: 49, y: 48, width: 62, height: 62 };
const IG_HEADER_CENTER_Y = 79;
const IG_SHOP_NAME_X = 126;
const IG_RIGHT_EDGE = 1030;
const IG_PHOTO_X = 130;
const IG_PHOTO_TOP = 169;
const IG_PHOTO_WIDTH = 818;
/** Gap between the photo's bottom edge and the band. */
const IG_PHOTO_BAND_GAP = 40;
const IG_PHOTO_RADIUS = 22;
const IG_BAND_HEIGHT = 232;
const IG_TEXT_LEFT = 56;
const IG_TITLE_BASELINE_OFFSET = 119;
const IG_SUBTITLE_BASELINE_OFFSET = 153;
const IG_PRICE_RIGHT = 1022;
const IG_PRICE_CENTER_OFFSET = 114;
const IG_PRICE_HEIGHT = 75;

/** Photo box for a canvas of the given size: fills the space above the band. */
export function instagramPhotoBox(size: CanvasSize): Rect {
  const bandTop: number = size.height - IG_BAND_HEIGHT;
  return {
    x: IG_PHOTO_X,
    y: IG_PHOTO_TOP,
    width: IG_PHOTO_WIDTH,
    height: bandTop - IG_PHOTO_BAND_GAP - IG_PHOTO_TOP,
  };
}

export function renderInstagramPost(
  ctx: Context,
  input: InstagramPostInput,
  format: InstagramFormat
): void {
  const size: CanvasSize = INSTAGRAM_POST_SIZES[format];
  const style: InstagramPostStyle = {
    ...DEFAULT_INSTAGRAM_POST_STYLE,
    ...input.style,
  };
  const { width, height } = size;
  const bandTop: number = height - IG_BAND_HEIGHT;
  const priceCenterY: number = bandTop + IG_PRICE_CENTER_OFFSET;
  const photoBox: Rect = instagramPhotoBox(size);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = style.background;
  ctx.fillRect(0, 0, width, height);

  // Header: logo + shop name on the left, badge chip on the right.
  let shopNameX: number = IG_LOGO_BOX.x;
  if (input.logo !== null) {
    const fitted: Rect = fitRect(sizeOf(input.logo), IG_LOGO_BOX, 'contain');
    ctx.drawImage(input.logo, fitted.x, fitted.y, fitted.width, fitted.height);
    shopNameX = IG_SHOP_NAME_X;
  }

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  let badgeLeft: number = IG_RIGHT_EDGE;
  const badge: string = input.badgeText.trim().toUpperCase();
  if (badge.length > 0) {
    ctx.font = font(600, 15, style.headingFontFamily);
    setLetterSpacing(ctx, '1.5px');
    const badgeWidth: number = ctx.measureText(badge).width + 40;
    const badgeRect: Rect = {
      x: IG_RIGHT_EDGE - badgeWidth,
      y: IG_HEADER_CENTER_Y - 20,
      width: badgeWidth,
      height: 40,
    };
    roundedRectPath(ctx, badgeRect, 20);
    ctx.fillStyle = style.badgeFill;
    ctx.fill();
    ctx.fillStyle = style.ink;
    ctx.textAlign = 'center';
    ctx.fillText(
      badge,
      badgeRect.x + badgeRect.width / 2,
      IG_HEADER_CENTER_Y + 1
    );
    setLetterSpacing(ctx, '0px');
    badgeLeft = badgeRect.x;
  }

  const shopName: string = input.shopName.trim();
  if (shopName.length > 0) {
    ctx.font = font(700, 22, style.headingFontFamily);
    ctx.textAlign = 'left';
    ctx.fillStyle = style.ink;
    ctx.fillText(
      truncateToWidth(ctx, shopName, badgeLeft - 24 - shopNameX),
      shopNameX,
      IG_HEADER_CENTER_Y
    );
  }

  // Product photo, rounded.
  ctx.save();
  roundedRectPath(ctx, photoBox, IG_PHOTO_RADIUS);
  ctx.clip();
  drawPhoto(
    ctx,
    input.photo,
    photoBox,
    input.photoPlacement,
    input.photoBackdrop ?? DEFAULT_PHOTO_BACKDROP
  );
  ctx.restore();

  // Bottom band.
  const band = ctx.createLinearGradient(0, height, width, bandTop);
  band.addColorStop(0, style.bandStart);
  band.addColorStop(1, style.bandEnd);
  ctx.fillStyle = band;
  ctx.fillRect(0, bandTop, width, IG_BAND_HEIGHT);

  // Price chip, right-aligned in the band.
  let textRight: number = IG_PRICE_RIGHT;
  const price: string = input.priceText.trim();
  if (price.length > 0) {
    ctx.font = font(700, 36, style.headingFontFamily);
    const chipWidth: number = Math.max(116, ctx.measureText(price).width + 48);
    const chip: Rect = {
      x: IG_PRICE_RIGHT - chipWidth,
      y: priceCenterY - IG_PRICE_HEIGHT / 2,
      width: chipWidth,
      height: IG_PRICE_HEIGHT,
    };
    roundedRectPath(ctx, chip, 14);
    ctx.fillStyle = style.priceFill;
    ctx.fill();
    ctx.fillStyle = style.priceInk;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(price, chip.x + chip.width / 2, priceCenterY + 2);
    textRight = chip.x - 32;
  }

  const textMaxWidth: number = textRight - IG_TEXT_LEFT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  const headline: string = input.headline.trim();
  if (headline.length > 0) {
    const size: number = fitFontSize(
      ctx,
      headline,
      700,
      style.headingFontFamily,
      textMaxWidth,
      56,
      34
    );
    ctx.font = font(700, size, style.headingFontFamily);
    ctx.fillStyle = style.headlineColor;
    ctx.fillText(
      truncateToWidth(ctx, headline, textMaxWidth),
      IG_TEXT_LEFT,
      bandTop + IG_TITLE_BASELINE_OFFSET
    );
  }

  const subtitle: string = input.subtitle.trim();
  if (subtitle.length > 0) {
    ctx.font = font(400, 20, style.bodyFontFamily);
    ctx.fillStyle = style.subtitleColor;
    ctx.fillText(
      truncateToWidth(ctx, subtitle, textMaxWidth),
      IG_TEXT_LEFT,
      bandTop + IG_SUBTITLE_BASELINE_OFFSET
    );
  }
}
