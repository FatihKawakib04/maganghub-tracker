// Client AI match. Kirim ke /api/match (proxy server -> endpoint AI asli), fallback ranker lokal.
import { rank } from "../shared/match.js";

// Bentuk candidate asli (Bp) + ekstra utk fallback lokal.
export function toCandidate(p) {
  const jurusan =
    p.jurusan && p.jurusan !== "Semua Jurusan"
      ? String(p.jurusan).split(/[,/]/).map((s) => s.trim()).filter(Boolean)
      : [];
  return {
    id: p.id,
    positionName: p.title,
    studyPrograms: jurusan,
    educationLevels: String(p.tingkat_pendidikan || "").split(",").map((s) => s.trim()).filter(Boolean),
    city: p.location,
    organizerType: p.organizer?.type || "company",
    taskDescription: p.job_description || "",
    total_applications: p.total_applications,
    approved_quantity: p.approved_quantity,
    quantity_needed: p.quantity_needed,
  };
}

export async function matchPositions(profile, positions, limit = 20) {
  const candidates = positions.map(toCandidate);
  try {
    const res = await fetch("/api/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "score", profile, candidates }),
    });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json?.recommendations) && json.recommendations.length) return json;
    }
  } catch {
    /* offline / tanpa endpoint -> ranker lokal */
  }
  return rank(profile, candidates, limit);
}
