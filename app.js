'use strict';
/* =========================================================
   Dash — personal dashboard PWA. All data lives on-device
   (localStorage). Weather from Open-Meteo (no API key).
   ========================================================= */

/* ---------- utils ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const pad = n => String(n).padStart(2, '0');
const dkey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const dayDiff = (a, b) => Math.round((parseKey(dkey(b)) - parseKey(dkey(a))) / 864e5);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (k, o = { month: 'short', day: 'numeric' }) => parseKey(k).toLocaleDateString(undefined, o);
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/* ---------- icons ---------- */
const svg = p => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
const I = {
  home: svg('<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'),
  tasks: svg('<rect x="3" y="3" width="18" height="18" rx="5"/><path d="m8 12 3 3 5-6"/>'),
  flame: svg('<path d="M12 3c1 3.5 5 5.4 5 10a5 5 0 0 1-10 0c0-2 .9-3.5 2-4.6.3 1.6 1 2.6 2 3.1-.2-3 .1-5.6 1-8.5z"/>'),
  note: svg('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  check: svg('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  play: svg('<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>'),
  pause: svg('<path d="M8 5v14M16 5v14" stroke-width="3"/>'),
  reset: svg('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>'),
  skip: svg('<path d="m5 4 10 8-10 8z"/><path d="M19 5v14"/>'),
  minus: svg('<path d="M5 12h14"/>'),
  trash: svg('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>'),
  pin: svg('<path d="M12 17v5M9 3h6l-1 6 4 4H6l4-4z"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  loc: svg('<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  chev: svg('<path d="m9 6 6 6-6 6"/>'),
  x: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  timer: svg('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/>'),
  drop: svg('<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>'),
};

/* ---------- state ---------- */
const KEY = 'dash.v1';
const ACCENTS = { violet: '#7c6cff', blue: '#3d8bff', teal: '#14b8a6', green: '#22c55e', orange: '#ff8a3d', pink: '#f43f8e', red: '#ef4444', gold: '#eab308' };
const HABIT_EMOJI = ['💧', '🏃', '📚', '🧘', '💪', '🥗', '😴', '✍️', '🎸', '💊', '🚶', '🧠', '🌱', '☀️', '🦷', '📵'];
const LINK_EMOJI = ['🔗', '🐙', '📺', '📧', '📅', '🎵', '💬', '🛒', '📰', '🏀', '💼', '🤖', '📷', '🎮', '🗺️', '💳'];
const CD_EMOJI = ['🎉', '✈️', '🎂', '🏖️', '🎓', '🎄', '💍', '🏆', '🎟️', '📦', '🏀', '❤️'];

const DEFAULTS = () => ({
  name: '', accent: 'violet', theme: 'dark', units: 'F', location: null,
  tasks: [],
  habits: [
    { id: uid(), name: 'Drink water', emoji: '💧', log: {} },
    { id: uid(), name: 'Workout', emoji: '💪', log: {} },
    { id: uid(), name: 'Read', emoji: '📚', log: {} },
  ],
  notes: [],
  links: [
    { id: uid(), title: 'Calendar', url: 'https://calendar.google.com', emoji: '📅' },
    { id: uid(), title: 'Mail', url: 'https://mail.google.com', emoji: '📧' },
    { id: uid(), title: 'GitHub', url: 'https://github.com', emoji: '🐙' },
    { id: uid(), title: 'YouTube', url: 'https://youtube.com', emoji: '📺' },
  ],
  countdowns: [{ id: uid(), title: 'New Year', date: `${new Date().getFullYear() + 1}-01-01`, emoji: '🎉', yearly: true }],
  water: { date: dkey(), count: 0 }, waterGoal: 8,
  intention: { date: dkey(), text: '' },
  focus: { mode: 'focus', running: false, endsAt: 0, remaining: 25 * 60, focusMin: 25, breakMin: 5, sessions: {} },
  tab: 'home', taskFilter: 'today', hideInstall: false,
});

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && typeof raw === 'object') { const d = DEFAULTS(); return { ...d, ...raw, focus: { ...d.focus, ...raw.focus } }; }
  } catch { }
  return DEFAULTS();
}
let S = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { toast('Storage full — export a backup'); } };

function rollDay() {
  const t = dkey();
  if (S.water.date !== t) S.water = { date: t, count: 0 };
  if (S.intention.date !== t) S.intention = { date: t, text: '' };
}

/* ---------- theme ---------- */
function applyTheme() {
  const root = document.documentElement;
  root.dataset.theme = S.theme;
  root.style.setProperty('--accent', ACCENTS[S.accent] || ACCENTS.violet);
  const dark = S.theme === 'dark' || (S.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  $('meta[name=theme-color]').content = dark ? '#09090d' : '#f2f2f7';
}
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);

