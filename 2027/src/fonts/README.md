# Fonts

Drop your `.woff2` files here (e.g. `MyFont-Regular.woff2`, `MyFont-Bold.woff2`).

They are referenced from `src/styles/global.css` with **relative** `url()` paths,
so Vite fingerprints them and rewrites the URLs with the correct GitHub Pages
`base` path automatically — don't move them to `public/` or the sub-path deploy
will 404.

To register a font, uncomment and edit the `@font-face` rules at the top of
`src/styles/global.css`, then set `--font` to your family name.
