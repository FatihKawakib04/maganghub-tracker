import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store.js";

const PAGE = 30;

export default function Mitra() {
  const navigate = useNavigate();
  const fetchData = useStore((s) => s.fetchData);
  const organizers = useStore((s) => s.organizersData);
  const positions = useStore((s) => s.positionsData);
  const loading = useStore((s) => s.loading);
  const targetOrganizers = useStore((s) => s.targetOrganizers);
  const toggleTarget = useStore((s) => s.toggleTargetOrganizer);

  const [q, setQ] = useState("");
  const [tipe, setTipe] = useState("all");
  const [kota, setKota] = useState("");
  const [onlyTarget, setOnlyTarget] = useState(false);
  const [visible, setVisible] = useState(PAGE);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const counts = useMemo(() => {
    const m = {};
    for (const p of positions) if (p.organizer_id) m[p.organizer_id] = (m[p.organizer_id] || 0) + 1;
    return m;
  }, [positions]);

  const cities = useMemo(() => [...new Set(organizers.map((o) => o.city?.name).filter(Boolean))].sort(), [organizers]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return organizers
      .filter((o) => {
        if (needle && !o.name.toLowerCase().includes(needle)) return false;
        if (tipe !== "all" && o.type !== tipe) return false;
        if (kota && o.city?.name !== kota) return false;
        if (onlyTarget && !targetOrganizers.includes(o.id)) return false;
        return true;
      })
      .sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0));
  }, [organizers, q, tipe, kota, onlyTarget, targetOrganizers, counts]);

  useEffect(() => setVisible(PAGE), [q, tipe, kota, onlyTarget]);

  return (
    <div className="mitra">
      <section className="hero">
        <h1>Daftar Mitra &amp; Penyelenggara</h1>
        <p className="muted">Jelajahi mitra dan penyelenggara Magang Nasional. Tandai mitra target untuk memfilternya di Eksplorasi.</p>
        <input className="search" placeholder="Cari nama mitra..." value={q} onChange={(e) => setQ(e.target.value)} />
      </section>

      <div className="filters">
        <select value={tipe} onChange={(e) => setTipe(e.target.value)}>
          <option value="all">Semua Tipe</option>
          <option value="government">Pemerintah</option>
          <option value="company">Swasta / BUMN</option>
        </select>
        <select value={kota} onChange={(e) => setKota(e.target.value)}>
          <option value="">Semua Kota</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="check">
          <input type="checkbox" checked={onlyTarget} onChange={(e) => setOnlyTarget(e.target.checked)} /> Mitra target
        </label>
        <span className="muted">{filtered.length.toLocaleString("id-ID")} mitra</span>
      </div>

      {loading && !organizers.length ? (
        <div className="empty">Memuat data mitra...</div>
      ) : (
        <div className="grid-cards">
          {filtered.slice(0, visible).map((o) => {
            const t = targetOrganizers.includes(o.id);
            return (
              <article key={o.id} className="card">
                <div className="card-head">
                  {o.logo_url ? (
                    <img className="logo" src={o.logo_url} alt="" loading="lazy" />
                  ) : (
                    <span className="logo">{o.name.substring(0, 3).toUpperCase()}</span>
                  )}
                  <div className="card-title">
                    <h3>{o.name}</h3>
                    <p className="muted">
                      {o.type === "government" ? "Pemerintah" : "Swasta / BUMN"}
                      {o.city?.name ? ` · ${o.city.name}` : ""}
                    </p>
                  </div>
                </div>
                <div className="chips">
                  <span className="chip">{counts[o.id] || 0} lowongan</span>
                </div>
                <div className="card-actions">
                  <button className="primary" onClick={() => navigate(`/?mitra=${o.id}`)}>
                    Lihat Lowongan
                  </button>
                  <button className={t ? "active" : ""} onClick={() => toggleTarget(o.id)}>
                    {t ? "Target" : "Tandai Target"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {visible < filtered.length ? (
        <div className="more">
          <button className="primary" onClick={() => setVisible(visible + PAGE)}>
            Muat Lebih Banyak ({filtered.length - visible} lagi)
          </button>
        </div>
      ) : null}
    </div>
  );
}