/* ---------- small components ---------- */
function ring(pct, size = 84, stroke = 9) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, h = size / 2;
  return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle class="ring-bg" cx="${h}" cy="${h}" r="${r}" stroke-width="${stroke}"/>
    <circle class="ring-fg" cx="${h}" cy="${h}" r="${r}" stroke-width="${stroke}" stroke-dasharray="${c.toFixed(2)}"
      stroke-dashoffset="${(c * (1 - Math.min(1, pct))).toFixed(2)}" transform="rotate(-90 ${h} ${h})"/></svg>`;
}
const secHead = (title, action = '') => `<div class="sec-head"><h2>${title}</h2>${action}</div>`;
const emojiPicker = (list, current) => `
  <div class="chips" data-group="emoji">
    ${list.map(e => `<button type="button" class="chip emoji ${e === current ? 'on' : ''}" data-a="pickChip" data-v="${e}">${e}</button>`).join('')}
  </div>
  <input class="input" name="emoji" value="${esc(current)}" maxlength="4" placeholder="Or type any emoji" style="margin-top:10px">`;

/* ---------- tasks helpers ---------- */
const taskSort = (a, b) => (a.due || '9999').localeCompare(b.due || '9999') || (b.priority || 0) - (a.priority || 0) || a.created - b.created;
function dueLabel(due) {
  if (!due) return null;
  const n = dayDiff(new Date(), parseKey(due));
  if (n < 0) return { t: n === -1 ? 'Yesterday' : `${-n}d overdue`, c: 'over' };
  if (n === 0) return { t: 'Today', c: 'today' };
  if (n === 1) return { t: 'Tomorrow', c: '' };
  if (n < 7) return { t: fmtDate(due, { weekday: 'long' }), c: '' };
  return { t: fmtDate(due), c: '' };
}
function todayTasks() {
  const t = dkey();
  const open = S.tasks.filter(x => !x.done && x.due && x.due <= t);
  const done = S.tasks.filter(x => x.done && x.doneAt === t);
  return { open, done, total: open.length + done.length };
}
function taskRow(t) {
  const d = dueLabel(t.due);
  const meta = (d && !t.done) || t.priority ? `<div class="task-meta">${d && !t.done ? `<span class="due ${d.c}">${d.t}</span>` : ''}${t.priority ? `<span class="prio">${'!'.repeat(t.priority)}</span>` : ''}</div>` : '';
  return `<div class="task ${t.done ? 'done' : ''} p${t.priority || 0}" data-tid="${t.id}">
    <button class="check" data-a="toggleTask" data-id="${t.id}" aria-label="${t.done ? 'Mark incomplete' : 'Complete'}">${I.check}</button>
    <div class="task-body" data-a="editTask" data-id="${t.id}"><div class="task-text">${esc(t.text)}</div>${meta}</div>
  </div>`;
}
function parseQuick(text) {
  let due = '', priority = 0;
  const words = text.trim().split(/\s+/), keep = [];
  for (const w of words) {
    const l = w.toLowerCase();
    if (l === '!!' || l === '!!!') priority = 2;
    else if (l === '!') priority = Math.max(priority, 1);
    else if (l === 'today' || l === 'tod') due = dkey();
    else if (l === 'tomorrow' || l === 'tmr' || l === 'tmrw') due = dkey(addDays(new Date(), 1));
    else keep.push(w);
  }
  return { text: keep.join(' ') || text.trim(), due, priority };
}
function addTask(raw, defaultDue = '') {
  const p = parseQuick(raw);
  if (!p.text) return;
  S.tasks.push({ id: uid(), text: p.text, done: false, due: p.due || defaultDue, priority: p.priority, created: Date.now() });
  save();
}

/* ---------- habits helpers ---------- */
function streak(h) {
  let d = new Date(); if (!h.log[dkey(d)]) d = addDays(d, -1);
  let n = 0; while (h.log[dkey(d)]) { n++; d = addDays(d, -1); }
  return n;
}
function bestStreak(h) {
  const keys = Object.keys(h.log).filter(k => h.log[k]).sort();
  let best = 0, cur = 0, prev = null;
  for (const k of keys) { cur = prev && dayDiff(parseKey(prev), parseKey(k)) === 1 ? cur + 1 : 1; best = Math.max(best, cur); prev = k; }
  return best;
}
const rate = (h, days = 30) => { let n = 0; for (let i = 0; i < days; i++) if (h.log[dkey(addDays(new Date(), -i))]) n++; return Math.round(n / days * 100); };

/* ---------- countdown helpers ---------- */
function nextDate(c) {
  if (!c.yearly) return c.date;
  const today = new Date(); const d = parseKey(c.date);
  let next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
  if (dayDiff(today, next) < 0) next = new Date(today.getFullYear() + 1, d.getMonth(), d.getDate());
  return dkey(next);
}

/* =========================================================
   WEATHER (Open-Meteo)
   ========================================================= */
const WMO = {
  0: ['Clear', '☀️', '🌙', 'clear'], 1: ['Mostly clear', '🌤️', '🌙', 'clear'], 2: ['Partly cloudy', '⛅', '☁️', 'cloud'], 3: ['Overcast', '☁️', '☁️', 'cloud'],
  45: ['Fog', '🌫️', '🌫️', 'cloud'], 48: ['Freezing fog', '🌫️', '🌫️', 'cloud'],
  51: ['Light drizzle', '🌦️', '🌧️', 'rain'], 53: ['Drizzle', '🌦️', '🌧️', 'rain'], 55: ['Heavy drizzle', '🌧️', '🌧️', 'rain'],
  56: ['Freezing drizzle', '🌧️', '🌧️', 'rain'], 57: ['Freezing drizzle', '🌧️', '🌧️', 'rain'],
  61: ['Light rain', '🌦️', '🌧️', 'rain'], 63: ['Rain', '🌧️', '🌧️', 'rain'], 65: ['Heavy rain', '🌧️', '🌧️', 'rain'],
  66: ['Freezing rain', '🌧️', '🌧️', 'rain'], 67: ['Freezing rain', '🌧️', '🌧️', 'rain'],
  71: ['Light snow', '🌨️', '🌨️', 'snow'], 73: ['Snow', '🌨️', '🌨️', 'snow'], 75: ['Heavy snow', '❄️', '❄️', 'snow'], 77: ['Snow grains', '🌨️', '🌨️', 'snow'],
  80: ['Showers', '🌦️', '🌧️', 'rain'], 81: ['Showers', '🌧️', '🌧️', 'rain'], 82: ['Heavy showers', '⛈️', '⛈️', 'storm'],
  85: ['Snow showers', '🌨️', '🌨️', 'snow'], 86: ['Snow showers', '❄️', '❄️', 'snow'],
  95: ['Thunderstorm', '⛈️', '⛈️', 'storm'], 96: ['Storm & hail', '⛈️', '⛈️', 'storm'], 99: ['Storm & hail', '⛈️', '⛈️', 'storm'],
};
const wmo = (code, day = 1) => { const w = WMO[code] || ['—', '🌡️', '🌡️', 'cloud']; return { label: w[0], icon: day ? w[1] : w[2], kind: w[3] }; };
const locSig = () => S.location ? `${S.location.lat},${S.location.lon},${S.units}` : '';

let W = (() => { try { return JSON.parse(localStorage.getItem('dash.weather')) || {}; } catch { return {}; } })();
let wLoading = false;

async function loadWeather(force = false) {
  if (!S.location || wLoading) return;
  if (!force && W.data && W.sig === locSig() && Date.now() - W.ts < 15 * 60e3) return;
  wLoading = true; refreshWeather();
  try {
    const { lat, lon } = S.location, f = S.units === 'F';
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m,relative_humidity_2m` +
      `&hourly=temperature_2m,weather_code,precipitation_probability,is_day` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,uv_index_max` +
      `&temperature_unit=${f ? 'fahrenheit' : 'celsius'}&wind_speed_unit=${f ? 'mph' : 'kmh'}&timezone=auto&forecast_days=7`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(r.status);
    W = { data: await r.json(), ts: Date.now(), sig: locSig() };
    try { localStorage.setItem('dash.weather', JSON.stringify(W)); } catch { }
  } catch {
    if (force) toast('Couldn’t reach weather service');
  } finally { wLoading = false; refreshWeather(); }
}
function refreshWeather() { const el = $('#weather'); if (el) el.outerHTML = weatherCard(); }

function weatherCard() {
  if (!S.location) return `
    <section class="card weather w-empty" id="weather">
      <div class="w-loc">${I.loc} Weather</div>
      <div class="w-cond" style="margin-top:8px;font-size:20px">See your forecast here</div>
      <div class="w-meta">Uses your location or a city you pick. Nothing leaves your phone except the coordinates.</div>
      <div class="w-cta"><button data-a="useLocation">Use my location</button><button data-a="goSettings">Search a city</button></div>
    </section>`;
  const d = W.sig === locSig() ? W.data : null;
  if (!d) return `<section class="card weather w-empty" id="weather"><div class="w-loc">${I.loc} ${esc(S.location.name)}</div>
    <div class="w-temp">--°</div><div class="w-cond">${wLoading ? 'Loading…' : 'Tap to retry'}</div>${wLoading ? '<div class="w-loading"></div>' : ''}</section>`;
  const c = d.current, w = wmo(c.weather_code, c.is_day);
  const kind = !c.is_day && (w.kind === 'clear' || w.kind === 'cloud') ? 'night' : w.kind;
  const start = Math.max(0, d.hourly.time.indexOf(c.time.slice(0, 13) + ':00'));
  const hours = d.hourly.time.slice(start, start + 24).map((t, j) => {
    const i = start + j, h = +t.slice(11, 13), p = d.hourly.precipitation_probability[i];
    const lbl = j === 0 ? 'Now' : (h % 12 || 12) + (h < 12 ? 'a' : 'p');
    return `<div class="hour"><span>${lbl}</span><span class="e">${wmo(d.hourly.weather_code[i], d.hourly.is_day[i]).icon}</span><span class="p">${p >= 20 ? p + '%' : ''}</span><b>${Math.round(d.hourly.temperature_2m[i])}°</b></div>`;
  }).join('');
  return `
    <section class="card weather w-${kind} pressable" id="weather" data-a="weatherSheet">
      ${wLoading ? '<div class="w-loading"></div>' : ''}
      <div class="w-top">
        <div>
          <div class="w-loc">${I.loc} ${esc(S.location.name)}</div>
          <div class="w-temp">${Math.round(c.temperature_2m)}°</div>
          <div class="w-cond">${w.label}</div>
        </div>
        <div class="w-icon">${w.icon}</div>
      </div>
      <div class="w-meta"><span>H ${Math.round(d.daily.temperature_2m_max[0])}° · L ${Math.round(d.daily.temperature_2m_min[0])}°</span><span>Feels ${Math.round(c.apparent_temperature)}°</span><span>💨 ${Math.round(c.wind_speed_10m)} ${S.units === 'F' ? 'mph' : 'km/h'}</span></div>
      <div class="hours">${hours}</div>
    </section>`;
}

function weatherSheet() {
  const d = W.data; if (!d) return loadWeather(true);
  const lo = Math.min(...d.daily.temperature_2m_min), hi = Math.max(...d.daily.temperature_2m_max), span = hi - lo || 1;
  const t = s => new Date(s).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const days = d.daily.time.map((k, i) => {
    const mn = d.daily.temperature_2m_min[i], mx = d.daily.temperature_2m_max[i], p = d.daily.precipitation_probability_max[i];
    return `<div class="day"><b>${i === 0 ? 'Today' : fmtDate(k, { weekday: 'short' })}</b><span class="e">${wmo(d.daily.weather_code[i]).icon}</span>
      <span class="p">${p >= 20 ? p + '%' : ''}</span><span class="lo">${Math.round(mn)}°</span>
      <div class="bar"><i style="left:${(mn - lo) / span * 100}%;right:${100 - (mx - lo) / span * 100}%"></i></div>
      <span class="hi">${Math.round(mx)}°</span></div>`;
  }).join('');
  openSheet(`
    <div class="sheet-head"><div class="sheet-title" style="margin:0">${esc(S.location.name)}</div><div class="spacer"></div>
      <button class="icon-btn" data-a="refreshWeather" aria-label="Refresh">${I.reset}</button></div>
    <div class="stat-grid">
      <div class="stat"><small>Humidity</small><b>${d.current.relative_humidity_2m}%</b></div>
      <div class="stat"><small>UV max</small><b>${Math.round(d.daily.uv_index_max[0] ?? 0)}</b></div>
      <div class="stat"><small>Wind</small><b>${Math.round(d.current.wind_speed_10m)}</b></div>
      <div class="stat"><small>Sunrise</small><b>${t(d.daily.sunrise[0])}</b></div>
      <div class="stat"><small>Sunset</small><b>${t(d.daily.sunset[0])}</b></div>
      <div class="stat"><small>Updated</small><b>${new Date(W.ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</b></div>
    </div>
    <div class="days">${days}</div>`);
}

function useLocation() {
  if (!navigator.geolocation) return toast('Location isn’t available here');
  toast('Finding you…');
  navigator.geolocation.getCurrentPosition(p => {
    S.location = { name: 'My location', lat: +p.coords.latitude.toFixed(3), lon: +p.coords.longitude.toFixed(3) };
    save(); render(); loadWeather(true); toast('Location set');
  }, () => toast('Location blocked — search a city in Settings'), { timeout: 12000, maximumAge: 6e5 });
}

let cityTimer;
function citySearch(q) {
  clearTimeout(cityTimer);
  const box = $('#city-results'); if (!box) return;
  if (q.trim().length < 2) { box.innerHTML = ''; return; }
  cityTimer = setTimeout(async () => {
    try {
      const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q.trim())}&count=6&language=en`);
      const j = await r.json();
      box.innerHTML = (j.results || []).map(c => `<button class="row" data-a="pickCity" data-name="${esc(c.name)}" data-lat="${c.latitude}" data-lon="${c.longitude}">
        <span class="ic">📍</span><div><div class="row-title">${esc(c.name)}</div><div class="muted" style="font-size:13px">${esc([c.admin1, c.country].filter(Boolean).join(', '))}</div></div></button>`).join('')
        || '<div class="pad muted">No matches</div>';
    } catch { box.innerHTML = '<div class="pad muted">Search failed — check your connection</div>'; }
  }, 300);
}

