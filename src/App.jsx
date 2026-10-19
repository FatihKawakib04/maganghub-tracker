import { useEffect } from "react";
import { NavLink, Route, Routes, Navigate } from "react-router-dom";
import { useStore } from "./store.js";
import { YEAR, BATCH_LABEL } from "./data.js";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import Explore from "./pages/Explore.jsx";
import Mitra from "./pages/Mitra.jsx";
import Tracker from "./pages/Tracker.jsx";

const THEME_KEY = "vite-ui-theme";
function systemTheme() {
  try {
    return typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}
function applyTheme(t) {
  const el = document.documentElement;
  el.classList.remove("light", "dark");
  el.classList.add(t === "system" ? systemTheme() : t === "dark" ? "dark" : "light");
}
function readTheme() {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}
function useTheme() {
  const set = (t) => {
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {
      /* storage penuh / privat */
    }
    applyTheme(t);
  };
  useEffect(() => applyTheme(readTheme()), []);
  return set;
}

export default function App() {
  const setTheme = useTheme();
  const fetchData = useStore((s) => s.fetchData);
  const stats = useStore((s) => s.stats);
  const bookmarks = useStore((s) => s.bookmarks);
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="app">
      <header className="topbar">
        <NavLink to="/" className="brand">
          <span className="brand-mark">MT</span>
          <span>
            Magang Nasional <b>Tracker</b>
            <small className="brand-sub">
              {YEAR} · {BATCH_LABEL}
            </small>
          </span>
        </NavLink>
        <nav className="nav">
          <NavLink to="/" end>
            Eksplorasi
          </NavLink>
          <NavLink to="/mitra">Mitra</NavLink>
          <NavLink to="/tracker" className="nav-tracker">
            Tracker{bookmarks.length ? <span className="pill">{bookmarks.length}</span> : null}
          </NavLink>
        </nav>
        <button className="ghost" onClick={() => setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark")}>
          Tema
        </button>
      </header>

      {stats ? (
        <div className="statsbar">
          <span>Total Lowongan <b>{stats.totalPositions.toLocaleString("id-ID")}</b></span>
          <span>Mitra <b>{stats.totalCompanies.toLocaleString("id-ID")}</b></span>
          <span>Slot <b>{stats.totalSlots.toLocaleString("id-ID")}</b></span>
          <span>Pelamar <b>{stats.totalApplicants.toLocaleString("id-ID")}</b></span>
          <span>Lokasi <b>{stats.totalLocations.toLocaleString("id-ID")}</b></span>
        </div>
      ) : null}

      <main className="page">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Explore />} />
            <Route path="/mitra" element={<Mitra />} />
            <Route path="/penyelenggara" element={<Navigate to="/mitra" replace />} />
            <Route path="/tracker" element={<Tracker />} />
            <Route path="*" element={<div className="empty">Halaman tidak ditemukan.</div>} />
          </Routes>
        </ErrorBoundary>
      </main>

      <footer className="footer">
        Tracker tidak resmi. Sumber data: MagangHub / SIAPkerja Kemnaker RI. Data profil & lamaran tersimpan lokal di perangkat.
      </footer>
    </div>
  );
}
