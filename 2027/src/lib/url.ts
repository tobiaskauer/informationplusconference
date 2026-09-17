/**
 * Prefix a root-relative path with Astro's configured `base` so links and
 * public assets (e.g. Tina-uploaded images at /uploads/..) work on GitHub
 * Pages project sites where the site is served from a sub-path.
 */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  if (!path.startsWith('/')) path = `/${path}`;
  return `${base}${path}`;
}

/** True for off-site links (http(s), protocol-relative, mailto, tel). */
export function isExternal(href: string): boolean {
  return /^(https?:)?\/\//.test(href) || href.startsWith('mailto:') || href.startsWith('tel:');
}

/** Resolve a CMS-authored link: external links pass through, internal paths get `base`. */
export function resolveHref(href: string): string {
  return isExternal(href) ? href : withBase(href);
}
