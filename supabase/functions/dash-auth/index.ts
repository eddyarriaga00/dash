// dash-auth: sign-in for Dash without any client secrets.
//  - Google: the app gets an ID token straight back from Google and sends it here; we verify it with Google.
//  - GitHub: device flow (user types a short code on github.com); we swap the device code for a token
//    and ask GitHub who it belongs to.
// A verified sign-in becomes a one-time ticket that the app redeems for its vault code.
// Called only by the app, with the project's publishable key (JWT verification stays on).
const ORIGINS = ["https://eddyarriaga00.github.io", "http://localhost:8787"];
const GOOGLE_CLIENT_ID = "179677240847-tfa1bts2arm25d1vptjb6cqltpqpbm9v.apps.googleusercontent.com";
const GITHUB_CLIENT_ID = "Ov23liP7kCHZcqhggpTU";
const SB = Deno.env.get("SUPABASE_URL")!;
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const db = (path: string, init: RequestInit = {}) =>
  fetch(`${SB}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers ?? {}) },
  });
const hex = (n: number) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, "0")).join("");

async function makeTicket(identity: string, name: string) {
  const ticket = hex(32);
  const r = await db("dash_tickets", {
    method: "POST",
    body: JSON.stringify({ ticket, identity, name, expires: new Date(Date.now() + 5 * 60e3).toISOString() }),
  });
  if (!r.ok) throw new Error("ticket store failed " + r.status);
  return ticket;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  const cors = {
    "Access-Control-Allow-Origin": ORIGINS.includes(origin) ? origin : ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Vary": "Origin",
  };
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!KEY) return json({ error: "server not configured" }, 500);

  try {
    const body = await req.json();

    // ---- Google: the app sends the ID token Google handed back to it; we verify it with Google ----
    if (body.action === "google") {
      const info = await (await fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(String(body.id_token ?? "")))).json();
      const okIss = info.iss === "accounts.google.com" || info.iss === "https://accounts.google.com";
      const okNonce = typeof body.nonce === "string" && body.nonce.length >= 16 && info.nonce === body.nonce;
      if (info.aud !== GOOGLE_CLIENT_ID || !okIss || !okNonce || !info.sub || Number(info.exp) * 1000 < Date.now()) {
        return json({ error: "google sign-in not valid" }, 401);
      }
      return json({ ticket: await makeTicket("google:" + info.sub, info.given_name || info.name || info.email || "Google") });
    }

    // ---- GitHub device flow ----
    if (body.action === "gh_start") {
      const r = await fetch("https://github.com/login/device/code", {
        method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, scope: "read:user" }),
      });
      return json(await r.json());
    }
    if (body.action === "gh_poll") {
      const r = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, device_code: String(body.device_code ?? ""), grant_type: "urn:ietf:params:oauth:grant-type:device_code" }),
      });
      const tok = await r.json();
      if (!tok.access_token) return json({ pending: true, reason: tok.error ?? "unknown" });
      const u = await (await fetch("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${tok.access_token}`, Accept: "application/vnd.github+json", "User-Agent": "dash-auth" },
      })).json();
      if (!u.id) return json({ error: "github user lookup failed" }, 502);
      return json({ ticket: await makeTicket("github:" + u.id, u.login || "GitHub") });
    }

    // ---- Redeem a ticket for the account's vault (or bind a new account to this device's vault) ----
    if (body.action === "redeem") {
      const ticket = String(body.ticket ?? "");
      if (!/^[0-9a-f]{64}$/.test(ticket)) return json({ error: "bad ticket" }, 400);
      const del = await db(`dash_tickets?ticket=eq.${ticket}`, { method: "DELETE" });
      const [t] = del.ok ? await del.json() : [];
      if (!t || Date.parse(t.expires) < Date.now()) return json({ error: "ticket expired" }, 400);
      const provider = t.identity.split(":")[0];
      const [acct] = await (await db(`dash_accounts?identity=eq.${encodeURIComponent(t.identity)}&select=vault,name`)).json();
      if (acct) return json({ vault: acct.vault, name: acct.name ?? t.name, provider, existing: true });
      const vault = String(body.vault ?? "");
      if (!/^dash-[0-9a-f]{48}$/.test(vault)) return json({ error: "bad vault" }, 400);
      const ins = await db("dash_accounts", { method: "POST", body: JSON.stringify({ identity: t.identity, vault, name: t.name }) });
      if (!ins.ok) return json({ error: "could not save account" }, 500);
      return json({ vault, name: t.name, provider, existing: false });
    }
    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
