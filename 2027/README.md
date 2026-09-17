# Information+ — Conference site (Astro + TinaCMS, no database)

The website content lives **entirely as Markdown in this Git
repository**. There is no database: content is edited locally with
TinaCMS and published as a fully static site to **GitHub Pages**.

## How it works

- **Content** = Markdown files in `src/content/` (`speakers/`, `sessions/`,
  `settings/`, `navigation/`, and the other collections). This is the single
  source of truth, versioned in Git.
- **Editing** = TinaCMS in *local mode*. `npm run dev` starts an ephemeral local
  editor at `/admin` that writes to those Markdown files.
- **Build** = Astro reads the same Markdown via its content collections and emits
  static HTML. The production build does **not** depend on Tina at all.
- **Cross-references** = a session's `speakers` field (a Tina `reference` list)
  is resolved to speaker pages at build time. See `src/lib/refs.ts`.

## Local development

```bash
npm install
npm run dev        # Astro on http://localhost:4321 + Tina editor at /admin
```

Edit content visually at <http://localhost:4321/admin/index.html>, or edit the
Markdown files directly. Commit the changes to Git.

```bash
npm run build      # static output in dist/
npm run preview    # serve the built site locally
npm run check      # refresh Astro's generated types and check every .astro file
```

If VS Code reports that a newly added collection is not a valid content key,
run `npm run check`. Astro's generated files under `.astro/` can otherwise lag
behind `src/content.config.ts`, even when the source schema is correct.

## Production deployment

This directory is the source for the current conference website, but deployment
is owned by `../.github/workflows/deploy.yml`. The root workflow builds this
project for `https://informationplusconference.com/`, adds the existing static
edition archives to the temporary deployment artifact, and publishes the result
to GitHub Pages.

Do not commit `dist/`, copy historical sites into this directory, or add another
deployment workflow here. See `../README.md` for the repository structure,
production settings, and the handover procedure for the next edition.

## Content model

| Collection | Fields |
| --- | --- |
| `speaker` | name, role, company, photo, featured, socials, bio (body) |
| `session` | title, date, startTime, endTime, location, track, **speakers (reference)**, abstract (body) |
| `room` | name, building, floor, room number, notes (body) |
| `settings` | shared conference name, dates, venue, and city |
| `homepageLayout` | fixed hero copy/buttons followed by reorderable homepage sections with visibility controls; Introduction and Conference organizers keep their editable content inside their section blocks |
| `venuePage` | venue hero image, alt text, and live dither settings |
| `navigation` | reorderable navbar items with icon, label, page/link, and visibility toggle |
| `edition` | year, city, country, venue, and archive URL |

Schema is defined twice intentionally: `tina/config.ts` (editor) and
`src/content.config.ts` (build). Keep them in sync when adding fields.

The dither effect also has two implementations by design. `heroDither.ts` and
`mediaDither.ts` render moving media with WebGL; `stillDither.ts` mirrors the
same visual rules on a 2D canvas for PNG and SVG export. When changing the
matrix, thresholds, or plus symbol, check both paths.
