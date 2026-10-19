// Jalankan: node test/score.test.mjs
import assert from "node:assert/strict";
import { scoreOf, scoreText, levelOf, slugify, idToLink, normalize } from "../src/data.js";

// --- batas level ---
const L = (n) => levelOf(n);
assert.equal(L(100), "Sangat Tinggi");
assert.equal(L(70), "Sangat Tinggi");
assert.equal(L(69), "Tinggi");
assert.equal(L(50), "Tinggi");
assert.equal(L(49), "Sedang");
assert.equal(L(30), "Sedang");
assert.equal(L(29), "Rendah");
assert.equal(L(15), "Rendah");
assert.equal(L(14), "Sangat Rendah");
assert.equal(L(0), "Sangat Rendah");

// --- klamp 0..100 & format teks ---
const mk = (q, a, extra = {}) => ({ quantity_needed: q, approved_quantity: q, total_applications: a, ...extra });
for (const p of [mk(1, 0), mk(3, 0), mk(10, 0), mk(1, 1), mk(1, 1e9), mk(50, 1), mk(2, 7)]) {
  const s = scoreOf(p);
  assert.ok(s >= 0 && s <= 100, `skor di luar rentang: ${s}`);
  assert.equal(scoreText(p), `${s}/100`);
}

// --- tren dari riwayat pelamar: growth positif menaikkan skor, growth 0 -> 80 ---
const base = mk(1, 40, { id: "abc" });
const def = scoreOf(base);
const hi = scoreOf(base, { abc: 5 });
const zero = scoreOf(base, { abc: 0 });
assert.ok(hi > def, "tren positif harus menaikkan skor");
assert.ok(zero > def, "growth=0 memakai cap 80 (> default 50)");
assert.equal(scoreOf(base), scoreOf(base, { lain: 99 }), "history id lain tidak berpengaruh");

// --- slugify + tautan asli ---
assert.equal(slugify("Teknisi Elektromedis"), "teknisi-elektromedis");
assert.equal(slugify("Admin  Gudang / Umum"), "admin-gudang-umum");
assert.equal(idToLink({ title: "Data Analyst", id: "xyz-1" }), "https://maganghub.kemnaker.go.id/magang-nasional/lowongan/data-analyst-xyz-1");

// --- normalisasi: pemetaan jenjang + fallback mitra ---
const dict = { cities: [], studyPrograms: [], organizers: {} };
const p = normalize({ i: "z", t: "Posisi", e: ["high_school", "profession"] }, dict);
assert.equal(p.tingkat_pendidikan, "SMA/SMK, Profesi");
assert.equal(p.company, "Mitra");
assert.equal(p.logo, "MIT");
assert.equal(p.quantity_needed, 1);

// kuota ACC beda dari diajukan -> label posisi
const q = normalize({ i: "y", t: "X", q: 3, aq: 2 }, dict);
assert.equal(q.approved_quantity, 2);
assert.equal(q.positions, "2 ACC / 3 Diajukan");

console.log("OK · score/level/slug/normalize edge-cases lolos");
