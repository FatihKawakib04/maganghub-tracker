// Handler /api/match: coba endpoint AI asli (NDJSON stream), fallback ranker lokal.
import { rank } from "./match.js";

// Endpoint asli situs. POST-nya TIDAK mengirim header CORS, jadi hanya bisa dipanggil server-side.
export const DEFAULT_UPSTREAM = "https://magang-nasional.faaris.id/api/match";

// Panggil upstream. Return objek hasil, atau null bila tak ada hasil (degraded/gagal).
export async function fetchUpstream(upstream, body, timeoutMs = 60000) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(upstream, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ac.signal,
    });
    if (res.status === 429) {
      const err = new Error("rate limited");
      err.retryAfter = 600;
      return err;
    }
    if (!res.ok) return null;

    const ct = res.headers.get("content-type") || "";
    if (body.stream || ct.includes("ndjson")) {
      const text = await res.text();
      const recommendations = [];
      let degraded = true;
      for (const line of text.split("\n")) {
        const raw = line.trim();
        if (!raw) continue;
        try {
          const j = JSON.parse(raw);
          if (j.type === "result" && j.result) {
            recommendations.push({ id: String(j.result.id), score: j.result.score, reason: j.result.reason || "" });
          } else if (j.type === "done") {
            degraded = !!j.degraded;
          }
        } catch {
          /* abaikan baris rusak */
        }
      }
      return recommendations.length ? { recommendations, degraded } : null;
    }
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function handleMatch(input, upstream = DEFAULT_UPSTREAM) {
  const { profile = {}, candidates = [], mode } = input || {};

  if (mode === "expand") {
    const j = upstream
      ? await fetchUpstream(upstream, { mode: "expand", profile: { jurusan: profile.jurusan || "", minat: profile.minat || "" } }, 20000)
      : null;
    if (j && !(j instanceof Error) && ((j.jurusan || []).length || (j.minat || []).length)) {
      return { jurusan: j.jurusan || [], minat: j.minat || [], degraded: !!j.degraded };
    }
    return { jurusan: [], minat: [], degraded: true };
  }

  if (upstream) {
    const j = await fetchUpstream(upstream, { profile, candidates, stream: true }, 60000);
    if (j instanceof Error) return { recommendations: [], degraded: true, retryAfter: j.retryAfter };
    if (j?.recommendations?.length) return j;
  }
  return rank(profile, candidates);
}
