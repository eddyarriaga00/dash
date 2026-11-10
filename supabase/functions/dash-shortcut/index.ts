// dash-shortcut: serves the signed "Dash Shifts" shortcut as a real file download,
// because GitHub Pages serves it as plain text and Safari then shows it as a page.
// Deployed with JWT verification off: it only returns a file that is already public.
Deno.serve(async () => {
  const r = await fetch("https://eddyarriaga00.github.io/dash/Dash%20Shifts.shortcut");
  if (!r.ok) return new Response("not found", { status: 404 });
  return new Response(r.body, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": 'attachment; filename="Dash Shifts.shortcut"',
      "Cache-Control": "no-store",
    },
  });
});
