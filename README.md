# MagangHub Tracker (rebuild fungsional)

Rebuild bersih dari `https://magang-nasional.faaris.id/` (Vite + React). Sumber data publik Kemnaker/MagangHub.

## Asal (hasil reverse-engineer)
- Situs asli: Vite + React SPA, state `zustand` persist, nama storage `magang-nasional-tracker-storage-v2`.
- Route asli: `/` (eksplorasi), `/mitra`, `/penyelenggara` → redirect `/mitra`, `/tracker`.
- Data: `https://magang-nasional.faaris.id/data/manifest.json` (CORS `*`), lalu `dict`, `list[]`, `organizers`, `skills`, `detail.files[64]`.
- Detail shard sebuah id: `parseInt(id.slice(-2), 16) % 64`.
- Skor peluang + level ada di modul `seo.js` (fungsi `ft`/`pt`/`ht`), bukan `index.js`.

## Struktur data (terkompresi, sama seperti aslinya)
Item list ringkas: `i` id, `t` title, `o` organizer, `c` city idx, `sp` studyProgram idx, `e` education, `q` kuota, `aq` kuota ACC, `ta` total pelamar, `td` deskripsi, `sk` skill idx, `wd` hari kerja, `dof` libur, `lat`/`lng`, `ca`/`ua`/`pa` tanggal.
`dict`: `cities`, `studyPrograms`, `organizers` (map id → `[nama, tipe]`).

## Skor peluang (rumus eksak)
`ft`: 4 faktor berbobot — rasio kuota/pelamar 50% (`100·(1−e^(−2·q/p)`), pool pelamar 20% (bucket `p`), tren 20% (default 50; map riwayat pelamar per-posisi tidak ada di manifest publik), multi-kuota 10% (bucket `q`). Persaingan nol → 90/95/100 berdasar kuota.
Level: ≥70 Sangat Tinggi, ≥50 Tinggi, ≥30 Sedang, ≥15 Rendah, else Sangat Rendah.

## AI match
- Client `POST /api/match` (same-origin) → `functions/api/match.js` (Cloudflare Pages) + middleware dev di `vite.config.js`.
- **Endpoint AI asli situs dipakai via proxy server-side**: `https://magang-nasional.faaris.id/api/match`, default `MATCH_UPSTREAM`.
  - Kontrak: mode `expand` → `{jurusan,minat,degraded}`; mode `stream:true` → NDJSON `{type:'result',result:{id,score,reason}}` … `{type:'done',degraded}`.
  - POST-nya tak mengirim header CORS, jadi **harus** dipanggil dari server (bukan browser). 429 → `retryAfter`, 403 → fallback.
- Bila upstream `degraded`/mati (kondisi saat ini) → otomatis fallback ke ranker deterministik `shared/match.js` (`degraded:true`).
- Matikan upstream: `MATCH_UPSTREAM=""`. Ganti ke LLM sendiri: isi URL + `MATCH_UPSTREAM_KEY`.

## Data offline (opsional)
- `node scripts/mirror-data.mjs` → unduh semua shard ke `public/data` (~90MB, di-`gitignore`).
- App memilih base otomatis: `VITE_DATA_BASE` → `/data` lokal → origin remote.

## Pakai
```
npm install
npm run dev            # http://localhost:5173  (API match ikut di dev)
npm run build
node test/smoke.mjs    # normalisasi + skor eksak + ranker + akses data live
node scripts/mirror-data.mjs   # snapshot offline opsional
```

## Keamanan & ketahanan
- **Tanpa secret di client.** Endpoint AI asli dipanggil server-side (proxy); bundle bersih dari kunci.
- **Proxy `/api/match` dibatasi**: body maks 2 MB (413), kandidat maks 2000, field dipotong (`sanitizeInput`). `ALLOWED_ORIGIN` (Pages env) bisa mengunci domain; default `*`.
- **URL eksternal divalidasi** (`safeUrl`): hanya `http(s)://` untuk logo mitra; `referrerPolicy="no-referrer"`. Link keluar pakai `rel="noreferrer"`.
- **`share` param dibatasi** (500 id, panjang ≤80) saat impor tracker.
- **Dev server bind `localhost`** (bukan LAN). `HOST=1 npm run dev` untuk membuka ke LAN.
- **ErrorBoundary** global → tak layar putih saat error render.
- **A11y**: kartu & modal `role`/`tabIndex`/keyboard, fokus otomatis, scroll-lock.
- **`npm audit` = 0** (react-router 7, vite 7; bukan lagi 6/5).
- CSP (saran, set di host, bukan meta): `default-src 'self'; img-src 'self' https://maganghub.kemnaker.go.id data:; connect-src 'self' https://magang-nasional.faaris.id; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'`.

## Sengaja tidak disertakan
- AdSense, Cloudflare Analytics (butuh ID/token milik pemilik situs).
- `contextmenu` disable (merusak UX/aksesibilitas).
- Generator OG image (butuh aset/desain).
- SEO fallback + JSON-LD, console warning asli: versi ringan sudah ada di `index.html`.
