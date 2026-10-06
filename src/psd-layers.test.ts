import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { initializeCanvas, readPsd, writePsd, type Layer } from 'ag-psd';

import {
  collectImportableLayers,
  defaultAssetName,
  isLikelyAsset,
  MAX_ASSET_NAME_LENGTH,
  suggestAssetKind,
} from './psd-layers';

// Outside a browser ag-psd needs to be told how to make image data; plain
// arrays are all that reading with `useImageData` uses.
initializeCanvas(
  () => {
    throw new Error('These tests never need a canvas');
  },
  (width: number, height: number) =>
    ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
    }) as ImageData
);

/** A layer filled with one colour; alpha 0 makes it empty. */
function solidLayer(
  name: string,
  left: number,
  top: number,
  width: number,
  height: number,
  rgba: readonly [number, number, number, number],
  extra: Partial<Layer> = {}
): Layer {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < width * height; index += 1)
    data.set(rgba, index * 4);
  return {
    name,
    left,
    top,
    right: left + width,
    bottom: top + height,
    imageData: { width, height, data },
    ...extra,
  };
}

/** Writes a PSD with ag-psd and reads it back as the app does. */
function roundTrip(children: Layer[]): Layer[] {
  // A composite of its own, so ag-psd needn't render one on a canvas.
  const composite = {
    width: 100,
    height: 80,
    data: new Uint8ClampedArray(100 * 80 * 4),
  };
  const buffer: ArrayBuffer = writePsd(
    { width: 100, height: 80, children, imageData: composite },
    { generateThumbnail: false }
  );
  return readPsd(buffer, {
    useImageData: true,
    skipCompositeImageData: true,
    skipThumbnail: true,
  }).children!;
}

void describe('collectImportableLayers', () => {
  void it('lists pixel layers top first, walking groups, skipping empty layers', () => {
    const layers: Layer[] = roundTrip([
      solidLayer('Background', 0, 0, 100, 80, [255, 255, 255, 255]),
      {
        name: 'Machines',
        children: [
          solidLayer('F2 render', 5, 6, 30, 40, [200, 80, 20, 255]),
          solidLayer('Empty', 0, 0, 10, 10, [0, 0, 0, 0]),
        ],
      },
      solidLayer('McQ logo', 60, 50, 20, 20, [40, 90, 60, 255], {
        hidden: true,
      }),
    ]);
    const found = collectImportableLayers(layers);
    assert.deepEqual(
      found.map((layer) => [
        layer.name,
        layer.groupPath.join('/'),
        layer.hidden,
      ]),
      [
        ['McQ logo', '', true],
        ['F2 render', 'Machines', false],
        ['Background', '', false],
      ]
    );
    const render = found[1]!;
    assert.deepEqual(
      [render.left, render.top, render.width, render.height],
      [5, 6, 30, 40]
    );
    assert.equal(render.pixels.length, 30 * 40 * 4);
    assert.deepEqual([...render.pixels.slice(0, 4)], [200, 80, 20, 255]);
    assert.equal(render.suggestedKind, 'machine_image');
    assert.equal(found[0]!.suggestedKind, 'watermark');
  });

  void it('marks layers inside a hidden group as hidden', () => {
    const layers: Layer[] = roundTrip([
      {
        name: 'Old',
        hidden: true,
        children: [solidLayer('Stamp', 0, 0, 10, 10, [0, 0, 0, 255])],
      },
    ]);
    assert.equal(collectImportableLayers(layers)[0]?.hidden, true);
  });

  void it('converts 16-bit channels to 8-bit', () => {
    const found = collectImportableLayers([
      {
        name: 'Deep',
        imageData: {
          width: 1,
          height: 1,
          data: new Uint16Array([65535, 0, 32768, 65535]),
        },
      },
    ]);
    assert.deepEqual([...found[0]!.pixels], [255, 0, 128, 255]);
  });

  void it('handles a file with no layers', () => {
    assert.deepEqual(collectImportableLayers(undefined), []);
  });
});

void describe('suggestAssetKind', () => {
  void it('spots machine renders by name or group', () => {
    assert.equal(suggestAssetKind('xTool P2S', []), 'machine_image');
    assert.equal(
      suggestAssetKind('Layer 3', ['Machine renders']),
      'machine_image'
    );
  });

  void it('prefers watermark when the layer says so, and defaults to it', () => {
    assert.equal(suggestAssetKind('F2 logo', ['Machines']), 'watermark');
    assert.equal(suggestAssetKind('Shape 1', []), 'watermark');
  });
});

void describe('defaultAssetName', () => {
  void it('prefixes the enclosing group and respects the length limit', () => {
    assert.equal(
      defaultAssetName({ name: 'F2', groupPath: ['Art', 'Machines'] }),
      'Machines / F2'
    );
    assert.equal(defaultAssetName({ name: 'Logo', groupPath: [] }), 'Logo');
    assert.equal(
      defaultAssetName({ name: 'x'.repeat(200), groupPath: [] }).length,
      MAX_ASSET_NAME_LENGTH
    );
  });
});

void describe('isLikelyAsset', () => {
  const canvas = { width: 100, height: 80 };
  void it('skips hidden layers and ones covering the whole canvas', () => {
    assert.equal(
      isLikelyAsset(
        { hidden: false, left: 5, top: 5, width: 20, height: 20 },
        canvas
      ),
      true
    );
    assert.equal(
      isLikelyAsset(
        { hidden: true, left: 5, top: 5, width: 20, height: 20 },
        canvas
      ),
      false
    );
    assert.equal(
      isLikelyAsset(
        { hidden: false, left: 0, top: 0, width: 100, height: 80 },
        canvas
      ),
      false
    );
    assert.equal(
      isLikelyAsset(
        { hidden: false, left: -10, top: -10, width: 130, height: 100 },
        canvas
      ),
      false
    );
  });
});

void describe('custom asset kind hints', () => {
  void it('uses the hints passed in instead of the defaults', () => {
    const hints = { watermark: /mark/i, machine: /product/i };
    assert.equal(suggestAssetKind('Product shot', [], hints), 'machine_image');
    assert.equal(suggestAssetKind('xTool P2S', [], hints), 'watermark');
    const found = collectImportableLayers(
      [
        {
          name: 'Product shot',
          imageData: {
            width: 1,
            height: 1,
            data: new Uint8ClampedArray([1, 2, 3, 255]),
          },
        },
      ],
      hints
    );
    assert.equal(found[0]?.suggestedKind, 'machine_image');
  });
});
