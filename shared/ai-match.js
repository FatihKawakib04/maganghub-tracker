// Handler /api/match: coba endpoint AI asli (NDJSON stream), fallback ranker lokal.
import { rank } from "./match.js";

// Endpoint asli situs. POST-nya TIDAK mengirim header CORS, jadi hanya bisa dipanggil server-side.
export const DEFAULT_UPSTREAM = "https://magang-nasional.faaris.id/api/match";

export const MAX_CANDIDATES = 2000;
const MAX_PROFILE = 160;
const MAX_TASK = 600;

const clampStr = (s, n) => (typeof s === "string" ? s.slice(0, n) : "");
const clampNum = (v) => (Number.isFinite(v) ? v : undefined);

// Bersihkan & batasi input agar proxy tak disalahgunakan (payload raksasa / field aneh).
export function sanitizeInput(input) {
  const src = input && typeof input === "object" ? input : {};
  const p = src.profile && typeof src.profile === "object" ? src.profile : {};
  const profile = {
    jurusan: clampStr(p.jurusan, MAX_PROFILE),
    jenjang: clampStr(p.jenjang, 40),
    kota: clampStr(p.kota, MAX_PROFILE),
    minat: clampStr(p.minat, MAX_PROFILE),
    tipeInstansi: ["all", "government", "company"].includes(p.tipeInstansi) ? p.tipeInstansi : "all",
  };
  const candidates = (Array.isArray(src.candidates) ? src.candidates : [])
    .slice(0, MAX_CANDIDATES)
    .map((c) => {
      const o = c && typeof c === "object" ? c : {};
      return {
        id: clampStr(o.id, 80),
        positionName: clampStr(o.positionName || o.title, 200),
        studyPrograms: (Array.isArray(o.studyPrograms) ? o.studyPrograms : []).slice(0, 10).map((s) => clampStr(s, 80)),
        educationLevels: (Array.isArray(o.educationLevels) ? o.educationLevels : []).slice(0, 10).map((s) => clampStr(s, 40)),
        city: clampStr(o.city || o.location, 80),
        organizerType: clampStr(o.organizerType, 40) || null,
        taskDescription: clampStr(o.taskDescription, MAX_TASK),
        total_applications: clampNum(o.total_applications),
        approved_quantity: clampNum(o.approved_quantity),
        quantity_needed: clampNum(o.quantity_needed),
      };
    })
    .filter((c) => c.id);

  return { profile, candidates, mode: src.mode === "expand" ? "expand" : "score" };
}

// Panggil upstream. Return objek hasil, Error (429), atau null (degraded/gagal).
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
            recommendations.push({ id: String(j.result.id), score: j.result.score, reason: clampStr(j.result.reason, 400) });
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
  const { profile, candidates, mode } = sanitizeInput(input);

  if (mode === "expand") {
    const j = upstream
      ? await fetchUpstream(upstream, { mode: "expand", profile: { jurusan: profile.jurusan, minat: profile.minat } }, 20000)
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
