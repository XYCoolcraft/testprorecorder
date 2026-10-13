'use strict';
/**
 * Build website ProRec  ->  dist/
 *  - menghasilkan halaman per bahasa (id di "/", en di "/en") dari src/page.html + src/locales/*.json
 *  - SEO: title/description, canonical, hreflang, Open Graph, Twitter Card, JSON-LD
 *    (SoftwareApplication, FAQPage, WebSite, Organization), sitemap.xml, robots.txt
 *  - minify CSS/JS + nama file ber-hash (cache 1 tahun)
 *  - jika installer ada di downloads/, hitung SHA-256 & ukuran otomatis
 * Tanpa dependensi (hanya modul bawaan Node).
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const readJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const cfg = readJSON(path.join(ROOT, 'site.config.json'));
const BASE = cfg.url.replace(/\/+$/, '');

// ---------------------------------------------------------------- util
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const get = (obj, p) => p.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
const sha8 = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 8);
const mkdir = (p) => fs.mkdirSync(p, { recursive: true });
const write = (rel, data) => { const f = path.join(DIST, rel); mkdir(path.dirname(f)); fs.writeFileSync(f, data); };

function copyDir(from, to) {
  mkdir(to);
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name), b = path.join(to, e.name);
    e.isDirectory() ? copyDir(a, b) : fs.copyFileSync(a, b);
  }
}

function minCss(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ')
    .replace(/\s*([{};,>])\s*/g, '$1').replace(/;}/g, '}').replace(/\s*:\s*(?=[^{}]*[;}])/g, ':').trim();
}
function minJs(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/^\s+/, ''))
    .filter((l) => l && !/^\/\//.test(l)).join('\n');
}

