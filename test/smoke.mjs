// Jalankan: node test/smoke.mjs
import assert from "node:assert/strict";
import { normalize, scoreOf, scoreText, levelOf, loadManifest, loadShard, getBase } from "../src/data.js";
import { rank } from "../shared/match.js";

const dict = {
  cities: [["Kota Bandung", "Jawa Barat"]],
  studyPrograms: ["Teknik Informatika", "Manajemen"],
  organizers: { org1: ["PT Contoh", "company"] },
};

// --- normalisasi ---
const raw = { i: "01a058c1-e355-7076-9aae-37bfeae826cd", t: "Data Analyst", o: "org1", c: 0, sp: [0], e: ["bachelor"], q: 1, aq: 1, ta: 100, wd: 5, dof: ["sunday"] };
const p = normalize(raw, dict);
assert.equal(p.title, "Data Analyst");
assert.equal(p.company, "PT Contoh");
assert.equal(p.location, "Kota Bandung");
assert.equal(p.tingkat_pendidikan, "S1");
assert.equal(p.jurusan, "Teknik Informatika");
assert.equal(p.days_off[0], "Min");
assert.equal(p.organizer.type, "company");

const empty = normalize({ i: "x", t: "Umum" }, dict);
assert.equal(empty.jurusan, "Semua Jurusan");
assert.equal(empty.location, "Indonesia");

// --- skor peluang (rumus eksak ft dari bundle) ---
assert.equal(scoreOf({ quantity_needed: 1, approved_quantity: 1, total_applications: 0 }), 90);
assert.equal(scoreOf({ quantity_needed: 2, approved_quantity: 2, total_applications: 0 }), 95);
assert.equal(scoreOf({ quantity_needed: 5, approved_quantity: 5, total_applications: 0 }), 100);
assert.equal(scoreOf({ quantity_needed: 1, approved_quantity: 1, total_applications: 100 }), 21);
assert.equal(scoreOf({ quantity_needed: 1, approved_quantity: 1, total_applications: 3 }), 46);
assert.equal(scoreText({ quantity_needed: 1, approved_quantity: 1, total_applications: 100 }), "21/100");
assert.ok(scoreOf({ quantity_needed: 5, approved_quantity: 5, total_applications: 3 }) > scoreOf({ quantity_needed: 1, approved_quantity: 1, total_applications: 5000 }));
assert.equal(levelOf(75), "Sangat Tinggi");
assert.equal(levelOf(0), "Sangat Rendah");

// --- ranker AI ---
const rec = rank(
  { jurusan: "Teknik Informatika", kota: "Bandung" },
  [
    { id: "a", title: "Backend Engineer", location: "Kota Surabaya", jurusan: "Akuntansi", tingkat_pendidikan: "S1", skills: ["Java"], total_applications: 1000, quantity_needed: 1, approved_quantity: 1 },
    { id: "b", title: "Software Engineer", location: "Kota Bandung", jurusan: "Teknik Informatika", tingkat_pendidikan: "S1", skills: ["React"], total_applications: 0, quantity_needed: 3, approved_quantity: 3 },
  ]
);
assert.equal(rec.recommendations[0].id, "b");
assert.ok(rec.recommendations[0].reason.includes("Jurusan cocok"));

// --- sumber data live ---
const manifest = await loadManifest();
assert.ok(manifest.list.length >= 1);
const list = await loadShard(manifest.list[0]);
assert.ok(Array.isArray(list) && list.length > 0);
const real = normalize(list[0], dict);
assert.ok(real.id && real.title);
console.log(`OK · sample "${real.title}" @ ${real.location} · ${manifest.stats.totalPositions} posisi · base=${getBase()}`);
