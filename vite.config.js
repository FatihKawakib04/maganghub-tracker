import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { handleMatch, DEFAULT_UPSTREAM } from "./shared/ai-match.js";

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
        req.on("data", (c) => (raw += c));
        req.on("end", async () => {
          res.setHeader("Content-Type", "application/json");
          try {
            const body = JSON.parse(raw || "{}");
            res.end(JSON.stringify(await handleMatch(body, upstream)));
          } catch (e) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: String(e) }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), matchApiDev()],
  server: { port: 5173, host: true },
});