/* =========================================================
   FOCUS TIMER
   ========================================================= */
const focusLen = m => (m === 'focus' ? S.focus.focusMin : S.focus.breakMin) * 60;
const focusLeft = () => S.focus.running ? Math.max(0, Math.round((S.focus.endsAt - Date.now()) / 1000)) : S.focus.remaining;
const mmss = s => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
let audioCtx;
function beep() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    [0, .22, .44].forEach(t => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination);
      g.gain.setValueAtTime(.001, audioCtx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(.3, audioCtx.currentTime + t + .02);
      g.gain.exponentialRampToValueAtTime(.001, audioCtx.currentTime + t + .18);
      o.start(audioCtx.currentTime + t); o.stop(audioCtx.currentTime + t + .2);
    });
  } catch { }
  navigator.vibrate?.([120, 60, 120]);
}
function focusComplete(silent) {
  const f = S.focus;
  if (f.mode === 'focus') { const k = dkey(); f.sessions[k] = (f.sessions[k] || 0) + 1; }
  f.mode = f.mode === 'focus' ? 'break' : 'focus';
  f.running = false; f.remaining = focusLen(f.mode);
  save();
  if (!silent) { beep(); toast(f.mode === 'break' ? 'Focus done — take a break ☕' : 'Break over — back at it 💪'); }
  if (S.tab === 'home') render(false);
}
function tick() {
  if (S.focus.running && focusLeft() <= 0) return focusComplete();
  const el = $('#focus-time'); if (!el) return;
  const left = focusLeft();
  el.textContent = mmss(left);
  $('#focus-bar').style.width = (100 - left / focusLen(S.focus.mode) * 100) + '%';
}
setInterval(tick, 1000);

/* =========================================================
   VIEWS
   ========================================================= */
