/**
 * Pre-renders link previews, after `vite build`.
 *
 * The share card is drawn client-side into a canvas, and no crawler runs that — so before this
 * step every link to the site unfurled as bare text, and every route shared the homepage's title.
 * This does the two things that fixes:
 *
 *  1. Draws one Open Graph image per route with the app's own card renderer, so the preview is the
 *     same artwork the product produces. Calculator previews are the real result of that
 *     calculator's defaults, computed by the real engine — the same answer a visitor lands on.
 *  2. Writes a real HTML file per route, copied from the built index.html with that route's title,
 *     description and image baked in. GitHub Pages then serves a crawlable document per URL
 *     instead of falling through to the SPA 404, and the app boots and routes exactly as before.
 *
 * Run with vite-node so it can import the app's TypeScript directly; there is no second copy of
 * the card layout or the calculator metadata to keep in sync.
 */
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REGISTRY } from '../src/calculators/registry';
import { brandCardCopy, OG_ROUTES, type OgRoute } from '../src/share/ogRoutes';
import { renderBrandCard, renderShareCard, type CardCanvas } from '../src/share/shareCard';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

/** Where the site actually lives, for the absolute URLs Open Graph requires. */
const SITE_URL = (process.env.SITE_URL ?? 'https://nazzaroni88-coder.github.io/truecost-lab/').replace(/\/?$/, '/');

/*
 * Inter, from the package rather than the network.
 *
 * The card's font stack starts with Inter and the app loads it from Google Fonts. A build that
 * fetched it would be one outage away from silently shipping previews set in DejaVu Sans, so the
 * weights the card uses are registered from node_modules and the build stays offline.
 */
for (const weight of [400, 500, 600, 700]) {
  const file = join(root, `node_modules/@fontsource/inter/files/inter-latin-${weight}-normal.woff2`);
  // registerFromPath returns null for a missing file rather than throwing, which would ship
  // previews quietly set in whatever the platform's default sans happens to be.
  if (!GlobalFonts.registerFromPath(file, 'Inter')) throw new Error(`Could not register Inter ${weight} from ${file}`);
}
if (!GlobalFonts.has('Inter')) throw new Error('Inter did not register; link previews would render in a fallback face');

/** OG previews are landscape by convention; 2x so they stay crisp on a retina timeline. */
const WIDTH = 1200;
const HEIGHT = 630;
const SCALE = 2;

function draw(route: OgRoute): Buffer {
  // @napi-rs/canvas implements the 2D context this renderer uses; the cast is the one place the
  // Node canvas meets a type written for the browser.
  const canvas = createCanvas(WIDTH * SCALE, HEIGHT * SCALE);
  const target = canvas as unknown as CardCanvas;

  if (route.kind === 'result') {
    const calc = REGISTRY.find((c) => c.id === route.calculatorId);
    if (!calc) throw new Error(`No calculator registered for og route "${route.path}" (id ${route.calculatorId})`);
    // A comparison page names the preset it is about; a calculator page shows its own defaults.
    let inputs = calc.defaults;
    if (route.presetId) {
      const preset = calc.presets.find((p) => p.id === route.presetId);
      if (!preset) throw new Error(`No preset "${route.presetId}" on calculator "${calc.id}" for og route "${route.path}"`);
      inputs = calc.normalize(preset.inputs);
    }
    const summary = calc.summary(inputs, calc.compute(inputs));
    renderShareCard(target, { calculatorName: calc.name, summary }, 'landscape', SCALE);
  } else {
    renderBrandCard(target, brandCardCopy(route), 'landscape', SCALE);
  }
  return canvas.toBuffer('image/png');
}

/** Replaces a meta tag's content in place, or appends the tag if the document has none. */
function setMeta(html: string, attr: 'property' | 'name', key: string, value: string): string {
  const tag = new RegExp(`<meta\\s+${attr}="${key}"\\s+content="[^"]*"\\s*/?>`);
  const next = `<meta ${attr}="${key}" content="${escapeAttr(value)}" />`;
  return tag.test(html) ? html.replace(tag, next) : html.replace('</head>', `    ${next}\n  </head>`);
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function pageHtml(shell: string, route: OgRoute): string {
  const imageUrl = `${SITE_URL}og/${route.image}.png`;
  // Nested routes are served as <path>/index.html, so the URL that returns 200 ends in a slash.
  // The app's own share links omit it and Pages redirects them here, which is what canonical is for.
  const pageUrl = route.path ? `${SITE_URL}${route.path}/` : SITE_URL;
  let html = shell.replace(/<title>[^<]*<\/title>/, `<title>${escapeAttr(route.title)}</title>`);
  html = setMeta(html, 'name', 'description', route.description);
  html = setMeta(html, 'property', 'og:title', route.title);
  html = setMeta(html, 'property', 'og:description', route.description);
  html = setMeta(html, 'property', 'og:url', pageUrl);
  html = setMeta(html, 'property', 'og:image', imageUrl);
  html = setMeta(html, 'property', 'og:image:width', String(WIDTH * SCALE));
  html = setMeta(html, 'property', 'og:image:height', String(HEIGHT * SCALE));
  html = setMeta(html, 'property', 'og:image:alt', route.alt);
  html = setMeta(html, 'name', 'twitter:title', route.title);
  html = setMeta(html, 'name', 'twitter:description', route.description);
  html = setMeta(html, 'name', 'twitter:image', imageUrl);
  html = setMeta(html, 'name', 'twitter:image:alt', route.alt);
  // A crawler that ignores og:url still needs to know which URL is canonical.
  const canonical = `<link rel="canonical" href="${escapeAttr(pageUrl)}" />`;
  html = /<link rel="canonical"[^>]*>/.test(html) ? html.replace(/<link rel="canonical"[^>]*>/, canonical) : html.replace('</head>', `    ${canonical}\n  </head>`);
  return html;
}

const shell = readFileSync(join(dist, 'index.html'), 'utf8');
if (!shell.includes('</head>')) throw new Error('dist/index.html has no </head>; cannot inject link previews');

mkdirSync(join(dist, 'og'), { recursive: true });

for (const route of OG_ROUTES) {
  writeFileSync(join(dist, 'og', `${route.image}.png`), draw(route));

  const html = pageHtml(shell, route);
  if (route.path === '') {
    writeFileSync(join(dist, 'index.html'), html);
  } else {
    // A directory with an index.html, so Pages serves the real document at /path/ rather than
    // falling through to the SPA 404 with the homepage's tags.
    const dir = join(dist, route.path);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), html);
  }
}

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...OG_ROUTES.map((r) => `  <url><loc>${r.path ? `${SITE_URL}${r.path}/` : SITE_URL}</loc></url>`),
  '</urlset>',
  '',
].join('\n');
writeFileSync(join(dist, 'sitemap.xml'), sitemap);
writeFileSync(join(dist, 'robots.txt'), `User-agent: *
Allow: /
Sitemap: ${SITE_URL}sitemap.xml
`);

console.log(`og: ${OG_ROUTES.length} images and pages written for ${SITE_URL}, plus sitemap.xml and robots.txt`);
