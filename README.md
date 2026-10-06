# Listing Image Toolkit

- Author:  Richard McQuiston
- Website:  https://richardmcquiston.com/

## Overview

`@richardmcquiston01/listing-image-toolkit` is a browser canvas toolkit for
marketplace listing images: hero and Instagram templates, photo placement,
crop and thumbnail guides, background removal, PSD layer import, and
size-optimised export. Everything runs client-side: photos never leave the
user's machine.

It was extracted from a working shop dashboard, where it builds listing hero
images and Instagram posts. The geometry helpers are pure functions and unit
tested; the renderers draw onto any `CanvasRenderingContext2D`.

| Module                 | What it does                                                                                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `render`               | 4000×3000 listing hero ("Etsy hero" preset) and 1080×1080 / 1080×1350 Instagram post renderers; photo zoom/pan maths; watermark layout; product render placement |
| `export`               | Downscale to a short side, pick a JPG quality within a byte budget, format file sizes, centred thumbnail crop guides                                        |
| `crop`                 | Crop box maths: move, resize by handle, aspect lock, drag out a new box, trim empty edges                                                                   |
| `background-removal`   | Removes a plain background from RGBA pixels (edge flood fill, feathered edges), no dependencies                                                             |
| `psd-layers`           | Picks importable layers out of an [ag-psd](https://github.com/Agamnentzar/ag-psd) layer tree, suggesting watermark vs product render                        |

The package ships ESM and CommonJS builds with type declarations. Each module
is also available on its own subpath, e.g.
`@richardmcquiston01/listing-image-toolkit/crop`.

## Getting Started

### Prerequisites

- A browser (or any environment with Canvas 2D) for the renderers. The pure
  maths (placement, crop, background removal, export sizing) runs anywhere.
- `ag-psd` (optional peer dependency, version 31 or later) only if you import
  layers from PSD files.

### Installation

```bash
bun add @richardmcquiston01/listing-image-toolkit
# Only for PSD import:
bun add ag-psd
```

npm, pnpm and yarn work too.

### Usage

```ts
import {
  DEFAULT_MACHINE_PLACEMENT,
  DEFAULT_PHOTO_PLACEMENT,
  ETSY_HERO_SIZE,
  renderEtsyHero,
  resolveEtsyTitleFont,
} from '@richardmcquiston01/listing-image-toolkit';

const canvas = document.createElement('canvas');
canvas.width = ETSY_HERO_SIZE.width;
canvas.height = ETSY_HERO_SIZE.height;
const ctx = canvas.getContext('2d')!;

const photo = await createImageBitmap(file);
renderEtsyHero(ctx, {
  photo,
  photoPlacement: DEFAULT_PHOTO_PLACEMENT,
  headline: 'Laser Cut Jig Pack',
  machineImage: null,
  machinePlacement: DEFAULT_MACHINE_PLACEMENT,
  machineLabel: '',
  watermarks: [],
  watermarkCorner: 'bottom-right',
  titleFont: resolveEtsyTitleFont(ctx),
  // Optional: override the default colours and fonts.
  style: { barColor: '#1F3A5F' },
});
```

Load web fonts before drawing (`WEB_FONTS_TO_LOAD` lists the defaults):

```ts
import { WEB_FONTS_TO_LOAD } from '@richardmcquiston01/listing-image-toolkit';
await Promise.all(WEB_FONTS_TO_LOAD.map((font) => document.fonts.load(font)));
```

### Examples

**render**: an Instagram post, and zooming the photo under the pointer.

```ts
import {
  DEFAULT_PHOTO_PLACEMENT,
  INSTAGRAM_POST_SIZES,
  photoFrame,
  renderInstagramPost,
  zoomPhoto,
} from '@richardmcquiston01/listing-image-toolkit/render';

const size = INSTAGRAM_POST_SIZES.portrait; // 1080×1350
const frame = photoFrame('instagram', size);
const placement = zoomPhoto(DEFAULT_PHOTO_PLACEMENT, 1.5, photo, frame, {
  x: 540,
  y: 500,
});
renderInstagramPost(
  ctx,
  {
    photo,
    photoPlacement: placement,
    headline: 'Desk Organiser',
    subtitle: '3D printed, made to order',
    priceText: '$20',
    shopName: 'My Shop',
    badgeText: 'Made to order',
    logo: null,
  },
  'portrait'
);
```

**export**: a JPG under 1 MB, at 2000 px on the short side.

```ts
import {
  OPTIMISED_JPEG_QUALITIES,
  pickQualityWithinBudget,
  scaleToShortSide,
} from '@richardmcquiston01/listing-image-toolkit/export';

const target = scaleToShortSide(canvas, 2000); // 2667×2000 for the hero
const scaled = document.createElement('canvas');
scaled.width = target.width;
scaled.height = target.height;
scaled.getContext('2d')!.drawImage(canvas, 0, 0, target.width, target.height);

const { encoded, quality, withinBudget } = await pickQualityWithinBudget(
  (q) =>
    new Promise<Blob>((resolve) =>
      scaled.toBlob((blob) => resolve(blob!), 'image/jpeg', q)
    ),
  OPTIMISED_JPEG_QUALITIES,
  1_000_000
);
```

**crop**: trim transparent or plain-colour margins, with a little padding.

```ts
import {
  findContentBounds,
  fullCrop,
  padCrop,
} from '@richardmcquiston01/listing-image-toolkit/crop';

const { data, width, height } = ctx.getImageData(0, 0, w, h);
const bounds = findContentBounds(data, width, height, 12);
const crop = bounds
  ? padCrop(bounds, Math.round(width * 0.01), { width, height })
  : fullCrop({ width, height });
```

**background-removal**: make a white background transparent.

```ts
import {
  DEFAULT_BACKGROUND_REMOVAL,
  removeBackground,
} from '@richardmcquiston01/listing-image-toolkit/background-removal';

const image = ctx.getImageData(0, 0, w, h);
const { pixels, removedCount } = removeBackground(
  image.data,
  image.width,
  image.height,
  DEFAULT_BACKGROUND_REMOVAL // { tolerance: 12, edgesOnly: true }
);
ctx.putImageData(new ImageData(pixels, image.width, image.height), 0, 0);
```

**psd-layers**: list the layers worth importing from a PSD.

```ts
import { readPsd } from 'ag-psd';
import {
  collectImportableLayers,
  defaultAssetName,
  isLikelyAsset,
} from '@richardmcquiston01/listing-image-toolkit/psd-layers';

const psd = readPsd(await file.arrayBuffer(), { useImageData: true });
for (const layer of collectImportableLayers(psd.children)) {
  if (isLikelyAsset(layer, psd)) {
    console.log(defaultAssetName(layer), layer.suggestedKind);
  }
}
```

Pass your own `{ watermark, machine }` regular expressions as the second
argument to `collectImportableLayers` (or third to `suggestAssetKind`) to tune
how layers are classified.

## Development

Bun is the package manager, script runner and test runner.

```bash
bun install
bun run typecheck
bun run lint
bun run format:check   # bun run format to fix
bun test
bun run build          # dist/: ESM (.js), CommonJS (.cjs), .d.ts / .d.cts
```

Branches: `dev` is the integration branch. Branch features off `dev` and open
pull requests into `dev`; `dev` is merged to `main` for a release.

### Releasing

1. Add a changeset with each user-facing change: `bun run changeset`.
2. On `dev`, run `bun run version-packages` to apply the changesets (version
   bump and `CHANGELOG.md`), commit, and merge `dev` into `main`.
3. Tag `main` with the new version and push the tag, e.g.
   `git tag v0.1.0 && git push origin v0.1.0`.

The `Release` workflow then builds, tests and runs
`npm publish --provenance --access public`. It needs an npm automation token
saved as the repository secret **`NPM_TOKEN`** (Settings → Secrets and
variables → Actions). The tag must match `package.json`'s version.

## Buy Me a Coffee

If this app, code, or repository has helped you or someone you know, please consider donating. I appreciate any help to offset the costs of development and/or AI Credits.

[**Donate via Stripe**](https://donate.stripe.com/00w5kD3Gj1Xo9v7gVOcs800), or scan:

[![Donate via Stripe](./donate.svg)](https://donate.stripe.com/00w5kD3Gj1Xo9v7gVOcs800)

## License

Apache 2

## Copyright

(c)2026 Richard McQuiston.  All rights reserved.