function viewHome() {
  rollDay();
  const now = new Date(), h = now.getHours(), t = dkey();
  const greet = h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 22 ? 'Good evening' : 'Good night';
  const tt = todayTasks();
  const hDone = S.habits.filter(x => x.log[t]).length;
  const total = tt.total + S.habits.length, done = tt.done.length + hDone;
  const pct = total ? done / total : 0;
  const sessions = S.focus.sessions[t] || 0;

  const upNext = S.tasks.filter(x => !x.done).sort(taskSort).slice(0, 4);
  const f = S.focus, left = focusLeft();
  const cds = S.countdowns.map(c => ({ ...c, next: nextDate(c) })).sort((a, b) => a.next.localeCompare(b.next));

  return `
  <header class="hero">
    <div style="flex:1">
      <div class="eyebrow">${now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
      <h1>${greet}${S.name ? `,<br><span class="accent">${esc(S.name)}</span>` : ''}</h1>
    </div>
    <button class="icon-btn" data-a="goSettings" aria-label="Settings">${I.gear}</button>
  </header>

  ${!S.hideInstall && !isStandalone() ? `<div class="banner"><span style="font-size:24px">📲</span><div><b>Add to Home Screen</b>${isIOS() ? 'Tap Share, then “Add to Home Screen”.' : 'Use your browser menu → Install app.'}</div><button class="x" data-a="hideInstall" aria-label="Dismiss">${I.x}</button></div>` : ''}

  ${weatherCard()}

  <section class="card">
    <div class="today">
      <div class="ring-wrap">${ring(pct)}<div class="ring-label"><div>${Math.round(pct * 100)}%<small>today</small></div></div></div>
      <div class="today-stats">
        <div class="ts"><span class="dot"></span>Tasks<b>${tt.done.length}/${tt.total}</b></div>
        <div class="ts"><span class="dot" style="background:#ff8a3d"></span>Habits<b>${hDone}/${S.habits.length}</b></div>
        <div class="ts"><span class="dot" style="background:#4aa8ff"></span>Focus<b>${sessions} ${sessions === 1 ? 'session' : 'sessions'}</b></div>
      </div>
    </div>
    <label class="intention"><span>🎯</span><input data-input="intention" value="${esc(S.intention.text)}" placeholder="Today’s one big thing…" enterkeyhint="done"></label>
  </section>

  <section class="card">
    ${secHead('Up next', `<button class="link-btn" data-a="tab" data-tab="tasks">See all</button>`)}
    ${upNext.length ? `<div class="task-list">${upNext.map(taskRow).join('')}</div>`
      : `<div class="empty"><div class="big">✨</div><b>All clear</b>Nothing on your plate.</div>`}
  </section>

  ${S.habits.length ? `<section class="card">
    ${secHead('Habits', `<button class="link-btn" data-a="tab" data-tab="habits">${hDone}/${S.habits.length}</button>`)}
    <div class="chip-row">${S.habits.map(x => `<button class="habit-chip ${x.log[t] ? 'on' : ''}" data-a="toggleHabit" data-id="${x.id}" data-day="${t}"><span>${x.emoji}</span>${esc(x.name)}</button>`).join('')}</div>
  </section>` : ''}

  <section class="card">
    ${secHead('Quick links', `<button class="link-btn" data-a="goSettings">Edit</button>`)}
    <div class="links">
      ${S.links.map(l => `<a class="qlink" href="${esc(l.url)}" target="_blank" rel="noopener"><span class="tile">${l.emoji || esc((l.title || '?')[0])}</span><span class="t">${esc(l.title)}</span></a>`).join('')}
      <button class="qlink" data-a="addLink"><span class="tile add">${I.plus}</span><span class="t">Add</span></button>
    </div>
  </section>

  <div class="grid2">
    <section class="card mini ${f.mode === 'break' ? 'mode-break' : ''}">
      <h3>${I.timer} ${f.mode === 'focus' ? 'Focus' : 'Break'}</h3>
      <div class="focus-time" id="focus-time">${mmss(left)}</div>
      <div class="focus-sub">${sessions} done today</div>
      <div class="progress"><i id="focus-bar" style="width:${100 - left / focusLen(f.mode) * 100}%"></i></div>
      <div class="mini-btns">
        <button class="primary" data-a="focusToggle" aria-label="${f.running ? 'Pause' : 'Start'}">${f.running ? I.pause : I.play}</button>
        <button data-a="${left === focusLen(f.mode) && !f.running ? 'focusSkip' : 'focusReset'}" aria-label="Reset">${left === focusLen(f.mode) && !f.running ? I.skip : I.reset}</button>
      </div>
    </section>
    <section class="card mini">
      <h3>${I.drop} Water</h3>
      <div class="water-count">${S.water.count}<small> / ${S.waterGoal}</small></div>
      <div class="focus-sub">${S.water.count >= S.waterGoal ? 'Goal hit 🎉' : `${S.waterGoal - S.water.count} to go`}</div>
      <div class="drops">${Array.from({ length: S.waterGoal }, (_, i) => `<i class="${i < S.water.count ? 'on' : ''}"></i>`).join('')}</div>
      <div class="mini-btns"><button data-a="water" data-n="-1" aria-label="Remove glass">${I.minus}</button><button class="primary" data-a="water" data-n="1" aria-label="Add glass" style="background:#4aa8ff">${I.plus}</button></div>
    </section>
  </div>

  <section class="card">
    ${secHead('Countdowns')}
    <div class="cd-row">
      ${cds.map(c => { const n = dayDiff(new Date(), parseKey(c.next)); return `<button class="cd ${n <= 7 && n >= 0 ? 'soon' : ''}" data-a="editCountdown" data-id="${c.id}">
        <span class="e">${c.emoji}</span>
        <span class="n">${n === 0 ? 'Today' : Math.abs(n)}${n === 0 ? '' : `<small>${n < 0 ? 'days ago' : n === 1 ? 'day' : 'days'}</small>`}</span>
        <span class="t">${esc(c.title)}</span><span class="d">${fmtDate(c.next, { month: 'short', day: 'numeric', year: 'numeric' })}</span></button>`; }).join('')}
      <button class="cd add" data-a="addCountdown" aria-label="Add countdown">${I.plus}</button>
    </div>
  </section>`;
}

function viewTasks() {
  const t = dkey(), f = S.taskFilter;
  const open = S.tasks.filter(x => !x.done).sort(taskSort);
  let body = '';
  const group = (label, list, cls = '') => list.length ? `<div class="group-label ${cls}">${label}</div><section class="card" style="padding:4px 16px"><div class="task-list">${list.map(taskRow).join('')}</div></section>` : '';
  if (f === 'today') {
    const over = open.filter(x => x.due && x.due < t), today = open.filter(x => x.due === t);
    const doneToday = S.tasks.filter(x => x.done && x.doneAt === t);
    body = group('Overdue', over, 'over') + group('Today', today) + group('Completed', doneToday);
    if (!over.length && !today.length) body = `<div class="empty card"><div class="big">🌤️</div><b>Nothing due today</b>Add something above, or enjoy the free time.</div>` + group('Completed', doneToday);
  } else if (f === 'upcoming') {
    const up = open.filter(x => x.due && x.due > t);
    const byDay = {}; up.forEach(x => (byDay[x.due] ||= []).push(x));
    body = Object.keys(byDay).sort().map(k => group(dueLabel(k).t + (dayDiff(new Date(), parseKey(k)) < 7 ? ` · ${fmtDate(k)}` : ''), byDay[k])).join('')
      || `<div class="empty card"><div class="big">📅</div><b>Nothing scheduled</b>Tasks with a future date show up here.</div>`;
  } else if (f === 'all') {
    body = group('Scheduled', open.filter(x => x.due)) + group('Someday', open.filter(x => !x.due));
    if (!open.length) body = `<div class="empty card"><div class="big">🗂️</div><b>No open tasks</b>Your list is empty.</div>`;
  } else {
    const done = S.tasks.filter(x => x.done).sort((a, b) => (b.doneTs || 0) - (a.doneTs || 0));
    body = done.length ? group(`${done.length} completed`, done) + `<button class="btn danger" data-a="clearDone" style="margin-top:8px">Clear completed</button>`
      : `<div class="empty card"><div class="big">🏁</div><b>Nothing completed yet</b>Checked-off tasks land here.</div>`;
  }
  return `
  <header class="page-head"><h1>Tasks</h1>${open.length ? `<span class="count-pill">${open.length}</span>` : ''}</header>
  <form class="quick-add" data-form="quickTask" autocomplete="off">
    <input class="input" id="qt" name="text" placeholder="Add a task… try “call mom tmr !”" enterkeyhint="done">
    <button class="add-btn" aria-label="Add task">${I.plus}</button>
  </form>
  <div class="seg">${[['today', 'Today'], ['upcoming', 'Upcoming'], ['all', 'All'], ['done', 'Done']].map(([k, l]) => `<button class="${f === k ? 'on' : ''}" data-a="taskFilter" data-f="${k}">${l}</button>`).join('')}</div>
  <div>${body}</div>`;
}

