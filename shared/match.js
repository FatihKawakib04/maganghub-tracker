// Ranker kecocokan profil -> lowongan (fallback deterministik).
// Menerima bentuk candidate asli (Bp): { id, positionName, studyPrograms[], educationLevels[], city, organizerType, taskDescription }
// sekaligus bentuk internal lama (title/jurusan/location/...).
export const tokenize = (s) =>
  String(s || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);

const overlap = (a, b) => {
  const set = new Set(b);
  return a.some((t) => set.has(t));
};

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

const titleOf = (c) => c.positionName || c.title || "";
const jurusanOf = (c) => (Array.isArray(c.studyPrograms) ? c.studyPrograms.join(" ") : c.jurusan || "");
const cityOf = (c) => c.city || c.location || "";
const eduOf = (c) => (Array.isArray(c.educationLevels) ? c.educationLevels.join(" ") : c.tingkat_pendidikan || "");
const taskOf = (c) => c.taskDescription || (c.skills || []).join(" ") || "";
const orgTypeOf = (c) => c.organizerType || c.organizer?.type || null;

export function rank(profile = {}, candidates = [], limit = 20) {
  const pj = tokenize(profile.jurusan);
  const pm = tokenize(profile.minat);
  const pk = tokenize(profile.kota);

  const scored = candidates.map((c) => {
    const cj = tokenize(jurusanOf(c));
    const title = tokenize(titleOf(c));
    const desc = tokenize(taskOf(c));
    const loc = tokenize(cityOf(c));
    const edu = eduOf(c).toLowerCase();

    let score = 0;
    const reasons = [];

    if (pj.length) {
      if (overlap(pj, cj) || jurusanOf(c).toLowerCase().includes("semua jurusan")) {
        score += 40;
        reasons.push("Jurusan cocok");
      }
    }
    if (pm.length) {
      const hit = pm.filter((t) => title.includes(t) || desc.includes(t));
      if (hit.length) {
        score += 25;
        reasons.push(`Sesuai minat: ${hit.slice(0, 2).join(", ")}`);
      }
    }
    if (pk.length && overlap(pk, loc)) {
      score += 20;
      reasons.push("Lokasi cocok");
    }
    if (profile.jenjang) {
      if (edu.includes(String(profile.jenjang).toLowerCase())) {
        score += 10;
        reasons.push("Jenjang sesuai");
      } else {
        score -= 5;
      }
    }
    if (profile.tipeInstansi && profile.tipeInstansi !== "all" && orgTypeOf(c) === profile.tipeInstansi) {
      score += 5;
      reasons.push("Tipe instansi sesuai");
    }
    const apps = c.total_applications ?? 0;
    const quota = c.approved_quantity ?? c.quantity_needed ?? 1;
    if (c.total_applications === undefined || apps === 0 || quota / Math.max(apps, 1) >= 0.1) {
      score += 10;
      reasons.push("Persaingan rendah");
    }

    return { id: c.id, score: clamp(Math.round(score), 0, 100), reason: reasons.join(" · ") || "Kecocokan umum" };
  });

  scored.sort((a, b) => b.score - a.score);
  return { recommendations: scored.slice(0, limit), degraded: true };
}
