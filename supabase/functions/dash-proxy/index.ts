// dash-proxy: small CORS helper for the Dash PWA. Not an open proxy:
//   ?kind=ics&url=<calendar feed>   raw .ics, only from known calendar hosts
//   ?kind=quotes&symbols=AAPL,SPY   stock quotes from Yahoo Finance
const ORIGINS = ["https://eddyarriaga00.github.io", "http://localhost:8787"];
const ICS_HOSTS = [/(^|\.)apple\.com$/, /(^|\.)icloud\.com$/, /(^|\.)google\.com$/, /(^|\.)instructure\.com$/,
  /(^|\.)office365\.com$/, /(^|\.)live\.com$/];

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  const cors = {
    "Access-Control-Allow-Origin": ORIGINS.includes(origin) ? origin : ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Vary": "Origin",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const q = new URL(req.url).searchParams;
  try {
    if (q.get("kind") === "ics") {
      const target = new URL((q.get("url") ?? "").trim().replace(/^webcal:/i, "https:"));
      if (target.protocol !== "https:" || !ICS_HOSTS.some((re) => re.test(target.hostname))) {
        return new Response("host not allowed", { status: 400, headers: cors });
      }
      const r = await fetch(target, { headers: { "User-Agent": "iOS/18.0 (22A000) dataaccessd/1.0", "Accept": "text/calendar,*/*" } });
      const body = await r.text();
      if (!r.ok || !body.includes("BEGIN:VCALENDAR")) {
        return new Response(`feed unavailable (${r.status})`, { status: 502, headers: cors });
      }
      return new Response(body, { headers: { ...cors, "Content-Type": "text/calendar; charset=utf-8" } });
    }
    if (q.get("kind") === "quotes") {
      const syms = (q.get("symbols") ?? "").split(",").map((s) => s.trim().toUpperCase())
        .filter((s) => /^[A-Z0-9.^=-]{1,12}$/.test(s)).slice(0, 12);
      const quotes = await Promise.all(syms.map(async (symbol) => {
        try {
          const r = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=15m`,
            { headers: { "User-Agent": "Mozilla/5.0 (Macintosh)" } },
          );
          const res = (await r.json())?.chart?.result?.[0];
          const m = res?.meta;
          if (!m) return { symbol, error: true };
          const spark = (res.indicators?.quote?.[0]?.close ?? []).filter((x: number | null) => x != null)
            .map((x: number) => +x.toFixed(2));
          return { symbol, name: m.shortName ?? m.longName ?? symbol, price: m.regularMarketPrice,
            prev: m.chartPreviousClose ?? m.previousClose, spark };
        } catch { return { symbol, error: true }; }
      }));
      return Response.json({ quotes }, { headers: { ...cors, "Cache-Control": "max-age=60" } });
    }
    return new Response("unknown kind", { status: 400, headers: cors });
  } catch (e) {
    return new Response(String(e), { status: 500, headers: cors });
  }
});
