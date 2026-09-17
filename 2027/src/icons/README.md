# Icons

Drop the full pixelarticons SVG set here — one file per icon, e.g. `calendar.svg`,
`map-pin.svg`, `megaphone.svg` (kebab-case filenames, no subfolders).

`src/components/Icon.astro` reads from this folder first (your vendored full set),
and falls back to the npm `pixelarticons` free set for any name not found here.
So you can add them all at once, or incrementally.

Use them as `<Icon name="filename-without-extension" />`.

For correct theming each SVG should keep `fill="currentColor"` and a `0 0 24 24`
viewBox (the free set already does); the component inlines the inner markup and
applies size/color via CSS.
