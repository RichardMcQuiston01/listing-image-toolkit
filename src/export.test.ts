import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  centredCropRect,
  ETSY_RECOMMENDED_SHORT_SIDE,
  ETSY_THUMBNAIL_ASPECT,
  formatFileSize,
  pickQualityWithinBudget,
  scaleToShortSide,
} from './export';
import { ETSY_HERO_SIZE } from './render';

void describe('scaleToShortSide', () => {
  void it('scales the Etsy hero to 2000 px on its short side, keeping 4:3', () => {
    assert.deepEqual(
      scaleToShortSide(ETSY_HERO_SIZE, ETSY_RECOMMENDED_SHORT_SIDE),
      {
        width: 2667,
        height: 2000,
      }
    );
  });

  void it('handles portrait canvases', () => {
    assert.deepEqual(scaleToShortSide({ width: 3000, height: 4000 }, 2000), {
      width: 2000,
      height: 2667,
    });
  });

  void it('never enlarges', () => {
    const small = { width: 1080, height: 1350 };
    assert.equal(scaleToShortSide(small, 2000), small);
  });
});

void describe('pickQualityWithinBudget', () => {
  /** A fake encoder: size grows with quality, and records each call. */
  function fakeEncoder(sizeAt: (quality: number) => number) {
    const tried: number[] = [];
    const encode = (quality: number) => {
      tried.push(quality);
      return Promise.resolve({ size: sizeAt(quality) });
    };
    return { encode, tried };
  }

  void it('stops at the first quality within the budget', async () => {
    const { encode, tried } = fakeEncoder((quality) =>
      Math.round(quality * 1_200_000)
    );
    const choice = await pickQualityWithinBudget(
      encode,
      [0.9, 0.85, 0.8, 0.75],
      1_000_000
    );
    assert.equal(choice.quality, 0.8);
    assert.equal(choice.withinBudget, true);
    assert.equal(choice.encoded.size, 960_000);
    assert.deepEqual(tried, [0.9, 0.85, 0.8]);
  });

  void it('returns the smallest result when nothing fits', async () => {
    const { encode } = fakeEncoder((quality) =>
      Math.round(quality * 5_000_000)
    );
    const choice = await pickQualityWithinBudget(encode, [0.9, 0.7], 1_000_000);
    assert.equal(choice.quality, 0.7);
    assert.equal(choice.withinBudget, false);
  });

  void it('rejects an empty quality list', async () => {
    const { encode } = fakeEncoder(() => 1);
    await assert.rejects(pickQualityWithinBudget(encode, [], 1));
  });
});

void describe('formatFileSize', () => {
  void it('uses decimal units', () => {
    assert.equal(formatFileSize(512), '512 B');
    assert.equal(formatFileSize(850_400), '850 KB');
    assert.equal(formatFileSize(2_430_000), '2.4 MB');
  });
});

void describe('centredCropRect', () => {
  void it('trims the sides of the 4:3 hero for a 5:4 thumbnail', () => {
    assert.deepEqual(centredCropRect(ETSY_HERO_SIZE, ETSY_THUMBNAIL_ASPECT), {
      x: 125,
      y: 0,
      width: 3750,
      height: 3000,
    });
  });

  void it('takes a centred square', () => {
    assert.deepEqual(centredCropRect(ETSY_HERO_SIZE, 1), {
      x: 500,
      y: 0,
      width: 3000,
      height: 3000,
    });
  });

  void it('trims top and bottom when the canvas is taller than the shape', () => {
    assert.deepEqual(centredCropRect({ width: 1000, height: 2000 }, 1), {
      x: 0,
      y: 500,
      width: 1000,
      height: 1000,
    });
  });
});
