# CHANGELOG

## 0.3.0

### Minor Changes

- 2370ad1: Photos can zoom out below "fit whole photo": `clampPlacement` and `zoomPhoto` now allow zoom down to `minPhotoZoom(source, box)`, which is the new `MIN_PHOTO_ZOOM` (0.25 of "fill the frame"), or the fit zoom when a very wide or tall photo needs less. The photo backdrop (white or blurred) fills the rest of the frame.

## 0.2.0

### Minor Changes

- c264072: Add an optional `photoBackdrop` to `EtsyHeroInput` and `InstagramPostInput`. `'blur'` fills the part of the photo frame the photo doesn't cover (zoomed out to fit, or moved) with a blurred copy of the photo; `'white'`, the default, keeps the current output. New exports: `PhotoBackdrop`, `DEFAULT_PHOTO_BACKDROP`, `photoBackdropBlurRadius`, `photoBackdropRect`, `PHOTO_BACKDROP_BLUR_FRACTION` and `PHOTO_BACKDROP_VEIL_OPACITY`.

## 0.1.0

### Minor Changes

- 12aad12: First release. Browser canvas toolkit extracted from the McQForYouDesign shop
  dashboard, where it was already in use and tested:
  
  - `render`: the 4000×3000 listing hero ("Etsy hero" preset) and 1080×1080 /
    1080×1350 Instagram post renderers, photo placement maths (fit, zoom about a
    point, pan, clamp), watermark row layout and machine-render placement.
    Colours and fonts are overridable per render with an optional `style`.
  - `export`: downscale to a short side, a JPG quality search within a byte
    budget, file-size formatting and centred thumbnail crop guides.
  - `crop`: crop box maths (move, resize by handle, aspect lock, trim empty
    edges, padding).
  - `background-removal`: plain-background removal with an edge flood fill and a
    feathered edge, over RGBA arrays.
  - `psd-layers`: picks importable layers out of an ag-psd layer tree, with
    overridable name hints for watermark vs product render.
  
  Ships ESM and CommonJS builds with type declarations, plus a subpath export per
  module.

Managed by [Changesets](https://github.com/changesets/changesets). Entries are
added by `bun run version-packages`; don't edit them by hand.
