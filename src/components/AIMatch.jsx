import { useEffect, useState } from "react";
import { useStore } from "../store.js";
import { matchPositions } from "../match.js";

const PREFS_KEY = "ai-match-prefs-v1";
const DEFAULT = { jurusan: "", jenjang: "", kota: "", minat: "", tipeInstansi: "all" };
const MAX_CANDIDATES = 1200;

function loadPrefs() {
  try {
    return { ...DEFAULT, ...JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") };
  } catch {
    return { ...DEFAULT };
  }
}

export default function AIMatch({ onOpen }) {
  const positions = useStore((s) => s.positionsData);
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState(loadPrefs);
  const [status, setStatus] = useState("idle"); // idle | loading | done | empty
  const [results, setResults] = useState([]);
  const [degraded, setDegraded] = useState(true);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(profile));
    } catch {
      /* storage penuh / privat */
    }
  }, [profile]);

  const set = (k, v) => setProfile((p) => ({ ...p, [k]: v }));

  const run = async () => {
    if (!positions.length) return;
    setStatus("loading");
    const out = await matchPositions(profile, positions.slice(0, MAX_CANDIDATES));
    const byId = Object.fromEntries(positions.map((p) => [p.id, p]));
    const recs = (out.recommendations || []).map((r) => ({ ...r, position: byId[r.id] })).filter((r) => r.position);
    setResults(recs);
    setDegraded(!!out.degraded);
    setStatus(recs.length ? "done" : "empty");
  };

  return (
    <section className="ai-panel">
      <button className="ai-toggle" onClick={() => setOpen((o) => !o)}>
        {open ? "Tutup Pencarian AI" : "Cari dengan AI"}
      </button>

      {open ? (
        <div className="ai-body">
          <p className="muted">
            Isi profilmu, biarkan sistem menilai lowongan mana yang paling cocok beserta alasannya. Profil hanya
            disimpan di perangkatmu.
          </p>
          <div className="ai-grid">
            <input placeholder="Jurusan" value={profile.jurusan} onChange={(e) => set("jurusan", e.target.value)} />
            <input placeholder="Minat / bidang" value={profile.minat} onChange={(e) => set("minat", e.target.value)} />
            <input placeholder="Kota" value={profile.kota} onChange={(e) => set("kota", e.target.value)} />
            <select value={profile.jenjang} onChange={(e) => set("jenjang", e.target.value)}>
              <option value="">Semua Jenjang</option>
              {["SMA/SMK", "Diploma", "S1", "S2", "S3", "Profesi"].map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
            <select value={profile.tipeInstansi} onChange={(e) => set("tipeInstansi", e.target.value)}>
              <option value="all">Semua Instansi</option>
              <option value="government">Pemerintah</option>
              <option value="company">Swasta / BUMN</option>
            </select>
            <button className="primary" onClick={run} disabled={status === "loading" || !positions.length}>
              {status === "loading" ? "Menilai..." : "Carikan Lowongan"}
            </button>
          </div>

          {status === "loading" ? <p className="muted">AI menilai {MAX_CANDIDATES} kandidat teratas...</p> : null}
          {status === "empty" ? <p className="muted">Belum ada lowongan yang cocok.</p> : null}

          {status === "done" && degraded ? (
            <p className="muted">AI asli (endpoint situs) sedang tidak tersedia — memakai skor heuristik lokal.</p>
          ) : null}
          {status === "done" ? (
            <ol className="ai-results">
              {results.map((r) => (
                <li key={r.id} onClick={() => onOpen(r.position)}>
                  <div className="ai-res-head">
                    <b>{r.position.title}</b>
                    <span className="badge lv-b">{r.score}</span>
                  </div>
                  <p className="muted">{r.position.company} · {r.position.location}</p>
                  <p className="ai-reason">Kenapa cocok: {r.reason}</p>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
