'use strict';
// `npm test`: build lalu periksa hasilnya (tanpa dependensi).
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
execFileSync(process.execPath, [path.join(__dirname, 'build.js')], { stdio: 'inherit' });

const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.error('  GAGAL:', m); } else console.log('  ok   ', m); };
const pages = cfg.languages.map((l) => [l, l === cfg.defaultLanguage ? 'index.html' : `${l}/index.html`]);

for (const [l, f] of pages) {
  console.log(`\n[${l}] ${f}`);
  const html = fs.readFileSync(path.join(DIST, f), 'utf8');
  ok(!/{{|}}/.test(html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '')), 'tidak ada placeholder template yang tersisa');
  ok(new RegExp(`<html lang="${l}">`).test(html), 'atribut lang benar');
  const title = (html.match(/<title>(.*?)<\/title>/) || [])[1] || '';
  ok(title.length > 20 && title.length <= 70, `title ${title.length} karakter (ideal <= 70)`);
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  ok(desc.length >= 100 && desc.length <= 170, `meta description ${desc.length} karakter (ideal 100-170)`);
  ok((html.match(/<h1[ >]/g) || []).length === 1, 'tepat satu <h1>');
  ok(/<link rel="canonical" href="https?:\/\//.test(html), 'canonical ada');
  ok((html.match(/hreflang="/g) || []).length >= cfg.languages.length + 1, 'hreflang + x-default ada');
  ok(/property="og:image" content="https?:\/\//.test(html), 'og:image absolut');
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)];
  let jsonOk = blocks.length >= 4;
  for (const b of blocks) { try { JSON.parse(b[1]); } catch { jsonOk = false; } }
  ok(jsonOk, `JSON-LD valid (${blocks.length} blok)`);
  const imgs = [...html.matchAll(/<img [^>]*>/g)].map((m) => m[0]);
  ok(imgs.every((i) => /\balt="/.test(i)), `semua ${imgs.length} <img> punya alt`);
  ok(imgs.every((i) => /\bwidth="/.test(i) && /\bheight="/.test(i)), 'semua <img> punya width/height (anti layout-shift)');
  ok(!/<script(?![^>]*(src=|application\/ld\+json))/.test(html), 'tidak ada script inline (aman untuk CSP)');
  ok(!/\sstyle="/.test(html), 'tidak ada style inline (aman untuk CSP)');
  // semua tautan/aset lokal harus ada
  const refs = [...html.matchAll(/(?:href|src)="(\/[^"#?]*)/g)].map((m) => m[1]);
  const missing = [...new Set(refs)].filter((r) => {
    if (r === '/') return false;
    const p = path.join(DIST, r);
    return !(fs.existsSync(p) || fs.existsSync(p + '.html') || fs.existsSync(path.join(p, 'index.html')));
  });
  ok(missing.length === 0, 'tidak ada tautan/aset lokal yang rusak' + (missing.length ? ': ' + missing.join(', ') : ''));
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  ok(new Set(ids).size === ids.length, 'id unik');
  const anchors = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
  ok(anchors.every((a) => ids.includes(a)), 'semua anchor (#...) menuju id yang ada');
}
console.log('\n[file SEO]');
const sm = fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
ok(cfg.languages.every((l) => sm.includes(`hreflang="${l}"`)), 'sitemap memuat hreflang semua bahasa');
ok(fs.readFileSync(path.join(DIST, 'robots.txt'), 'utf8').includes('Sitemap:'), 'robots.txt menunjuk sitemap');
ok(JSON.parse(fs.readFileSync(path.join(DIST, 'version.json'), 'utf8')).version === cfg.version, 'version.json cocok dengan config');
ok(fs.existsSync(path.join(DIST, '404.html')), '404.html ada');
console.log(fail ? `\n${fail} pemeriksaan GAGAL` : '\nSemua pemeriksaan lulus');
process.exit(fail ? 1 : 0);
