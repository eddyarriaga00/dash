# Dash

A personal dashboard built as an installable phone web app (PWA). It has no build step, no dependencies, and needs no API keys.

**Features:** live weather with hourly and 7-day forecasts (Open-Meteo) · daily progress ring · today's intention · tasks with due dates and priorities (quick-add understands `tmr`, `today`, `!`, `!!`) · habit tracker with streaks and a heatmap · notes with search and pinning · quick links · focus/break timer · water tracker · countdowns (one-off or yearly) · dark/light/auto theme with 8 accent colors · JSON backup export/import · works offline.

Your data is stored only on your phone, in the browser's localStorage. Use **Settings → Export backup** now and then.

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
