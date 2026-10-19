// Data layer. Sumber: /data/*.json publik (CORS *). Skema field sama dgn bundle asli.
export const DATA_BASE = "https://magang-nasional.faaris.id/data";
export const ORIGIN = "https://maganghub.kemnaker.go.id/magang-nasional/lowongan";
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

function mapSkills(raw, dict) {
  if (!Array.isArray(raw.sk) || raw.sk.length === 0) return ["Kompetensi Magang"];
  const names = raw.sk.map((i) => dict.studyPrograms?.[i]).filter(Boolean);
  return names.length ? names : ["Kompetensi Magang"];
}

// Normalisasi item list ringkas -> objek penuh. Cerminan fungsi Mi() bundle asli.
export function normalize(raw, dict) {
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
    skills: mapSkills(raw, dict),
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
  return fetchJSON(`${DATA_BASE}/manifest.json`, "no-cache");
}

export async function loadShard(path) {
  return fetchJSON(`${DATA_BASE}/${path}`);
}

export async function detailShardFor(id, manifest) {
  if (!manifest?.detail?.files?.length) return null;
  const idx = shardIndex(id, manifest.detail.shards);
  return manifest.detail.files[idx] || null;
}

// --- Skor peluang. Formula asli 4 faktor berbobot: rasio 50%, pool 20%, tren 20%, multi-kuota 10%.
// ponytail: kurva rasio diekstrapolasi, bukan rumus eksak bundle (ditutup minifikasi). Naikkan presisi bila skor jadi fitur kritis.
const ratioScore = (ratio) => 100 * (1 - Math.exp(-ratio * 50));
export function scoreOf(p) {
  const quota = p.approved_quantity ?? p.quantity_needed ?? 1;
  const apps = p.total_applications ?? 0;
  const ratio = apps <= 0 ? 1 : quota / apps;
  const pool = Math.min(apps / 50, 1) * 100;
  const trend = Math.max(0, 100 - Math.min(Math.abs(p._tr ?? 0), 100));
  const multi = (p.quantity_needed ?? 1) > 1 ? 100 : 30;
  return Math.round(0.5 * ratioScore(ratio) + 0.2 * pool + 0.2 * trend + 0.1 * multi);
}
export const levelOf = (s) =>
  s >= 70 ? "Sangat Tinggi" : s >= 50 ? "Tinggi" : s >= 30 ? "Sedang" : s >= 15 ? "Rendah" : "Sangat Rendah";