function viewHabits() {
  const t = new Date();
  const week = Array.from({ length: 7 }, (_, i) => addDays(t, i - 6));
  const hDone = S.habits.filter(x => x.log[dkey()]).length;
  let wk = 0; S.habits.forEach(h => week.forEach(d => { if (h.log[dkey(d)]) wk++; }));
  const wkPct = S.habits.length ? Math.round(wk / (S.habits.length * 7) * 100) : 0;
  return `
  <header class="page-head"><h1>Habits</h1><div class="spacer"></div><button class="icon-btn on" data-a="addHabit" aria-label="New habit">${I.plus}</button></header>
  ${S.habits.length ? `<section class="card"><div class="today">
    <div class="ring-wrap">${ring(S.habits.length ? hDone / S.habits.length : 0, 72, 8)}<div class="ring-label"><div style="font-size:16px">${hDone}/${S.habits.length}</div></div></div>
    <div class="today-stats"><div class="ts">Done today<b>${hDone}</b></div><div class="ts">Last 7 days<b>${wkPct}%</b></div><div class="ts">Longest streak<b>${Math.max(0, ...S.habits.map(streak))} 🔥</b></div></div>
  </div></section>` : ''}
  ${S.habits.map(h => {
    const s = streak(h);
    return `<section class="card habit">
      <div class="habit-top" data-a="habitDetail" data-id="${h.id}">
        <div class="habit-emoji">${h.emoji}</div>
        <div><div class="habit-name">${esc(h.name)}</div><div class="habit-sub">${rate(h)}% last 30 days</div></div>
        <div class="streak ${s ? '' : 'zero'}">${s} 🔥</div>
      </div>
      <div class="week">${week.map(d => { const k = dkey(d), today = k === dkey(); return `<div class="wd ${today ? 'is-today' : ''}">${today ? 'Today' : d.toLocaleDateString(undefined, { weekday: 'narrow' })}
        <button class="${h.log[k] ? 'on' : ''}" data-a="toggleHabit" data-id="${h.id}" data-day="${k}" aria-label="${k}">${I.check}</button></div>`; }).join('')}</div>
    </section>`;
  }).join('') || `<div class="empty card"><div class="big">🌱</div><b>No habits yet</b>Tap + to start tracking one.</div>`}`;
}

let noteQuery = '';
function notesList() {
  const q = noteQuery.toLowerCase().trim();
  const list = S.notes.filter(n => !q || (n.title + ' ' + n.body).toLowerCase().includes(q))
    .sort((a, b) => (b.pinned - a.pinned) || b.updated - a.updated);
  if (!list.length) return `<div class="empty card"><div class="big">📝</div><b>${q ? 'No matches' : 'No notes yet'}</b>${q ? 'Try another search.' : 'Tap + to jot something down.'}</div>`;
  return `<div class="notes-grid">${list.map(n => `<button class="note-card pressable" data-a="openNote" data-id="${n.id}">
    ${n.title ? `<h4>${esc(n.title)}</h4>` : ''}<p>${esc(n.body.slice(0, 280)) || '<i>Empty</i>'}</p>
    <div class="when">${n.pinned ? I.pin : ''}${ago(n.updated)}</div></button>`).join('')}</div>`;
}
function ago(ts) {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return 'Just now'; if (s < 3600) return `${Math.floor(s / 60)}m ago`; if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function viewNotes() {
  return `
  <header class="page-head"><h1>Notes</h1>${S.notes.length ? `<span class="count-pill">${S.notes.length}</span>` : ''}<div class="spacer"></div><button class="icon-btn on" data-a="openNote" aria-label="New note">${I.plus}</button></header>
  ${S.notes.length ? `<div class="search">${I.search}<input class="input" type="search" data-input="noteSearch" value="${esc(noteQuery)}" placeholder="Search notes"></div>` : ''}
  <div id="notes-list">${notesList()}</div>`;
}

function viewSettings() {
  const row = (ic, title, right, a = '', attrs = '') => `<${a ? 'button' : 'div'} class="row" ${a ? `data-a="${a}"` : ''} ${attrs}><span class="ic">${ic}</span><span class="row-title">${title}</span>${right}</${a ? 'button' : 'div'}>`;
  return `
  <header class="page-head"><button class="icon-btn" data-a="tab" data-tab="home" aria-label="Back" style="transform:scaleX(-1)">${I.chev}</button><h1>Settings</h1></header>

  <div class="settings-label">Profile</div>
  <div class="list">${row('👋', 'Your name', `<input class="inline" data-change="name" value="${esc(S.name)}" placeholder="Optional" autocomplete="given-name">`)}</div>

  <div class="settings-label">Appearance</div>
  <div class="list">
    <div class="pad"><div class="seg">${[['auto', 'Auto'], ['dark', 'Dark'], ['light', 'Light']].map(([k, l]) => `<button class="${S.theme === k ? 'on' : ''}" data-a="setTheme" data-v="${k}">${l}</button>`).join('')}</div></div>
    <div class="swatches" style="padding-top:0">${Object.entries(ACCENTS).map(([k, c]) => `<button class="swatch ${S.accent === k ? 'on' : ''}" style="background:${c};color:${c}" data-a="setAccent" data-v="${k}" aria-label="${k}"></button>`).join('')}</div>
  </div>

  <div class="settings-label">Weather</div>
  <div class="list">
    ${row('📍', 'Location', `<span class="v">${S.location ? esc(S.location.name) : 'Not set'}</span>`)}
    ${row('🛰️', 'Use my current location', `<span class="v">${I.chev}</span>`, 'useLocation')}
    <div class="pad" style="padding-bottom:8px"><div class="search">${I.search}<input class="input" type="search" data-input="city" placeholder="Search a city"></div></div>
    <div class="city-results" id="city-results"></div>
    <div class="pad"><div class="seg">${[['F', '°F · mph'], ['C', '°C · km/h']].map(([k, l]) => `<button class="${S.units === k ? 'on' : ''}" data-a="setUnits" data-v="${k}">${l}</button>`).join('')}</div></div>
  </div>

  <div class="settings-label">Focus & water</div>
  <div class="list">
    ${row('🎯', 'Focus minutes', `<input class="inline num" type="number" inputmode="numeric" min="1" max="180" data-change="focusMin" value="${S.focus.focusMin}">`)}
    ${row('☕', 'Break minutes', `<input class="inline num" type="number" inputmode="numeric" min="1" max="60" data-change="breakMin" value="${S.focus.breakMin}">`)}
    ${row('💧', 'Daily water goal', `<input class="inline num" type="number" inputmode="numeric" min="1" max="20" data-change="waterGoal" value="${S.waterGoal}">`)}
  </div>

  <div class="settings-label">Quick links</div>
  <div class="list">
    ${S.links.map(l => row(l.emoji || '🔗', esc(l.title), `<span class="v">${esc(l.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 22))}${I.chev}</span>`, 'editLink', `data-id="${l.id}"`)).join('')}
    ${row('➕', '<span class="accent">Add link</span>', '', 'addLink')}
  </div>

  <div class="settings-label">Countdowns</div>
  <div class="list">
    ${S.countdowns.map(c => row(c.emoji, esc(c.title), `<span class="v">${fmtDate(nextDate(c))}${I.chev}</span>`, 'editCountdown', `data-id="${c.id}"`)).join('')}
    ${row('➕', '<span class="accent">Add countdown</span>', '', 'addCountdown')}
  </div>

  <div class="settings-label">Your data</div>
  <div class="list">
    ${row('📤', 'Export backup', `<span class="v">${I.chev}</span>`, 'exportData')}
    ${row('📥', 'Import backup', `<span class="v">${I.chev}</span>`, 'importData')}
    ${row('🗑️', '<span style="color:var(--danger)">Erase everything</span>', '', 'resetAll')}
  </div>
  <p class="foot">Dash · everything is stored only on this device.<br>Export a backup now and then.</p>
  <input type="file" id="import-file" accept="application/json,.json" hidden>`;
}

