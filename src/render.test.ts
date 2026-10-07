import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  clampMachinePlacement,
  clampPlacement,
  DEFAULT_MACHINE_PLACEMENT,
  MACHINE_MAX_OVERHANG,
  machineRenderRect,
  MAX_MACHINE_SCALE,
  MIN_MACHINE_SCALE,
  nudgeMachinePlacement,
  DEFAULT_PHOTO_PLACEMENT,
  ETSY_HERO_SIZE,
  INSTAGRAM_POST_SIZES,
  fitRect,
  fitZoom,
  instagramPhotoBox,
  layoutWatermarks,
  MAX_PHOTO_ZOOM,
  panPhoto,
  PHOTO_BACKDROP_BLUR_FRACTION,
  photoBackdropBlurRadius,
  photoBackdropRect,
  photoFrame,
  placePhoto,
  renderEtsyHero,
  renderInstagramPost,
  zoomPhoto,
  type ImageSource,
} from './render';

const BOX = { x: 100, y: 50, width: 400, height: 300 };

void describe('fitRect', () => {
  void it('cover fills the box, cropping the overflow, centred', () => {
    // 2:1 source into a 4:3 box: height matches, width overflows.
    assert.deepEqual(fitRect({ width: 2000, height: 1000 }, BOX, 'cover'), {
      x: 0,
      y: 50,
      width: 600,
      height: 300,
    });
  });

  void it('contain fits entirely inside the box, letterboxed and centred', () => {
    assert.deepEqual(fitRect({ width: 2000, height: 1000 }, BOX, 'contain'), {
      x: 100,
      y: 100,
      width: 400,
      height: 200,
    });
  });

  void it('upscales a small source', () => {
    assert.deepEqual(fitRect({ width: 40, height: 30 }, BOX, 'contain'), BOX);
  });

  void it('returns the box unchanged for a zero-sized source instead of dividing by zero', () => {
    assert.deepEqual(fitRect({ width: 0, height: 100 }, BOX, 'cover'), BOX);
  });
});

void describe('layoutWatermarks', () => {
  const canvas = ETSY_HERO_SIZE;

  void it('lays a row out from the bottom-left corner', () => {
    const rects = layoutWatermarks(
      [
        { width: 200, height: 100 },
        { width: 100, height: 100 },
      ],
      canvas,
      'bottom-left',
      200,
      40,
      10,
      10_000
    );
    assert.deepEqual(rects, [
      { x: 40, y: 3000 - 40 - 100, width: 200, height: 100 },
      { x: 250, y: 3000 - 40 - 200, width: 200, height: 200 },
    ]);
  });

  void it('lays a row out leftward from the bottom-right corner', () => {
    const rects = layoutWatermarks(
      [
        { width: 100, height: 100 },
        { width: 100, height: 100 },
      ],
      canvas,
      'bottom-right',
      100,
      40,
      10,
      10_000
    );
    assert.deepEqual(
      rects.map((rect) => [rect.x, rect.x + rect.width]),
      [
        [3860, 3960],
        [3750, 3850],
      ]
    );
  });

  void it('shrinks everything uniformly when the row is too wide', () => {
    const rects = layoutWatermarks(
      [
        { width: 100, height: 100 },
        { width: 100, height: 100 },
      ],
      canvas,
      'bottom-left',
      100,
      0,
      0,
      100
    );
    assert.deepEqual(
      rects.map((rect) => rect.width),
      [50, 50]
    );
    const last = rects[rects.length - 1];
    assert.ok(last !== undefined);
    assert.equal(
      last.x + last.width,
      100,
      'the row fits the maximum width exactly'
    );
  });

  void it('returns nothing for no watermarks', () => {
    assert.deepEqual(
      layoutWatermarks([], canvas, 'bottom-left', 100, 0, 0, 100),
      []
    );
  });
});

void describe('instagramPhotoBox', () => {
  void it('matches the square design', () => {
    assert.deepEqual(instagramPhotoBox(INSTAGRAM_POST_SIZES.square), {
      x: 130,
      y: 169,
      width: 818,
      height: 639,
    });
  });

  void it('gives the portrait format’s extra 270px to the photo only', () => {
    const square = instagramPhotoBox(INSTAGRAM_POST_SIZES.square);
    const portrait = instagramPhotoBox(INSTAGRAM_POST_SIZES.portrait);
    assert.equal(
      INSTAGRAM_POST_SIZES.portrait.height - INSTAGRAM_POST_SIZES.square.height,
      270
    );
    assert.deepEqual(portrait, { ...square, height: square.height + 270 });
  });
});

