# Information+ conference website

This repository publishes `https://informationplusconference.com` and keeps
previous conference editions available at their year-based URLs.

## Repository structure

- `2027/` is the Astro and TinaCMS source for the current website served at `/`.
- `2016/`, `2018/`, `2020/`, `2021/`, `2023/`, and `2025/` are finished static
  archives served at `/<year>/`.
- `2025-11ty/` is retained source material for the 2025 edition. It is not part
  of the published artifact; the finished site is in `2025/`.
- `.github/workflows/deploy.yml` builds the current edition and assembles the
  current site and archives into one temporary GitHub Pages artifact.

Historical sites are not duplicated inside `2027/`, and generated deployment
files are not committed.

## Develop the current site

Use Node.js 22 or newer:

```sh
cd 2027
npm ci
npm run dev
```

Before opening a pull request, validate the project:

```sh
npm run check
npm run build
```

Content is stored as Markdown in `2027/src/content/`. TinaCMS is local-only and
is available at `http://localhost:4321/admin/index.html` while `npm run dev` is
running. Build output in `2027/dist/` is generated and must not be committed.

## Deployment

A push to `main` that changes the current site, a published archive, the domain
files, or the deployment workflow triggers GitHub Pages deployment. The workflow:

1. installs and checks the project in `2027/`;
2. builds the current site into `2027/dist/`;
3. copies the existing year archives into that temporary output;
4. deploys the combined artifact to GitHub Pages.

In the repository's GitHub settings, **Pages → Build and deployment → Source**
must be set to **GitHub Actions**. The custom domain must be
`informationplusconference.com`, with HTTPS enforcement enabled. The domain is
recorded in both the root `CNAME` and `2027/public/CNAME`; keep them identical.

The workflow deliberately does not publish `2025-11ty/`, repository source,
dependencies, or generated build directories.

## Hand over to the next edition

When 2027 becomes a historical edition:

1. Tag the final 2027 source revision so it remains easy to retrieve.
2. Build `2027/` and replace the source directory on the new-edition branch with
   its finished static `dist/` output. The resulting root `2027/` becomes the
   permanent `/2027/` archive; Git history and the tag preserve its source.
3. Add the next edition's source in a new year directory.
4. Update `CURRENT_EDITION_PATH`, the archive list, and workflow path filters in
   `.github/workflows/deploy.yml`.
5. Set the new project's Astro `site` to the production domain and keep its
   `base` unset so it is served at `/`.
6. Run the check and build locally, then verify the root site and every archived
   year after deployment.

This handover keeps only one committed copy of each historical website while
allowing the current edition to use its normal source project structure.
