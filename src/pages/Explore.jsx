import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useStore } from "../store.js";
import { scoreOf, levelOf } from "../data.js";
import { PositionCard, PositionDetail, ScoreBadge } from "../components/Position.jsx";
import AIMatch from "../components/AIMatch.jsx";

const PAGE = 24;
const SORTS = [
  { value: "newest", label: "Terbaru" },
  { value: "oldest", label: "Paling Lama" },
  { value: "ratio_asc", label: "Peluang Terbesar" },
  { value: "ratio_desc", label: "Peluang Terketat" },
  { value: "uang_saku_desc", label: "Uang Saku Tertinggi" },
];
const ratioOf = (p) => {
  const q = p.approved_quantity ?? p.quantity_needed ?? 1;
  const a = p.total_applications ?? 0;
  return a <= 0 ? Infinity : q / a;
};
const ts = (d) => {
  const t = new Date(d).getTime();
  return Number.isNaN(t) ? 0 : t;
};

export default function Explore() {
  const [params, setParams] = useSearchParams();
  const positions = useStore((s) => s.positionsData);
  const dict = useStore((s) => s.dict);
  const loading = useStore((s) => s.loading);
  const hydrating = useStore((s) => s.hydrating);
  const fetchData = useStore((s) => s.fetchData);
  const importShare = useStore((s) => s.importShare);
  const targetOrganizers = useStore((s) => s.targetOrganizers);
  const compareList = useStore((s) => s.compareList);

  const [q, setQ] = useState("");
  const [jurusan, setJurusan] = useState("");
  const [kota, setKota] = useState("");
  const [jenjang, setJenjang] = useState("");
  const [tipe, setTipe] = useState("all");
  const [chance, setChance] = useState("");
  const [onlyMulti, setOnlyMulti] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  const [greenZone, setGreenZone] = useState(false);
  const [onlyTarget, setOnlyTarget] = useState(false);
  const [mitraId, setMitraId] = useState(params.get("mitra") || "");
  const [sort, setSort] = useState("newest");
  const [view, setView] = useState("grid");
  const [visible, setVisible] = useState(PAGE);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    fetchData();
    const share = params.get("share");
    if (share) {
      importShare(share.split(",").filter(Boolean));
      params.delete("share");
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deferredQuery = useDeferredValue(q);
  const filtered = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    let out = positions.filter((p) => {
      if (needle) {
        const hay = `${p.title} ${p.company} ${p.location} ${p.jurusan} ${(p.skills || []).join(" ")}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (jurusan && !p.jurusan.toLowerCase().includes(jurusan.toLowerCase())) return false;
      if (kota && p.location !== kota) return false;
      if (jenjang && !p.tingkat_pendidikan.toLowerCase().includes(jenjang.toLowerCase())) return false;
      if (tipe !== "all" && p.organizer?.type !== tipe) return false;
      if (chance && levelOf(scoreOf(p)) !== chance) return false;
      if (!showClosed && p.active === false) return false;
      if (onlyMulti && (p.quantity_needed ?? 1) <= 1) return false;
      if (greenZone && p.jurusan !== "Semua Jurusan") return false;
      if (onlyTarget && !targetOrganizers.includes(p.organizer_id)) return false;
      if (mitraId && p.organizer_id !== mitraId) return false;
      return true;
    });
    out = out.slice().sort((a, b) => {
      if (sort === "oldest") return ts(a.date) - ts(b.date);
      if (sort === "ratio_asc") return ratioOf(b) - ratioOf(a) || scoreOf(b) - scoreOf(a);
      if (sort === "ratio_desc") return ratioOf(a) - ratioOf(b);
      if (sort === "uang_saku_desc") return (b.uang_saku ?? 0) - (a.uang_saku ?? 0);
      return ts(b.date) - ts(a.date);
    });
    return out;
  }, [positions, deferredQuery, jurusan, kota, jenjang, tipe, chance, onlyMulti, showClosed, greenZone, onlyTarget, mitraId, sort, targetOrganizers]);

  useEffect(() => setVisible(PAGE), [q, jurusan, kota, jenjang, tipe, chance, onlyMulti, greenZone, onlyTarget, sort]);

  const reset = () => {
    setQ(""); setJurusan(""); setKota(""); setJenjang(""); setTipe("all");
    setChance(""); setOnlyMulti(false); setShowClosed(false); setGreenZone(false); setOnlyTarget(false);
    setMitraId(""); setParams({}, { replace: true });
  };

  return (
    <div className="explore">
      <section className="hero">
        <h1>Eksplorasi Kesempatan Magang</h1>
        <p className="muted">
          Cari, filter, dan simpan lowongan Magang Nasional (Kemnaker RI). Data publik, tanpa login.
        </p>
        <input
          className="search"
          placeholder="Cari posisi, mitra, jurusan, atau lokasi..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </section>

      <AIMatch onOpen={setOpen} />

      <div className="filters">
        <input list="prodi" placeholder="Jurusan" value={jurusan} onChange={(e) => setJurusan(e.target.value)} />
        <datalist id="prodi">{(dict?.studyPrograms || []).map((s) => <option key={s} value={s} />)}</datalist>

        <select value={kota} onChange={(e) => setKota(e.target.value)}>
          <option value="">Semua Kota</option>
          {(dict?.cities || []).map(([name]) => <option key={name} value={name}>{name}</option>)}
        </select>

        <select value={jenjang} onChange={(e) => setJenjang(e.target.value)}>
          <option value="">Semua Jenjang</option>
          {["SMA/SMK", "SMK", "Diploma", "S1", "S2", "S3", "Profesi"].map((e) => <option key={e} value={e}>{e}</option>)}
        </select>

        <select value={tipe} onChange={(e) => setTipe(e.target.value)}>
          <option value="all">Semua Instansi</option>
          <option value="government">Pemerintah</option>
          <option value="company">Swasta / BUMN</option>
        </select>

        <select value={chance} onChange={(e) => setChance(e.target.value)}>
          <option value="">Semua Peluang</option>
          {["Sangat Tinggi", "Tinggi", "Sedang", "Rendah", "Sangat Rendah"].map((l) => <option key={l} value={l}>{l}</option>)}
        </select>

        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        <label className="check"><input type="checkbox" checked={greenZone} onChange={(e) => setGreenZone(e.target.checked)} /> Semua Jurusan</label>
        <label className="check"><input type="checkbox" checked={onlyMulti} onChange={(e) => setOnlyMulti(e.target.checked)} /> Kuota &gt; 1</label>
        <label className="check"><input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} /> Tampilkan Ditutup</label>
        <label className="check"><input type="checkbox" checked={onlyTarget} onChange={(e) => setOnlyTarget(e.target.checked)} /> Mitra target</label>

        <button className="ghost" onClick={reset}>Hapus Semua</button>
        {mitraId ? (
          <button className="chip" onClick={() => { setMitraId(""); setParams({}, { replace: true }); }}>
            Mitra aktif ✕
          </button>
        ) : null}
        <button className="ghost" onClick={() => setView(view === "grid" ? "list" : "grid")}>
          Tampilan {view === "grid" ? "Grid" : "List"}
        </button>
      </div>

      <p className="muted result-count">
        {filtered.length.toLocaleString("id-ID")} lowongan
        {hydrating ? " · memuat sisa data..." : ""}
        {loading ? " · memuat..." : ""}
      </p>

      {loading && !positions.length ? (
        <div className="empty">Memuat data lowongan...</div>
      ) : !filtered.length ? (
        <div className="empty">Tidak ada hasil.</div>
      ) : (
        <div className={view === "grid" ? "grid-cards" : "list-cards"}>
          {filtered.slice(0, visible).map((p) => (
            <PositionCard key={p.id} p={p} onOpen={setOpen} />
          ))}
        </div>
      )}

      {visible < filtered.length ? (
        <div className="more">
          <button className="primary" onClick={() => setVisible(visible + PAGE)}>
            Muat Lebih Banyak ({filtered.length - visible} lagi)
          </button>
        </div>
      ) : null}

      {compareList.length ? <CompareBar /> : null}
      {open ? <PositionDetail p={open} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}

function CompareBar() {
  const positions = useStore((s) => s.positionsData);
  const compareList = useStore((s) => s.compareList);
  const clearCompare = useStore((s) => s.clearCompare);
  const [open, setOpen] = useState(false);
  const items = positions.filter((p) => compareList.includes(p.id));
  return (
    <div className="compare-bar">
      <div className="chips">
        {items.map((p) => <span key={p.id} className="chip">{p.title}</span>)}
      </div>
      <div className="compare-actions">
        <button className="ghost" onClick={clearCompare}>Hapus</button>
        <button className="primary" onClick={() => setOpen(true)}>Bandingkan Sekarang</button>
      </div>
      {open ? (
        <div className="overlay" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <header className="modal-head"><h2>Bandingkan</h2><button className="ghost" onClick={() => setOpen(false)}>Tutup</button></header>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Kriteria</th>{items.map((p) => <th key={p.id}>{p.title}</th>)}</tr>
                </thead>
                <tbody>
                  <tr><td>Mitra</td>{items.map((p) => <td key={p.id}>{p.company}</td>)}</tr>
                  <tr><td>Lokasi</td>{items.map((p) => <td key={p.id}>{p.location}</td>)}</tr>
                  <tr><td>Kuota</td>{items.map((p) => <td key={p.id}>{p.approved_quantity ?? p.quantity_needed}</td>)}</tr>
                  <tr><td>Pelamar</td>{items.map((p) => <td key={p.id}>{p.total_applications ?? 0}</td>)}</tr>
                  <tr><td>Jenjang</td>{items.map((p) => <td key={p.id}>{p.tingkat_pendidikan}</td>)}</tr>
                  <tr><td>Skor</td>{items.map((p) => <td key={p.id}><ScoreBadge p={p} /></td>)}</tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
