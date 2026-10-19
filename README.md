# MagangHub Tracker (rebuild fungsional)

Rebuild bersih dari `https://magang-nasional.faaris.id/` (Vite + React). Sumber data publik Kemnaker/MagangHub.

## Asal (hasil reverse-engineer)
- Situs asli: Vite + React SPA, state `zustand` persist, nama storage `magang-nasional-tracker-storage-v2`.
- Route asli: `/` (eksplorasi), `/mitra`, `/penyelenggara` → redirect `/mitra`, `/tracker`.
- Data: `https://magang-nasional.faaris.id/data/manifest.json` (CORS `*`), lalu `dict`, `list[]`, `organizers`, `skills`, `detail.files[64]`.
- Detail shard untuk sebuah id: `parseInt(id.slice(-2), 16) % 64`.
- `/api/match` (AI) = Cloudflare Function di origin asli; **tidak** di-clone di sini.

## Struktur data (terkompresi, sama seperti aslinya)
Item list ringkas: `i` id, `t` title, `o` organizer, `c` city idx, `sp` studyProgram idx, `e` education, `q` kuota, `aq` kuota ACC, `ta` total pelamar, `td` deskripsi, `sk` skill idx, `wd` hari kerja, `dof` libur, `lat`/`lng`, `ca`/`ua`/`pa` tanggal.
`dict`: `cities`, `studyPrograms`, `organizers` (map id → `[nama, tipe]`).

## Skor peluang
4 faktor berbobot: rasio kuota/pelamar 50%, ukuran pool 20%, tren 20%, multi-kuota 10%. Level: ≥70 Sangat Tinggi, ≥50 Tinggi, ≥30 Sedang, ≥15 Rendah, else Sangat Rendah.
`ponytail:` kurva rasio diekstrapolasi (rumus eksak tertutup minifikasi).

## Kekurangan vs asli
- AI match (`/api/match`), PRNG score eksak, analytics, AdSense, dan generator OG image tidak disertakan.
- Data diambil live saat runtime (bukan snapshot offline).

## Pakai
```
npm install
npm run dev      # http://localhost:5173
npm run build
node test/smoke.mjs   # cek normalisasi + skor + akses data live
```