void describe('photo placement', () => {
  // A 2:1 photo in a 4:3 frame: "fill" matches heights, "fit" matches widths.
  const photo = { width: 2000, height: 1000 };
  const frame = { x: 0, y: 0, width: 400, height: 300 };
  const near = (actual: number, expected: number): void =>
    assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≉ ${expected}`);
  const nearRect = (
    actual: Record<string, number>,
    expected: Record<string, number>
  ): void => {
    for (const key of Object.keys(expected))
      near(actual[key] ?? NaN, expected[key] ?? NaN);
  };

  void it('zoom 1 fills the frame, centred (the old "Fill the frame")', () => {
    assert.deepEqual(placePhoto(photo, frame, DEFAULT_PHOTO_PLACEMENT), {
      x: -100,
      y: 0,
      width: 600,
      height: 300,
    });
    assert.deepEqual(
      placePhoto(photo, frame, DEFAULT_PHOTO_PLACEMENT),
      fitRect(photo, frame, 'cover')
    );
  });

  void it('fitZoom shows the whole photo (the old "Fit whole photo")', () => {
    const zoom = fitZoom(photo, frame);
    near(zoom, 2 / 3);
    nearRect(
      { ...placePhoto(photo, frame, { zoom, panX: 0, panY: 0 }) },
      { ...fitRect(photo, frame, 'contain') }
    );
  });

  void it('pans by fractions of the frame', () => {
    const rect = placePhoto(photo, frame, { zoom: 1, panX: 0.1, panY: -0.2 });
    assert.equal(rect.x, -100 + 40);
    assert.equal(rect.y, -60);
  });

  void it('clamps zoom between "fit" and the maximum', () => {
    near(
      clampPlacement({ zoom: 0.1, panX: 0, panY: 0 }, photo, frame).zoom,
      2 / 3
    );
    assert.equal(
      clampPlacement({ zoom: 99, panX: 0, panY: 0 }, photo, frame).zoom,
      MAX_PHOTO_ZOOM
    );
  });

  void it('lets the centre reach the frame edge zoomed out, and further zoomed in', () => {
    assert.equal(
      clampPlacement({ zoom: 1, panX: 5, panY: -5 }, photo, frame).panY,
      -0.5
    );
    // At zoom 1 the photo is 1.5x the frame wide, so the limit stays 0.75.
    assert.equal(
      clampPlacement({ zoom: 1, panX: 5, panY: 0 }, photo, frame).panX,
      0.75
    );
    // At zoom 4 it is 6x wide: any part can be brought to the centre.
    assert.equal(
      clampPlacement({ zoom: 4, panX: -9, panY: 0 }, photo, frame).panX,
      -3
    );
  });

  void it('pans by canvas pixels', () => {
    assert.deepEqual(panPhoto(DEFAULT_PHOTO_PLACEMENT, 40, -30, photo, frame), {
      zoom: 1,
      panX: 0.1,
      panY: -0.1,
    });
  });

  void it('zooms about an anchor, keeping the point under it in place', () => {
    const anchor = { x: 300, y: 75 };
    const before = placePhoto(photo, frame, DEFAULT_PHOTO_PLACEMENT);
    const zoomed = zoomPhoto(DEFAULT_PHOTO_PLACEMENT, 2, photo, frame, anchor);
    const after = placePhoto(photo, frame, zoomed);
    // The same fraction of the photo sits under the anchor before and after.
    const fractionBefore = (anchor.x - before.x) / before.width;
    const fractionAfter = (anchor.x - after.x) / after.width;
    assert.ok(Math.abs(fractionBefore - fractionAfter) < 1e-9);
    assert.ok(
      Math.abs(
        (anchor.y - before.y) / before.height -
          (anchor.y - after.y) / after.height
      ) < 1e-9
    );
    assert.equal(zoomed.zoom, 2);
  });

  void it('zooms about the centre without an anchor, and stops at the limits', () => {
    assert.deepEqual(
      zoomPhoto({ zoom: 1, panX: 0.1, panY: 0 }, 2, photo, frame),
      {
        zoom: 2,
        panX: 0.2,
        panY: 0,
      }
    );
    assert.equal(
      zoomPhoto(DEFAULT_PHOTO_PLACEMENT, 100, photo, frame).zoom,
      MAX_PHOTO_ZOOM
    );
    near(zoomPhoto(DEFAULT_PHOTO_PLACEMENT, 0.01, photo, frame).zoom, 2 / 3);
  });

  void it('frames the photo on the whole hero, and in the photo box on Instagram', () => {
    assert.deepEqual(photoFrame('etsy', ETSY_HERO_SIZE), {
      x: 0,
      y: 0,
      width: 4000,
      height: 3000,
    });
    assert.deepEqual(
      photoFrame('instagram', INSTAGRAM_POST_SIZES.portrait),
      instagramPhotoBox(INSTAGRAM_POST_SIZES.portrait)
    );
  });
});

void describe('machine render placement', () => {
  // A tall render, like the PSD's: fits the 623×993 box by height.
  const render = { width: 600, height: 1200 };

  void it('defaults to the PSD position and size', () => {
    assert.deepEqual(machineRenderRect(render, DEFAULT_MACHINE_PLACEMENT), {
      x: 20,
      y: 20,
      width: 496.5,
      height: 993,
    });
  });

  void it('scales from the top-left corner, so it stays tucked into the corner', () => {
    const rect = machineRenderRect(render, {
      scale: 0.5,
      offsetX: 0,
      offsetY: 0,
    });
    assert.deepEqual(rect, { x: 20, y: 20, width: 248.25, height: 496.5 });
  });

  void it('nudges by canvas pixels', () => {
    const moved = nudgeMachinePlacement(
      DEFAULT_MACHINE_PLACEMENT,
      400,
      300,
      render
    );
    assert.deepEqual(moved, { scale: 1, offsetX: 0.1, offsetY: 0.1 });
    const rect = machineRenderRect(render, moved);
    assert.equal(rect.x, 420);
    assert.equal(rect.y, 320);
  });

  void it('lets the render hang off the canvas by up to a quarter of its size', () => {
    const offLeft = machineRenderRect(render, {
      scale: 1,
      offsetX: -0.5,
      offsetY: -0.5,
    });
    assert.equal(offLeft.x, -496.5 * MACHINE_MAX_OVERHANG);
    assert.equal(offLeft.y, -993 * MACHINE_MAX_OVERHANG);
    const offRight = machineRenderRect(render, {
      scale: 1,
      offsetX: 5,
      offsetY: 5,
    });
    assert.equal(
      offRight.x + offRight.width * (1 - MACHINE_MAX_OVERHANG),
      4000
    );
    assert.equal(
      offRight.y + offRight.height * (1 - MACHINE_MAX_OVERHANG),
      3000
    );
  });

  void it('can tuck the render right into the corner', () => {
    const corner = machineRenderRect(render, {
      scale: 1,
      offsetX: -20 / 4000,
      offsetY: -20 / 3000,
    });
    assert.equal(corner.x, 0);
    assert.equal(corner.y, 0);
  });

  void it('clamps the scale', () => {
    assert.equal(
      clampMachinePlacement({ scale: 0.01, offsetX: 0, offsetY: 0 }, render)
        .scale,
      MIN_MACHINE_SCALE
    );
    assert.equal(
      clampMachinePlacement({ scale: 99, offsetX: 0, offsetY: 0 }, render)
        .scale,
      MAX_MACHINE_SCALE
    );
  });
});

void describe('photo backdrop', () => {
  const frame = { x: 0, y: 0, width: 400, height: 300 };

  void it('blurs by a fraction of the longer side, at least 1px', () => {
    assert.equal(
      photoBackdropBlurRadius(frame),
      400 * PHOTO_BACKDROP_BLUR_FRACTION
    );
    assert.equal(
      photoBackdropBlurRadius({ x: 0, y: 0, width: 4, height: 2 }),
      1
    );
  });

  void it('covers the frame plus twice the blur radius on every side', () => {
    // A 2:1 photo covering a 440×340 box (400×300 grown by 20 each side).
    assert.deepEqual(
      photoBackdropRect({ width: 2000, height: 1000 }, frame, 10),
      {
        x: -140,
        y: -20,
        width: 680,
        height: 340,
      }
    );
  });

  /** Records drawImage calls and the filter in force for each one. */
  function recordingContext(): {
    ctx: CanvasRenderingContext2D;
    draws: { source: unknown; filter: string }[];
  } {
    const draws: { source: unknown; filter: string }[] = [];
    const state: Record<string | symbol, unknown> = { filter: 'none' };
    const ctx = new Proxy(state, {
      get(target, key) {
        if (key in target) return target[key];
        if (key === 'drawImage')
          return (source: unknown) =>
            draws.push({ source, filter: String(target['filter']) });
        if (key === 'measureText') return () => ({ width: 10 });
        if (key === 'createLinearGradient')
          return () => ({ addColorStop: () => undefined });
        return () => undefined;
      },
      set(target, key, value) {
        target[key] = value;
        return true;
      },
    }) as unknown as CanvasRenderingContext2D;
    return { ctx, draws };
  }

  const photo = { width: 1600, height: 600 } as unknown as ImageSource;
  const fit = { zoom: 0.5, panX: 0, panY: 0 };

  void it('draws only the photo by default (white backdrop)', () => {
    const { ctx, draws } = recordingContext();
    renderInstagramPost(
      ctx,
      {
        photo,
        photoPlacement: fit,
        headline: 'Jig',
        subtitle: '',
        priceText: '',
        shopName: '',
        badgeText: '',
        logo: null,
      },
      'square'
    );
    assert.deepEqual(draws, [{ source: photo, filter: 'none' }]);
  });

  void it('draws a blurred copy under the photo for "blur"', () => {
    const { ctx, draws } = recordingContext();
    renderEtsyHero(ctx, {
      photo,
      photoPlacement: fit,
      photoBackdrop: 'blur',
      headline: 'Jig',
      machineImage: null,
      machinePlacement: { scale: 1, offsetX: 0, offsetY: 0 },
      machineLabel: '',
      watermarks: [],
      watermarkCorner: 'bottom-right',
      titleFont: { family: 'serif', weight: 700 },
    });
    assert.deepEqual(draws, [
      {
        source: photo,
        filter: `blur(${4000 * PHOTO_BACKDROP_BLUR_FRACTION}px)`,
      },
      { source: photo, filter: 'none' },
    ]);
  });
});
