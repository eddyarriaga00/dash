# Dash

A personal dashboard built as an installable phone web app (PWA). It has no build step, no dependencies, and needs no API keys.

**Live:** https://eddyarriaga00.github.io/dash/

**Features:** cloud sync across devices (Supabase) · live weather with hourly and 7-day forecasts (Open-Meteo) · daily progress ring · today's intention · tasks with due dates, priorities and repeats (quick-add understands `tmr`, `today`, `daily`, `weekly`, `!`, `!!`), plus swipe right to complete and swipe left to delete · daily mood check-in · habit tracker with streaks and a heatmap · notes with search and pinning · quick links · focus/break timer · water tracker · countdowns (one-off or yearly) · dark/light/auto theme with 8 accent colors · JSON backup export/import · works offline.

Your data is saved on the device first, so the app works offline. **Cloud sync** is optional: tap **Settings → Turn on cloud sync** to get a private sync code. On your other devices, paste that code into **Settings**, or use **Share code** to AirDrop it. Changes from every device are merged, and deletions are kept.

### How sync works
- Supabase project `dash` (org *delamain*); the schema is in [`supabase/schema.sql`](supabase/schema.sql).
- The table is locked (RLS on, no grants). The browser can only call `dash_pull` / `dash_push`, and both need the 53-character random code.
- Writes check a revision number. If two devices write at the same time, the app pulls, merges and retries.
- Only the *publishable* key is in `app.js`, which is safe to make public. Treat your sync code like a password.

## Deploy to GitHub Pages
1. Create a **public** repo on GitHub (free GitHub Pages needs a public repo; your data is never in the repo).
2. Push this folder to it:
   ```bash
   git remote add origin https://github.com/<you>/dash.git
   git push -u origin main
   ```
3. On GitHub, open **Settings → Pages**, then set **Source: Deploy from a branch** with branch `main` and folder `/ (root)`.
4. After about a minute, the site is live at `https://<you>.github.io/dash/`.

## Install on your phone
- **iPhone:** open the URL in **Safari**, tap **Share**, then **Add to Home Screen**.
- **Android:** open it in Chrome, open the **⋮** menu, then tap **Install app**.

## Updating
After you change any files, bump `VERSION` in `sw.js` (for example `dash-v2`). The installed app picks up the new files the next time it opens twice.

## Run locally
```bash
python3 -m http.server 8787
```