/* =========================================================
   RENDER / NAV
   ========================================================= */
const VIEWS = { home: viewHome, tasks: viewTasks, habits: viewHabits, notes: viewNotes, settings: viewSettings };
function render(animate = false) {
  const v = $('#view');
  const y = scrollY;
  v.innerHTML = (VIEWS[S.tab] || viewHome)();
  if (animate) { v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter'); scrollTo(0, 0); }
  else scrollTo(0, y);
  renderTabs();
}
function renderTabs() {
  const due = todayTasks().open.length;
  const tab = (k, label, icon, badge = 0) => `<button class="tab ${S.tab === k ? 'on' : ''}" data-a="tab" data-tab="${k}" aria-label="${label}">${icon}<span>${label}</span>${badge ? `<span class="badge">${badge}</span>` : ''}</button>`;
  $('#tabs').innerHTML = tab('home', 'Home', I.home) + tab('tasks', 'Tasks', I.tasks, due) +
    `<button class="fab" data-a="quickAdd" aria-label="Quick add">${I.plus}</button>` +
    tab('habits', 'Habits', I.flame) + tab('notes', 'Notes', I.note);
}
function go(tab) {
  if (S.tab === tab) return scrollTo({ top: 0, behavior: 'smooth' });
  S.tab = tab; save(); render(true);
}

/* =========================================================
   SHEETS & TOAST
   ========================================================= */
function openSheet(html, { full = false, onMount, onClose } = {}) {
  const root = $('#sheet-root');
  if (root.innerHTML) { root._onClose?.(); }
  root.innerHTML = `<div class="sheet-backdrop" data-a="closeSheet"></div><div class="sheet ${full ? 'full' : ''}" role="dialog" aria-modal="true"><div class="grabber"></div>${html}</div>`;
  root._onClose = onClose;
  const sheet = $('.sheet', root);
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('open')));
  dragToClose(sheet);
  onMount?.(sheet);
}
function closeSheet() {
  const root = $('#sheet-root'); if (!root.innerHTML) return;
  const cb = root._onClose; root._onClose = null; cb?.();
  document.activeElement?.blur?.();
  root.classList.remove('open');
  setTimeout(() => { if (!root.classList.contains('open')) root.innerHTML = ''; }, 380);
}
function dragToClose(sheet) {
  let y0 = null, dy = 0;
  sheet.addEventListener('touchstart', e => {
    if (sheet.scrollTop > 0 || e.target.closest('textarea, input, .chip-row, .chips')) { y0 = null; return; }
    y0 = e.touches[0].clientY; dy = 0;
  }, { passive: true });
  sheet.addEventListener('touchmove', e => {
    if (y0 === null) return;
    dy = e.touches[0].clientY - y0;
    if (dy > 0) { sheet.classList.add('dragging'); sheet.style.transform = `translateY(${dy}px)`; }
  }, { passive: true });
  sheet.addEventListener('touchend', () => {
    if (y0 === null) return;
    sheet.classList.remove('dragging'); sheet.style.transform = '';
    if (dy > 110) closeSheet();
    y0 = null;
  });
}
let undoFn = null;
function toast(msg, undo) {
  const t = $('#toast');
  undoFn = undo || null;
  t.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button data-a="undo">Undo</button>' : ''}`;
  t.classList.add('show');
  clearTimeout(t._h); t._h = setTimeout(() => { t.classList.remove('show'); undoFn = null; }, undo ? 4500 : 2400);
}
function removeWithUndo(listName, id, label) {
  const list = S[listName], i = list.findIndex(x => x.id === id); if (i < 0) return;
  const [item] = list.splice(i, 1); save(); closeSheet(); render();
  toast(`${label} deleted`, () => { S[listName].splice(i, 0, item); save(); render(); });
}

/* ---------- sheet forms ---------- */
function taskSheet(t) {
  const isNew = !t;
  t = t || { text: '', due: S.taskFilter === 'today' || S.tab === 'home' ? dkey() : '', priority: 0 };
  const opts = [['', 'No date'], [dkey(), 'Today'], [dkey(addDays(new Date(), 1)), 'Tomorrow'], [dkey(addDays(new Date(), 7)), 'Next week']];
  openSheet(`
  <form data-form="task" data-id="${t.id || ''}" autocomplete="off">
    <div class="sheet-title">${isNew ? 'New task' : 'Edit task'}</div>
    <input class="input lg" name="text" value="${esc(t.text)}" placeholder="What needs doing?" required enterkeyhint="done">
    <label class="label">Due</label>
    <div class="chips" data-group="due">
      ${opts.map(([v, l]) => `<button type="button" class="chip ${(t.due || '') === v ? 'on' : ''}" data-a="pickChip" data-v="${v}">${l}</button>`).join('')}
      <input type="date" class="chip" data-input="pickDate" value="${t.due || ''}" aria-label="Pick date">
    </div>
    <input type="hidden" name="due" value="${t.due || ''}">
    <label class="label">Priority</label>
    <div class="chips" data-group="priority">
      ${[[0, 'None'], [1, '! Medium'], [2, '!! High']].map(([v, l]) => `<button type="button" class="chip ${(t.priority || 0) === v ? 'on' : ''}" data-a="pickChip" data-v="${v}">${l}</button>`).join('')}
    </div>
    <input type="hidden" name="priority" value="${t.priority || 0}">
    <div class="btn-row">
      <button class="btn">${isNew ? 'Add task' : 'Save'}</button>
      ${isNew ? '' : `<button type="button" class="btn danger" data-a="deleteTask" data-id="${t.id}">Delete task</button>`}
    </div>
  </form>`, { onMount: el => isNew && setTimeout(() => $('[name=text]', el).focus(), 350) });
}

function habitSheet(h) {
  const isNew = !h; h = h || { name: '', emoji: HABIT_EMOJI[0] };
  openSheet(`
  <form data-form="habit" data-id="${h.id || ''}" autocomplete="off">
    <div class="sheet-title">${isNew ? 'New habit' : 'Edit habit'}</div>
    <input class="input lg" name="name" value="${esc(h.name)}" placeholder="e.g. Meditate 10 min" required>
    <label class="label">Icon</label>${emojiPicker(HABIT_EMOJI, h.emoji)}
    <div class="btn-row"><button class="btn">${isNew ? 'Create habit' : 'Save'}</button></div>
  </form>`, { onMount: el => isNew && setTimeout(() => $('[name=name]', el).focus(), 350) });
}

