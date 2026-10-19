import { useEffect, useRef } from "react";
import { useStore } from "../store.js";
import { scoreOf, levelOf, idToLink } from "../data.js";

const levelClass = (l) =>
  l === "Sangat Tinggi"
    ? "lv-a"
    : l === "Tinggi"
    ? "lv-b"
    : l === "Sedang"
    ? "lv-c"
    : l === "Rendah"
    ? "lv-d"
    : "lv-e";

export function ScoreBadge({ p }) {
  const s = scoreOf(p);
  const l = levelOf(s);
  return <span className={"badge " + levelClass(l)}>{s} · {l}</span>;
}

export function PositionCard({ p, onOpen }) {
  const bookmarks = useStore((s) => s.bookmarks);
  const toggleBookmark = useStore((s) => s.toggleBookmark);
  const compareList = useStore((s) => s.compareList);
  const toggleCompare = useStore((s) => s.toggleCompare);
  const saved = bookmarks.includes(p.id);
  const cmp = compareList.includes(p.id);

  return (
    <article className="card">
      <div
        className="card-head"
        role="button"
        tabIndex={0}
        aria-label={`Lihat detail ${p.title}`}
        onClick={() => onOpen(p)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen(p);
          }
        }}
      >
        <span className="logo">{p.logo}</span>
        <div className="card-title">
          <h3>{p.title}</h3>
          <p className="muted">{p.company} · {p.location}</p>
        </div>
      </div>

      <div className="chips">
        <span className="chip">Kuota {p.approved_quantity ?? p.quantity_needed}</span>
        <span className="chip">{p.total_applications ?? 0} pelamar</span>
        <ScoreBadge p={p} />
      </div>

      {p.jurusan === "Semua Jurusan" ? (
        <span className="chip green">Semua Jurusan</span>
      ) : (
        <p className="muted clamp">{p.jurusan}</p>
      )}

      <div className="card-actions">
        <button onClick={() => onOpen(p)}>Detail</button>
        <button className={cmp ? "active" : ""} onClick={() => toggleCompare(p.id)}>
          {cmp ? "Dibandingkan" : "Bandingkan"}
        </button>
        <button
          className={saved ? "active" : "primary"}
          onClick={() =>
            toggleBookmark(p.id, {
              id: p.id,
              title: p.title,
              company: p.company,
              location: p.location,
              date: p.date,
              jurusan: p.jurusan,
              tingkat_pendidikan: p.tingkat_pendidikan,
              link: idToLink(p),
            })
          }
        >
          {saved ? "Tersimpan" : "Simpan"}
        </button>
      </div>
    </article>
  );
}

export function PositionDetail({ p, onClose }) {
  const fetchDetail = useStore((s) => s.fetchDetail);
  const positionsData = useStore((s) => s.positionsData);
  const current = (p && positionsData.find((x) => x.id === p.id)) || p;
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (p?.id) fetchDetail(p.id);
  }, [p?.id, fetchDetail]);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!current) return null;
  const s = scoreOf(current);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={current.title} onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <div>
            <h2>{current.title}</h2>
            <p className="muted">{current.company} · {current.location}</p>
          </div>
          <button ref={closeRef} className="ghost" onClick={onClose}>Tutup</button>
        </header>

        <div className="grid-2">
          <div className="stat"><small>Kuota ACC</small><b>{current.approved_quantity ?? current.quantity_needed}</b></div>
          <div className="stat"><small>Total Pelamar</small><b>{current.total_applications ?? 0}</b></div>
          <div className="stat"><small>Skor Peluang</small><b>{s} · {levelOf(s)}</b></div>
          <div className="stat"><small>Hari Kerja</small><b>{current.working_days || 5} hari</b></div>
        </div>

        <dl className="meta">
          <dt>Jurusan</dt><dd>{current.jurusan}</dd>
          <dt>Jenjang</dt><dd>{current.tingkat_pendidikan}</dd>
          <dt>Libur</dt><dd>{current.days_off?.length ? current.days_off.join(", ") : "Sab, Min"}</dd>
          <dt>Uang Saku</dt><dd>{current.uang_saku ? "Rp " + current.uang_saku.toLocaleString("id-ID") : current.salary}</dd>
        </dl>

        {current.skills?.length ? (
          <div className="section">
            <h4>Kompetensi</h4>
            <div className="chips">{current.skills.map((sk, i) => <span key={i} className="chip">{sk}</span>)}</div>
          </div>
        ) : null}

        <div className="section">
          <h4>Deskripsi</h4>
          <p className="desc">{current.job_description || "Tidak ada deskripsi."}</p>
        </div>

        {current.curriculum?.length ? (
          <div className="section">
            <h4>Kurikulum ({current.curriculum.length} unit)</h4>
            {current.curriculum.map((u, i) => (
              <details key={i}>
                <summary>{u.name}{u.materials?.length ? ` · ${u.materials.length} materi` : ""}</summary>
                <p className="desc">{u.description}</p>
              </details>
            ))}
          </div>
        ) : null}

        <a className="btn-primary" href={idToLink(current)} target="_blank" rel="noreferrer">
          Buka di MagangHub ↗
        </a>
      </div>
    </div>
  );
}
