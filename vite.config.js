import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { handleMatch, DEFAULT_UPSTREAM } from "./shared/ai-match.js";

const MAX_BODY = 2 * 1024 * 1024; // 2 MB

// Dev middleware /api/match. Mencerminkan fungsi Cloudflare Pages di functions/api/match.js.
// Set MATCH_UPSTREAM="" untuk mematikan upstream AI asli (pakai ranker lokal).
function matchApiDev() {
  const upstream = process.env.MATCH_UPSTREAM === "" ? null : process.env.MATCH_UPSTREAM || DEFAULT_UPSTREAM;
  return {
    name: "match-api-dev",
    configureServer(server) {
      server.middlewares.use("/api/match", (req, res, next) => {
        if (req.method !== "POST") return next();
        let raw = "";
        let tooBig = false;
        req.on("data", (c) => {
          raw += c;
          if (raw.length > MAX_BODY && !tooBig) {
            tooBig = true;
            res.statusCode = 413;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "payload too large" }));
            req.destroy();
          }
        });
        req.on("end", async () => {
          if (tooBig || res.writableEnded) return;
          res.setHeader("Content-Type", "application/json");
          try {
            const body = JSON.parse(raw || "{}");
            res.end(JSON.stringify(await handleMatch(body, upstream)));
          } catch {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: "bad request" }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), matchApiDev()],
  // Host LAN (0.0.0.0) hanya bila diminta eksplisit: HOST=1 npm run dev
  server: { port: 5173, host: process.env.HOST === "1" ? true : "localhost" },
});
