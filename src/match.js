// Client AI match. Coba /api/match (Pages Function / dev middleware), fallback ranker lokal.
import { rank } from "../shared/match.js";

export async function matchPositions(profile, candidates) {
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
    /* offline / tidak ada endpoint -> pakai fallback */
  }
  return rank(profile, candidates);
}
