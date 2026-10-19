// Data layer. Sumber: /data/*.json publik (CORS *). Skema field sama dgn bundle asli.
// Urutan resolusi base: VITE_DATA_BASE -> /data lokal (hasil scripts/mirror-data.mjs) -> origin.
export const REMOTE_BASE = "https://magang-nasional.faaris.id/data";
export const DATA_BASE = REMOTE_BASE; // alias kompatibilitas
export const ORIGIN = "https://maganghub.kemnaker.go.id/magang-nasional/lowongan";

let BASE = null;
export function getBase() {
  return BASE;
}
// Probe /data lokal; validasi JSON agar SPA-fallback HTML (200) tidak dianggap data.
async function probeLocal() {
  try {
    const res = await fetch("/data/manifest.json", { cache: "no-cache" });
    if (!res.ok) return null;
    const j = await res.json();
    if (j && Array.isArray(j.list)) return j;
  } catch {
    /* bukan JSON / tidak ada */
  }
  return null;
}
export const YEAR = 2026;
export const BATCH_LABEL = "Batch 2";

const EDU = {
  high_school: "SMA/SMK",
  vocational: "SMK",
  diploma: "Diploma",
  bachelor: "S1",
  master: "S2",
  doctor: "S3",
  profession: "Profesi",
};

const DAYS = { sunday: "Min", monday: "Sen", tuesday: "Sel", wednesday: "Rab", thursday: "Kam", friday: "Jum", saturday: "Sab" };

export async function fetchJSON(url, cache) {
  const res = await fetch(url, cache ? { cache } : undefined);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

export const slugify = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
export const idToLink = (p) => `${ORIGIN}/${slugify(p.title ?? p.t)}-${p.id ?? p.i}`;
const shardIndex = (id, shards) => {
  const n = parseInt(String(id).slice(-2), 16);
  return Number.isNaN(n) ? 0 : n % shards;
};

function mapSkills(raw, skills) {
  if (!Array.isArray(raw.sk) || raw.sk.length === 0 || !Array.isArray(skills)) return ["Kompetensi Magang"];
  const names = raw.sk.map((i) => skills[i]).filter(Boolean);
  return names.length ? names : ["Kompetensi Magang"];
}

// Normalisasi item list ringkas -> objek penuh. Cerminan fungsi Mi() bundle asli.
// skills = array nama dari manifest.skills (indeks `sk`).
export function normalize(raw, dict, skills) {
  const [cityName, province] = dict.cities?.[raw.c] || [];
  const [orgName, orgType] = dict.organizers?.[raw.o] || [];
  let jurusan = "Semua Jurusan";
  if (Array.isArray(raw.sp) && raw.sp.length) {
    const names = raw.sp.map((i) => dict.studyPrograms?.[i]).filter(Boolean);
    if (names.length) jurusan = names.join(", ");
  }
  let edu = "S1";
  if (Array.isArray(raw.e) && raw.e.length) {
    const names = raw.e.map((e) => EDU[e] || e).filter(Boolean);
    if (names.length) edu = names.join(", ");
  }
  const quota = raw.q || 1;
  const hasAq = typeof raw.aq === "number";
  return {
    id: raw.i || "vac-id",
    title: raw.t || "Posisi Magang",
    company: orgName || "Mitra",
    organizer_id: raw.o || null,
    organizer: raw.o ? { id: raw.o, name: orgName || "Mitra", type: orgType ?? null } : null,
    location: cityName || "Indonesia",
    province: province || "Indonesia",
    duration: "3-6 bulan",
    salary: "Uang Saku Tersedia",
    uang_saku: typeof raw.us === "number" ? raw.us : null,
    deadline: "Sesuai Batch",
    logo: orgName ? orgName.substring(0, 3).toUpperCase() : "MIT",
    positions: hasAq && raw.aq !== quota ? `${raw.aq} ACC / ${quota} Diajukan` : `${quota} kuota`,
    quantity_needed: quota,
    approved_quantity: hasAq ? raw.aq : quota,
    total_applications: typeof raw.ta === "number" ? raw.ta : null,
    jurusan,
    tingkat_pendidikan: edu,
    job_description: raw.td || "",
    skills: mapSkills(raw, skills),
    curriculum: [],
    _sk: raw.sk || null,
    _tr: typeof raw.tr === "number" ? raw.tr : null,
    working_days: raw.wd,
    days_off: (raw.dof || []).map((d) => DAYS[d] || d),
    latitude: raw.lat,
    longitude: raw.lng,
    created_at: raw.ca,
    updated_at: raw.ua,
    published_at: raw.pa,
    date: raw.ca || raw.ua || raw.pa,
    active: raw.a !== 0,
    closed_at: raw.cl || null,
  };
}

// Stream data: manifest -> shard awal (tampil cepat) -> hydrate sisanya + skills.
export async function loadManifest() {
  const env = import.meta.env?.VITE_DATA_BASE;
  if (env) {
    BASE = env;
    return fetchJSON(`${env}/manifest.json`, "no-cache");
  }
  const local = await probeLocal();
  if (local) {
    BASE = "/data";
    return local;
  }
  BASE = REMOTE_BASE;
  return fetchJSON(`${REMOTE_BASE}/manifest.json`, "no-cache");
}

export async function loadShard(path) {
  if (!BASE) await loadManifest();
  return fetchJSON(`${BASE}/${path}`);
}

export async function detailShardFor(id, manifest) {
  if (!manifest?.detail?.files?.length) return null;
  const idx = shardIndex(id, manifest.detail.shards);
  return manifest.detail.files[idx] || null;
}

// --- Skor peluang. Rumus EKSAK dari modul seo.js bundle asli (fungsi ft).
// 4 faktor berbobot: rasio kuota/pelamar 50%, pool pelamar 20%, tren 20%, multi-kuota 10%.
// Tren default 50 karena map riwayat pelamar per-posisi tidak tersedia di manifest publik.
const num = (e) => (typeof e === "number" ? e : (e && parseInt(String(e).replace(/\D/g, ""), 10)) || 0);

export function scoreOf(p, historyById) {
  const apps = num(p.total_applications);
  const quota = num(p.approved_quantity ?? p.quantity_needed) || 1;
  if (apps === 0) return quota >= 5 ? 100 : quota >= 2 ? 95 : 90;

  const ratio = quota / apps; // kuota per pelamar
  const rasio = Math.min(100, 100 * (1 - Math.exp(-2 * ratio))); // 50%
  const pool = apps < 3 ? 40 : apps < 10 ? 55 : apps < 30 ? 65 : apps < 100 ? 60 : 45; // 20%
  const growth = historyById?.[p.id]; // 20%
  const trend = growth === undefined ? 50 : growth > 0 ? Math.min(100, 100 * Math.exp(-0.007 * growth)) : 80;
  const multi = quota >= 10 ? 100 : quota >= 5 ? 80 : quota >= 3 ? 60 : quota >= 2 ? 40 : 10; // 10%

  const f = rasio * 0.5 + pool * 0.2 + trend * 0.2 + multi * 0.1;
  return Math.round(Math.min(100, Math.max(0, f)));
}
export const scoreText = (p, h) => `${scoreOf(p, h)}/100`;
export const levelOf = (s) =>
  s >= 70 ? "Sangat Tinggi" : s >= 50 ? "Tinggi" : s >= 30 ? "Sedang" : s >= 15 ? "Rendah" : "Sangat Rendah";
