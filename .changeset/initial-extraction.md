---
'@richardmcquiston01/listing-image-toolkit': minor
---

First release. Browser canvas toolkit extracted from the McQForYouDesign shop
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
