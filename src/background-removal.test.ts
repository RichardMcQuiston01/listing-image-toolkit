import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { detectBackgroundColour, removeBackground } from './background-removal';

type Rgba = readonly [number, number, number, number];

const WHITE: Rgba = [255, 255, 255, 255];
const RED: Rgba = [200, 30, 30, 255];

/** Builds an RGBA image from rows of pixels. */
function image(rows: readonly (readonly Rgba[])[]): {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
} {
  const height: number = rows.length;
  const width: number = rows[0]?.length ?? 0;
  const pixels = new Uint8ClampedArray(width * height * 4);
  rows.forEach((row, y) =>
    row.forEach((pixel, x) => pixels.set(pixel, (y * width + x) * 4))
  );
  return { pixels, width, height };
}

function alphaAt(
  pixels: Uint8ClampedArray,
  width: number,
  x: number,
  y: number
): number {
  return pixels[(y * width + x) * 4 + 3] ?? -1;
}

/** 5×5: a white border, a red ring, and a white hole in the middle. */
const W = WHITE;
const R = RED;
const RING = image([
  [W, W, W, W, W],
  [W, R, R, R, W],
  [W, R, W, R, W],
  [W, R, R, R, W],
  [W, W, W, W, W],
]);

void describe('detectBackgroundColour', () => {
  void it('takes the median of the border, ignoring a stray subject pixel', () => {
    const withStray = image([
      [W, W, R, W, W],
      [W, R, R, R, W],
      [W, W, W, W, W],
    ]);
    assert.deepEqual(
      detectBackgroundColour(withStray.pixels, 5, 3),
      [255, 255, 255]
    );
  });

  void it('falls back to white when the border is already transparent', () => {
    const clear: Rgba = [0, 0, 0, 0];
    const transparent = image([
      [clear, clear],
      [clear, clear],
    ]);
    assert.deepEqual(
      detectBackgroundColour(transparent.pixels, 2, 2),
      [255, 255, 255]
    );
  });
});

void describe('removeBackground', () => {
  void it('removes background connected to the edges, keeping white inside the subject', () => {
    const result = removeBackground(RING.pixels, 5, 5, {
      tolerance: 10,
      edgesOnly: true,
    });
    assert.equal(alphaAt(result.pixels, 5, 0, 0), 0, 'border removed');
    assert.equal(alphaAt(result.pixels, 5, 1, 1), 255, 'subject kept');
    assert.equal(alphaAt(result.pixels, 5, 2, 2), 255, 'enclosed white kept');
    assert.equal(result.removedCount, 16);
    assert.deepEqual(result.background, [255, 255, 255]);
  });

  void it('removes the colour everywhere when edgesOnly is off', () => {
    const result = removeBackground(RING.pixels, 5, 5, {
      tolerance: 10,
      edgesOnly: false,
    });
    assert.equal(
      alphaAt(result.pixels, 5, 2, 2),
      0,
      'enclosed white removed too'
    );
    assert.equal(result.removedCount, 17);
  });

  void it('does not modify the input', () => {
    removeBackground(RING.pixels, 5, 5, { tolerance: 10, edgesOnly: true });
    assert.equal(alphaAt(RING.pixels, 5, 0, 0), 255);
  });

  void it('respects the tolerance for off-white backgrounds', () => {
    const offWhite: Rgba = [240, 240, 236, 255];
    const shot = image([
      [offWhite, W, offWhite],
      [offWhite, R, offWhite],
      [W, offWhite, W],
    ]);
    const strict = removeBackground(shot.pixels, 3, 3, {
      tolerance: 0,
      edgesOnly: true,
    });
    const loose = removeBackground(shot.pixels, 3, 3, {
      tolerance: 10,
      edgesOnly: true,
    });
    assert.ok(
      strict.removedCount < 8,
      'nothing outside an exact match is removed at 0'
    );
    assert.equal(loose.removedCount, 8);
    assert.equal(alphaAt(loose.pixels, 3, 1, 1), 255, 'the red subject stays');
  });

  void it('fades near-background edge pixels instead of leaving a halo', () => {
    const halo: Rgba = [230, 205, 205, 255]; // anti-aliased red-on-white edge
    const edge = image([
      [W, W, W, W],
      [W, halo, R, W],
      [W, W, W, W],
    ]);
    const result = removeBackground(edge.pixels, 4, 3, {
      tolerance: 10,
      edgesOnly: true,
    });
    const haloAlpha: number = alphaAt(result.pixels, 4, 1, 1);
    assert.ok(
      haloAlpha > 0 && haloAlpha < 255,
      `halo partly transparent, got ${haloAlpha}`
    );
    assert.equal(alphaAt(result.pixels, 4, 2, 1), 255, 'solid red untouched');
  });
});