function habitDetail(h) {
  const end = new Date(), weeks = 17;
  const start = addDays(end, -((weeks - 1) * 7 + end.getDay()));
  const cells = []; for (let d = start; dkey(d) <= dkey(end); d = addDays(d, 1)) { const k = dkey(d); cells.push(`<i class="${h.log[k] ? 'on' : ''} ${k === dkey() ? 't' : ''}" title="${k}"></i>`); }
  openSheet(`
    <div class="habit-top" style="margin-bottom:16px"><div class="habit-emoji" style="width:52px;height:52px;font-size:26px">${h.emoji}</div>
      <div><div class="sheet-title" style="margin:0">${esc(h.name)}</div><div class="habit-sub">Since ${Object.keys(h.log).sort()[0] ? fmtDate(Object.keys(h.log).sort()[0]) : 'today'}</div></div></div>
    <div class="stat-grid">
      <div class="stat"><small>Streak</small><b>${streak(h)} 🔥</b></div>
      <div class="stat"><small>Best</small><b>${bestStreak(h)}</b></div>
      <div class="stat"><small>30 days</small><b>${rate(h)}%</b></div>
    </div>
    <label class="label" style="margin-top:4px">Last ${weeks} weeks</label>
    <div class="heat">${cells.join('')}</div>
    <div class="btn-row">
      <button class="btn secondary" data-a="editHabit" data-id="${h.id}">Edit</button>
      <button class="btn danger" data-a="deleteHabit" data-id="${h.id}">Delete habit</button>
    </div>`);
}

function linkSheet(l) {
  const isNew = !l; l = l || { title: '', url: '', emoji: '🔗' };
  openSheet(`
  <form data-form="link" data-id="${l.id || ''}" autocomplete="off">
    <div class="sheet-title">${isNew ? 'New link' : 'Edit link'}</div>
    <input class="input lg" name="title" value="${esc(l.title)}" placeholder="Name" required maxlength="20">
    <input class="input" name="url" value="${esc(l.url)}" placeholder="https://…" required inputmode="url" autocapitalize="off" style="margin-top:10px">
    <label class="label">Icon</label>${emojiPicker(LINK_EMOJI, l.emoji)}
    <div class="btn-row"><button class="btn">${isNew ? 'Add link' : 'Save'}</button>
      ${isNew ? '' : `<button type="button" class="btn danger" data-a="deleteLink" data-id="${l.id}">Delete link</button>`}</div>
  </form>`);
}

function countdownSheet(c) {
  const isNew = !c; c = c || { title: '', date: dkey(addDays(new Date(), 30)), emoji: '🎉', yearly: false };
  openSheet(`
  <form data-form="countdown" data-id="${c.id || ''}" autocomplete="off">
    <div class="sheet-title">${isNew ? 'New countdown' : 'Edit countdown'}</div>
    <input class="input lg" name="title" value="${esc(c.title)}" placeholder="Vacation, birthday, launch…" required maxlength="30">
    <label class="label">Date</label>
    <input class="input" type="date" name="date" value="${c.date}" required>
    <label class="switch-row">Repeats every year<span class="toggle"><input type="checkbox" name="yearly" ${c.yearly ? 'checked' : ''}><i></i></span></label>
    <label class="label">Icon</label>${emojiPicker(CD_EMOJI, c.emoji)}
    <div class="btn-row"><button class="btn">${isNew ? 'Add countdown' : 'Save'}</button>
      ${isNew ? '' : `<button type="button" class="btn danger" data-a="deleteCountdown" data-id="${c.id}">Delete countdown</button>`}</div>
  </form>`);
}

function noteSheet(id) {
  let n = S.notes.find(x => x.id === id), isNew = !n, deleted = false;
  if (!n) n = { id: uid(), title: '', body: '', pinned: false, updated: Date.now() };
  openSheet(`
    <div class="sheet-head">
      <button class="ghost" data-a="closeSheet">Done</button><div class="spacer"></div>
      <button class="icon-btn ${n.pinned ? 'on' : ''}" id="pin-btn" aria-label="Pin">${I.pin}</button>
      <button class="icon-btn danger" id="del-btn" aria-label="Delete note">${I.trash}</button>
    </div>
    <input class="note-title" placeholder="Title" value="${esc(n.title)}">
    <textarea class="note-body" placeholder="Start writing…">${esc(n.body)}</textarea>`, {
    full: true,
    onMount: el => {
      const persist = () => {
        n.updated = Date.now();
        if (isNew && (n.title.trim() || n.body.trim())) { S.notes.unshift(n); isNew = false; }
        save();
      };
      $('.note-title', el).addEventListener('input', e => { n.title = e.target.value; persist(); });
      $('.note-body', el).addEventListener('input', e => { n.body = e.target.value; persist(); });
      $('#pin-btn', el).addEventListener('click', e => { n.pinned = !n.pinned; e.currentTarget.classList.toggle('on', n.pinned); if (!isNew) save(); });
      $('#del-btn', el).addEventListener('click', () => { deleted = true; if (!isNew) removeWithUndo('notes', n.id, 'Note'); else closeSheet(); });
      if (isNew) setTimeout(() => $('.note-body', el).focus(), 350);
    },
    onClose: () => {
      if (deleted) return;
      if (!isNew && !n.title.trim() && !n.body.trim()) S.notes = S.notes.filter(x => x.id !== n.id);
      save(); if (S.tab === 'notes') setTimeout(() => render(), 0);
    },
  });
}

function quickAddSheet() {
  openSheet(`
  <form data-form="quick" autocomplete="off">
    <div class="sheet-title">Quick add</div>
    <div class="quick-add"><input class="input lg" name="text" placeholder="New task for today…" enterkeyhint="done"><button class="add-btn" aria-label="Add">${I.plus}</button></div>
  </form>
  <div class="qa-grid">
    <button data-a="openNote"><span>📝</span>Note</button>
    <button data-a="addHabit"><span>🔥</span>Habit</button>
    <button data-a="addLink"><span>🔗</span>Link</button>
    <button data-a="addCountdown"><span>⏳</span>Countdown</button>
  </div>`, { onMount: el => setTimeout(() => $('input', el).focus(), 350) });
}

/* =========================================================
   ACTIONS (event delegation)
   ========================================================= */
