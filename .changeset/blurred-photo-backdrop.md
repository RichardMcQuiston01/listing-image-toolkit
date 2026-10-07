---
'@richardmcquiston01/listing-image-toolkit': minor
---

Add an optional `photoBackdrop` to `EtsyHeroInput` and `InstagramPostInput`. `'blur'` fills the part of the photo frame the photo doesn't cover (zoomed out to fit, or moved) with a blurred copy of the photo; `'white'`, the default, keeps the current output. New exports: `PhotoBackdrop`, `DEFAULT_PHOTO_BACKDROP`, `photoBackdropBlurRadius`, `photoBackdropRect`, `PHOTO_BACKDROP_BLUR_FRACTION` and `PHOTO_BACKDROP_VEIL_OPACITY`.
