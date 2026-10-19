import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { loadManifest, loadShard, normalize, detailShardFor } from "./data.js";

export const STATUSES = [
  { key: "planned", label: "Rencana Melamar", color: "gray" },
  { key: "applied", label: "Sudah Melamar", color: "blue" },
  { key: "interview", label: "Tahap Wawancara", color: "amber" },
  { key: "accepted", label: "Diterima (Lolos)", color: "green" },
  { key: "rejected", label: "Ditolak", color: "red" },
];

export const useStore = create(
  persist(
    (set, get) => ({
      manifest: null,
      dict: null,
      stats: null,
      positionsData: [],
      organizersData: [],
      loading: false,
      hydrating: false,
      error: null,
      _detailShards: {},

      fetchData: async (force = false) => {
        const { positionsData, loading, _inFlight } = get();
        if (_inFlight) return;
        if (positionsData.length > 0 && !force) return;
        set({ loading: true, error: null, _inFlight: true });
        try {
          const manifest = await loadManifest();
          const [dict, organizers, first] = await Promise.all([
            loadShard(manifest.dict),
            loadShard(manifest.organizers),
            loadShard(manifest.list[0]),
          ]);
          const positions = first
            .map((r) => normalize(r, dict))
            .sort((a, b) => new Date(b.date) - new Date(a.date));
          set({
            manifest,
            dict,
            stats: manifest.stats,
            organizersData: organizers,
            positionsData: positions,
            loading: false,
            hydrating: true,
          });
          // Hydrate sisa shard di background.
          const rest = await Promise.allSettled(manifest.list.slice(1).map((f) => loadShard(f)));
          const more = rest.flatMap((r) =>
            r.status === "fulfilled" && Array.isArray(r.value) ? r.value.map((x) => normalize(x, dict)) : []
          );
          const seen = new Set(positions.map((p) => p.id));
          const merged = [...positions, ...more.filter((p) => !seen.has(p.id))].sort(
            (a, b) => new Date(b.date) - new Date(a.date)
          );
          set({ positionsData: merged, hydrating: false });
        } catch (e) {
          console.error("Gagal memuat data:", e);
          set({ error: String(e), loading: false, hydrating: false });
        } finally {
          set({ _inFlight: false });
        }
      },

      fetchDetail: async (id) => {
        const { manifest, _detailShards } = get();
        if (!id || !manifest?.detail?.files?.length) return;
        const shard = detailShardFor(id, manifest);
        if (!shard || _detailShards[shard]) return;
        set((s) => ({ _detailShards: { ...s._detailShards, [shard]: "loading" } }));
        try {
          const map = await loadShard(shard);
          set((s) => ({
            _detailShards: { ...s._detailShards, [shard]: "loaded" },
            positionsData: s.positionsData.map((p) =>
              map[p.id] ? { ...p, curriculum: map[p.id] } : p
            ),
          }));
        } catch (e) {
          console.error("Gagal memuat detail:", shard, e);
          set((s) => {
            const next = { ...s._detailShards };
            delete next[shard];
            return { _detailShards: next };
          });
        }
      },

      // --- user state (persisted) ---
      bookmarks: [],
      statuses: {},
      compareList: [],
      targetOrganizers: [],
      snapshots: {},

      toggleBookmark: (id, snap) =>
        set((s) => {
          if (s.bookmarks.includes(id)) return { bookmarks: s.bookmarks.filter((x) => x !== id) };
          return {
            bookmarks: [...s.bookmarks, id],
            snapshots: snap ? { ...s.snapshots, [id]: snap } : s.snapshots,
          };
        }),
      updateStatus: (id, status) => set((s) => ({ statuses: { ...s.statuses, [id]: status } })),
      toggleCompare: (id) =>
        set((s) =>
          s.compareList.includes(id)
            ? { compareList: s.compareList.filter((x) => x !== id) }
            : { compareList: [...s.compareList, id] }
        ),
      clearCompare: () => set({ compareList: [] }),
      toggleTargetOrganizer: (oid) =>
        set((s) => ({
          targetOrganizers: s.targetOrganizers.includes(oid)
            ? s.targetOrganizers.filter((x) => x !== oid)
            : [...s.targetOrganizers, oid],
        })),
      importShare: (ids) =>
        set((s) => {
          const next = [...new Set([...s.bookmarks, ...ids])];
          return { bookmarks: next };
        }),
    }),
    {
      name: "magang-nasional-tracker-storage-v2",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        bookmarks: s.bookmarks,
        statuses: s.statuses,
        compareList: s.compareList,
        targetOrganizers: s.targetOrganizers,
        snapshots: s.snapshots,
      }),
    }
  )
);
