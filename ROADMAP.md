# ROADMAP

- Merge the pixel code (background removal, content bounds, layer pixel
  conversion) with maker-image-tools' `@maker/core-image`, so there's one
  implementation of each.
- More templates: other marketplace hero sizes and social formats (Pinterest
  2:3, Facebook, story 9:16), built on the same placement helpers.
- Make template geometry (bar height, margins, photo boxes) data rather than
  constants, so new layouts don't need new renderer code.
- Marketplace-neutral aliases for the "Etsy hero" preset names.
- Visual regression tests for the renderers, using an offscreen canvas.