// ---------------------------------------------------------- template mini
function render(tpl, ctx) {
  tpl = tpl.replace(/{{#each ([\w.]+)}}([\s\S]*?){{\/each}}/g, (_, p, inner) =>
    (get(ctx, p) || []).map((item, i) => render(inner, { ...ctx, this: item, index: i, n: i + 1 })).join(''));
  tpl = tpl.replace(/{{#if (!?)([\w.]+)}}([\s\S]*?){{\/if}}/g, (_, neg, p, inner) => {
    const [a, b = ''] = inner.split('{{else}}');
    const v = !!get(ctx, p);
    return render((neg ? !v : v) ? a : b, ctx);
  });
  tpl = tpl.replace(/{{{\s*([\w.]+)\s*}}}/g, (_, p) => String(get(ctx, p) ?? ''));
  return tpl.replace(/{{\s*([\w.]+)\s*}}/g, (_, p) => esc(get(ctx, p) ?? ''));
}

// ---------------------------------------------------------------- ikon
const svg = (d) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
const ICONS = {
  monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  shield: '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
  pointer: '<path d="M5 3l14 7-6 2-2 6z"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  scissors: '<circle cx="6" cy="7" r="2.5"/><circle cx="6" cy="17" r="2.5"/><path d="M8 8.5L20 18M8 15.5L20 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  hash: '<path d="M5 9h14M5 15h14M10 4L8 20M16 4l-2 16"/>',
  eyeoff: '<path d="M3 3l18 18"/><path d="M10.6 6.1A9.5 9.5 0 0 1 21 12a14 14 0 0 1-3 3.6M6.3 7.3A14 14 0 0 0 3 12s3.5 6 9 6a9 9 0 0 0 3.4-.7"/>',
  box: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>',
  file: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
};
const icon = (n) => svg(ICONS[n] || ICONS.spark);

// ------------------------------------------------------------ persiapan
fs.rmSync(DIST, { recursive: true, force: true });
mkdir(DIST);

// installer lokal (opsional) -> checksum & ukuran otomatis
const site = { ...cfg };
const installer = path.join(ROOT, cfg.installerFile || '');
if (cfg.installerFile && fs.existsSync(installer)) {
  const buf = fs.readFileSync(installer);
  site.sha256 = crypto.createHash('sha256').update(buf).digest('hex');
  site.sizeMB = Math.round((buf.length / 1048576) * 10) / 10;
  site.sizeEstimated = false;
  if (!site.downloadUrl) site.downloadUrl = '/downloads/' + path.basename(installer);
  write('downloads/' + path.basename(installer), buf);
  console.log(`installer ditemukan: ${site.sizeMB} MB  sha256=${site.sha256.slice(0, 12)}...`);
}
site.sizeText = (site.sizeEstimated ? '≈ ' : '') + String(site.sizeMB).replace('.', ',') + ' MB';
site.installerName = path.basename(cfg.installerFile || `ProRec-Setup-${cfg.version}.exe`);
site.hasSha = !!site.sha256;
site.hasPortable = !!site.portableUrl;

// aset: minify + hash
const css = minCss(fs.readFileSync(path.join(SRC, 'assets/css/style.css'), 'utf8'));
const js = minJs(fs.readFileSync(path.join(SRC, 'assets/js/app.js'), 'utf8'));
const cssName = `style.${sha8(css)}.css`, jsName = `app.${sha8(js)}.js`;
write('assets/css/' + cssName, css);
write('assets/js/' + jsName, js);
copyDir(path.join(SRC, 'assets/img'), path.join(DIST, 'assets/img'));
fs.copyFileSync(path.join(SRC, 'favicon.ico'), path.join(DIST, 'favicon.ico'));

// ------------------------------------------------------------- halaman
const locales = {};
for (const l of cfg.languages) locales[l] = readJSON(path.join(SRC, 'locales', `${l}.json`));
const pageTpl = fs.readFileSync(path.join(SRC, 'page.html'), 'utf8');
const notFoundTpl = fs.readFileSync(path.join(SRC, '404.html'), 'utf8');
const urlFor = (l) => (l === cfg.defaultLanguage ? BASE + '/' : `${BASE}/${l}`);
const pathFor = (l) => (l === cfg.defaultLanguage ? '/' : `/${l}`);
const SHOTS = { rec: 'rec', set: 'set', overlay: 'overlay', hist: 'hist', about: 'about' };

function jsonLd(l, t) {
  const abs = (p) => BASE + p;
  const app = {
    '@context': 'https://schema.org', '@type': 'SoftwareApplication',
    name: cfg.name, alternateName: `${cfg.name} Screen Recorder`, description: t.meta.description,
    applicationCategory: 'MultimediaApplication', operatingSystem: 'Windows 10, Windows 11',
    softwareVersion: cfg.version, datePublished: cfg.releaseDate, dateModified: cfg.releaseDate,
    fileSize: `${site.sizeMB}MB`, downloadUrl: site.downloadUrl.startsWith('http') ? site.downloadUrl : abs(site.downloadUrl),
    installUrl: urlFor(l) + '#download', inLanguage: ['id', 'en', 'es', 'fr', 'ja'],
    isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    author: { '@type': 'Organization', name: cfg.creator, url: BASE },
    image: abs(`/assets/img/og-${l}.png`),
    screenshot: Object.values(SHOTS).map((k) => abs(`/assets/img/${k}.${l}.webp`)),
    featureList: t.features.items.map((f) => f.title),
  };
  const faq = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: t.faq.items.map((q) => ({ '@type': 'Question', name: q.q,
      acceptedAnswer: { '@type': 'Answer', text: q.a.replace(/<[^>]+>/g, '') } })),
  };
  const webs = { '@context': 'https://schema.org', '@type': 'WebSite', name: cfg.name, url: BASE, inLanguage: l,
    publisher: { '@type': 'Organization', name: cfg.creator } };
  const org = { '@context': 'https://schema.org', '@type': 'Organization', name: cfg.creator, url: BASE,
    logo: abs('/assets/img/icon-512.png'), sameAs: cfg.socials.map((s) => s.url) };
  return [app, faq, webs, org].map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('\n');
}

for (const l of cfg.languages) {
  const t = JSON.parse(JSON.stringify(locales[l]));
  t.features.items.forEach((f) => { f.svg = icon(f.icon); });
  t.proof.items.forEach((f) => { f.svg = icon(f.icon); });
  t.compare.rows.forEach((r) => { r.bNo = !r.bOk && !r.bMid; });
  t.preview.tabs.forEach((tab, i) => { tab.img = `/assets/img/${SHOTS[tab.key]}.${l}.webp`; tab.first = i === 0; tab.selected = i === 0 ? 'true' : 'false'; tab.tabindex = i === 0 ? '0' : '-1'; });
  const others = cfg.languages.filter((x) => x !== l);
  const ctx = {
    t, site, lang: l, canonical: urlFor(l), base: BASE,
    ogImage: `${BASE}/assets/img/og-${l}.png`, ogLocale: t.locale,
    ogLocaleAlt: others.map((o) => `<meta property="og:locale:alternate" content="${locales[o].locale}">`).join('\n'),
    hreflangs: [...cfg.languages.map((x) => `<link rel="alternate" hreflang="${x}" href="${urlFor(x)}">`),
      `<link rel="alternate" hreflang="x-default" href="${urlFor(cfg.defaultLanguage)}">`].join('\n'),
    switchHref: pathFor(others[0] || l), switchLabel: t.switchLabel, switchCode: (others[0] || l).toUpperCase(),
    assets: { css: `/assets/css/${cssName}`, js: `/assets/js/${jsName}` },
    jsonld: jsonLd(l, t), year: new Date(cfg.releaseDate).getFullYear(),
    ic: Object.fromEntries(Object.keys(ICONS).map((k) => [k, icon(k)])),
    socials: cfg.socials, themeColor: '#0d0f14',
    googleVerification: cfg.googleVerification, bingVerification: cfg.bingVerification,
  };
  const html = render(pageTpl, ctx);
  write(l === cfg.defaultLanguage ? 'index.html' : `${l}/index.html`, html);
}

// 404 (noindex)
{
  const l = cfg.defaultLanguage; const t = locales[l];
  write('404.html', render(notFoundTpl, { t, site, lang: l, assets: { css: `/assets/css/${cssName}`, js: `/assets/js/${jsName}` }, ic: { arrow: icon('arrow') } }));
}

// ----------------------------------------------------------- file SEO
const alt = (l) => cfg.languages.map((x) => `    <xhtml:link rel="alternate" hreflang="${x}" href="${urlFor(x)}"/>`).join('\n') +
  `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${urlFor(cfg.defaultLanguage)}"/>`;
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${cfg.languages.map((l) => `  <url>
    <loc>${urlFor(l)}</loc>
    <lastmod>${cfg.releaseDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${l === cfg.defaultLanguage ? '1.0' : '0.9'}</priority>
${alt(l)}
  </url>`).join('\n')}
</urlset>
`);
write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /404\n\nSitemap: ${BASE}/sitemap.xml\n`);
write('version.json', JSON.stringify({ name: cfg.name, version: cfg.version, released: cfg.releaseDate,
  download: `${BASE}/#download`, sha256: site.sha256 || null, sizeMB: site.sizeMB }, null, 2) + '\n');
write('manifest.webmanifest', JSON.stringify({
  name: `${cfg.name} Screen Recorder`, short_name: cfg.name, start_url: '/', scope: '/', display: 'standalone',
  background_color: '#0d0f14', theme_color: '#0d0f14', description: locales[cfg.defaultLanguage].meta.description,
  icons: [{ src: '/assets/img/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/assets/img/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }],
}, null, 2) + '\n');
write('humans.txt', `/* TEAM */\nCreator: ${cfg.creator}\n\n/* SITE */\nSoftware: ${cfg.name} ${cfg.version}\nStandards: HTML5, CSS3, ES2020\n`);
write('llms.txt', `# ${cfg.name} - free screen recorder for Windows (by ${cfg.creator})\n\n> ${locales.en.meta.description}\n\n- Official site: ${BASE}/\n- English: ${BASE}/en\n- Download: ${BASE}/#download\n- Version: ${cfg.version}\n- License: freeware, no telemetry, no ads\n`);

console.log(`build selesai -> dist/  (${cfg.languages.join(', ')})  css=${cssName} js=${jsName}`);
