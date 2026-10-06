import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  clampCrop,
  cropFromPoints,
  cropToAspect,
  findContentBounds,
  fullCrop,
  isFullCrop,
  MIN_CROP_SIZE,
  moveCrop,
  padCrop,
  resizeCrop,
  type CropRect,
} from './crop';

const SIZE = { width: 400, height: 300 } as const;
const BOX: CropRect = { x: 100, y: 50, width: 200, height: 100 };

void describe('clampCrop', () => {
  void it('rounds to whole pixels and keeps the box inside the image', () => {
    assert.deepEqual(
      clampCrop({ x: -10.4, y: 280, width: 50.6, height: 40 }, SIZE),
      {
        x: 0,
        y: 260,
        width: 51,
        height: 40,
      }
    );
  });

  void it('enforces a minimum size and never exceeds the image', () => {
    assert.deepEqual(clampCrop({ x: 10, y: 10, width: 1, height: 999 }, SIZE), {
      x: 10,
      y: 0,
      width: MIN_CROP_SIZE,
      height: 300,
    });
  });

  void it('allows images smaller than the minimum', () => {
    assert.deepEqual(
      clampCrop({ x: 0, y: 0, width: 1, height: 1 }, { width: 4, height: 4 }),
      {
        x: 0,
        y: 0,
        width: 4,
        height: 4,
      }
    );
  });
});

void describe('fullCrop / isFullCrop', () => {
  void it('covers the whole image', () => {
    assert.ok(isFullCrop(fullCrop(SIZE), SIZE));
    assert.ok(!isFullCrop(BOX, SIZE));
  });
});

void describe('moveCrop', () => {
  void it('moves without resizing and stops at the edges', () => {
    assert.deepEqual(moveCrop(BOX, 30, -20, SIZE), { ...BOX, x: 130, y: 30 });
    assert.deepEqual(moveCrop(BOX, 500, 500, SIZE), { ...BOX, x: 200, y: 200 });
  });
});

void describe('resizeCrop', () => {
  void it('moves only the dragged edge', () => {
    assert.deepEqual(resizeCrop(BOX, 'e', 40, 99, SIZE, null), {
      ...BOX,
      width: 240,
    });
    assert.deepEqual(resizeCrop(BOX, 'n', 99, -20, SIZE, null), {
      ...BOX,
      y: 30,
      height: 120,
    });
  });

  void it('keeps the opposite corner fixed', () => {
    assert.deepEqual(resizeCrop(BOX, 'nw', 20, 10, SIZE, null), {
      x: 120,
      y: 60,
      width: 180,
      height: 90,
    });
  });

  void it('stops at the image edge and at the minimum size', () => {
    assert.equal(resizeCrop(BOX, 'e', 1000, 0, SIZE, null).width, 300);
    assert.deepEqual(resizeCrop(BOX, 'w', 1000, 0, SIZE, null), {
      ...BOX,
      x: 300 - MIN_CROP_SIZE,
      width: MIN_CROP_SIZE,
    });
  });

  void it('keeps an aspect ratio from a corner, following the larger move', () => {
    const square: CropRect = { x: 100, y: 100, width: 100, height: 100 };
    assert.deepEqual(resizeCrop(square, 'se', 40, 10, SIZE, 1), {
      x: 100,
      y: 100,
      width: 140,
      height: 140,
    });
  });

  void it('keeps an aspect ratio from an edge, growing about the centre', () => {
    const square: CropRect = { x: 100, y: 100, width: 100, height: 100 };
    assert.deepEqual(resizeCrop(square, 'e', 20, 0, SIZE, 1), {
      x: 100,
      y: 90,
      width: 120,
      height: 120,
    });
  });

  void it('shrinks an aspect-locked box to fit the image, keeping the anchor', () => {
    const square: CropRect = { x: 100, y: 100, width: 100, height: 100 };
    const result: CropRect = resizeCrop(square, 'se', 400, 400, SIZE, 1);
    assert.deepEqual(result, { x: 100, y: 100, width: 200, height: 200 });
  });
});

void describe('cropFromPoints', () => {
  void it('draws a box in any direction', () => {
    assert.deepEqual(
      cropFromPoints({ x: 300, y: 200 }, { x: 100, y: 50 }, SIZE, null),
      {
        x: 100,
        y: 50,
        width: 200,
        height: 150,
      }
    );
  });

  void it('clamps to the image and keeps the aspect ratio', () => {
    assert.deepEqual(
      cropFromPoints({ x: 50, y: 50 }, { x: 500, y: 100 }, SIZE, 1),
      {
        x: 50,
        y: 50,
        width: 250,
        height: 250,
      }
    );
  });
});

void describe('cropToAspect', () => {
  void it('takes the largest centred box of that ratio', () => {
    assert.deepEqual(cropToAspect(fullCrop(SIZE), 1, SIZE), {
      x: 50,
      y: 0,
      width: 300,
      height: 300,
    });
    assert.deepEqual(cropToAspect(BOX, 1, SIZE), {
      x: 150,
      y: 50,
      width: 100,
      height: 100,
    });
  });
});

void describe('padCrop', () => {
  void it('grows the box, staying inside the image', () => {
    assert.deepEqual(padCrop(BOX, 10, SIZE), {
      x: 90,
      y: 40,
      width: 220,
      height: 120,
    });
    assert.deepEqual(padCrop({ x: 5, y: 5, width: 10, height: 10 }, 10, SIZE), {
      x: 0,
      y: 0,
      width: 25,
      height: 25,
    });
  });
});

type Rgba = readonly [number, number, number, number];
const CLEAR: Rgba = [0, 0, 0, 0];
const WHITE: Rgba = [255, 255, 255, 255];
const RED: Rgba = [200, 30, 30, 255];

function image(
  width: number,
  height: number,
  fill: Rgba,
  marks: readonly [number, number][]
) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < width * height; index += 1)
    pixels.set(fill, index * 4);
  for (const [x, y] of marks) pixels.set(RED, (y * width + x) * 4);
  return pixels;
}

void describe('findContentBounds', () => {
  void it('trims transparent edges', () => {
    const pixels = image(6, 5, CLEAR, [
      [1, 1],
      [3, 3],
    ]);
    assert.deepEqual(findContentBounds(pixels, 6, 5, 10), {
      x: 1,
      y: 1,
      width: 3,
      height: 3,
    });
  });

  void it('trims a plain background colour on an opaque image', () => {
    const pixels = image(6, 5, WHITE, [
      [2, 1],
      [4, 2],
    ]);
    assert.deepEqual(findContentBounds(pixels, 6, 5, 10), {
      x: 2,
      y: 1,
      width: 3,
      height: 2,
    });
  });

  void it('returns null for an empty image', () => {
    assert.equal(findContentBounds(image(3, 3, CLEAR, []), 3, 3, 10), null);
    assert.equal(findContentBounds(image(3, 3, WHITE, []), 3, 3, 10), null);
  });
});
