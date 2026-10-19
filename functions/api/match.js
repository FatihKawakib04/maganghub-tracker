// Cloudflare Pages Function: POST /api/match
// Default upstream = endpoint AI asli situs (dipanggil server-side karena POST-nya tanpa CORS).
// Set env MATCH_UPSTREAM="" untuk mematikan upstream; set URL lain untuk LLM milikmu sendiri.
import { handleMatch, DEFAULT_UPSTREAM } from "../../shared/ai-match.js";

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

  const upstream = env?.MATCH_UPSTREAM === "" ? null : env?.MATCH_UPSTREAM || DEFAULT_UPSTREAM;
  return json(await handleMatch(body, upstream));
}
