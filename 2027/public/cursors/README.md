# Custom cursors

The full pixelarticons cursor set lives in `svg/` and `png/`.

The site currently uses:

- normal: `svg/default-dark.svg` → `png/default-dark.png`
- pointer: `svg/pointer.svg` → `png/pointer.png`
- text: `svg/text.svg` → `png/text.png`
- disabled: `svg/not-allowed.svg` → `png/not-allowed.png`
- draggable control: `svg/grab.svg` → `png/grab.png`
- actively dragged control: `svg/grabbing.svg` → `png/grabbing.png`

Wired in `src/layouts/Base.astro` as `--cur-*` custom properties (paths built
with `withBase(...)` for the GitHub Pages sub-path), consumed in
`src/styles/global.css` and component styles. Each uses a fallback chain — SVG first
(crisp, Chrome / Edge / Firefox), then PNG (so **Safari**, which ignores SVG
cursors, still works), then the matching native cursor keyword. The default and
pointer hotspot is `4 1`; the text I-beam uses its centered `16 16` hotspot.

To use a different cursor for some state, point the relevant rule in
`global.css` at another file in these folders (e.g. `text`, `not-allowed`,
`grab`, `wait`, `zoom-in`).

These come from the pixelarticons **website** download (the `/free/cursors/`
folder), not the npm package — the package only ships SVGs + a font.

They're wired up with CSS variables set on `<html>` in `src/layouts/Base.astro`
using `withBase(...)` so the paths work under the GitHub Pages sub-path.

If neither custom asset can be loaded, each rule falls back to the matching
native cursor keyword.
