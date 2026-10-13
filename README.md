# ProRec — Official Website

Website resmi ProRec (by XYCoolcraft). Node.js 24, tanpa dependensi, HTML/CSS/JS terpisah, dua bahasa (id di `/`, en di `/en`).

## Jalankan lokal
```bash
npm start        # build otomatis (prestart) lalu buka http://localhost:3000
npm test         # build + 40+ pemeriksaan (SEO, tautan, JSON-LD, CSP-safe)
```

## Edit konten
| Apa | File |
|---|---|
| Domain, versi, tautan unduh, sosial media, verifikasi Google | `site.config.json` |
| Teks (Indonesia / English) | `src/locales/id.json`, `src/locales/en.json` |
| Struktur halaman | `src/page.html` |
| Tampilan / interaksi | `src/assets/css/style.css`, `src/assets/js/app.js` |
| Screenshot | `src/assets/img/` |

**Checksum & ukuran otomatis:** taruh installer di `downloads/ProRec-Setup-2.1.0.exe`, lalu `npm run build` —
SHA-256 dan ukuran terisi sendiri di halaman, `version.json`, dan JSON-LD.
(Installer besar sebaiknya di GitHub Releases; isi `downloadUrl`.)

## Deploy ke Vercel (paket Free / Hobby)
1. Upload folder ini ke GitHub → vercel.com → **Add New Project** → pilih repo.
2. Framework Preset **Other**; setting lain otomatis dari `vercel.json` (build `node scripts/build.js`, output `dist`).
3. Deploy. Tambahkan domain sendiri di **Settings → Domains**, lalu ubah `url` di `site.config.json`.
Hanya memakai fitur gratis: situs statis + headers/redirects (tanpa Serverless Function, tanpa cron).

## Checklist agar muncul di Google
1. Ubah `url` ke domain final, deploy ulang.
2. Daftar **Google Search Console** → isi `googleVerification` (meta tag) → **Sitemaps** → kirim `sitemap.xml`.
3. Daftar **Bing Webmaster Tools** (`bingVerification`).
4. Buat video/artikel + tautan balik (GitHub README, YouTube, forum) yang menuju website ini.
5. Jaga nama konsisten: **ProRec**, **XYCoolcraft**.
SEO bawaan: title/description, canonical, hreflang, Open Graph/Twitter, JSON-LD (SoftwareApplication, FAQPage, WebSite, Organization), sitemap, robots, kecepatan (brotli, cache 1 tahun, tanpa framework).
