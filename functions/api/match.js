// Cloudflare Pages Function: POST /api/match
// Default: ranker deterministik lokal. Set env MATCH_UPSTREAM untuk meneruskan ke AI upstream.
import { rank } from "../../shared/match.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...CORS } });

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: "bad request" }, 400);

  if (env?.MATCH_UPSTREAM) {
    try {
      const upstream = await fetch(env.MATCH_UPSTREAM, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(env.MATCH_UPSTREAM_KEY ? { Authorization: `Bearer ${env.MATCH_UPSTREAM_KEY}` } : {}) },
        body: JSON.stringify(body),
      });
      if (upstream.ok) return new Response(await upstream.text(), { headers: { "Content-Type": "application/json", ...CORS } });
    } catch {
      /* jatuh ke ranker lokal */
    }
  }

  return json(rank(body.profile || {}, body.candidates || []));
}
