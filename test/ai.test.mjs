// Jalankan: node test/ai.test.mjs  (offline; global fetch di-mock)
import assert from "node:assert/strict";
import { fetchUpstream, handleMatch, DEFAULT_UPSTREAM } from "../shared/ai-match.js";

const realFetch = globalThis.fetch;
const mockFetch = (impl) => {
  globalThis.fetch = impl;
};
const ndjson = (lines) =>
  new Response(lines.map((l) => JSON.stringify(l)).join("\n") + "\n", {
    status: 200,
    headers: { "content-type": "application/x-ndjson; charset=utf-8" },
  });

try {
  // 1) parse NDJSON: hasil + done(degraded:false)
  mockFetch(async () => ndjson([{ type: "result", result: { id: "a", score: 88, reason: "cocok" } }, { type: "done", degraded: false }]));
  const up = await fetchUpstream("http://x", { stream: true }, 5000);
  assert.equal(up.degraded, false);
  assert.equal(up.recommendations.length, 1);
  assert.deepEqual(up.recommendations[0], { id: "a", score: 88, reason: "cocok" });

  // 2) degraded tanpa hasil -> null
  mockFetch(async () => ndjson([{ type: "done", degraded: true }]));
  assert.equal(await fetchUpstream("http://x", { stream: true }, 5000), null);

  // 3) 429 -> Error ber-retryAfter
  mockFetch(async () => new Response("{}", { status: 429 }));
  const err = await fetchUpstream("http://x", { stream: true }, 5000);
  assert.ok(err instanceof Error);
  assert.equal(err.retryAfter, 600);

  // 4) handleMatch: upstream degraded -> fallback ranker lokal
  mockFetch(async () => ndjson([{ type: "done", degraded: true }]));
  const out = await handleMatch(
    { profile: { jurusan: "Teknik Informatika" }, candidates: [{ id: "b", positionName: "SWE", studyPrograms: ["Teknik Informatika"], educationLevels: ["S1"], city: "Bandung" }] },
    "http://x"
  );
  assert.equal(out.degraded, true);
  assert.equal(out.recommendations[0].id, "b");

  // 5) handleMatch: upstream hidup -> pakai hasil upstream
  mockFetch(async () => ndjson([{ type: "result", result: { id: "z", score: 99, reason: "AI" } }, { type: "done", degraded: false }]));
  const live = await handleMatch({ profile: {}, candidates: [{ id: "z", positionName: "X" }] }, "http://x");
  assert.equal(live.recommendations[0].id, "z");
  assert.equal(live.degraded, false);

  // 6) expand: upstream mengisi istilah
  mockFetch(async () => new Response(JSON.stringify({ jurusan: ["informatika"], minat: ["web"], degraded: false }), { status: 200, headers: { "content-type": "application/json" } }));
  const ex = await handleMatch({ mode: "expand", profile: { jurusan: "informatika", minat: "web" } }, "http://x");
  assert.deepEqual(ex.jurusan, ["informatika"]);

  // 7) upstream mati (upstream=null) -> ranker lokal, tak menyentuh jaringan
  let called = false;
  mockFetch(async () => { called = true; return new Response("", { status: 500 }); });
  const off = await handleMatch({ profile: { kota: "Bandung" }, candidates: [{ id: "q", city: "Bandung", positionName: "Y" }] }, null);
  assert.equal(called, false);
  assert.equal(off.recommendations[0].id, "q");

  assert.match(DEFAULT_UPSTREAM, /magang-nasional\.faaris\.id\/api\/match$/);
  console.log("OK · parser upstream NDJSON + fallback + expand lolos");
} finally {
  globalThis.fetch = realFetch;
}
