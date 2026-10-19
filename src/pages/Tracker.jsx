import { useEffect, useState } from "react";
import { useStore, STATUSES } from "../store.js";
import { PositionDetail } from "../components/Position.jsx";

export default function Tracker() {
  const fetchData = useStore((s) => s.fetchData);
  const positions = useStore((s) => s.positionsData);
  const bookmarks = useStore((s) => s.bookmarks);
  const snapshots = useStore((s) => s.snapshots);
  const statuses = useStore((s) => s.statuses);
  const updateStatus = useStore((s) => s.updateStatus);
  const toggleBookmark = useStore((s) => s.toggleBookmark);
  const [open, setOpen] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const byId = Object.fromEntries(positions.map((p) => [p.id, p]));
  const cards = bookmarks.map((id) => byId[id] || snapshots[id] || { id, title: id, company: "-", location: "-" });

  const share = async () => {
    const url = new URL(window.location.origin);
    url.searchParams.set("share", bookmarks.join(","));
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Salin tautan ini:", url.toString());
    }
  };

  return (
    <div className="tracker">
      <section className="hero">
        <h1>My Tracker — Lamaran Magang Tersimpan</h1>
        <p className="muted">Kelola status lamaran di papan Kanban. Data tersimpan lokal di perangkat.</p>
        <div className="tracker-actions">
          <button className="primary" onClick={share} disabled={!bookmarks.length}>
            {copied ? "Tautan Disalin!" : "Bagikan Tracker"}
          </button>
          <span className="muted">{bookmarks.length} lowongan tersimpan</span>
        </div>
      </section>

      {!bookmarks.length ? (
        <div className="empty">Belum ada lowongan tersimpan. Simpan dari halaman Eksplorasi.</div>
      ) : (
        <div className="kanban">
          {STATUSES.map((col) => {
            const items = cards.filter((c) => (statuses[c.id] || "planned") === col.key);
            return (
              <section key={col.key} className="col">
                <header className={`col-head c-${col.color}`}>
                  {col.label} <span className="pill">{items.length}</span>
                </header>
                {items.map((c) => (
                  <article key={c.id} className="mini-card">
                    <h4 onClick={() => byId[c.id] && setOpen(byId[c.id])}>{c.title}</h4>
                    <p className="muted">{c.company} · {c.location}</p>
                    <select value={statuses[c.id] || "planned"} onChange={(e) => updateStatus(c.id, e.target.value)}>
                      {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                    <button className="ghost" onClick={() => toggleBookmark(c.id)}>Hapus</button>
                  </article>
                ))}
              </section>
            );
          })}
        </div>
      )}

      {open ? <PositionDetail p={open} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}