const byId = (list, id) => S[list].find(x => x.id === id);
const A = {
  tab: el => go(el.dataset.tab),
  goSettings: () => { closeSheet(); go('settings'); },
  closeSheet,
  undo: () => { undoFn?.(); undoFn = null; $('#toast').classList.remove('show'); },
  quickAdd: quickAddSheet,
  hideInstall: () => { S.hideInstall = true; save(); render(); },

  toggleTask: el => {
    const t = byId('tasks', el.dataset.id); if (!t) return;
    t.done = !t.done; t.doneAt = t.done ? dkey() : null; t.doneTs = t.done ? Date.now() : null; save();
    const row = el.closest('.task'); row?.classList.toggle('done', t.done);
    if (t.done) navigator.vibrate?.(10);
    setTimeout(() => render(), t.done ? 450 : 0);
  },
  editTask: el => taskSheet(byId('tasks', el.dataset.id)),
  deleteTask: el => removeWithUndo('tasks', el.dataset.id, 'Task'),
  taskFilter: el => { S.taskFilter = el.dataset.f; save(); render(); },
  clearDone: () => {
    const before = S.tasks; S.tasks = S.tasks.filter(x => !x.done); save(); render();
    toast('Cleared completed', () => { S.tasks = before; save(); render(); });
  },

  toggleHabit: el => {
    const h = byId('habits', el.dataset.id), k = el.dataset.day; if (!h) return;
    if (h.log[k]) delete h.log[k]; else { h.log[k] = true; navigator.vibrate?.(10); }
    save(); el.classList.toggle('on', !!h.log[k]);
    setTimeout(() => render(), 220);
  },
  addHabit: () => habitSheet(),
  editHabit: el => habitSheet(byId('habits', el.dataset.id)),
  habitDetail: el => habitDetail(byId('habits', el.dataset.id)),
  deleteHabit: el => removeWithUndo('habits', el.dataset.id, 'Habit'),

  openNote: el => noteSheet(el.dataset.id),

  addLink: () => linkSheet(),
  editLink: el => linkSheet(byId('links', el.dataset.id)),
  deleteLink: el => removeWithUndo('links', el.dataset.id, 'Link'),
  addCountdown: () => countdownSheet(),
  editCountdown: el => countdownSheet(byId('countdowns', el.dataset.id)),
  deleteCountdown: el => removeWithUndo('countdowns', el.dataset.id, 'Countdown'),

  pickChip: el => {
    const g = el.closest('[data-group]'), f = el.closest('form');
    $$('.chip', g).forEach(c => c.classList.toggle('on', c === el));
    f.elements[g.dataset.group].value = el.dataset.v;
    const d = $('input[type=date]', g); if (d) d.value = el.dataset.v;
  },

  focusToggle: () => {
    const f = S.focus;
    if (f.running) { f.remaining = focusLeft(); f.running = false; }
    else { f.endsAt = Date.now() + f.remaining * 1000; f.running = true; try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume(); } catch { } }
    save(); render();
  },
  focusReset: () => { S.focus.running = false; S.focus.remaining = focusLen(S.focus.mode); save(); render(); },
  focusSkip: () => { S.focus.mode = S.focus.mode === 'focus' ? 'break' : 'focus'; S.focus.remaining = focusLen(S.focus.mode); save(); render(); },
  water: el => {
    S.water.count = Math.max(0, Math.min(30, S.water.count + +el.dataset.n)); save(); render();
    if (+el.dataset.n > 0 && S.water.count === S.waterGoal) toast('Hydration goal hit 💧');
  },

  weatherSheet: () => W.data && W.sig === locSig() ? weatherSheet() : loadWeather(true),
  refreshWeather: () => { closeSheet(); loadWeather(true); },
  useLocation,
  pickCity: el => {
    S.location = { name: el.dataset.name, lat: +(+el.dataset.lat).toFixed(3), lon: +(+el.dataset.lon).toFixed(3) };
    save(); render(); loadWeather(true); toast(`Weather set to ${el.dataset.name}`);
  },
  setTheme: el => { S.theme = el.dataset.v; save(); applyTheme(); render(); },
  setAccent: el => { S.accent = el.dataset.v; save(); applyTheme(); render(); },
  setUnits: el => { S.units = el.dataset.v; save(); render(); loadWeather(true); },

  exportData: () => {
    const blob = new Blob([JSON.stringify({ app: 'dash', version: 1, exported: new Date().toISOString(), data: S }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `dash-backup-${dkey()}.json`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast('Backup exported');
  },
  importData: () => $('#import-file').click(),
  resetAll: () => {
    if (!confirm('Erase all tasks, habits, notes and settings on this device? This can’t be undone.')) return;
    localStorage.removeItem(KEY); localStorage.removeItem('dash.weather'); S = DEFAULTS(); W = {}; save(); applyTheme(); render(true); toast('Fresh start');
  },
};

const FORMS = {
  quickTask: f => { addTask(f.elements.text.value, S.taskFilter === 'today' ? dkey() : ''); render(); $('#qt')?.focus(); },
  quick: f => { const v = f.elements.text.value; if (!v.trim()) return; addTask(v, dkey()); closeSheet(); render(); toast('Task added'); },
  task: f => {
    const d = Object.fromEntries(new FormData(f)), id = f.dataset.id;
    if (!d.text.trim()) return;
    if (id) Object.assign(byId('tasks', id), { text: d.text.trim(), due: d.due, priority: +d.priority });
    else S.tasks.push({ id: uid(), text: d.text.trim(), done: false, due: d.due, priority: +d.priority, created: Date.now() });
    save(); closeSheet(); render();
  },
  habit: f => {
    const d = Object.fromEntries(new FormData(f)), id = f.dataset.id;
    if (id) Object.assign(byId('habits', id), { name: d.name.trim(), emoji: d.emoji || '✅' });
    else S.habits.push({ id: uid(), name: d.name.trim(), emoji: d.emoji || '✅', log: {} });
    save(); closeSheet(); render();
  },
  link: f => {
    const d = Object.fromEntries(new FormData(f)), id = f.dataset.id;
    let url = d.url.trim(); if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = 'https://' + url;
    const v = { title: d.title.trim(), url, emoji: d.emoji };
    if (id) Object.assign(byId('links', id), v); else S.links.push({ id: uid(), ...v });
    save(); closeSheet(); render();
  },
  countdown: f => {
    const d = Object.fromEntries(new FormData(f)), id = f.dataset.id;
    const v = { title: d.title.trim(), date: d.date, emoji: d.emoji || '⏳', yearly: !!d.yearly };
    if (id) Object.assign(byId('countdowns', id), v); else S.countdowns.push({ id: uid(), ...v });
    save(); closeSheet(); render();
  },
};

const INPUTS = {
  intention: el => { S.intention = { date: dkey(), text: el.value }; save(); },
  noteSearch: el => { noteQuery = el.value; $('#notes-list').innerHTML = notesList(); },
  city: el => citySearch(el.value),
  pickDate: el => {
    const g = el.closest('[data-group]'); el.closest('form').elements.due.value = el.value;
    $$('.chip', g).forEach(c => c.tagName === 'BUTTON' && c.classList.toggle('on', c.dataset.v === el.value));
  },
};
const CHANGES = {
  name: el => { S.name = el.value.trim().slice(0, 24); save(); },
  focusMin: el => { S.focus.focusMin = Math.max(1, Math.min(180, +el.value || 25)); if (!S.focus.running && S.focus.mode === 'focus') S.focus.remaining = focusLen('focus'); save(); },
  breakMin: el => { S.focus.breakMin = Math.max(1, Math.min(60, +el.value || 5)); if (!S.focus.running && S.focus.mode === 'break') S.focus.remaining = focusLen('break'); save(); },
  waterGoal: el => { S.waterGoal = Math.max(1, Math.min(20, +el.value || 8)); save(); },
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el) return;
  const fn = A[el.dataset.a]; if (!fn) return;
  if (el.tagName !== 'A') e.preventDefault();
  fn(el, e);
});
document.addEventListener('submit', e => { e.preventDefault(); FORMS[e.target.dataset.form]?.(e.target); });
document.addEventListener('input', e => INPUTS[e.target.dataset.input]?.(e.target));
document.addEventListener('change', e => {
  CHANGES[e.target.dataset.change]?.(e.target);
  if (e.target.id === 'import-file' && e.target.files[0]) {
    e.target.files[0].text().then(txt => {
      const j = JSON.parse(txt), data = j.data || j;
      if (!Array.isArray(data.tasks) || !Array.isArray(data.habits)) throw new Error('bad');
      if (!confirm('Replace everything on this device with this backup?')) return;
      const d = DEFAULTS(); S = { ...d, ...data, focus: { ...d.focus, ...data.focus } }; save(); applyTheme(); render(true); toast('Backup restored');
    }).catch(() => toast('That file isn’t a Dash backup'));
    e.target.value = '';
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.dataset.input === 'intention') e.target.blur();
  if (e.key === 'Escape') closeSheet();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (S.focus.running && focusLeft() <= 0) focusComplete();
  if (!$('#sheet-root').innerHTML && !document.activeElement?.matches('input, textarea')) render();
  loadWeather();
});

/* =========================================================
   BOOT
   ========================================================= */
if (S.tab === 'settings') S.tab = 'home';
if (S.focus.running && focusLeft() <= 0) focusComplete(true);
applyTheme();
render(true);
loadWeather();
setInterval(() => loadWeather(), 15 * 60e3);
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
}
