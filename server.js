'use strict';
/**
 * Server statis tanpa dependensi (Node 24) untuk `npm start`.
 * Menyajikan folder dist/ dengan: kompresi brotli/gzip, ETag + 304, cache header,
 * header keamanan, clean URL, halaman 404, perlindungan path traversal, /healthz.
 * (Di Vercel, folder dist/ disajikan langsung oleh CDN memakai vercel.json.)
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');

const DIST = path.join(__dirname, 'dist');
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.jpg': 'image/jpeg', '.woff2': 'font/woff2',
};
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.json', '.webmanifest', '.xml', '.txt', '.svg']);
const CSP = "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; " +
  "font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'";
const SECURITY = {
  'Content-Security-Policy': CSP,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

const cache = new Map(); // filePath -> { mtimeMs, raw, etag, br, gz }

function load(file) {
  const st = fs.statSync(file);
  const hit = cache.get(file);
  if (hit && hit.mtimeMs === st.mtimeMs) return hit;
  const raw = fs.readFileSync(file);
  const ext = path.extname(file).toLowerCase();
  const entry = { mtimeMs: st.mtimeMs, raw, etag: '"' + crypto.createHash('sha1').update(raw).digest('base64url').slice(0, 20) + '"' };
  if (COMPRESSIBLE.has(ext) && raw.length > 512) {
    entry.br = zlib.brotliCompressSync(raw, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 9 } });
    entry.gz = zlib.gzipSync(raw, { level: 9 });
  }
  cache.set(file, entry);
  return entry;
}

function cacheControl(rel, ext) {
  if (/^assets\/(css|js)\//.test(rel)) return 'public, max-age=31536000, immutable';
  if (rel.startsWith('assets/')) return 'public, max-age=604800, stale-while-revalidate=86400';
  if (ext === '.html') return 'no-cache';
  return 'public, max-age=3600';
}

function resolve(urlPath) {
  let p;
  try { p = decodeURIComponent(urlPath); } catch { return null; }
  if (p.includes('\0')) return null;
  const norm = path.posix.normalize(p);
  const candidates = [norm, norm + '.html', path.posix.join(norm, 'index.html')];
  for (const c of candidates) {
    const abs = path.join(DIST, c);
    if (!abs.startsWith(DIST + path.sep) && abs !== DIST) return null; // path traversal
    try { if (fs.statSync(abs).isFile()) return abs; } catch { /* next */ }
  }
  return undefined;
}

function send(req, res, status, file, extra = {}) {
  const ext = path.extname(file).toLowerCase();
  const e = load(file);
  const headers = {
    ...SECURITY, ...extra,
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': extra['Cache-Control'] || cacheControl(path.relative(DIST, file).replace(/\\/g, '/'), ext),
    ETag: e.etag, Vary: 'Accept-Encoding',
  };
  if (req.headers['x-forwarded-proto'] === 'https') headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains';
  if (status === 200 && req.headers['if-none-match'] === e.etag) { res.writeHead(304, headers); return res.end(); }
  const ae = String(req.headers['accept-encoding'] || '');
  let body = e.raw;
  if (e.br && /\bbr\b/.test(ae)) { body = e.br; headers['Content-Encoding'] = 'br'; }
  else if (e.gz && /\bgzip\b/.test(ae)) { body = e.gz; headers['Content-Encoding'] = 'gzip'; }
  headers['Content-Length'] = body.length;
  res.writeHead(status, headers);
  res.end(req.method === 'HEAD' ? undefined : body);
}

const server = http.createServer((req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD', ...SECURITY });
      return res.end('Method Not Allowed');
    }
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' });
      return res.end('ok');
    }
    // /en/ -> /en (sama seperti trailingSlash:false di Vercel); /index.html -> /
    if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
      res.writeHead(308, { Location: url.pathname.slice(0, -1) + url.search });
      return res.end();
    }
    if (url.pathname === '/index.html' || url.pathname === '/id') {
      res.writeHead(308, { Location: '/' });
      return res.end();
    }
    const file = resolve(url.pathname);
    if (file) return send(req, res, 200, file);
    const nf = path.join(DIST, '404.html');
    if (fs.existsSync(nf)) return send(req, res, 404, nf, { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' });
    res.writeHead(404, SECURITY);
    res.end('Not Found');
  } catch (err) {
    console.error(err);
    res.writeHead(500, SECURITY);
    res.end('Internal Server Error');
  }
});

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('dist/ belum ada. Jalankan:  npm run build');
  process.exit(1);
}
server.listen(PORT, HOST, () => console.log(`ProRec website: http://localhost:${PORT}`));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => server.close(() => process.exit(0)));
