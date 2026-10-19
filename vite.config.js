import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { rank } from "./shared/match.js";

// Middleware dev untuk /api/match (mencerminkan fungsi Cloudflare Pages di functions/api/match.js).
function matchApiDev() {
  return {
    name: "match-api-dev",
    configureServer(server) {
      server.middlewares.use("/api/match", (req, res, next) => {
        if (req.method !== "POST") return next();
        let raw = "";
        req.on("data", (c) => (raw += c));
        req.on("end", () => {
          res.setHeader("Content-Type", "application/json");
          try {
            const body = JSON.parse(raw || "{}");
            res.end(JSON.stringify(rank(body.profile || {}, body.candidates || [])));
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
