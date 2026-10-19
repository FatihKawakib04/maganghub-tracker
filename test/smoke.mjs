// Jalankan: node test/smoke.mjs
import assert from "node:assert/strict";
import { normalize, scoreOf, levelOf, loadManifest, loadShard, DATA_BASE } from "../src/data.js";

const dict = {
  cities: [["Kota Bandung", "Jawa Barat"]],
  studyPrograms: ["Teknik Informatika", "Manajemen"],
  organizers: { org1: ["PT Contoh", "company"] },
};

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

const high = scoreOf({ quantity_needed: 5, approved_quantity: 5, total_applications: 3 });
const low = scoreOf({ quantity_needed: 1, approved_quantity: 1, total_applications: 5000 });
assert.ok(high > low, "rasio kuota/pelamar tinggi harus skor lebih tinggi");
assert.equal(levelOf(75), "Sangat Tinggi");
assert.equal(levelOf(0), "Sangat Rendah");

// Cek sumber data live (CORS publik).
const manifest = await loadManifest();
assert.ok(manifest.list.length >= 1);
const list = await loadShard(manifest.list[0]);
assert.ok(Array.isArray(list) && list.length > 0);
const real = normalize(list[0], dict);
assert.ok(real.id && real.title);
console.log(`OK · sample: "${real.title}" @ ${real.location} · manifest ${manifest.stats.totalPositions} posisi · ${DATA_BASE}`);
