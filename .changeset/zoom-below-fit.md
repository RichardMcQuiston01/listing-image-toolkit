---
'@richardmcquiston01/listing-image-toolkit': minor
---

Photos can zoom out below "fit whole photo": `clampPlacement` and `zoomPhoto` now allow zoom down to `minPhotoZoom(source, box)`, which is the new `MIN_PHOTO_ZOOM` (0.25 of "fill the frame"), or the fit zoom when a very wide or tall photo needs less. The photo backdrop (white or blurred) fills the rest of the frame.
