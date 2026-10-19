// Ranker kecocokan profil -> lowongan. Dipakai server (/api/match) dan fallback client.
// Deterministik, tanpa panggilan LLM. Ganti dengan upstream AI bila ada kunci.

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

export function rank(profile = {}, candidates = [], limit = 20) {
  const pj = tokenize(profile.jurusan);
  const pm = tokenize(profile.minat);
  const pk = tokenize(profile.kota);

  const scored = candidates.map((c) => {
    const cj = tokenize(c.jurusan);
    const title = tokenize(c.title);
    const skills = tokenize((c.skills || []).join(" "));
    const loc = tokenize(c.location);
    const edu = String(c.tingkat_pendidikan || "").toLowerCase();

    let score = 0;
    const reasons = [];

    if (pj.length) {
      if (overlap(pj, cj) || String(c.jurusan || "").toLowerCase().includes("semua jurusan")) {
        score += 40;
        reasons.push("Jurusan cocok");
      }
    }
    if (pm.length) {
      const hit = pm.filter((t) => title.includes(t) || skills.includes(t));
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
    if (profile.tipeInstansi && profile.tipeInstansi !== "all" && c.organizer?.type === profile.tipeInstansi) {
      score += 5;
      reasons.push("Tipe instansi sesuai");
    }
    // Bonus peluang bila data pelamar tersedia.
    const apps = c.total_applications ?? 0;
    const quota = c.approved_quantity ?? c.quantity_needed ?? 1;
    if (apps === 0 || quota / Math.max(apps, 1) >= 0.1) {
      score += 10;
      reasons.push("Persaingan rendah");
    }

    return { id: c.id, score: clamp(Math.round(score), 0, 100), reason: reasons.join(" · ") || "Kecocokan umum" };
  });

  scored.sort((a, b) => b.score - a.score);
  return { recommendations: scored.slice(0, limit), degraded: true };
}
