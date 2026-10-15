// @ts-check
import { defineConfig } from 'astro/config';

// PREVIEW_SITE / PREVIEW_BASE are set only by scripts/deploy-preview.sh, so a
// preview can live on another domain or in a sub-folder. Production ignores them.
export default defineConfig({
  site: process.env.PREVIEW_SITE || 'https://informationplusconference.com',
  base: process.env.PREVIEW_BASE || undefined,
  output: 'static',
  trailingSlash: 'ignore',
});
