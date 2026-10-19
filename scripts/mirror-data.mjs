// Snapshot data offline -> public/data (di-serve di /data, otomatis dipakai app).
// Pakai: node scripts/mirror-data.mjs [--out public/data] [--base <url>]
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const args = process.argv.slice(2);
const argVal = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const BASE = argVal("--base", "https://magang-nasional.faaris.id/data");
const OUT = argVal("--out", "public/data");

const get = async (name) => {
  const res = await fetch(`${BASE}/${name}`);
  if (!res.ok) throw new Error(`${res.status} ${name}`);
  return res;
};

const save = async (name, buf) => {
  const path = join(OUT, name);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, buf);
  return buf.length;
};

const manifest = await (await get("manifest.json")).json();
const files = [...new Set([manifest.dict, manifest.skills, manifest.organizers, ...manifest.list, ...(manifest.detail?.files || [])])].filter(Boolean);

await save("manifest.json", Buffer.from(JSON.stringify(manifest)));
let total = 0;
const concurrency = 6;
for (let i = 0; i < files.length; i += concurrency) {
  const batch = files.slice(i, i + concurrency);
  const sizes = await Promise.all(
    batch.map(async (f) => {
      const buf = Buffer.from(await (await get(f)).arrayBuffer());
      const n = await save(f, buf);
      console.log(`  ${f} ${(n / 1024).toFixed(0)} KB`);
      return n;
    })
  );
  total += sizes.reduce((a, b) => a + b, 0);
}

console.log(`\nSelesai: ${files.length + 1} file, ${(total / 1024 / 1024).toFixed(1)} MB -> ${OUT}`);
console.log("Jalankan ulang dev/build; app otomatis memakai /data lokal.");
