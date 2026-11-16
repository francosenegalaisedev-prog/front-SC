import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { SEO, SECTOR_PAGES, LEGAL_PAGES } from "../src/data/seo";

const BASE = "https://www.support-connecte.com";
const DIST = "dist";
const template = readFileSync(`${DIST}/index.html`, "utf8");

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function setTag(html: string, regex: RegExp, tag: string) {
  return regex.test(html)
    ? html.replace(regex, () => tag)
    : html.replace("</head>", () => `  ${tag}\n</head>`);
}

function render(p: { path: string; title: string; description: string }) {
  const url = BASE + (p.path || "/");
  const t = esc(p.title);
  const d = esc(p.description);
  let h = template;
  h = h.replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${t}</title>`);
  h = setTag(h, /<meta[^>]*name="description"[^>]*>/i, `<meta name="description" content="${d}" />`);
  h = setTag(h, /<link[^>]*rel="canonical"[^>]*>/i, `<link rel="canonical" href="${url}" />`);
  h = setTag(h, /<meta[^>]*property="og:title"[^>]*>/i, `<meta property="og:title" content="${t}" />`);
  h = setTag(h, /<meta[^>]*property="og:description"[^>]*>/i, `<meta property="og:description" content="${d}" />`);
  h = setTag(h, /<meta[^>]*property="og:url"[^>]*>/i, `<meta property="og:url" content="${url}" />`);
  h = setTag(h, /<meta[^>]*property="og:image"[^>]*>/i, `<meta property="og:image" content="${BASE}/og-image.png" />`);
  return h;
}

const pages: { path: string; title: string; description: string }[] = [
  ...Object.values(SEO),
  ...SECTOR_PAGES,
  ...LEGAL_PAGES,
];

for (const p of pages) {
  const dir = p.path ? `${DIST}${p.path}` : DIST;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/index.html`, render(p));
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url><loc>${BASE}${p.path || "/"}</loc></url>`).join("\n")}
</urlset>
`;
writeFileSync(`${DIST}/sitemap.xml`, xml);

console.log(`SEO : ${pages.length} pages + sitemap.xml`);
