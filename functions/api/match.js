// Cloudflare Pages Function: POST /api/match
// Default upstream = endpoint AI asli situs (dipanggil server-side karena POST-nya tanpa CORS).
// Set env MATCH_UPSTREAM="" untuk mematikan upstream; set URL lain untuk LLM milikmu sendiri.
// Set env ALLOWED_ORIGIN ke domainmu untuk membatasi akses (default "*").
import { handleMatch, DEFAULT_UPSTREAM } from "../../shared/ai-match.js";

const MAX_BODY = 2 * 1024 * 1024; // 2 MB

const corsHeaders = (origin, allowed) => {
  const h = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
  if (allowed === "*") h["Access-Control-Allow-Origin"] = "*";
  else if (origin && origin === allowed) h["Access-Control-Allow-Origin"] = origin;
  return h;
};

const json = (obj, status, headers) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...headers } });

export async function onRequestOptions({ request, env }) {
  const allowed = env?.ALLOWED_ORIGIN || "*";
  return new Response(null, { status: 204, headers: corsHeaders(request.headers.get("Origin"), allowed) });
}

export async function onRequestPost({ request, env }) {
  const allowed = env?.ALLOWED_ORIGIN || "*";
  const headers = corsHeaders(request.headers.get("Origin"), allowed);
  const origin = request.headers.get("Origin");

  // Tolak lintas-origin bila allowlist ketat dan tidak cocok.
  if (allowed !== "*" && origin && origin !== allowed) return json({ error: "forbidden" }, 403, headers);

  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_BODY) return json({ error: "payload too large" }, 413, headers);

  const text = await request.text();
  if (text.length > MAX_BODY) return json({ error: "payload too large" }, 413, headers);

  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: "bad request" }, 400, headers);
  }

  const upstream = env?.MATCH_UPSTREAM === "" ? null : env?.MATCH_UPSTREAM || DEFAULT_UPSTREAM;
  return json(await handleMatch(body, upstream), 200, headers);
}
