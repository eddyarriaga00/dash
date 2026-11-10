// dash-push: reminders as real push notifications for the Dash PWA.
// The app uploads a list of upcoming reminders for its vault; a cron job calls "tick" every minute;
// due reminders are queued per device and each device gets an empty push. The service worker then
// fetches its queued text ("pending") and shows it. Empty pushes need no payload encryption, and the
// signing key pair is generated here on first use and kept in the database (never typed in by anyone).
const ORIGINS = ["https://eddyarriaga00.github.io", "http://localhost:8787"];
const SUBJECT = "https://eddyarriaga00.github.io/dash/";
const PUSH_HOSTS = [/(^|\.)push\.apple\.com$/, /^fcm\.googleapis\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /(^|\.)notify\.windows\.com$/];
const SB = Deno.env.get("SUPABASE_URL")!;
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const VAULT = /^dash-[0-9a-f]{48}$/;

const db = (path: string, init: RequestInit = {}) =>
  fetch(`${SB}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers ?? {}) },
  });
const b64u = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf as ArrayBuffer))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const okEndpoint = (e: string) => { try { const u = new URL(e); return u.protocol === "https:" && PUSH_HOSTS.some((re) => re.test(u.hostname)); } catch { return false; } };

// VAPID key pair: made once, stored in dash_kv.
async function keys(): Promise<{ jwk: JsonWebKey; pub: string }> {
  const [row] = await (await db("dash_kv?k=eq.vapid&select=v")).json();
  if (row?.v?.jwk) return row.v;
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const v = { jwk: await crypto.subtle.exportKey("jwk", pair.privateKey), pub: b64u(await crypto.subtle.exportKey("raw", pair.publicKey)) };
  const ins = await db("dash_kv", { method: "POST", body: JSON.stringify({ k: "vapid", v }), headers: { Prefer: "return=minimal" } });
  if (!ins.ok) { const [again] = await (await db("dash_kv?k=eq.vapid&select=v")).json(); if (again?.v?.jwk) return again.v; throw new Error("could not store key"); }
  return v;
}
async function sendPush(endpoint: string): Promise<number> {
  const { jwk, pub } = await keys();
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const enc = (o: unknown) => b64u(new TextEncoder().encode(JSON.stringify(o)));
  const unsigned = `${enc({ typ: "JWT", alg: "ES256" })}.${enc({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: SUBJECT })}`;
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(unsigned));
  const r = await fetch(endpoint, { method: "POST", headers: { Authorization: `vapid t=${unsigned}.${b64u(sig)}, k=${pub}`, TTL: "3600", Urgency: "high" } });
  await r.body?.cancel();
  return r.status;
}
// Queue the text for each device of a vault, then poke each device once.
async function deliver(byVault: Map<string, { title: string; body: string; tag: string }[]>) {
  let sent = 0;
  for (const [vault, items] of byVault) {
    const subs: { endpoint: string }[] = await (await db(`dash_push_subs?vault=eq.${vault}&select=endpoint`)).json();
    for (const s of subs) {
      await db("dash_outbox", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(items.map((i) => ({ endpoint: s.endpoint, ...i }))) });
      const status = await sendPush(s.endpoint).catch(() => 0);
      if (status === 404 || status === 410) await db(`dash_push_subs?endpoint=eq.${encodeURIComponent(s.endpoint)}`, { method: "DELETE" });
      else if (status >= 200 && status < 300) sent++;
    }
  }
  return sent;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  const cors = { "Access-Control-Allow-Origin": ORIGINS.includes(origin) ? origin : ORIGINS[0], "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Vary": "Origin" };
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!KEY) return json({ error: "server not configured" }, 500);
  try {
    const b = await req.json();
    const text = (v: unknown, n: number) => String(v ?? "").slice(0, n);

    if (b.action === "key") return json({ publicKey: (await keys()).pub });

    if (b.action === "subscribe") {
      if (!VAULT.test(b.vault ?? "") || !okEndpoint(b.endpoint ?? "")) return json({ error: "bad request" }, 400);
      const r = await db("dash_push_subs?on_conflict=endpoint", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ endpoint: b.endpoint, vault: b.vault, fails: 0 }) });
      return json({ ok: r.ok });
    }
    if (b.action === "unsubscribe") {
      if (!okEndpoint(b.endpoint ?? "")) return json({ error: "bad request" }, 400);
      await db(`dash_push_subs?endpoint=eq.${encodeURIComponent(b.endpoint)}`, { method: "DELETE" });
      return json({ ok: true });
    }
    // Replace this vault's not-yet-sent reminders with a fresh list.
    if (b.action === "schedule") {
      if (!VAULT.test(b.vault ?? "") || !Array.isArray(b.items)) return json({ error: "bad request" }, 400);
      const now = Date.now(), max = now + 9 * 864e5;
      const rows = b.items.slice(0, 150).map((i: Record<string, unknown>) => ({ vault: b.vault, at: new Date(String(i.at)).toISOString(), title: text(i.title, 80), body: text(i.body, 180), tag: text(i.tag, 40) }))
        .filter((r: { at: string; title: string }) => r.title && Date.parse(r.at) > now - 60e3 && Date.parse(r.at) < max);
      await db(`dash_reminders?vault=eq.${b.vault}&sent=eq.false`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      if (rows.length) await db("dash_reminders", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(rows) });
      return json({ ok: true, scheduled: rows.length });
    }
    // The service worker asks what to show for this device.
    if (b.action === "pending") {
      if (!okEndpoint(b.endpoint ?? "")) return json({ items: [] });
      const del = await db(`dash_outbox?endpoint=eq.${encodeURIComponent(b.endpoint)}`, { method: "DELETE" });
      const rows: { title: string; body: string; tag: string; created_at: string }[] = del.ok ? await del.json() : [];
      return json({ items: rows.filter((r) => Date.now() - Date.parse(r.created_at) < 30 * 60e3).map(({ title, body, tag }) => ({ title, body, tag })) });
    }
    if (b.action === "test") {
      if (!VAULT.test(b.vault ?? "")) return json({ error: "bad request" }, 400);
      const sent = await deliver(new Map([[b.vault, [{ title: "Dash notifications are on", body: "You'll get reminders for shifts, habits, tasks and bills here.", tag: "test" }]]]));
      return json({ ok: true, sent });
    }
    // Cron: send everything that has come due (skip anything more than 45 minutes late).
    if (b.action === "tick") {
      const upd = await db(`dash_reminders?sent=eq.false&at=lte.${new Date().toISOString()}`, { method: "PATCH", body: JSON.stringify({ sent: true }) });
      const due: { vault: string; at: string; title: string; body: string; tag: string }[] = upd.ok ? await upd.json() : [];
      const byVault = new Map<string, { title: string; body: string; tag: string }[]>();
      for (const d of due) if (Date.now() - Date.parse(d.at) < 45 * 60e3) byVault.set(d.vault, [...(byVault.get(d.vault) ?? []), { title: d.title, body: d.body, tag: d.tag }]);
      const sent = await deliver(byVault);
      // Housekeeping: drop old sent reminders and stale queue rows.
      const old = new Date(Date.now() - 2 * 864e5).toISOString();
      await db(`dash_reminders?sent=eq.true&at=lt.${old}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      await db(`dash_outbox?created_at=lt.${old}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      return json({ due: due.length, sent });
    }
    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
