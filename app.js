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
  card: svg('<rect x="2.5" y="5.500" width="19" height="13" rx="3"/><path d="M2.500 10h19M15.500 14.500h2.500"/>'),
  drop: svg('<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>'),
};

/* ---------- state ---------- */
const KEY = 'dash.v1';
const ACCENTS = { violet: '#7c6cff', blue: '#3d8bff', teal: '#14b8a6', green: '#22c55e', orange: '#ff8a3d', pink: '#f43f8e', red: '#ef4444', gold: '#eab308' };
const HABIT_EMOJI = ['💊', '🚿', '🦷', '💪', '📚', '🧘', '🏃', '🥗', '😴', '🧴', '🛏️', '💻', '🚶', '🧹', '✍️', '📵', '🧠', '🌱', '☀️', '🎸'];
const WHEN = { am: ['Morning', '🌅'], any: ['Anytime', '☀️'], pm: ['Evening', '🌙'] };
const HABIT_IDEAS = [
  ['💊', 'Take medicine', 'am', 1], ['🚿', 'Shower', 'am', 1], ['🦷', 'Brush teeth', 'am', 2], ['🛏️', 'Make bed', 'am', 1],
  ['🧴', 'Skincare', 'pm', 1], ['💪', 'Workout', 'any', 1], ['🚶', 'Walk', 'any', 1], ['🧘', 'Meditate', 'any', 1],
  ['📖', 'Study', 'any', 1], ['💻', 'Code', 'any', 1], ['🏋️', 'Gym 3× a week', 'any', 1, 3], ['🧺', 'Laundry', 'any', 1, 1], ['🛒', 'Meal prep', 'any', 1, 1], ['📚', 'Read', 'pm', 1], ['🥗', 'Eat a real meal', 'any', 3],
  ['🧹', 'Tidy up', 'any', 1], ['✍️', 'Journal', 'pm', 1], ['📵', 'No phone in bed', 'pm', 1], ['😴', 'In bed on time', 'pm', 1],
  ['🦷', 'Floss', 'pm', 1], ['💊', 'Vitamins', 'am', 1], ['☀️', 'Get outside', 'any', 1], ['📞', 'Call family', 'any', 1],
];
const NBA_TEAMS = 'ATL BOS BKN CHA CHI CLE DAL DEN DET GS HOU IND LAC LAL MEM MIA MIL MIN NO NY OKC ORL PHI PHX POR SAC SA TOR UTAH WSH'.split(' ');
const LINK_EMOJI = ['🔗', '🐙', '📺', '📧', '📅', '🎵', '💬', '🛒', '📰', '🏀', '💼', '🤖', '📷', '🎮', '🗺️', '💳'];
const MOODS = [['😣', 'Rough'], ['😕', 'Meh'], ['😐', 'Okay'], ['🙂', 'Good'], ['😄', 'Great']];
const CD_EMOJI = ['🎉', '✈️', '🎂', '🏖️', '🎓', '🎄', '💍', '🏆', '🎟️', '📦', '🏀', '❤️'];

const DEFAULTS = () => ({
  name: '', accent: 'violet', theme: 'dark', units: 'F', location: null,
  tasks: [],
  habits: [
    { id: uid(), name: 'Take medicine', emoji: '💊', when: 'am', target: 1, log: {} },
    { id: uid(), name: 'Shower', emoji: '🚿', when: 'am', target: 1, log: {} },
    { id: uid(), name: 'Brush teeth', emoji: '🦷', when: 'am', target: 2, log: {} },
    { id: uid(), name: 'Workout', emoji: '💪', when: 'any', target: 1, log: {} },
    { id: uid(), name: 'Read', emoji: '📚', when: 'pm', target: 1, log: {} },
  ],
  widgets: { nba: true, anime: true }, team: '', calUrl: '', workCal: '', paydaySeen: '', xShifts: [], budgets: {}, notify: { on: false, work: true, brief: true, habits: true, tasks: true, bills: true, lead: 15, morning: '08:00', evening: '20:30' }, tags: ['School', 'Work', 'Personal', 'Errands'], tagFilter: '', spend: [], layout: null, shiftLog: {}, rate: 0, job: '', taxPct: 0, unpaidBreak: 0, commute: 25, payday: '',
  kit: 'Badge, Water bottle, Lunch, Charger, Headphones', kitDone: { date: '', items: [] }, bills: [], billPaid: {},
  stocks: 'SPY, AAPL, NVDA',
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
  moods: {},
  tab: 'home', taskFilter: 'today', hideInstall: false,
});

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && typeof raw === 'object') { const d = DEFAULTS(); return { ...d, ...raw, focus: { ...d.focus, ...raw.focus }, widgets: { ...d.widgets, ...raw.widgets }, notify: { ...d.notify, ...raw.notify } }; }
  } catch { }
  return DEFAULTS();
}
let S = load();
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { toast('Storage full — export a backup'); } };
const save = () => { persist(); markDirty(); };
// Remember deletions so a sync merge doesn't resurrect them (kept 60 days).
function tombstone(id) {
  S._deleted = S._deleted || {};
  S._deleted[id] = Date.now();
  const cutoff = Date.now() - 60 * 864e5;
  for (const k in S._deleted) if (S._deleted[k] < cutoff) delete S._deleted[k];
}

function rollDay() {
  const t = dkey();
  if (S.water.date !== t) S.water = { date: t, count: 0 };
  if (S.intention.date !== t) S.intention = { date: t, text: '' };
}

/* =========================================================
   CLOUD SYNC (Supabase). No accounts: a long random sync code
   identifies your vault; the DB only exposes two RPCs that need it.
   ========================================================= */
const SB_URL = 'https://cwlpoykayfrpohfvzrfm.supabase.co';
const SB_KEY = 'sb_publishable_HNY1baadiiTnSl7CLRFxyg_i_RmTiYB'; // public by design
const LOCAL_ONLY = ['tab', 'taskFilter', 'hideInstall', 'tagFilter'];
let SY = (() => { try { return JSON.parse(localStorage.getItem('dash.sync')) || {}; } catch { return {}; } })();
const saveSY = () => { try { localStorage.setItem('dash.sync', JSON.stringify(SY)); } catch { } };
let syncStatus = SY.vault ? 'ok' : 'off', pushTimer = null, syncBusy = false, syncAgain = false;

async function rpc(fn, body) {
  const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SB_KEY }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${fn} ${r.status}`);
  return r.json();
}
const newVault = () => 'dash-' + [...crypto.getRandomValues(new Uint8Array(24))].map(b => b.toString(16).padStart(2, '0')).join('');
function payload() { const o = { ...S }; LOCAL_ONLY.forEach(k => delete o[k]); return o; }
function adopt(data) {
  const keep = {}; LOCAL_ONLY.forEach(k => keep[k] = S[k]);
  const d = DEFAULTS(); S = { ...d, ...data, ...keep, focus: { ...d.focus, ...data.focus }, widgets: { ...d.widgets, ...data.widgets }, notify: { ...d.notify, ...data.notify } };
  persist();
}
// Merge for when both sides changed: union lists by id, local edits win, deletions stick.
function merge(local, remote) {
  const dead = { ...(remote._deleted || {}), ...(local._deleted || {}) };
  const out = { ...remote, ...local, _deleted: dead };
  for (const k of ['tasks', 'habits', 'notes', 'links', 'countdowns', 'bills', 'xShifts', 'spend', 'places']) {
    const rmap = new Map((remote[k] || []).map(x => [x.id, x])), seen = new Set(), list = [];
    for (const x of local[k] || []) {
      const r = rmap.get(x.id); seen.add(x.id);
      if (k === 'habits' && r) list.push({ ...x, log: { ...r.log, ...x.log } });
      else if (k === 'notes' && r && (r.updated || 0) > (x.updated || 0)) list.push(r);
      else list.push(x);
    }
    for (const r of remote[k] || []) if (!seen.has(r.id)) list.push(r);
    out[k] = list.filter(x => !dead[x.id]);
  }
  out.moods = { ...(remote.moods || {}), ...(local.moods || {}) };
  out.shiftLog = { ...(remote.shiftLog || {}), ...(local.shiftLog || {}) };
  out.billPaid = { ...(remote.billPaid || {}), ...(local.billPaid || {}) };
  const ss = { ...(remote.focus?.sessions || {}) };
  for (const [k, v] of Object.entries(local.focus?.sessions || {})) ss[k] = Math.max(v, ss[k] || 0);
  out.focus = { ...local.focus, sessions: ss };
  return out;
}
function markDirty() {
  queueReminders();
  if (!SY.vault) return;
  SY.dirty = true; saveSY();
  clearTimeout(pushTimer); pushTimer = setTimeout(syncNow, 1500);
}
function setSyncStatus(s) {
  syncStatus = s;
  $$('[data-sync-dot]').forEach(el => el.dataset.syncDot = s);
  const t = $('#sync-text'); if (t) t.textContent = syncLabel();
}
function syncLabel() {
  if (!SY.vault) return 'Off';
  if (syncStatus === 'syncing') return 'Syncing…';
  if (syncStatus === 'error') return 'Couldn’t sync — will retry';
  if (syncStatus === 'offline') return 'Offline — will sync later';
  return SY.last ? `Synced ${ago(SY.last).toLowerCase()}` : 'Ready';
}
async function syncNow() {
  if (!SY.vault) return;
  if (!navigator.onLine) return setSyncStatus('offline');
  if (syncBusy) { syncAgain = true; return; }
  // Don't swap data out from under an open editor; try again shortly.
  if ($('#sheet-root').innerHTML && !SY.dirty) { clearTimeout(pushTimer); pushTimer = setTimeout(syncNow, 4000); return; }
  syncBusy = true; setSyncStatus('syncing');
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const [remote] = await rpc('dash_pull', { vault: SY.vault });
      let changed = false;
      if (remote && remote.rev !== SY.rev) {
        if (SY.dirty) S = { ...merge(payload(), remote.data), ...Object.fromEntries(LOCAL_ONLY.map(k => [k, S[k]])) };
        else adopt(remote.data);
        SY.rev = remote.rev; persist(); changed = true;
      }
      if (SY.dirty || !remote) {
        const [res] = await rpc('dash_push', { vault: SY.vault, payload: payload(), base_rev: remote ? remote.rev : 0 });
        if (!res.ok) continue; // someone else wrote in between → pull, merge, retry
        SY.rev = res.rev; SY.dirty = false;
      }
      SY.last = Date.now(); saveSY();
      if (changed) softRender();
      setSyncStatus('ok');
      break;
    }
  } catch { setSyncStatus('error'); }
  syncBusy = false;
  if (syncAgain) { syncAgain = false; syncNow(); }
}
// Re-render unless the user is typing in the page.
function softRender() {
  applyTheme(); logShifts();
  if ($('#sheet-root').innerHTML || document.activeElement?.closest?.('#view input, #view textarea')) return;
  render();
}
async function enableSync() {
  SY = { vault: newVault(), rev: 0, dirty: true }; saveSY();
  await syncNow();
  render(); if (syncStatus === 'ok') toast('Cloud sync is on ☁️');
}
async function joinSync(code) {
  code = code.trim();
  if (!/^dash-[0-9a-f]{48}$/.test(code)) return toast('That doesn’t look like a sync code');
  try {
    const [remote] = await rpc('dash_pull', { vault: code });
    if (!remote) return toast('No dashboard found for that code');
    if (!confirm('Replace what’s on this device with your synced dashboard?')) return;
    SY = { vault: code, rev: remote.rev, dirty: false, last: Date.now() }; saveSY();
    adopt(remote.data); setSyncStatus('ok'); render(true); toast('Synced ☁️');
  } catch { toast('Couldn’t reach the sync server'); }
}

/* =========================================================
   ACCOUNTS: Google / GitHub sign-in. A sign-in is just a nicer way to
   find your vault: the dash-auth function verifies who you are and
   returns the vault code tied to that account.
   ========================================================= */
const GOOGLE_CLIENT_ID = '179677240847-tfa1bts2arm25d1vptjb6cqltpqpbm9v.apps.googleusercontent.com';
const authCall = async body => {
  const r = await fetch(`${SB_URL}/functions/v1/dash-auth`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }, body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error || r.status);
  return j;
};
function googleSignIn() {
  const nonce = [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('');
  try { localStorage.setItem('dash.nonce', nonce); } catch { }
  const q = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID, response_type: 'id_token', scope: 'openid profile email',
    redirect_uri: location.origin + location.pathname, nonce, prompt: 'select_account',
  });
  location.href = 'https://accounts.google.com/o/oauth2/v2/auth?' + q;
}
async function finishGoogle(idToken) {
  const nonce = localStorage.getItem('dash.nonce'); localStorage.removeItem('dash.nonce');
  toast('Signing you in…');
  try { const { ticket } = await authCall({ action: 'google', id_token: idToken, nonce }); await redeemTicket(ticket); }
  catch { toast('Google sign-in didn’t work — try again'); }
}
let ghPoll = null;
async function githubSignIn() {
  let d;
  try { d = await authCall({ action: 'gh_start' }); } catch { return toast('Couldn’t reach GitHub — try again'); }
  if (!d.user_code) return toast('Couldn’t reach GitHub — try again');
  ghPoll = { device: d.device_code, interval: (d.interval || 5) * 1000, until: Date.now() + (d.expires_in || 900) * 1000 };
  openSheet(`
    <div class="sheet-title">Sign in with GitHub</div>
    <p class="muted">GitHub will ask for this code. Tap the button to copy it and open GitHub, paste it there, then come back.</p>
    <div class="gh-code">${esc(d.user_code)}</div>
    <div class="btn-row"><button class="btn" data-a="ghOpen" data-code="${esc(d.user_code)}">Copy code & open GitHub</button></div>
    <p class="muted" style="text-align:center;margin-top:14px">Waiting for you to approve…</p>`, { onClose: () => { ghPoll = null; } });
  setTimeout(pollGithub, ghPoll.interval);
}
async function pollGithub() {
  const p = ghPoll; if (!p || p.busy) return;
  if (Date.now() > p.until) { ghPoll = null; closeSheet(); return toast('That code expired — try again'); }
  p.busy = true;
  try {
    const r = await authCall({ action: 'gh_poll', device_code: p.device });
    if (r.ticket) { ghPoll = null; closeSheet(); await redeemTicket(r.ticket); return; }
    if (r.reason === 'slow_down') p.interval += 5000;
    if (r.reason === 'expired_token' || r.reason === 'access_denied') { ghPoll = null; closeSheet(); return toast('GitHub sign-in was cancelled'); }
  } catch { }
  p.busy = false;
  if (ghPoll === p) setTimeout(pollGithub, p.interval);
}
async function redeemTicket(ticket) {
  const mine = SY.vault || newVault();
  let r;
  try { r = await authCall({ action: 'redeem', ticket, vault: mine }); } catch { return toast('Sign-in expired — try again'); }
  const account = { ...(SY.account || {}), name: (SY.account && SY.account.name) || r.name, [r.provider]: true };
  if (r.vault === mine) {
    // New sign-in → now tied to this device's data (or an extra login for the same account).
    if (!SY.vault) SY = { vault: mine, rev: 0, dirty: true };
    SY.account = account; saveSY();
    if (!S.name && r.provider === 'google') { S.name = String(r.name).slice(0, 24); persist(); }
    await syncNow();
    toast(r.existing ? `Welcome back, ${r.name}` : `Signed in as ${r.name} ✓`);
  } else {
    // This sign-in already has a dashboard saved from another device.
    const hasLocal = SY.vault || S.tasks.length || S.notes.length;
    if (hasLocal && !confirm(`${r.name} already has a Dash saved. Replace what’s on this device with it?`)) return toast('Sign-in cancelled');
    try {
      const [remote] = await rpc('dash_pull', { vault: r.vault });
      if (remote) { SY = { vault: r.vault, rev: remote.rev, dirty: false, last: Date.now(), account: { name: r.name, [r.provider]: true } }; saveSY(); adopt(remote.data); }
      else { SY = { vault: r.vault, rev: 0, dirty: true, account: { name: r.name, [r.provider]: true } }; saveSY(); await syncNow(); }
      setSyncStatus('ok'); toast(`Welcome back, ${r.name}`);
    } catch { return toast('Couldn’t load your saved Dash — try again'); }
  }
  CAL = {}; applyTheme(); render(true);
}
const AUTH_ICONS = {
  google: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#4285F4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.2a5.300 5.300 0 0 1-2.300 3.500v2.900h3.700c2.200-2 3.400-5 3.400-8.500z"/><path fill="#34A853" d="M12 23.500c3.100 0 5.700-1 7.600-2.800l-3.700-2.900c-1 .700-2.300 1.100-3.900 1.100-3 0-5.500-2-6.400-4.700H1.800v3A11.500 11.500 0 0 0 12 23.500z"/><path fill="#FBBC05" d="M5.600 14.200a6.900 6.900 0 0 1 0-4.400v-3H1.800a11.500 11.500 0 0 0 0 10.400z"/><path fill="#EA4335" d="M12 5.100c1.700 0 3.200.6 4.400 1.700l3.300-3.300A11.500 11.500 0 0 0 1.800 6.800l3.800 3c.9-2.700 3.400-4.700 6.400-4.700z"/></svg>',
  github: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12 .5a11.500 11.500 0 0 0-3.600 22.400c.6.100.8-.2.800-.600v-2c-3.200.700-3.900-1.400-3.900-1.400-.5-1.300-1.300-1.700-1.300-1.700-1-.700.100-.700.100-.700 1.200.100 1.800 1.200 1.800 1.200 1 1.800 2.700 1.300 3.400 1 .1-.800.4-1.300.7-1.600-2.600-.300-5.300-1.300-5.300-5.700 0-1.300.5-2.300 1.200-3.100-.1-.300-.5-1.500.1-3.100 0 0 1-.300 3.200 1.200a11 11 0 0 1 5.800 0C17.200 4.700 18.200 5 18.200 5c.6 1.600.2 2.800.1 3.100.8.800 1.200 1.800 1.200 3.100 0 4.400-2.700 5.400-5.300 5.700.4.400.8 1.100.8 2.200v3.200c0 .400.200.700.800.600A11.500 11.500 0 0 0 12 .5z"/></svg>',
};

/* =========================================================
   NOTIFICATIONS. The app works out the next week's reminders and uploads them;
   the server sends each one at its time as a push notification.
   ========================================================= */
const pushCall = async body => {
  const r = await fetch(`${SB_URL}/functions/v1/dash-push`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({})); if (!r.ok || j.error) throw new Error(j.error || r.status); return j;
};
const pushHere = () => { try { return localStorage.getItem('dash.push') || ''; } catch { return ''; } };
const canPush = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const atTime = (day, hhmm) => { const [h, m] = String(hhmm || '08:00').split(':').map(Number); const d = parseKey(day); d.setHours(h || 0, m || 0, 0, 0); return d.getTime(); };
function buildReminders() {
  const N = S.notify || {}, now = Date.now(), out = [], all = shifts().filter(e => !e.allDay);
  const add = (at, title, body, tag) => { if (at > now + 30e3 && at < now + 8 * 864e5) out.push({ at: new Date(at).toISOString(), title, body: body || '', tag }); };
  for (let i = 0; i < 7; i++) {
    const day = dkey(addDays(new Date(), i)), today = i === 0;
    const sh = all.filter(e => dkey(new Date(e.start)) === day), due = S.tasks.filter(t => !t.done && t.due === day);
    const bills = (S.bills || []).filter(b => dkey(billDue(b).date) === day), pd = nextPayday(), payday = pd && dkey(pd) === day;
    // Morning brief: what the day holds
    if (N.brief) {
      const bits = [];
      if (sh.length) bits.push(`Work ${tm(sh[0].start)}–${tm(sh[sh.length - 1].end)}`); else if (all.length) bits.push('No shift today');
      if (due.length) bits.push(`${due.length} task${due.length === 1 ? '' : 's'} due`);
      if (bills.length) bits.push(`${bills.map(b => b.name).join(', ')} due`);
      if (payday) bits.push('Payday 💵');
      if (bits.length) add(atTime(day, N.morning), 'Today', bits.join(' · '), 'brief-' + day);
    }
    // Work: time to leave, and a heads-up the evening before
    if (N.work) for (const e of sh) {
      const pl = fromPlace(), go = leaveAt(e.start, pl), others = allPlaces().filter(x => x.id !== pl.id && x.mins);
      const body = [S.early ? `Be there ${tm(arriveAt(e.start))}` : '', `Shift ${tm(e.start)} – ${tm(e.end)}`, ...others.map(x => `From ${x.name}: ${tm(leaveAt(e.start, x))}`)].filter(Boolean).join(' · ');
      add(go - (+N.lead || 15) * 6e4, pl.mins ? `Leave ${allPlaces().length > 1 ? pl.name + ' ' : ''}by ${tm(go)}` : `Shift in ${(+N.lead || 15) + (S.early || 0)} min`, body, 'leave-' + e.start);
      const early = new Date(e.start).getHours() < 12;
      add(atTime(dkey(addDays(parseKey(day), -1)), '20:00'), `Work tomorrow ${tm(e.start)} – ${tm(e.end)}`, early ? `Bed by ${tm(e.start - ((S.commute || 0) + 45) * 6e4 - 8 * 36e5)} for 8 hours of sleep` : 'Pack what you need tonight', 'eve-' + e.start);
    }
    // Habits: each habit's own reminder time, plus one evening nudge
    if (N.habits) {
      for (const h of S.habits) if (h.remind && !(today && hOk(h)) && !(isWeekly(h) && weekMet(h))) add(atTime(day, h.remind), `${h.emoji} ${h.name}`, isWeekly(h) ? `${weekDone(h)}/${weekGoal(h)} this week` : 'Tap to check it off', 'habit-' + h.id + day);
      const left = today ? S.habits.filter(h => !hOk(h)) : S.habits.filter(h => !isWeekly(h));
      if (left.length) add(atTime(day, N.evening), today ? `${left.length} habit${left.length === 1 ? '' : 's'} left today` : 'Evening check-in', today ? left.slice(0, 4).map(h => h.name).join(', ') : 'Check off today’s habits', 'habits-' + day);
    }
    // Tasks with a due date: a midday nudge on the day
    if (N.tasks && due.length) add(atTime(day, '13:00'), `${due.length} task${due.length === 1 ? '' : 's'} due today`, due.slice(0, 3).map(t => t.text).join(' · '), 'tasks-' + day);
    // Bills: the evening before
    if (N.bills) for (const b of bills) add(atTime(dkey(addDays(parseKey(day), -1)), '18:00'), `${b.emoji || '🧾'} ${b.name} due tomorrow`, b.amount ? `$${b.amount}` : '', 'bill-' + b.id + day);
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}
let remTimer = null, remSig = '';
function queueReminders(ms = 4000) {
  if (!(S.notify && S.notify.on) || !SY.vault) return;
  clearTimeout(remTimer); remTimer = setTimeout(() => uploadReminders(), ms);
}
async function uploadReminders(force) {
  if (!(S.notify && S.notify.on) || !SY.vault || !navigator.onLine) return;
  const items = buildReminders(), sig = JSON.stringify(items);
  if (!force && sig === remSig) return;
  try { await pushCall({ action: 'schedule', vault: SY.vault, items }); remSig = sig; } catch { }
}
async function enablePush() {
  if (!canPush()) return toast(isIOS() && !isStandalone() ? 'Open Dash from its Home Screen icon first' : 'This browser can’t show notifications');
  // Ask right away: iPhone only shows the prompt straight after a tap.
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return toast('Notifications are off for Dash — turn them on in iPhone Settings');
  try {
    if (!SY.vault) { await enableSync(); if (!SY.vault) throw new Error('sync'); }
    const { publicKey } = await pushCall({ action: 'key' });
    const raw = atob(publicKey.replace(/-/g, '+').replace(/_/g, '/')), key = Uint8Array.from(raw, c => c.charCodeAt(0));
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    await pushCall({ action: 'subscribe', vault: SY.vault, endpoint: sub.endpoint });
    try { localStorage.setItem('dash.push', sub.endpoint); } catch { }
    S.notify = { ...S.notify, on: true }; save(); render();
    await uploadReminders(true);
    await pushCall({ action: 'test', vault: SY.vault });
    toast('Notifications on — a test is on its way');
  } catch { toast('Couldn’t turn notifications on — try again'); }
}
async function disablePush() {
  const ep = pushHere();
  try { const reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription(); if (sub) await sub.unsubscribe(); } catch { }
  try { if (ep) await pushCall({ action: 'unsubscribe', endpoint: ep }); localStorage.removeItem('dash.push'); } catch { }
  render(); toast('Notifications off on this device');
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
  const bits = [
    d && !t.done ? `<span class="due ${d.c}">${d.t}</span>` : '',
    t.repeat && !t.done ? `<span class="rep">🔁 ${REPEATS[t.repeat]}</span>` : '',
    t.tag ? `<span class="tag">${esc(t.tag)}</span>` : '',
    t.priority ? `<span class="prio">${'!'.repeat(t.priority)}</span>` : '',
  ].join('');
  return `<div class="swipe" data-tid="${t.id}">
    <div class="swipe-bg"><span class="l">${I.check} ${t.done ? 'Undo' : 'Done'}</span><span class="r">Delete ${I.trash}</span></div>
    <div class="task ${t.done ? 'done' : ''} p${t.priority || 0}">
      <button class="check" data-a="toggleTask" data-id="${t.id}" aria-label="${t.done ? 'Mark incomplete' : 'Complete'}">${I.check}</button>
      <div class="task-body" data-a="editTask" data-id="${t.id}"><div class="task-text">${esc(t.text)}</div>${bits ? `<div class="task-meta">${bits}</div>` : ''}</div>
    </div>
  </div>`;
}
const REPEATS = { daily: 'Daily', weekdays: 'Weekdays', weekly: 'Weekly', monthly: 'Monthly' };
function nextDue(t) {
  const base = parseKey(t.due || dkey()), today = parseKey(dkey()), day = base.getDate();
  let d = base;
  const step = () => {
    if (t.repeat === 'daily') d = addDays(d, 1);
    else if (t.repeat === 'weekly') d = addDays(d, 7);
    else if (t.repeat === 'weekdays') { do d = addDays(d, 1); while (d.getDay() === 0 || d.getDay() === 6); }
    else { const m = new Date(d.getFullYear(), d.getMonth() + 1, 1); m.setDate(Math.min(day, new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate())); d = m; }
  };
  step(); while (d <= today) step();
  return dkey(d);
}
function setTaskDone(id, done) {
  const t = S.tasks.find(x => x.id === id); if (!t) return null;
  t.done = done; t.doneAt = done ? dkey() : null; t.doneTs = done ? Date.now() : null;
  let msg = null;
  if (done && t.repeat) {
    const next = { ...t, id: uid(), done: false, doneAt: null, doneTs: null, due: nextDue(t), created: Date.now() };
    S.tasks.push(next); t.spawned = next.id; msg = `Next: ${dueLabel(next.due).t}`;
  } else if (!done && t.spawned) {
    const sp = S.tasks.find(x => x.id === t.spawned && !x.done);
    if (sp) { S.tasks = S.tasks.filter(x => x !== sp); tombstone(sp.id); }
    t.spawned = null;
  }
  save();
  return msg;
}
// Find an existing tag ignoring case, or add a new one.
function useTag(name) {
  S.tags = S.tags || [];
  const hit = S.tags.find(t => t.toLowerCase() === name.toLowerCase()); if (hit) return hit;
  const t = name[0].toUpperCase() + name.slice(1); S.tags.push(t); return t;
}
function parseQuick(text) {
  let due = '', priority = 0, repeat = '', tag = '';
  const words = text.trim().split(/\s+/), keep = [];
  for (const w of words) {
    const l = w.toLowerCase();
    if (l === '!!' || l === '!!!') priority = 2;
    else if (l === '!') priority = Math.max(priority, 1);
    else if (l === 'today' || l === 'tod') due = dkey();
    else if (l === 'tomorrow' || l === 'tmr' || l === 'tmrw') due = dkey(addDays(new Date(), 1));
    else if (REPEATS[l]) repeat = l;
    else if (/^#[\w-]{2,20}$/.test(w)) tag = useTag(w.slice(1));
    else keep.push(w);
  }
  if (repeat && !due) due = dkey();
  return { text: keep.join(' ') || text.trim(), due, priority, repeat, tag };
}
function addTask(raw, defaultDue = '') {
  const p = parseQuick(raw);
  if (!p.text) return;
  S.tasks.push({ id: uid(), text: p.text, done: false, due: p.due || defaultDue, priority: p.priority, repeat: p.repeat, tag: p.tag || (S.tab === 'tasks' ? S.tagFilter : '') || '', created: Date.now() });
  save();
}

/* ---------- habits helpers ---------- */
const hTarget = h => Math.max(1, h.target || 1);
const hCount = (h, k) => { const v = h.log[k]; return v === true ? hTarget(h) : (v || 0); };
const hDone = (h, k = dkey()) => hCount(h, k) >= hTarget(h);
const byWhen = (a, b) => 'am any pm'.indexOf(a.when || 'any') - 'am any pm'.indexOf(b.when || 'any');
// Tap = one more; tapping a finished habit clears it. Past days toggle done/not done.
function bumpHabit(h, k) {
  const t = hTarget(h), c = hCount(h, k);
  if (k !== dkey()) { if (c >= t) delete h.log[k]; else h.log[k] = t; }
  else if (c >= t) delete h.log[k]; else h.log[k] = c + 1;
  return hDone(h, k);
}
function streak(h) {
  if (isWeekly(h)) {
    let w = new Date(weekStart()); if (!weekMet(h, w)) w = addDays(w, -7);
    let n = 0; while (n < 260 && weekMet(h, w)) { n++; w = addDays(w, -7); }
    return n;
  }
  let d = new Date(); if (!hDone(h, dkey(d))) d = addDays(d, -1);
  let n = 0; while (hDone(h, dkey(d))) { n++; d = addDays(d, -1); }
  return n;
}
function bestStreak(h) {
  if (isWeekly(h)) {
    let best = 0, cur = 0, w = new Date(weekStart(addDays(new Date(), -364)));
    for (let i = 0; i < 53; i++, w = addDays(w, 7)) { cur = weekMet(h, w) ? cur + 1 : 0; best = Math.max(best, cur); }
    return best;
  }
  const keys = Object.keys(h.log).filter(k => hDone(h, k)).sort();
  let best = 0, cur = 0, prev = null;
  for (const k of keys) { cur = prev && dayDiff(parseKey(prev), parseKey(k)) === 1 ? cur + 1 : 1; best = Math.max(best, cur); prev = k; }
  return best;
}
// Habits can be daily, or "N times a week" (Sun–Sat weeks).
const isWeekly = h => h.per === 'week';
const weekGoal = h => Math.min(6, Math.max(1, h.weekGoal || 3));
const weekDone = (h, ref = new Date()) => { const a = weekStart(ref); let n = 0; for (let i = 0; i < 7; i++) if (hDone(h, dkey(addDays(new Date(a), i)))) n++; return n; };
const weekMet = (h, ref = new Date()) => weekDone(h, ref) >= weekGoal(h);
// "Settled for today": a daily habit done today, or a weekly habit done today / already at its goal this week.
const hOk = h => isWeekly(h) ? hDone(h) || weekMet(h) : hDone(h);
// Habit strength (like Loop Habit Tracker): a slow average of recent days, so one missed day barely dents it.
function strength(h) {
  const f = isWeekly(h) ? weekGoal(h) / 7 : 1, a = 0.06; let x = 0;
  for (let i = 89; i >= 0; i--) { const k = dkey(addDays(new Date(), -i)); if (i === 0 && !hDone(h, k)) break; x = (1 - a) * x + a * (hDone(h, k) ? 1 : 0); }
  return Math.min(100, Math.round(x / f * 100));
}
const rate = (h, days = 30) => { let n = 0; for (let i = 0; i < days; i++) if (hDone(h, dkey(addDays(new Date(), -i)))) n++; return Math.round(n / days * 100); };

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
   LIVE WIDGETS: NBA scores (ESPN) + anime airing today (AniList)
   ========================================================= */
let NBA = { ts: 0, games: null }, ANI = { day: '', list: null };
async function loadNBA(force) {
  if (!S.widgets.nba || (!force && Date.now() - NBA.ts < 45e3)) return;
  NBA.ts = Date.now();
  try {
    const j = await (await fetch('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard')).json();
    NBA.games = (j.events || []).map(e => {
      const c = e.competitions[0], side = s => { const x = c.competitors.find(y => y.homeAway === s); return { abbr: x.team.abbreviation, logo: x.team.logo, score: x.score, win: x.winner }; };
      return { state: e.status.type.state, detail: e.status.type.shortDetail, date: e.date, home: side('home'), away: side('away') };
    });
  } catch { NBA.games = NBA.games || []; }
  const el = $('#nba'); if (el) el.outerHTML = nbaCard();
}
function nbaCard() {
  if (!S.widgets.nba) return '';
  const fav = g => S.team && (g.home.abbr === S.team || g.away.abbr === S.team);
  const order = { in: 0, pre: 1, post: 2 };
  const games = [...(NBA.games || [])].sort((a, b) => fav(b) - fav(a) || order[a.state] - order[b.state] || a.date.localeCompare(b.date));
  const team = (t, g) => `<div class="tm ${g.state === 'post' && !t.win ? 'lost' : ''}"><img src="${esc(t.logo)}" alt="" loading="lazy"><b>${esc(t.abbr)}</b><span>${g.state === 'pre' ? '' : esc(t.score)}</span></div>`;
  return `<section class="card" id="nba">
    ${secHead('🏀 NBA today', `<a class="link-btn" href="https://eddyarriaga00.github.io/NBA-Tracker-STATS-APP/" target="_blank" rel="noopener">Open app</a>`)}
    ${!NBA.games ? '<div class="muted">Loading scores…</div>' : !games.length ? '<div class="muted">No games today.</div>' : `<div class="cd-row">${games.map(g => `
      <div class="game ${fav(g) ? 'fav' : ''} ${g.state}">${team(g.away, g)}${team(g.home, g)}
        <div class="gs">${g.state === 'in' ? '<i></i>' : ''}${g.state === 'pre' ? new Date(g.date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : esc(g.detail)}</div></div>`).join('')}</div>`}
  </section>`;
}
async function loadAnime() {
  if (!S.widgets.anime || (ANI.day === dkey() && ANI.list)) return;
  const a = Math.floor(parseKey(dkey()).getTime() / 1000), b = a + 86400;
  const query = `{Page(perPage:50){airingSchedules(airingAt_greater:${a - 1},airingAt_lesser:${b},sort:TIME){airingAt episode media{id title{english romaji} coverImage{medium} popularity isAdult countryOfOrigin siteUrl}}}}`;
  try {
    const j = await (await fetch('https://graphql.anilist.co', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) })).json();
    ANI = { day: dkey(), list: j.data.Page.airingSchedules.filter(x => !x.media.isAdult && x.media.countryOfOrigin === 'JP')
      .sort((x, y) => y.media.popularity - x.media.popularity).slice(0, 10).sort((x, y) => x.airingAt - y.airingAt) };
  } catch { ANI.list = ANI.list || []; }
  const el = $('#anime'); if (el) el.outerHTML = animeCard();
}
function animeCard() {
  if (!S.widgets.anime) return '';
  const now = Date.now() / 1000;
  return `<section class="card" id="anime">
    ${secHead('📺 Airing today', `<a class="link-btn" href="https://eddyarriaga00.github.io/anitrack/" target="_blank" rel="noopener">AniTrack</a>`)}
    ${!ANI.list ? '<div class="muted">Loading schedule…</div>' : !ANI.list.length ? '<div class="muted">Nothing airing today.</div>' : `<div class="cd-row">${ANI.list.map(x => `
      <a class="ani ${x.airingAt < now ? 'aired' : ''}" href="${esc(x.media.siteUrl)}" target="_blank" rel="noopener">
        <img src="${esc(x.media.coverImage.medium)}" alt="" loading="lazy">
        <span class="t">${esc(x.media.title.english || x.media.title.romaji)}</span>
        <span class="d">Ep ${x.episode} · ${x.airingAt < now ? 'Out now' : new Date(x.airingAt * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span></a>`).join('')}</div>`}
  </section>`;
}
/* ---------- work schedule (calendar feed) + stocks, via the dash-proxy edge function ---------- */
const proxy = q => fetch(`${SB_URL}/functions/v1/dash-proxy?${q}`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } });
let CAL = (() => { try { return JSON.parse(localStorage.getItem('dash.cal')) || {}; } catch { return {}; } })();
let calBusy = false;
function parseICS(txt) {
  const un = v => v.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();
  const when = v => {
    const m = v.match(/^(\d{4})(\d\d)(\d\d)(?:T(\d\d)(\d\d)(\d\d)?(Z)?)?/); if (!m) return null;
    if (!m[4]) return { t: new Date(+m[1], m[2] - 1, +m[3]).getTime(), allDay: true };
    return { t: m[7] ? Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5]) : new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5]).getTime() };
  };
  const out = []; let e = null;
  for (const ln of txt.replace(/\r?\n[ \t]/g, '').split(/\r?\n/)) {
    if (ln === 'BEGIN:VEVENT') e = {};
    else if (ln === 'END:VEVENT') { if (e && e.start) out.push(e); e = null; }
    else if (e) {
      const i = ln.indexOf(':'); if (i < 0) continue;
      const name = ln.slice(0, i).split(';')[0], v = ln.slice(i + 1);
      if (name === 'SUMMARY') e.title = un(v);
      else if (name === 'LOCATION') e.loc = un(v);
      else if (name === 'DTSTART') { const r = when(v); if (r) { e.start = r.t; e.allDay = !!r.allDay; } }
      else if (name === 'DTEND') e.end = when(v)?.t;
    }
  }
  return out.sort((a, b) => a.start - b.start);
}
// Shifts come from a calendar link (S.calUrl) or, failing that, from the iPhone
// Shortcut that posts lines of "Title|start ISO|end ISO" to this sync vault.
const calSrc = () => S.calUrl ? 'ics:' + S.calUrl : SY.vault ? 'sc:' + SY.vault : '';
function parseShiftLines(txt) {
  return (txt || '').split(/\r?\n/).map(l => {
    const [title, a, b, cal] = l.split('|').map(x => x.trim()), start = Date.parse(a), end = Date.parse(b);
    return isNaN(start) ? null : { title, start, end: isNaN(end) ? undefined : end, cal: cal || '', allDay: !isNaN(end) && end - start >= 864e5 - 6e4 };
  }).filter(Boolean).sort((x, y) => x.start - y.start);
}
const shiftCals = () => [...new Set((CAL.events || []).map(e => e.cal).filter(Boolean))];
const runShortcut = () => { location.href = `shortcuts://run-shortcut?name=${encodeURIComponent('Dash Shifts')}&input=text&text=${encodeURIComponent(SY.vault)}`; };
async function loadCal(force) {
  const src = calSrc(); if (!src || calBusy) return;
  if (!force && CAL.url === src && Date.now() - CAL.ts < (S.calUrl ? 30 : 5) * 60e3) return;
  calBusy = true;
  const from = parseKey(dkey()).getTime(), to = from + 28 * 864e5;
  const keep = list => list.filter(e => (e.end || e.start) >= from && e.start < to).slice(0, 60);
  try {
    if (S.calUrl) {
      const r = await proxy(`kind=ics&url=${encodeURIComponent(S.calUrl)}`);
      if (!r.ok) throw new Error(r.status);
      CAL = { url: src, ts: Date.now(), events: keep(parseICS(await r.text())), error: false };
      if (force) toast(CAL.events.length ? `Calendar connected — ${CAL.events.length} upcoming` : 'Connected, but nothing upcoming');
    } else {
      const [row] = await rpc('dash_shifts', { vault: SY.vault });
      CAL = { url: src, ts: Date.now(), events: keep(parseShiftLines(row?.lines)), at: row?.at ? Date.parse(row.at) : 0, error: false };
      if (force) toast(CAL.at ? `Shifts updated ${ago(CAL.at).toLowerCase()}` : 'Nothing received from your iPhone yet');
    }
  } catch {
    CAL = { ...CAL, url: src, ts: Date.now(), error: true, events: CAL.url === src ? CAL.events : [] };
    if (force) toast(S.calUrl ? 'Couldn’t read that calendar link' : 'Couldn’t check for shifts');
  }
  try { localStorage.setItem('dash.cal', JSON.stringify(CAL)); } catch { }
  calBusy = false;
  logShifts(); queueReminders();
  if (S.tab === 'home' || S.tab === 'money') softRender();
}
const tm = t => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(':00', '').replace(/\s/g, ' ');
const tshort = t => { const d = new Date(t), h = d.getHours(), m = d.getMinutes(); return `${h % 12 || 12}${m ? ':' + pad(m) : ''}${h < 12 ? 'a' : 'p'}`; };
const dur = ms => { const h = ms / 36e5; return h >= 1 ? `${+h.toFixed(1)}h` : `${Math.round(ms / 6e4)}m`; };
const money = n => '$' + Math.round(n).toLocaleString();
// Shifts entered by hand (for ones the calendar feed doesn't have). Times are local, e.g. "2026-11-19T11:00".
const manualShifts = () => (S.xShifts || []).map(x => ({ id: x.id, manual: true, title: 'Added by hand', start: new Date(x.start).getTime(), end: new Date(x.end).getTime(), allDay: false }))
  .filter(e => !isNaN(e.start) && !isNaN(e.end));
function calShifts() {
  if (!calSrc() || CAL.url !== calSrc()) return [];
  const cals = S.calUrl ? [] : shiftCals(), pick = cals.includes(S.workCal);
  if (cals.length > 1 && !pick) return [];
  return (CAL.events || []).filter(e => !pick || e.cal === S.workCal);
}
// Work shifts from today onward: the calendar's, plus hand-entered ones on days the calendar has nothing.
function shifts() {
  const cal = calShifts(), days = new Set(cal.filter(e => !e.allDay).map(e => dkey(new Date(e.start)))), from = parseKey(dkey()).getTime();
  return [...cal, ...manualShifts().filter(e => e.end >= from && !days.has(dkey(new Date(e.start))))].sort((x, y) => x.start - y.start);
}
const unlogShift = x => { if (x && S.shiftLog) delete S.shiftLog[new Date(x.start).toISOString()]; };
const paidHours = (start, end) => { const h = (end - start) / 36e5; return Math.max(0, h - (h >= 6 ? (S.unpaidBreak || 0) / 60 : 0)); };
// Remember shifts so pay estimates still know about days that have passed.
function logShifts() {
  const seen = calPayday(); if (seen && seen !== S.paydaySeen) { S.paydaySeen = seen; save(); }
  const now = Date.now(), log = { ...(S.shiftLog || {}) }, before = JSON.stringify(log), cutoff = now - 70 * 864e5;
  for (const k in log) if (Date.parse(k) > now || Date.parse(k) < cutoff) delete log[k];
  for (const e of shifts()) if (!e.allDay && e.end) log[new Date(e.start).toISOString()] = +((e.end - e.start) / 36e5).toFixed(2);
  // Hand-entered shifts on past days count too, unless that day is already logged from the calendar.
  const logged = new Set(Object.keys(log).map(k => dkey(new Date(k))));
  for (const e of manualShifts()) if (e.end < now && e.start > cutoff && !logged.has(dkey(new Date(e.start)))) log[new Date(e.start).toISOString()] = +((e.end - e.start) / 36e5).toFixed(2);
  if (JSON.stringify(log) !== before) { S.shiftLog = log; save(); }
}
// Paid hours between two times, from the log (past) and the live schedule (future).
function hoursBetween(from, to) {
  let h = 0;
  for (const [k, v] of Object.entries(S.shiftLog || {})) { const t = Date.parse(k); if (t >= from && t < to) h += Math.max(0, v - (v >= 6 ? (S.unpaidBreak || 0) / 60 : 0)); }
  return h;
}
// Pay weeks run Sunday to Saturday; over 40 paid hours in a week earns time and a half.
const weekStart = (d = new Date()) => { const x = parseKey(dkey(d)); x.setDate(x.getDate() - x.getDay()); return x.getTime(); };
const WEEK = 7 * 864e5;
function weekPay(start) {
  const end = addDays(new Date(start), 7).getTime(), h = hoursBetween(start, end), ot = Math.max(0, h - 40);
  return { start, end, h, ot, gross: (h + ot * 0.5) * (S.rate || 0) };
}
const takeHome = g => g * (1 - Math.min(60, S.taxPct || 0) / 100);
const dayPaid = k => { const a = parseKey(k).getTime(); return hoursBetween(a, addDays(new Date(a), 1).getTime()); };
// A paycheck covers the two Sunday–Saturday weeks that end on the Saturday before payday.
function paychecks(from, count) {
  const first = nextPayday(); if (!first) return [];
  const out = []; let p = first; while (dayDiff(new Date(from), p) > 13) p = addDays(p, -14);
  while (dayDiff(p, new Date(from)) > 0) p = addDays(p, 14);
  for (let i = 0; i < count; i++, p = addDays(p, 14)) {
    const sat = addDays(p, -((p.getDay() + 1) % 7 || 7)), w2 = weekStart(sat), w1 = addDays(new Date(w2), -7).getTime();
    const a = weekPay(w1), b = weekPay(w2);
    out.push({ date: p, from: w1, to: sat, h: a.h + b.h, ot: a.ot + b.ot, gross: a.gross + b.gross });
  }
  return out;
}
const calPayday = () => { const e = (CAL.url === calSrc() && CAL.events || []).find(x => /pay\s*day/i.test(x.title || '')); return e ? dkey(new Date(e.start)) : ''; };
function nextPayday() {
  const anchor = S.payday || S.paydaySeen || '';
  if (!anchor) return null;
  const a = parseKey(anchor), n = Math.max(0, Math.ceil(dayDiff(a, new Date()) / 14));
  return addDays(a, n * 14);
}
function hourlyAt(t) {
  const d = W.sig === locSig() && W.data; if (!d) return null;
  const x = new Date(t), i = d.hourly.time.indexOf(`${dkey(x)}T${pad(x.getHours())}:00`);
  return i < 0 ? null : { temp: Math.round(d.hourly.temperature_2m[i]), rain: d.hourly.precipitation_probability[i], icon: wmo(d.hourly.weather_code[i], d.hourly.is_day[i]).icon };
}
/* ---------- places: where you might leave from, each with its own drive time ---------- */
const allPlaces = () => [{ id: 'home', name: 'Home', icon: '🏠', mins: S.commute || 0, lat: S.homeLL?.lat, lon: S.homeLL?.lon }, ...(S.places || [])];
const fromPlace = () => allPlaces().find(x => x.id === S.from) || allPlaces()[0];
const arriveAt = start => start - (S.early || 0) * 6e4;
const leaveAt = (start, pl = fromPlace()) => arriveAt(start) - (pl.mins || 0) * 6e4;
const hasTravel = () => allPlaces().some(x => x.mins);
const mapsUrl = () => S.workAddr ? `https://maps.apple.com/?daddr=${encodeURIComponent(S.workAddr)}&dirflg=d` : '';
function kmBetween(a, b) {
  const r = x => x * Math.PI / 180, dLat = r(b.lat - a.lat), dLon = r(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}
// If you've pinned any place, Dash works out which one you're at when a shift is coming up.
let autoFromAt = 0;
function autoFrom() {
  const pinned = allPlaces().filter(x => x.lat != null); if (!pinned.length || !navigator.geolocation) return;
  const now = Date.now(), next = shifts().find(e => !e.allDay && e.start > now && e.start - now < 10 * 36e5);
  if (!next || now - autoFromAt < 5 * 6e4) return; autoFromAt = now;
  navigator.geolocation.getCurrentPosition(pos => {
    const me = { lat: pos.coords.latitude, lon: pos.coords.longitude };
    const near = pinned.map(x => [kmBetween(me, x), x]).sort((a, b) => a[0] - b[0])[0];
    let id = null;
    if (near[0] < 1.5) id = near[1].id; else if (fromPlace().lat != null) id = allPlaces().find(x => x.lat == null)?.id || null;
    if (!id || id === fromPlace().id) return;
    S.from = id; save(); if (!$('#sheet-root').innerHTML) render();
    toast(`Leaving from ${fromPlace().name} · leave by ${tm(leaveAt(next.start))}`);
  }, () => {}, { timeout: 10000, maximumAge: 12e4 });
}
function placeSheet(pl) {
  const isNew = !pl; pl = pl || { name: '', icon: '📍', mins: '' };
  const home = pl.id === 'home';
  openSheet(`
  <form data-form="place" data-id="${pl.id || ''}" autocomplete="off">
    <div class="sheet-title">${isNew ? 'New place' : esc(pl.name)}</div>
    ${home ? '' : `<input class="input lg" name="name" value="${esc(pl.name)}" placeholder="Hospital, school, gym…" required maxlength="24">`}
    <label class="label">Drive to work (minutes)</label>
    <input class="input" type="number" inputmode="numeric" name="mins" min="0" max="240" value="${pl.mins || ''}" placeholder="35" required>
    ${home ? '' : `<label class="label">Icon</label>${emojiPicker(['📍', '🏥', '🏫', '🏋️', '👨‍👩‍👧', '❤️', '🏢', '☕'], pl.icon)}`}
    <label class="switch-row">${pl.lat != null ? 'Pinned — tap to re-pin where I am now' : 'Pin where I am now'}<span class="toggle"><input type="checkbox" name="pin"><i></i></span></label>
    <p class="muted" style="font-size:13px;margin:6px 0 0">Pin a place while you’re standing there and Dash will notice when you’re at it before a shift, and switch “leave by” for you.${pl.lat != null ? ' <button type="button" class="link-btn" data-a="unpinPlace" data-id="' + pl.id + '">Remove pin</button>' : ''}</p>
    <div class="btn-row"><button class="btn">${isNew ? 'Add place' : 'Save'}</button>
      ${isNew || home ? '' : `<button type="button" class="btn danger" data-a="deletePlace" data-id="${pl.id}">Delete place</button>`}</div>
  </form>`);
}
function setPlaceLL(id, ll) {
  if (id === 'home') { if (ll) S.homeLL = ll; else delete S.homeLL; }
  else { const x = (S.places || []).find(y => y.id === id); if (x) { if (ll) Object.assign(x, ll); else { delete x.lat; delete x.lon; } } }
}

function workCard() {
  const src = calSrc(), mine = CAL.url === src, byHand = (S.xShifts || []).length > 0;
  if (!byHand && (!src || (!S.calUrl && !(mine && CAL.at)))) return '';
  const cals = S.calUrl || !mine ? [] : shiftCals();
  if (cals.length > 1 && !cals.includes(S.workCal)) return `<section class="card" id="work">${secHead('💼 Work')}
    <div class="muted" style="margin-bottom:10px">Which calendar has your shifts?</div>
    <div class="chips">${cals.map(c => `<button class="chip" data-a="setWorkCal" data-v="${esc(c)}">${esc(c)}</button>`).join('')}</div></section>`;
  const now = Date.now(), all = shifts(), evs = all.filter(e => (e.end || e.start + 36e5) > now);
  const head = secHead(`💼 ${S.job ? esc(S.job) : 'Work'}`, `<span style="display:flex;gap:14px"><button class="link-btn" data-a="addShift">+ Shift</button>${!S.calUrl ? `<button class="link-btn" data-a="updateShifts">Update</button>` : ''}</span>`);
  if (!evs.length) return `<section class="card" id="work">${head}<div class="muted">${CAL.error && S.calUrl ? 'Couldn’t load your schedule from that link.' : mine || !src ? `No shifts coming up 🎉${CAL.at && now - CAL.at > 3 * 864e5 ? ' (last update from your iPhone was ' + ago(CAL.at).toLowerCase() + ')' : ''}` : 'Loading your schedule…'}</div></section>`;
  const dayName = t => { const n = dayDiff(new Date(), new Date(t)); return n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : new Date(t).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }); };
  const range = e => e.allDay ? 'All day' : `${tm(e.start)} – ${tm(e.end || e.start)}`;
  const [n, ...rest] = evs, on = n.start <= now && !n.allDay, soon = !n.allDay && !on && n.start - now < 30 * 36e5;
  const status = n.allDay ? dayName(n.start) : on ? `On shift · ${dur(n.end - now)} left` : n.start - now < 864e5 ? `Starts in ${dur(n.start - now)}` : dayName(n.start);

  // Helpful times around the shift
  const tips = [];
  if (soon) {
    const pl = fromPlace(), leave = leaveAt(n.start), many = allPlaces().length > 1;
    if (pl.mins) tips.push(`<span class="tip ${leave - now < 30 * 6e4 && leave > now ? 'hot' : ''}">🚗 Leave${many ? ' ' + esc(pl.name.toLowerCase() === 'home' ? 'home' : pl.name) : ''} by <b>${tm(leave)}</b>${leave > now && leave - now < 6 * 36e5 ? ` · in ${dur(leave - now)}` : leave <= now ? ' · go now' : ''}</span>`);
    if (S.early && pl.mins) tips.push(`<span class="tip">🎯 There by <b>${tm(arriveAt(n.start))}</b> · ${pl.mins} min drive</span>`);
    const w = hourlyAt(n.start); if (w) tips.push(`<span class="tip">${w.icon} <b>${w.temp}°</b> going in${w.rain >= 30 ? ` · ${w.rain}% rain` : ''}</span>`);
  }
  if ((on || soon) && n.end) { const w = hourlyAt(n.end); if (w) tips.push(`<span class="tip">${w.icon} <b>${w.temp}°</b> heading home${w.rain >= 30 ? ` · ${w.rain}% rain` : ''}</span>`); }
  const tmrKey = dkey(addDays(new Date(), 1)), early = all.find(e => !e.allDay && dkey(new Date(e.start)) === tmrKey && new Date(e.start).getHours() < 12);
  if (early) tips.push(`<span class="tip">😴 Bed by <b>${tm(early.start - ((S.commute || 0) + 45) * 6e4 - 8 * 36e5)}</b> for tomorrow’s ${tm(early.start)}</span>`);
  const off = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i)).find(d => !all.some(e => dkey(new Date(e.start)) === dkey(d)));
  if (off && dayDiff(new Date(), off) > 0) tips.push(`<span class="tip">🏖️ Next day off <b>${dayDiff(new Date(), off) === 1 ? 'tomorrow' : off.toLocaleDateString(undefined, { weekday: 'long' })}</b></span>`);

  // Pre-shift checklist, on shift days until the shift ends
  const kit = (S.kit || '').split(',').map(x => x.trim()).filter(Boolean), today = dkey();
  const done = S.kitDone && S.kitDone.date === today ? S.kitDone.items : [];
  const showKit = kit.length && dkey(new Date(n.start)) === today && !on;
  return `<section class="card" id="work">${head}
    <div class="shift ${on ? 'on' : ''}" ${n.manual ? `data-a="editShift" data-id="${n.id}" style="cursor:pointer"` : ''}>
      <div class="shift-when"><b>${dayName(n.start)}</b><span>${range(n)}</span></div>
      <div class="shift-meta"><span class="pill ${on ? 'live' : ''}">${status}</span><span class="muted">${esc(n.loc || n.title || '')}${!n.allDay && n.end ? ` · ${dur(n.end - n.start)}` : ''}</span></div>
      ${on ? `<div class="progress" style="margin:12px 0 0"><i style="width:${Math.min(100, (now - n.start) / (n.end - n.start) * 100)}%"></i></div>` : ''}
    </div>
    ${tips.length ? `<div class="tips">${tips.join('')}</div>` : ''}
    ${soon && (allPlaces().length > 1 || mapsUrl()) ? `<div class="from"><small>Leaving from</small><div class="chip-row" style="margin-top:6px">${allPlaces().map(x => `<button class="habit-chip ${x.id === fromPlace().id ? 'on' : ''}" data-a="setFrom" data-id="${x.id}">${x.icon} ${esc(x.name)}${x.mins ? ` · ${tm(leaveAt(n.start, x))}` : ''}</button>`).join('')}${mapsUrl() ? `<a class="habit-chip" href="${esc(mapsUrl())}" target="_blank" rel="noopener">🧭 Directions</a>` : ''}</div></div>` : ''}
    ${showKit ? `<div class="kit"><small>${done.length >= kit.length ? 'Ready to go ✓' : 'Before you go'}</small><div class="chip-row" style="margin-top:6px">${kit.map(k => `<button class="habit-chip ${done.includes(k) ? 'on' : ''}" data-a="kitToggle" data-v="${esc(k)}">${done.includes(k) ? '✓ ' : ''}${esc(k)}</button>`).join('')}</div></div>` : ''}
    ${rest.length ? `<div class="shift-list">${rest.slice(0, 6).map(e => `<div class="shift-row" ${e.manual ? `data-a="editShift" data-id="${e.id}" style="cursor:pointer"` : ''}><b>${dayName(e.start)}${e.manual ? ' ✎' : ''}</b><span>${range(e)}</span><span class="muted">${e.allDay || !e.end ? esc(e.title || '') : dur(e.end - e.start)}</span></div>`).join('')}</div>` : ''}
  </section>`;
}
// 7-day strip: shifts, days off and tasks due, at a glance.
function weekCard() {
  if (!calView.sel) { calView.sel = dkey(); calView.ym = calView.sel.slice(0, 7); }
  return `<section class="card" id="week">${secHead('🗓️ Calendar')}<div id="calbody">${calBody()}</div></section>`;
}
/* ---------- full calendar: any month, everything Dash knows about each day ---------- */
const calView = { ym: '', sel: '' };
const ymOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
// Everything on each day of a date range, keyed by day.
function dayItems(from, to) {
  const out = {}, put = (k, x) => (out[k] = out[k] || []).push(x), inR = t => t >= from && t < to;
  const shiftDays = new Set();
  const addShiftItem = e => { const k = dkey(new Date(e.start)); if (shiftDays.has(k)) return; shiftDays.add(k);
    put(k, { type: 'shift', icon: '💼', t: e.start, title: `${tm(e.start)} – ${tm(e.end || e.start)}`, sub: `${S.job || 'Work'} · ${dur((e.end || e.start) - e.start)}${S.rate ? ' · ' + money(paidHours(e.start, e.end || e.start) * S.rate) : ''}`, short: tshort(e.start), id: e.manual ? e.id : '' }); };
  shifts().filter(e => !e.allDay && inR(e.start)).forEach(addShiftItem);
  manualShifts().filter(e => inR(e.start)).forEach(addShiftItem);
  for (const [k, h] of Object.entries(S.shiftLog || {})) { const t = Date.parse(k); if (inR(t)) addShiftItem({ start: t, end: t + h * 36e5 }); }
  const seen = new Set();
  if (!S.calUrl && CAL.url === calSrc()) for (const e of CAL.events || []) {
    if (e.cal === S.workCal || !inR(e.start)) continue;
    const key = (e.title || '').toLowerCase().replace(/[^a-z0-9]/g, '') + dkey(new Date(e.start)); if (seen.has(key)) continue; seen.add(key);
    const t = `${e.title} ${e.cal}`.toLowerCase(); if (/pay\s*day/.test(t)) continue;
    put(dkey(new Date(e.start)), { type: 'event', icon: /birthday|bday/.test(t) ? '🎂' : /holiday/.test(t) ? '🎉' : '📅', t: e.start, title: e.title, sub: e.allDay ? 'All day' : tm(e.start) + (e.end ? ' – ' + tm(e.end) : '') });
  }
  for (const t of S.tasks) if (t.due && inR(parseKey(t.due).getTime())) put(t.due, { type: 'task', icon: t.done ? '✅' : '☑️', t: 0, title: t.text, sub: t.done ? 'Done' : 'Task due', id: t.id, done: t.done });
  const pd = nextPayday();
  if (pd) for (let d = addDays(pd, -14 * Math.ceil(Math.max(0, dayDiff(new Date(from), pd)) / 14)); d.getTime() < to; d = addDays(d, 14)) if (inR(d.getTime())) {
    const c = S.rate ? paychecks(d.getTime(), 1)[0] : null;
    put(dkey(d), { type: 'pay', icon: '💵', t: 1, title: 'Payday', sub: c && c.gross ? `About ${money(c.gross)}${S.taxPct ? ' · ~' + money(takeHome(c.gross)) + ' take-home' : ''}` : 'Every two weeks' });
  }
  for (let d = new Date(from); d.getTime() < to; d = addDays(d, 1)) {
    const k = dkey(d), last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    for (const b of S.bills || []) if (Math.min(b.day, last) === d.getDate()) put(k, { type: 'bill', icon: b.emoji || '🧾', t: 2, title: b.name, sub: `Bill due${b.amount ? ' · ' + money(b.amount) : ''}` });
    for (const c of S.countdowns || []) if (c.date === k || (c.yearly && c.date.slice(5) === k.slice(5))) put(k, { type: 'cd', icon: c.emoji || '⏳', t: 3, title: c.title, sub: 'Countdown' });
  }
  for (const k in out) out[k].sort((a, b) => a.t - b.t);
  return out;
}
function calBody() {
  const today = dkey(), [y, m] = calView.ym.split('-').map(Number), first = new Date(y, m - 1, 1);
  const start = addDays(first, -first.getDay()), weeks = Math.ceil((first.getDay() + new Date(y, m, 0).getDate()) / 7);
  const items = dayItems(start.getTime(), addDays(start, weeks * 7).getTime());
  let hrs = 0, n = 0;
  const cells = Array.from({ length: weeks * 7 }, (_, i) => {
    const d = addDays(start, i), k = dkey(d), it = items[k] || [], sh = it.find(x => x.type === 'shift'), out = d.getMonth() !== m - 1;
    if (sh && !out) { n++; hrs += dayPaid(k) || 0; }
    const dots = [...new Set(it.filter(x => x.type !== 'shift' && !x.done).map(x => x.type))].slice(0, 4);
    return `<button class="cal-d ${out ? 'out' : ''} ${k === today ? 't' : ''} ${k === calView.sel ? 'sel' : ''} ${sh ? 'has' : ''}" data-a="calPick" data-k="${k}"><b>${d.getDate()}</b>${sh ? `<span>${sh.short}</span>` : '<span>&nbsp;</span>'}<em>${dots.map(t => `<i class="d-${t}"></i>`).join('')}</em></button>`;
  }).join('');
  const sel = calView.sel, list = items[sel] || [], sd = parseKey(sel), diff = dayDiff(new Date(), sd);
  const label = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : diff === -1 ? 'Yesterday' : sd.toLocaleDateString(undefined, { weekday: 'long' });
  return `<div class="cal-nav"><button class="mv" data-a="calNav" data-n="-1" aria-label="Previous month">‹</button>
      <b>${first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</b>
      <button class="mv" data-a="calNav" data-n="1" aria-label="Next month">›</button></div>
    <div class="cal-sum muted">${n ? `${n} shift${n === 1 ? '' : 's'}${hrs ? ` · ${+hrs.toFixed(1)}h${S.rate ? ' · ' + money(hrs * S.rate) : ''}` : ''}` : 'No shifts this month'}${calView.ym !== ymOf(new Date()) ? ` · <button class="link-btn" data-a="calToday">Back to today</button>` : ''}</div>
    <div class="cal-w">${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(x => `<small>${x}</small>`).join('')}</div>
    <div class="cal-g" id="cal-g">${cells}</div>
    <div class="cal-key"><span><i class="d-event"></i>Event</span><span><i class="d-task"></i>Task</span><span><i class="d-bill"></i>Bill</span><span><i class="d-pay"></i>Payday</span><span><i class="d-cd"></i>Countdown</span></div>
    <div class="cal-day"><div class="sec-head" style="margin-top:14px"><h2>${label} <span class="muted" style="font-weight:500;font-size:14px">${sd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></h2>
      <span style="display:flex;gap:14px"><button class="link-btn" data-a="calAddShift">+ Shift</button><button class="link-btn" data-a="calAddTask">+ Task</button></span></div>
      ${list.length ? `<div class="stock-list">${list.map(x => `<div class="stock" ${x.type === 'shift' && x.id ? `data-a="editShift" data-id="${x.id}" style="cursor:pointer"` : x.type === 'task' ? `data-a="editTask" data-id="${x.id}" style="cursor:pointer"` : ''}>
        <span style="font-size:22px">${x.icon}</span><div><b style="font-size:15px;${x.done ? 'text-decoration:line-through;opacity:.6' : ''}">${esc(x.title)}</b><small>${esc(x.sub)}</small></div></div>`).join('')}</div>`
      : `<div class="muted" style="padding:6px 0 4px">Nothing on this day${diff >= 0 ? ' — a day off 🏖️' : ''}.</div>`}</div>`;
}
// The calendar lives on the home screen; this jumps to it on a given day.
function calendarSheet(day) {
  calView.sel = day || dkey(); calView.ym = calView.sel.slice(0, 7);
  if (S.tab !== 'home') { S.tab = 'home'; render(); } else calRedraw();
  setTimeout(() => $('#week')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
}
let calX = null, calY = 0;
document.addEventListener('touchstart', e => { const g = e.target.closest?.('#cal-g'); calX = g ? e.touches[0].clientX : null; calY = e.touches[0].clientY; }, { passive: true });
document.addEventListener('touchend', e => { if (calX == null) return; const dx = e.changedTouches[0].clientX - calX, dy = e.changedTouches[0].clientY - calY; calX = null;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) calShift(dx < 0 ? 1 : -1); }, { passive: true });
function calRedraw() { const el = $('#calbody'); if (el) el.innerHTML = calBody(); }
function calShift(n) {
  const [y, m] = calView.ym.split('-').map(Number), d = new Date(y, m - 1 + n, 1);
  calView.ym = ymOf(d); calView.sel = calView.ym === ymOf(new Date()) ? dkey() : dkey(d); calRedraw();
}

function payCard() {
  if (!S.rate) return '';
  const ws = weekStart(), cur = weekPay(ws), next = weekPay(addDays(new Date(ws), 7).getTime()), pd = nextPayday();
  const worked = hoursBetween(ws, Date.now()), check = paychecks(Date.now(), 1)[0];
  return `<section class="card pressable" id="pay" data-a="openPay" style="cursor:pointer">${secHead('💵 Pay estimate', `<span class="link-btn">Calendar</span>`)}
    <div class="pay"><div><b>${money(cur.gross)}</b><small>this week · ${+cur.h.toFixed(1)}h${cur.ot ? ' · OT' : ''}</small></div><div><b>${money(next.gross)}</b><small>next week · ${+next.h.toFixed(1)}h${next.ot ? ' · OT' : ''}</small></div></div>
    <div class="progress" style="margin:14px 0 8px"><i style="width:${cur.h ? Math.min(100, worked / cur.h * 100) : 0}%"></i></div>
    <div class="shift-meta" style="margin:0"><span class="muted">${money(worked * S.rate)} earned so far${S.taxPct ? ` · ~${money(takeHome(cur.gross))} take-home` : ''}</span>${pd ? `<span class="pill" style="margin-left:auto">${check && check.gross ? money(check.gross) + ' · ' : ''}${dayDiff(new Date(), pd) === 0 ? 'payday 🎉' : 'in ' + dayDiff(new Date(), pd) + 'd'}</span>` : ''}</div>
  </section>`;
}
let payMonth = 0;
function paySheet() {
  const now = new Date(), first = new Date(now.getFullYear(), now.getMonth() + payMonth, 1), y = first.getFullYear(), m = first.getMonth();
  const days = new Date(y, m + 1, 0).getDate(), today = dkey();
  const paydays = new Set(paychecks(addDays(first, -14), 6).map(c => dkey(c.date)));
  let cells = '<i></i>'.repeat(first.getDay()), mh = 0, mShifts = 0;
  for (let d = 1; d <= days; d++) {
    const k = dkey(new Date(y, m, d)), h = dayPaid(k); if (h) { mh += h; mShifts++; }
    cells += `<div class="pc ${h ? 'has' : ''} ${k === today ? 't' : ''}"><b>${d}</b>${h ? `<span>${+h.toFixed(1)}h</span><small>${money(h * S.rate)}</small>` : ''}${paydays.has(k) ? '<em>💵</em>' : ''}</div>`;
  }
  // Weeks that touch this month
  const weeks = []; let mGross = 0;
  for (let w = weekStart(first); w < new Date(y, m + 1, 1).getTime(); w = addDays(new Date(w), 7).getTime()) { const x = weekPay(w); weeks.push(x); }
  weeks.forEach(x => mGross += x.gross);
  const fmt = t => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const thisWeek = weekStart();
  const checks = paychecks(first, 3).filter(c => c.date.getMonth() === m || c.gross);
  openSheet(`
    <div class="sheet-head"><div><div class="sheet-title" style="margin:0">Pay</div><div class="muted" style="font-size:13px">${S.job ? esc(S.job) + ' · ' : ''}$${(+S.rate).toFixed(2)}/hr${S.taxPct ? ` · ${S.taxPct}% withheld` : ' · before taxes'}</div></div><div class="spacer"></div><button class="ghost" data-a="closeSheet">Done</button></div>
    <div class="pmonth"><button class="icon-btn" data-a="payNav" data-n="-1" aria-label="Previous month" style="transform:scaleX(-1)">${I.chev}</button><b>${first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</b><button class="icon-btn" data-a="payNav" data-n="1" aria-label="Next month">${I.chev}</button></div>
    <div class="pgrid head">${'SMTWTFS'.split('').map(c => `<small>${c}</small>`).join('')}</div>
    <div class="pgrid">${cells}</div>
    <div class="stat-grid" style="margin-top:14px">
      <div class="stat"><small>Shifts</small><b>${mShifts}</b></div>
      <div class="stat"><small>Paid hours</small><b>${+mh.toFixed(1)}</b></div>
      <div class="stat"><small>${S.taxPct ? 'Take-home' : 'Gross'}</small><b>${money(S.taxPct ? takeHome(mh * S.rate) : mh * S.rate)}</b></div>
    </div>
    <button class="btn secondary" data-a="addShift" style="margin-top:4px">${I.plus} Add a shift by hand</button>
    <label class="label">By week (Sun–Sat)</label>
    <div class="list" style="box-shadow:none">${weeks.map(x => `<div class="row ${x.start === thisWeek ? 'now' : ''}"><div><div class="row-title">${fmt(x.start)} – ${fmt(x.end - 864e5)}${x.start === thisWeek ? ' <span class="pill live" style="font-size:11px">this week</span>' : ''}</div>
      <div class="muted" style="font-size:13px">${x.h ? `${+x.h.toFixed(1)}h${x.ot ? ` · ${+x.ot.toFixed(1)}h overtime at 1.5×` : ''}` : 'No shifts'}</div></div>
      <div class="v" style="display:block;text-align:right"><b style="color:var(--text);font-size:17px">${x.h ? money(x.gross) : '—'}</b>${S.taxPct && x.h ? `<div style="font-size:12px">~${money(takeHome(x.gross))} net</div>` : ''}</div></div>`).join('')}</div>
    ${checks.length ? `<label class="label">Paychecks</label>
    <div class="list" style="box-shadow:none">${checks.map(c => `<div class="row"><span class="ic">💵</span><div><div class="row-title">${c.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
      <div class="muted" style="font-size:13px">for ${fmt(c.from)} – ${fmt(c.to)} · ${+c.h.toFixed(1)}h</div></div>
      <div class="v" style="display:block;text-align:right"><b style="color:var(--text);font-size:17px">${c.h ? money(c.gross) : '—'}</b>${S.taxPct && c.h ? `<div style="font-size:12px">~${money(takeHome(c.gross))} net</div>` : ''}</div></div>`).join('')}</div>`
    : `<p class="muted" style="font-size:13px;margin-top:14px">Add one payday in Settings → Work & pay to see each paycheck.</p>`}
    <p class="muted" style="font-size:12.5px;margin-top:14px">Estimates only. Dash knows the shifts your iPhone has sent (about two weeks ahead), shifts you add by hand, and past days from when you started using it.${S.unpaidBreak ? ` ${S.unpaidBreak} min unpaid break taken off shifts of 6h or more.` : ''}</p>`, { full: false });
}

// Bills: monthly, due on a day of the month.
function billDue(b) {
  const now = new Date(), ym = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  const on = (y, m) => new Date(y, m, Math.min(b.day, new Date(y, m + 1, 0).getDate()));
  let d = on(now.getFullYear(), now.getMonth());
  if ((S.billPaid || {})[b.id] === ym(d)) d = on(now.getFullYear(), now.getMonth() + 1);
  return { date: d, ym: ym(d), days: dayDiff(now, d) };
}
function billsCard() {
  const list = (S.bills || []).map(b => ({ ...b, due: billDue(b) })).sort((a, b) => a.due.days - b.due.days);
  if (!list.length) return '';
  const total = list.reduce((a, b) => a + (+b.amount || 0), 0);
  return `<section class="card" id="bills">${secHead('🧾 Bills', `<button class="link-btn" data-a="addBill">Add</button>`)}
    <div class="stock-list">${list.slice(0, 6).map(b => { const n = b.due.days; return `<div class="stock">
      <div data-a="editBill" data-id="${b.id}" style="cursor:pointer"><b>${b.emoji || '🧾'} ${esc(b.name)}</b><small class="${n < 0 ? 'over' : n <= 3 ? 'soon' : ''}">${n < 0 ? `${-n}d overdue` : n === 0 ? 'Due today' : n === 1 ? 'Due tomorrow' : `Due ${b.due.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${n}d`}</small></div>
      <div class="px"><b>${b.amount ? '$' + (+b.amount).toLocaleString(undefined, { maximumFractionDigits: 2 }) : ''}</b></div>
      <button class="paid-btn" data-a="payBill" data-id="${b.id}" data-ym="${b.due.ym}" aria-label="Mark paid">${I.check}</button></div>`; }).join('')}</div>
    ${total ? `<div class="muted" style="font-size:13px;margin-top:10px">${money(total)} a month across ${list.length} bill${list.length === 1 ? '' : 's'}</div>` : ''}
  </section>`;
}

let STK = { ts: 0, key: '', quotes: null };
const stockList = () => (S.stocks || '').split(/[\s,]+/).map(x => x.trim().toUpperCase()).filter(Boolean).slice(0, 12);
async function loadStocks(force) {
  const syms = stockList(), key = syms.join(',');
  if (!syms.length || (!force && STK.key === key && Date.now() - STK.ts < 60e3)) return;
  STK.ts = Date.now(); STK.key = key;
  try { STK.quotes = (await (await proxy(`kind=quotes&symbols=${encodeURIComponent(key)}`)).json()).quotes; }
  catch { STK.quotes = STK.quotes || []; }
  const el = $('#stocks'); if (el) el.outerHTML = stocksCard();
}
function spark(vals, up) {
  if (!vals || vals.length < 2) return '';
  const lo = Math.min(...vals), hi = Math.max(...vals), sp = hi - lo || 1;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1) * 70).toFixed(1)},${(26 - (v - lo) / sp * 24).toFixed(1)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 70 28" width="70" height="28"><polyline points="${pts}" fill="none" stroke="${up ? 'var(--ok)' : 'var(--danger)'}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}
function stocksCard() {
  if (!stockList().length) return '';
  const q = STK.key === stockList().join(',') ? STK.quotes : null;
  return `<section class="card" id="stocks">
    ${secHead('📈 Watchlist', `<button class="link-btn" data-a="goSettings">Edit</button>`)}
    ${!q ? '<div class="muted">Loading quotes…</div>' : `<div class="stock-list">${q.map(x => {
      if (x.error || x.price == null) return `<div class="stock"><div><b>${esc(x.symbol)}</b><small>Not found</small></div></div>`;
      const ch = x.prev ? (x.price - x.prev) / x.prev * 100 : 0, up = ch >= 0;
      return `<div class="stock"><div><b>${esc(x.symbol)}</b><small>${esc(x.name || '')}</small></div>${spark(x.spark, up)}
        <div class="px"><b>${x.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b><span class="chg ${up ? 'up' : 'down'}">${up ? '+' : ''}${ch.toFixed(2)}%</span></div></div>`; }).join('')}</div>`}
  </section>`;
}
const loadWidgets = () => { if (S.tab === 'home') { loadNBA(); loadAnime(); } if (S.tab === 'home' || S.tab === 'money') { loadCal(); loadStocks(); } };

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

function toggleTask(id) {
  const t = byId('tasks', id); if (!t) return;
  const done = !t.done, msg = setTaskDone(id, done);
  $(`.swipe[data-tid="${id}"] .task`)?.classList.toggle('done', done);
  if (done) navigator.vibrate?.(10);
  if (msg) toast(msg);
  setTimeout(() => render(), done ? 450 : 0);
}

/* ---------- swipe rows: right = complete, left = delete ---------- */
let sw = null, swipeEndedAt = 0;
document.addEventListener('touchstart', e => {
  const row = e.target.closest('.swipe');
  sw = row && !e.target.closest('.check') ? { row, x: e.touches[0].clientX, y: e.touches[0].clientY, dx: 0, lock: null } : null;
}, { passive: true });
document.addEventListener('touchmove', e => {
  if (!sw) return;
  const dx = e.touches[0].clientX - sw.x, dy = e.touches[0].clientY - sw.y;
  if (!sw.lock) {
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    sw.lock = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'x' : 'y';
    if (sw.lock === 'x') sw.row.classList.add('swiping');
  }
  if (sw.lock !== 'x') return;
  e.preventDefault();
  sw.dx = dx;
  sw.row.querySelector('.task').style.transform = `translateX(${dx}px)`;
  sw.row.classList.toggle('right', dx > 0);
  const armed = Math.abs(dx) > 90;
  if (armed !== sw.row.classList.contains('armed')) { sw.row.classList.toggle('armed', armed); if (armed) navigator.vibrate?.(8); }
}, { passive: false });
document.addEventListener('touchend', () => {
  if (!sw || sw.lock !== 'x') { sw = null; return; }
  const { row, dx } = sw, id = row.dataset.tid, task = row.querySelector('.task');
  sw = null; swipeEndedAt = Date.now();
  task.style.transition = 'transform .25s cubic-bezier(.2,.8,.2,1)';
  if (dx > 90) { task.style.transform = ''; setTimeout(() => { row.classList.remove('swiping', 'armed', 'right'); toggleTask(id); }, 150); }
  else if (dx < -90) { task.style.transform = 'translateX(-110%)'; setTimeout(() => removeWithUndo('tasks', id, 'Task'), 220); }
  else { task.style.transform = ''; setTimeout(() => row.classList.remove('swiping', 'armed', 'right'), 250); }
});

/* =========================================================
   VIEWS
   ========================================================= */
function viewHome() {
  rollDay();
  const now = new Date(), h = now.getHours(), t = dkey();
  const greet = h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 22 ? 'Good evening' : 'Good night';
  const tt = todayTasks();
  const nDone = S.habits.filter(hOk).length;
  const total = tt.total + S.habits.length, done = tt.done.length + nDone;
  const pct = total ? done / total : 0;
  const sessions = S.focus.sessions[t] || 0;

  const upNext = S.tasks.filter(x => !x.done).sort(taskSort).slice(0, 4);
  const f = S.focus, left = focusLeft();
  const cds = S.countdowns.map(c => ({ ...c, next: nextDate(c) })).sort((a, b) => a.next.localeCompare(b.next));

  const hero = `
  <header class="hero">
    <div style="flex:1">
      <div class="eyebrow">${now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
      <h1>${greet}${S.name ? `,<br><span class="accent">${esc(S.name)}</span>` : ''}</h1>
    </div>
    <button class="icon-btn" data-a="openSearch" aria-label="Search">${I.search}</button>
    <button class="icon-btn" data-a="goSettings" aria-label="Settings">${I.gear}${SY.vault ? `<span class="sync-dot" data-sync-dot="${syncStatus}"></span>` : ''}</button>
  </header>

  ${!S.hideInstall && !isStandalone() ? `<div class="banner"><span style="font-size:24px">📲</span><div><b>Add to Home Screen</b>${isIOS() ? 'Tap Share, then “Add to Home Screen”.' : 'Use your browser menu → Install app.'}</div><button class="x" data-a="hideInstall" aria-label="Dismiss">${I.x}</button></div>` : ''}`;
  const P = {
    weather: () => weatherCard(),
    work: () => workCard(),
    week: () => weekCard() || '<span id="week" hidden></span>',
    pay: () => payCard(),
    agenda: () => agendaCard(),
    spend: () => spendCard(),
    mood: () => moodCard(),
    bills: () => billsCard(),
    nba: () => nbaCard(),
    anime: () => animeCard(),
    stocks: () => stocksCard(),
    today: () => `<section class="card">
    <div class="today">
      <div class="ring-wrap">${ring(pct)}<div class="ring-label"><div>${Math.round(pct * 100)}%<small>today</small></div></div></div>
      <div class="today-stats">
        <div class="ts"><span class="dot"></span>Tasks<b>${tt.done.length}/${tt.total}</b></div>
        <div class="ts"><span class="dot" style="background:#ff8a3d"></span>Habits<b>${nDone}/${S.habits.length}</b></div>
        <div class="ts"><span class="dot" style="background:#4aa8ff"></span>Focus<b>${sessions} ${sessions === 1 ? 'session' : 'sessions'}</b></div>
      </div>
    </div>
    <label class="intention"><span>🎯</span><input data-input="intention" value="${esc(S.intention.text)}" placeholder="Today’s one big thing…" enterkeyhint="done"></label>
  </section>`,
    tasks: () => `<section class="card">
    ${secHead('Up next', `<button class="link-btn" data-a="tab" data-tab="tasks">See all</button>`)}
    ${upNext.length ? `<div class="task-list">${upNext.map(taskRow).join('')}</div>`
      : `<div class="empty"><div class="big">✨</div><b>All clear</b>Nothing on your plate.</div>`}
  </section>`,
    habits: () => S.habits.length ? `<section class="card">
    ${secHead('Habits', `<button class="link-btn" data-a="tab" data-tab="habits">${nDone}/${S.habits.length}</button>`)}
    <div class="chip-row">${[...S.habits].sort((a, b) => hDone(a, t) - hDone(b, t) || byWhen(a, b)).map(x => `<button class="habit-chip ${hDone(x, t) ? 'on' : ''}" data-a="toggleHabit" data-id="${x.id}" data-day="${t}"><span>${x.emoji}</span>${esc(x.name)}${hTarget(x) > 1 ? `<small>${hCount(x, t)}/${hTarget(x)}</small>` : ''}</button>`).join('')}</div>
  </section>` : '',
    links: () => `<section class="card">
    ${secHead('Quick links', `<button class="link-btn" data-a="goSettings">Edit</button>`)}
    <div class="links">
      ${S.links.map(l => `<a class="qlink" href="${esc(l.url)}" target="_blank" rel="noopener"><span class="tile">${l.emoji || esc((l.title || '?')[0])}</span><span class="t">${esc(l.title)}</span></a>`).join('')}
      <button class="qlink" data-a="addLink"><span class="tile add">${I.plus}</span><span class="t">Add</span></button>
    </div>
  </section>`,
    tools: () => `<div class="grid2">
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
  </div>`,
    countdowns: () => `<section class="card">
    ${secHead('Countdowns')}
    <div class="cd-row">
      ${cds.map(c => { const n = dayDiff(new Date(), parseKey(c.next)); return `<button class="cd ${n <= 7 && n >= 0 ? 'soon' : ''}" data-a="editCountdown" data-id="${c.id}">
        <span class="e">${c.emoji}</span>
        <span class="n">${n === 0 ? 'Today' : Math.abs(n)}${n === 0 ? '' : `<small>${n < 0 ? 'days ago' : n === 1 ? 'day' : 'days'}</small>`}</span>
        <span class="t">${esc(c.title)}</span><span class="d">${fmtDate(c.next, { month: 'short', day: 'numeric', year: 'numeric' })}</span></button>`; }).join('')}
      <button class="cd add" data-a="addCountdown" aria-label="Add countdown">${I.plus}</button>
    </div>
  </section>`,
  };
  P.moneySum = () => moneySummary();
  const L = layout(), hidden = new Set(L.hidden), shut = new Set(L.collapsed);
  const body = sectionOrder().map(([id, title, cards]) => {
    const html = cards.filter(c => !hidden.has(c) && P[c]).map(c => P[c]()).filter(x => x && !/^<span id="week" hidden>/.test(x)).join('\n');
    if (!html) return '';
    if (!title) return html;
    return `<button class="sec-toggle ${shut.has(id) ? 'shut' : ''}" data-a="secToggle" data-id="${id}"><span>${title}</span>${I.chev}</button>${shut.has(id) ? '' : html}`;
  }).join('\n');
  return hero + brief() + body + `
  <div class="home-foot"><button class="chip" data-a="weeklyReview">📊 Weekly review</button><button class="chip" data-a="customizeHome">⚙️ Customize home</button></div>`;
}

// One row at the top of home: the few things that matter right now.
function brief() {
  const now = Date.now(), out = [], all = shifts(), sh = all.find(e => !e.allDay && (e.end || e.start) > now);
  if (sh && dkey(new Date(sh.start)) === dkey()) out.push(['home', sh.start <= now ? `💼 On shift till ${tm(sh.end)}` : `💼 Work ${tm(sh.start)}${fromPlace().mins ? ` · leave ${tm(leaveAt(sh.start))}` : ''}`]);
  else if (all.length) out.push(['home', '🏖️ No shift today']);
  const due = todayTasks().open.length; if (due) out.push(['tasks', `✅ ${due} task${due === 1 ? '' : 's'} due`]);
  if (S.habits.length) { const left = S.habits.filter(h => !hOk(h)).length; out.push(['habits', left ? `🔥 ${left} habit${left === 1 ? '' : 's'} left` : '🔥 Habits done']); }
  const bill = (S.bills || []).map(b => ({ b, d: billDue(b).days })).filter(x => x.d <= 3).sort((x, y) => x.d - y.d)[0];
  if (bill) out.push(['money', `🧾 ${esc(bill.b.name)} ${bill.d < 0 ? 'overdue' : bill.d === 0 ? 'due today' : `due in ${bill.d}d`}`]);
  const pd = nextPayday(); if (pd && dayDiff(new Date(), pd) <= 2) out.push(['money', `💵 Payday ${dayDiff(new Date(), pd) === 0 ? 'today' : dayDiff(new Date(), pd) === 1 ? 'tomorrow' : 'in 2d'}`]);
  return out.length ? `<div class="chip-row brief">${out.map(([tab, text]) => `<button class="habit-chip" data-a="tab" data-tab="${tab}">${text}</button>`).join('')}</div>` : '';
}

/* ---------- money tab: pay, spending, bills and stocks in one place ---------- */
function viewMoney() {
  const checks = S.rate ? paychecks(Date.now(), 3).filter(c => c.h) : [], d = new Date(), ms = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  const list = [...(S.spend || [])].filter(x => x.ts >= ms).sort((a, b) => b.ts - a.ts), fmt = t => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `
  <header class="page-head"><h1>Money</h1><div class="spacer"></div><button class="icon-btn" data-a="goSettings" aria-label="Settings">${I.gear}</button></header>
  ${S.rate ? payCard() : `<section class="card">${secHead('💵 Pay estimate')}<div class="muted" style="margin-bottom:12px">Add your hourly pay to see what each week and paycheck comes to.</div><button class="btn" data-a="goSettings">Set it up</button></section>`}
  ${checks.length ? `<section class="card">${secHead('Next paychecks', `<button class="link-btn" data-a="openPay">Calendar</button>`)}<div class="stock-list">${checks.map(c => `<div class="stock"><span style="font-size:22px">💵</span>
    <div><b style="font-size:15px">${c.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</b><small>${fmt(c.from)} – ${fmt(c.to)} · ${+c.h.toFixed(1)}h</small></div>
    <div class="px"><b>${money(c.gross)}</b>${S.taxPct ? `<small>~${money(takeHome(c.gross))} net</small>` : ''}</div></div>`).join('')}</div></section>` : ''}
  ${spendCard()}
  ${budgetCard()}
  ${list.length > 3 ? `<section class="card">${secHead(d.toLocaleDateString(undefined, { month: 'long' }) + ' spending', `<span class="muted" style="font-size:14px;font-weight:650">${money(list.reduce((t, x) => t + x.amt, 0))}</span>`)}
    <div class="shift-list" style="margin:0">${list.slice(0, 30).map(x => `<div class="shift-row" data-a="delSpend" data-id="${x.id}" style="cursor:pointer;grid-template-columns:1fr auto auto"><b>${catIcon(x.cat || guessCat(x.note))} ${esc(x.note || 'Expense')}</b><span class="muted" style="font-size:13px">${fmt(x.ts)}</span><span>$${(+x.amt).toFixed(2)}</span></div>`).join('')}</div></section>` : ''}
  ${billsCard() || `<section class="card">${secHead('🧾 Bills', `<button class="link-btn" data-a="addBill">Add</button>`)}<div class="muted">Add rent, phone or subscriptions and Dash tracks what’s due next.</div></section>`}
  ${stocksCard()}`;
}

/* ---------- search everything ---------- */
function searchSheet() {
  openSheet(`<div class="sheet-head"><div class="sheet-title" style="margin:0">Search</div><div class="spacer"></div><button class="ghost" data-a="closeSheet">Done</button></div>
    <div class="search">${I.search}<input class="input" type="search" data-input="globalSearch" placeholder="Tasks, notes, habits, bills…" autocapitalize="off"></div>
    <div id="gs" style="margin-top:12px;min-height:240px"><div class="muted">Type at least two letters.</div></div>`, { onMount: el => setTimeout(() => $('input', el).focus(), 350) });
}
function searchResults(q) {
  q = q.toLowerCase().trim(); if (q.length < 2) return '<div class="muted">Type at least two letters.</div>';
  const hit = v => String(v || '').toLowerCase().includes(q), rows = [];
  S.tasks.filter(t => hit(t.text) || hit(t.tag)).sort((a, b) => a.done - b.done).slice(0, 8).forEach(t => rows.push(['editTask', t.id, t.done ? '☑️' : '✅', t.text, t.done ? 'Done' : (dueLabel(t.due) || { t: 'Task' }).t]));
  S.notes.filter(n => hit(n.title) || hit(n.body)).slice(0, 6).forEach(n => rows.push(['openNote', n.id, '📝', n.title || n.body.slice(0, 40), 'Note']));
  S.habits.filter(h => hit(h.name)).forEach(h => rows.push(['habitDetail', h.id, h.emoji, h.name, 'Habit']));
  (S.bills || []).filter(b => hit(b.name)).forEach(b => rows.push(['editBill', b.id, b.emoji || '🧾', b.name, 'Bill']));
  S.countdowns.filter(c => hit(c.title)).forEach(c => rows.push(['editCountdown', c.id, c.emoji, c.title, 'Countdown']));
  S.links.filter(l => hit(l.title) || hit(l.url)).forEach(l => rows.push(['editLink', l.id, l.emoji || '🔗', l.title, 'Link']));
  return rows.length ? `<div class="list" style="box-shadow:none">${rows.map(([a, id, ic, t, sub]) => `<button class="row" data-a="${a}" data-id="${id}"><span class="ic">${ic}</span><span class="row-title" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t)}</span><span class="v">${esc(sub)}</span></button>`).join('')}</div>` : '<div class="muted">Nothing found.</div>';
}

/* ---------- home layout: sections you can collapse, reorder, and hide cards in ---------- */
const CARD_LABEL = { weather: '🌤️ Weather', work: '💼 Shifts', week: '🗓️ Calendar', today: '🎯 Today progress', tasks: '✅ Up next', habits: '🔥 Habits', agenda: '📅 Coming up', mood: '🙂 Mood',
  moneySum: '💳 Money summary', pay: '💵 Pay estimate', spend: '💸 Spending', bills: '🧾 Bills', stocks: '📈 Watchlist', nba: '🏀 NBA', anime: '📺 Anime', links: '🔗 Quick links', tools: '⏱️ Focus & water', countdowns: '⏳ Countdowns' };
const SECTIONS = [['top', '', ['weather']], ['work', 'Work', ['work', 'week']], ['today', 'Today', ['today', 'tasks', 'habits', 'agenda', 'mood']],
  ['money', 'Money', ['moneySum', 'pay', 'spend', 'bills', 'stocks']], ['fun', 'For fun', ['nba', 'anime']], ['tools', 'Tools', ['links', 'tools', 'countdowns']]];
// Pay, spending, bills and stocks live in the Money tab, so home shows a one-card summary by default.
const LAYOUT_DEFAULT = () => ({ v: 2, sections: [], hidden: ['pay', 'spend', 'bills', 'stocks'], collapsed: [] });
function layout() { if (!S.layout || S.layout.v !== 2) S.layout = LAYOUT_DEFAULT(); return S.layout; }
function sectionOrder() {
  const ids = SECTIONS.map(x => x[0]), saved = (layout().sections || []).filter(id => ids.includes(id));
  return [...saved, ...ids.filter(id => !saved.includes(id))].map(id => SECTIONS.find(x => x[0] === id));
}
function moneySummary() {
  const ws = weekStart(), spent = spendBetween(ws, addDays(new Date(ws), 7).getTime()), wp = S.rate ? weekPay(ws) : null;
  const bill = (S.bills || []).map(b => ({ b, d: billDue(b).days })).sort((x, y) => x.d - y.d)[0], pd = nextPayday();
  if (!wp && !spent && !bill) return '';
  const cell = (label, value, sub = '') => `<div><small>${label}</small><b>${value}</b>${sub ? `<em>${sub}</em>` : ''}</div>`;
  return `<section class="card pressable" id="msum" data-a="tab" data-tab="money" style="cursor:pointer">
    <div class="msum">
      ${wp ? cell('This week', money(wp.gross), `${+wp.h.toFixed(1)}h${pd ? ` · payday ${dayDiff(new Date(), pd) === 0 ? 'today' : 'in ' + dayDiff(new Date(), pd) + 'd'}` : ''}`) : ''}
      ${cell('Spent', money(spent), wp ? (takeHome(wp.gross) - spent >= 0 ? money(takeHome(wp.gross) - spent) + ' left' : 'over') : 'this week')}
      ${bill ? cell('Next bill', esc(bill.b.name), bill.d < 0 ? 'overdue' : bill.d === 0 ? 'today' : `in ${bill.d}d`) : ''}
    </div></section>`;
}
function customizeSheet() {
  const L = layout(), hidden = new Set(L.hidden), order = sectionOrder();
  openSheet(`
    <div class="sheet-head"><div class="sheet-title" style="margin:0">Customize home</div><div class="spacer"></div><button class="ghost" data-a="closeSheet">Done</button></div>
    <p class="muted" style="font-size:13px;margin-bottom:4px">Move whole sections up or down, and switch individual cards on or off. On the home screen, tap a section’s name to fold it away.</p>
    ${order.map(([id, title, cards], i) => `
      <div class="lay-head"><b>${title || 'Top'}</b><span><button class="mv" data-a="secMove" data-id="${id}" data-n="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move section up">↑</button><button class="mv" data-a="secMove" data-id="${id}" data-n="1" ${i === order.length - 1 ? 'disabled' : ''} aria-label="Move section down">↓</button></span></div>
      <div class="list" style="box-shadow:none">${cards.map(c => `<label class="row lay"><span class="row-title" style="${hidden.has(c) ? 'opacity:.45' : ''}">${CARD_LABEL[c]}</span>
        <span class="toggle" style="margin-left:auto"><input type="checkbox" data-change="layToggle" data-id="${c}" ${hidden.has(c) ? '' : 'checked'}><i></i></span></label>`).join('')}</div>`).join('')}
    <div class="btn-row"><button class="btn secondary" data-a="layReset">Reset to default</button></div>`, { onClose: () => setTimeout(() => S.tab === 'home' && render(), 0) });
}

/* ---------- coming up: everything in your calendar that isn't work ---------- */
function agendaCard() {
  if (S.calUrl || CAL.url !== calSrc()) return '';
  const now = Date.now(), seen = new Set(), rows = [];
  for (const e of CAL.events || []) {
    if (e.cal === S.workCal || (e.end || e.start) < now) continue;
    const key = (e.title || '').toLowerCase().replace(/[^a-z0-9]/g, '') + dkey(new Date(e.start)); if (seen.has(key)) continue; seen.add(key);
    const t = `${e.title} ${e.cal}`.toLowerCase();
    rows.push({ ...e, icon: /pay\s*day/.test(t) ? '💵' : /birthday|bday/.test(t) ? '🎂' : /holiday/.test(t) ? '🎉' : '📅' });
  }
  if (!rows.length) return '';
  return `<section class="card" id="agenda">${secHead('📅 Coming up', `<button class="link-btn" data-a="openCal">Calendar ›</button>`)}
    <div class="stock-list">${rows.slice(0, 6).map(e => { const n = dayDiff(new Date(), new Date(e.start)); return `<div class="stock">
      <span style="font-size:22px">${e.icon}</span><div><b style="font-size:15px">${esc(e.title)}</b><small>${new Date(e.start).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}${e.allDay || e.icon === '💵' ? '' : ' · ' + tm(e.start)}</small></div>
      <span class="pill ${n <= 1 ? 'live' : ''}">${n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : `in ${n}d`}</span></div>`; }).join('')}</div>
  </section>`;
}

/* ---------- spending: quick log, compared with what you're earning this week ---------- */
const SPEND_CATS = [['Food', '🍔'], ['Gas', '⛽'], ['Shopping', '🛍️'], ['Fun', '🎮'], ['Bills', '🧾'], ['Other', '💸']];
const catIcon = c => (SPEND_CATS.find(x => x[0] === c) || SPEND_CATS[5])[1];
// Guess a category from what you typed, so most entries need no extra tap.
function guessCat(note) {
  const n = (note || '').toLowerCase();
  if (/food|lunch|dinner|breakfast|coffee|mcdonald|chick|subway|taco|wendy|bojang|cane|crumbl|chipotle|pizza|uber ?eats|doordash|grocer|starbucks|snack|drink/.test(n)) return 'Food';
  if (/gas|fuel|shell|exxon|bp\b|sheetz|wawa|speedway|car ?wash|parking|toll|uber\b|lyft/.test(n)) return 'Gas';
  if (/movie|amc|santikos|steam|game|psn|playstation|xbox|nintendo|twitch|concert|ticket|card|pok[eé]mon|one piece|bowling/.test(n)) return 'Fun';
  if (/amazon|tiktok|target|walmart|shop|clothes|shoes|nike|best ?buy|apple store/.test(n)) return 'Shopping';
  if (/bill|rent|phone|t-?mobile|insurance|subscription|spotify|netflix|hulu|apple ?care|klarna|afterpay|sezzle|affirm|loan/.test(n)) return 'Bills';
  return 'Other';
}
const monthStart = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1).getTime();
function budgetCard() {
  const d = new Date(), ms = monthStart(d), me = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime(), B = S.budgets || {};
  const by = {}; (S.spend || []).filter(x => x.ts >= ms && x.ts < me).forEach(x => { const c = x.cat || guessCat(x.note); by[c] = (by[c] || 0) + (+x.amt || 0); });
  const cats = SPEND_CATS.filter(([c]) => by[c] || B[c]);
  const daysLeft = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() - d.getDate() + 1;
  const total = Object.values(by).reduce((a, b) => a + b, 0), totalB = Object.values(B).reduce((a, b) => a + (+b || 0), 0);
  return `<section class="card" id="budgets">${secHead(`📊 ${d.toLocaleDateString(undefined, { month: 'long' })} budget`, `<button class="link-btn" data-a="editBudgets">${totalB ? 'Edit' : 'Set budgets'}</button>`)}
    ${totalB ? `<div class="shift-meta" style="margin:0 0 12px"><span class="muted">${money(total)} of ${money(totalB)} · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left${totalB > total ? ` · ${money((totalB - total) / daysLeft)}/day to stay on track` : ''}</span></div>` : ''}
    ${cats.length ? `<div class="bud-list">${cats.map(([c, ic]) => { const spent = by[c] || 0, lim = +B[c] || 0, pc = lim ? spent / lim : 0; return `<div class="bud">
      <div class="bud-top"><span>${ic} ${c}</span><span><b>${money(spent)}</b>${lim ? `<span class="muted"> / ${money(lim)}</span>` : ''}</span></div>
      ${lim ? `<div class="progress" style="margin:6px 0 0"><i style="width:${Math.min(100, pc * 100)}%;${pc > 1 ? 'background:var(--danger)' : pc > .85 ? 'background:var(--warn)' : ''}"></i></div>` : ''}</div>`; }).join('')}</div>`
    : `<div class="muted">Log spending and it’s sorted into Food, Gas, Fun and more. Set a monthly limit for each to see how you’re doing.</div>`}
  </section>`;
}
function budgetSheet() {
  const B = S.budgets || {};
  openSheet(`<form data-form="budgets" autocomplete="off">
    <div class="sheet-title">Monthly budgets</div>
    <p class="muted" style="font-size:13px;margin-bottom:6px">Leave a category empty for no limit.</p>
    <div class="list" style="box-shadow:none">${SPEND_CATS.map(([c, ic]) => `<label class="row"><span class="ic">${ic}</span><span class="row-title">${c}</span>
      <input class="inline num" type="number" inputmode="decimal" min="0" step="1" name="${c}" value="${B[c] || ''}" placeholder="$" style="width:90px"></label>`).join('')}</div>
    <div class="btn-row"><button class="btn">Save budgets</button></div></form>`);
}
const spendBetween = (a, b) => (S.spend || []).filter(x => x.ts >= a && x.ts < b).reduce((t, x) => t + (+x.amt || 0), 0);
function spendCard() {
  const ws = weekStart(), we = addDays(new Date(ws), 7).getTime(), spent = spendBetween(ws, we), earn = S.rate ? takeHome(weekPay(ws).gross) : 0;
  const recent = [...(S.spend || [])].sort((a, b) => b.ts - a.ts).slice(0, 3);
  return `<section class="card" id="spend">${secHead('💸 Spending', `<span class="muted" style="font-size:13px;font-weight:600">this week</span>`)}
    <div class="shift-when" style="margin-bottom:8px"><b style="font-size:28px">${money(spent)}</b>${earn ? `<span class="muted" style="font-size:14px;font-weight:600">${earn - spent >= 0 ? money(earn - spent) + ' left of ' + money(earn) : money(spent - earn) + ' over ' + money(earn)}</span>` : ''}</div>
    ${earn ? `<div class="progress" style="margin:0 0 12px"><i style="width:${Math.min(100, spent / earn * 100)}%;${spent > earn ? 'background:var(--danger)' : ''}"></i></div>` : ''}
    <form class="quick-add" data-form="spend" autocomplete="off">
      <input class="input" name="amt" type="number" inputmode="decimal" min="0" step="0.01" placeholder="$" style="flex:0 0 84px" required>
      <input class="input" name="note" placeholder="What for?" maxlength="30" enterkeyhint="done">
      <button class="add-btn" aria-label="Add expense">${I.plus}</button>
      <input type="hidden" name="cat" value="">
    </form>
    <div class="chips cat-chips" data-group="cat">${SPEND_CATS.map(([c, ic]) => `<button type="button" class="chip" data-a="pickCat" data-v="${c}">${ic} ${c}</button>`).join('')}</div>
    ${recent.length ? `<div class="shift-list">${recent.map(x => `<div class="shift-row" data-a="delSpend" data-id="${x.id}" style="cursor:pointer;grid-template-columns:1fr auto auto"><b>${catIcon(x.cat || guessCat(x.note))} ${esc(x.note || 'Expense')}</b><span class="muted" style="font-size:13px">${ago(x.ts)}</span><span>$${(+x.amt).toFixed(2)}</span></div>`).join('')}</div>` : ''}
  </section>`;
}

/* ---------- weekly review ---------- */
function weeklyReview() {
  const stats = off => {
    const a = addDays(new Date(weekStart()), off * 7).getTime(), b = addDays(new Date(a), 7).getTime(), days = Array.from({ length: 7 }, (_, i) => dkey(addDays(new Date(a), i)));
    const past = days.filter(k => k <= dkey());
    const hab = S.habits.length && past.length ? past.reduce((t, k) => t + S.habits.filter(h => hDone(h, k)).length, 0) / (S.habits.length * past.length) : 0;
    const moods = days.map(k => S.moods[k]).filter(Boolean), wp = weekPay(a);
    return { a, b, days, tasks: S.tasks.filter(t => t.done && days.includes(t.doneAt)).length, hab, focus: days.reduce((t, k) => t + (S.focus.sessions[k] || 0), 0),
      hours: wp.h, gross: wp.gross, spent: spendBetween(a, b), mood: moods.length ? moods.reduce((x, y) => x + y, 0) / moods.length : 0 };
  };
  const cur = stats(0), prev = stats(-1), fmt = t => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const delta = (x, y, unit = '') => !y && !x ? '' : `<em class="${x >= y ? 'up' : 'down'}">${x >= y ? '▲' : '▼'} ${Math.abs(+(x - y).toFixed(1))}${unit} vs last week</em>`;
  const tile = (label, value, d = '') => `<div class="stat rv"><small>${label}</small><b>${value}</b>${d}</div>`;
  const best = [...S.habits].map(h => ({ h, n: cur.days.filter(k => hDone(h, k)).length })).sort((x, y) => y.n - x.n)[0];
  openSheet(`
    <div class="sheet-head"><div><div class="sheet-title" style="margin:0">Weekly review</div><div class="muted" style="font-size:13px">${fmt(cur.a)} – ${fmt(cur.b - 864e5)} so far</div></div><div class="spacer"></div><button class="ghost" data-a="closeSheet">Done</button></div>
    <div class="stat-grid" style="grid-template-columns:1fr 1fr">
      ${tile('Tasks done', cur.tasks, delta(cur.tasks, prev.tasks))}
      ${tile('Habits kept', Math.round(cur.hab * 100) + '%', delta(Math.round(cur.hab * 100), Math.round(prev.hab * 100), '%'))}
      ${tile('Hours scheduled', +cur.hours.toFixed(1) + 'h', delta(cur.hours, prev.hours, 'h'))}
      ${S.rate ? tile('Pay (est.)', money(cur.gross), delta(Math.round(cur.gross), Math.round(prev.gross))) : ''}
      ${tile('Spent', money(cur.spent), cur.spent || prev.spent ? `<em>${money(prev.spent)} last week</em>` : '')}
      ${tile('Focus sessions', cur.focus, delta(cur.focus, prev.focus))}
      ${tile('Mood', cur.mood ? MOODS[Math.round(cur.mood) - 1][0] + ' ' + MOODS[Math.round(cur.mood) - 1][1] : '—')}
      ${best && best.n ? tile('Best habit', `${best.h.emoji} ${best.n}/7`, `<em>${esc(best.h.name)}</em>`) : ''}
    </div>
    <label class="label">Habits each day</label>
    <div class="rv-days">${cur.days.map(k => { const n = S.habits.filter(h => hDone(h, k)).length, pc = S.habits.length ? n / S.habits.length : 0; return `<div><div class="rv-bar"><i style="height:${Math.round(pc * 100)}%"></i></div><small>${parseKey(k).toLocaleDateString(undefined, { weekday: 'narrow' })}</small></div>`; }).join('')}</div>`);
}

function moodCard() {
  const t = dkey(), cur = S.moods[t];
  const days = Array.from({ length: 14 }, (_, i) => dkey(addDays(new Date(), i - 13)));
  const logged = days.filter(k => S.moods[k]);
  const avg = logged.length ? logged.reduce((a, k) => a + S.moods[k], 0) / logged.length : 0;
  return `<section class="card">
    ${secHead(cur ? `Feeling ${MOODS[cur - 1][1].toLowerCase()} today` : 'How are you feeling?', logged.length > 2 ? `<span class="muted" style="font-size:13px;font-weight:600">2-wk avg ${MOODS[Math.round(avg) - 1][0]}</span>` : '')}
    <div class="moods ${cur ? 'has' : ''}">${MOODS.map(([e, l], i) => `<button class="mood ${cur === i + 1 ? 'on' : ''}" data-a="setMood" data-v="${i + 1}" aria-label="${l}">${e}</button>`).join('')}</div>
    ${logged.length ? `<div class="mood-strip">${days.map(k => `<span class="${k === t ? 't' : ''}" title="${k}">${S.moods[k] ? MOODS[S.moods[k] - 1][0] : ''}</span>`).join('')}</div>` : ''}
  </section>`;
}

function viewTasks() {
  const t = dkey(), f = S.taskFilter, used = (S.tags || []).filter(g => S.tasks.some(x => x.tag === g));
  if (S.tagFilter && !used.includes(S.tagFilter)) S.tagFilter = '';
  const pool = S.tagFilter ? S.tasks.filter(x => x.tag === S.tagFilter) : S.tasks;
  const open = pool.filter(x => !x.done).sort(taskSort);
  let body = '';
  const group = (label, list, cls = '') => list.length ? `<div class="group-label ${cls}">${label}</div><section class="card" style="padding:4px 16px"><div class="task-list">${list.map(taskRow).join('')}</div></section>` : '';
  if (f === 'today') {
    const over = open.filter(x => x.due && x.due < t), today = open.filter(x => x.due === t);
    const doneToday = pool.filter(x => x.done && x.doneAt === t);
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
    const done = pool.filter(x => x.done).sort((a, b) => (b.doneTs || 0) - (a.doneTs || 0));
    body = done.length ? group(`${done.length} completed`, done) + `<button class="btn danger" data-a="clearDone" style="margin-top:8px">Clear completed</button>`
      : `<div class="empty card"><div class="big">🏁</div><b>Nothing completed yet</b>Checked-off tasks land here.</div>`;
  }
  return `
  <header class="page-head"><h1>Tasks</h1>${open.length ? `<span class="count-pill">${open.length}</span>` : ''}</header>
  <form class="quick-add" data-form="quickTask" autocomplete="off">
    <input class="input" id="qt" name="text" placeholder="Add a task… try “essay tmr #school !”" enterkeyhint="done">
    <button class="add-btn" aria-label="Add task">${I.plus}</button>
  </form>
  <div class="seg">${[['today', 'Today'], ['upcoming', 'Upcoming'], ['all', 'All'], ['done', 'Done']].map(([k, l]) => `<button class="${f === k ? 'on' : ''}" data-a="taskFilter" data-f="${k}">${l}</button>`).join('')}</div>
  ${used.length ? `<div class="chip-row tagbar">${['', ...used].map(g => `<button class="habit-chip ${(S.tagFilter || '') === g ? 'on' : ''}" data-a="tagFilter" data-v="${esc(g)}">${g ? esc(g) : 'All'}<small>${S.tasks.filter(x => !x.done && (!g || x.tag === g)).length}</small></button>`).join('')}</div>` : ''}
  <div>${body}</div>`;
}

function viewHabits() {
  const t = new Date(), tk = dkey();
  const week = Array.from({ length: 7 }, (_, i) => addDays(t, i - 6));
  const nDone = S.habits.filter(hOk).length;
  let wk = 0; S.habits.forEach(h => week.forEach(d => { if (hDone(h, dkey(d))) wk++; }));
  const wkPct = S.habits.length ? Math.round(wk / (S.habits.length * 7) * 100) : 0;
  const card = h => {
    const s = streak(h), tg = hTarget(h), c = hCount(h, tk), done = c >= tg;
    return `<section class="card habit ${done ? 'is-done' : ''}">
      <div class="habit-top">
        <button class="habit-emoji" data-a="habitDetail" data-id="${h.id}" aria-label="Details">${h.emoji}</button>
        <div class="habit-info" data-a="habitDetail" data-id="${h.id}"><div class="habit-name">${esc(h.name)}</div>
          <div class="habit-sub">${isWeekly(h) ? `<b class="wk-goal ${weekMet(h) ? 'met' : ''}">${weekDone(h)}/${weekGoal(h)} this week</b> ` : ''}${[s ? `🔥 ${s} ${isWeekly(h) ? 'wk' : 'day'}${s === 1 ? '' : 's'}` : '', strength(h) ? `💪 ${strength(h)}%` : '', h.remind ? `🔔 ${tm(atTime(tk, h.remind))}` : ''].filter(Boolean).join(' · ') || (isWeekly(h) ? '' : 'Not started yet')}</div></div>
        <button class="habit-go ${done ? 'on' : ''}" data-a="toggleHabit" data-id="${h.id}" data-day="${tk}" aria-label="${done ? 'Undo' : 'Mark done'}">${done ? I.check : tg > 1 ? `<b>${c}/${tg}</b>` : I.check}</button>
      </div>
      <div class="week">${week.map(d => { const k = dkey(d), today = k === tk, part = hCount(h, k) > 0 && !hDone(h, k); return `<div class="wd ${today ? 'is-today' : ''}">${today ? 'Today' : d.toLocaleDateString(undefined, { weekday: 'narrow' })}
        <button class="${hDone(h, k) ? 'on' : part ? 'part' : ''}" data-a="toggleHabit" data-id="${h.id}" data-day="${k}" aria-label="${k}">${I.check}</button></div>`; }).join('')}</div>
    </section>`;
  };
  const todo = (a, b) => hOk(a) - hOk(b) || (a.remind || '99').localeCompare(b.remind || '99');
  const group = (label, list) => list.length ? `<div class="group-label">${label} <span class="muted" style="font-weight:600">· ${list.filter(hOk).length}/${list.length}</span></div>${[...list].sort(todo).map(card).join('')}` : '';
  const daily = S.habits.filter(h => !isWeekly(h));
  const groups = Object.entries(WHEN).map(([k, [label, icon]]) => group(`${icon} ${label}`, daily.filter(h => (h.when || 'any') === k))).join('')
    + group('📆 Weekly goals', S.habits.filter(isWeekly));
  const have = new Set(S.habits.map(h => h.name.toLowerCase()));
  const ideas = HABIT_IDEAS.map((x, i) => [x, i]).filter(([x]) => !have.has(x[1].toLowerCase()));
  return `
  <header class="page-head"><h1>Habits</h1><div class="spacer"></div><button class="icon-btn on" data-a="addHabit" aria-label="New habit">${I.plus}</button></header>
  ${S.habits.length ? `<section class="card"><div class="today">
    <div class="ring-wrap">${ring(S.habits.length ? nDone / S.habits.length : 0, 72, 8)}<div class="ring-label"><div style="font-size:16px">${nDone}/${S.habits.length}</div></div></div>
    <div class="today-stats"><div class="ts">${nDone === S.habits.length ? 'All done today 🎉' : 'Left today'}<b>${nDone === S.habits.length ? '' : S.habits.length - nDone}</b></div><div class="ts">Last 7 days<b>${wkPct}%</b></div><div class="ts">Longest streak<b>${Math.max(0, ...S.habits.map(streak))} 🔥</b></div></div>
  </div></section>` : `<div class="empty card"><div class="big">🌱</div><b>No habits yet</b>Pick a few below or tap + to make your own.</div>`}
  ${groups}
  ${ideas.length ? `<div class="group-label">✨ Quick add</div>
  <div class="chip-row" style="margin-top:0">${ideas.map(([x, i]) => `<button class="habit-chip idea" data-a="addIdea" data-i="${i}"><span>${x[0]}</span>${x[1]}</button>`).join('')}</div>` : ''}`;
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

  <div class="settings-label">Account</div>
  <div class="list">
    ${SY.account ? `
      ${row('👤', esc(SY.account.name || 'Signed in'), `<span class="v">${['google', 'github'].filter(k => SY.account[k]).map(k => AUTH_ICONS[k]).join(' ')}</span>`)}
      ${!SY.account.google ? `<button class="row" data-a="googleSignIn"><span class="ic">${AUTH_ICONS.google}</span><span class="row-title">Also sign in with Google</span><span class="v">${I.chev}</span></button>` : ''}
      ${!SY.account.github ? `<button class="row" data-a="githubSignIn"><span class="ic">${AUTH_ICONS.github}</span><span class="row-title">Also sign in with GitHub</span><span class="v">${I.chev}</span></button>` : ''}
      ${row('🚪', '<span style="color:var(--danger)">Sign out on this device</span>', '', 'signOut')}`
    : `
      <div class="pad muted" style="font-size:14px">Sign in to back up your Dash and get it on every device, without codes.</div>
      <div class="pad auth-btns" style="padding-top:0">
        <button class="auth-btn" data-a="googleSignIn">${AUTH_ICONS.google}Continue with Google</button>
        <button class="auth-btn" data-a="githubSignIn">${AUTH_ICONS.github}Continue with GitHub</button>
      </div>`}
  </div>

  <div class="settings-label">Cloud sync</div>
  <div class="list">
    ${SY.vault ? `
      ${row('☁️', 'Status', `<span class="v"><span class="sync-dot inline" data-sync-dot="${syncStatus}"></span><span id="sync-text">${syncLabel()}</span></span>`)}
      ${row('🔄', 'Sync now', `<span class="v">${I.chev}</span>`, 'syncNow')}
      ${row('📲', 'Add another device', `<span class="v">Share code${I.chev}</span>`, 'shareCode')}
      ${row('🔌', '<span style="color:var(--danger)">Turn off on this device</span>', '', 'disableSync')}`
    : `
      <div class="pad muted" style="font-size:14px">Prefer no account? Sync with a private code instead.</div>
      <div class="pad" style="padding-top:0"><button class="btn" data-a="enableSync">Turn on cloud sync</button></div>
      <form class="pad quick-add" data-form="joinSync" style="padding-top:0" autocomplete="off">
        <input class="input" name="code" placeholder="Have a code? Paste it here" autocapitalize="off" autocorrect="off" spellcheck="false">
        <button class="add-btn" aria-label="Join">${I.chev}</button>
      </form>`}
  </div>

  <div class="settings-label">Profile</div>
  <div class="list">${row('👋', 'Your name', `<input class="inline" data-change="name" value="${esc(S.name)}" placeholder="Optional" autocomplete="given-name">`)}</div>

  <div class="settings-label">Appearance</div>
  <div class="list">
    <div class="pad"><div class="seg">${[['auto', 'Auto'], ['dark', 'Dark'], ['light', 'Light']].map(([k, l]) => `<button class="${S.theme === k ? 'on' : ''}" data-a="setTheme" data-v="${k}">${l}</button>`).join('')}</div></div>
    <div class="swatches" style="padding-top:0">${Object.entries(ACCENTS).map(([k, c]) => `<button class="swatch ${S.accent === k ? 'on' : ''}" style="background:${c};color:${c}" data-a="setAccent" data-v="${k}" aria-label="${k}"></button>`).join('')}</div>
  </div>

  <div class="settings-label">Notifications</div>
  <div class="list">
    ${pushHere() && S.notify.on ? `
      ${row('🔔', 'On for this device', `<span class="v">${buildReminders().length} coming up</span>`)}
      ${[['brief', '🌅', 'Morning brief'], ['work', '💼', 'Work: leave-by and night before'], ['habits', '🔥', 'Habit reminders'], ['tasks', '✅', 'Tasks due'], ['bills', '🧾', 'Bills due tomorrow']].map(([k, ic, l]) =>
        row(ic, l, `<span class="toggle" style="margin-left:auto"><input type="checkbox" data-change="ntf" data-k="${k}" ${S.notify[k] ? 'checked' : ''}><i></i></span>`)).join('')}
      ${row('⏰', 'Morning brief at', `<input class="inline" type="time" data-change="ntfTime" data-k="morning" value="${esc(S.notify.morning)}" style="width:auto">`)}
      ${row('🌙', 'Evening check-in at', `<input class="inline" type="time" data-change="ntfTime" data-k="evening" value="${esc(S.notify.evening)}" style="width:auto">`)}
      ${row('🚗', 'Warn me before leaving (min)', `<input class="inline num" type="number" inputmode="numeric" min="0" max="120" data-change="ntfLead" value="${S.notify.lead}">`)}
      ${row('📨', 'Send a test', `<span class="v">${I.chev}</span>`, 'pushTest')}
      ${row('🔕', '<span style="color:var(--danger)">Turn off on this device</span>', '', 'pushOff')}
      <div class="pad muted" style="font-size:13px">Give any habit its own reminder time by editing the habit.</div>`
    : `
      <div class="pad muted" style="font-size:14px">Get reminders on your phone: when to leave for work, your shift tomorrow, medicine and other habits, tasks and bills due.</div>
      <div class="pad" style="padding-top:0"><button class="btn" data-a="pushOn">Turn on notifications</button></div>
      ${isIOS() && !isStandalone() ? `<div class="pad muted" style="font-size:13px;padding-top:0">On iPhone this only works from the Dash icon on your Home Screen, not in Safari.</div>` : ''}`}
  </div>

  <div class="settings-label">Home screen</div>
  <div class="list">
    ${row('⚙️', 'Customize home', `<span class="v">Hide or reorder cards${I.chev}</span>`, 'customizeHome')}
    ${row('📊', 'Weekly review', `<span class="v">${I.chev}</span>`, 'weeklyReview')}
  </div>

  <div class="settings-label">Home widgets</div>
  <div class="list">
    ${row('🏀', 'NBA scores', `<span class="toggle" style="margin-left:auto"><input type="checkbox" data-change="wNba" ${S.widgets.nba ? 'checked' : ''}><i></i></span>`)}
    ${row('⭐', 'My team', `<select class="inline-select" data-change="team"><option value="">None</option>${NBA_TEAMS.map(t => `<option ${S.team === t ? 'selected' : ''}>${t}</option>`).join('')}</select>`)}
    ${row('📺', 'Anime airing today', `<span class="toggle" style="margin-left:auto"><input type="checkbox" data-change="wAnime" ${S.widgets.anime ? 'checked' : ''}><i></i></span>`)}
    ${row('📈', 'Stocks', `<input class="inline" data-change="stocks" value="${esc(S.stocks || '')}" placeholder="SPY, AAPL" autocapitalize="characters" autocorrect="off" spellcheck="false">`)}
  </div>

  <div class="settings-label">Work schedule</div>
  <div class="list">
    ${row('💼', 'Status', `<span class="v">${S.calUrl ? (CAL.error ? 'Link not working' : `${(CAL.events || []).length} upcoming`) : !SY.vault ? 'Not set up yet' : CAL.at ? `${(CAL.events || []).length} shifts · sent ${ago(CAL.at).toLowerCase()}` : 'Waiting for your iPhone'}</span>`)}
    <a class="row" href="${SB_URL}/functions/v1/dash-shortcut" target="_blank" rel="noopener"><span class="ic">1️⃣</span><span class="row-title">Add the shortcut</span><span class="v">One time${I.chev}</span></a>
    ${row('2️⃣', 'Update shifts', `<span class="v">${I.chev}</span>`, 'updateShifts')}
    ${!S.calUrl && shiftCals().length > 1 ? `<div class="pad"><div class="muted" style="font-size:13px;margin-bottom:8px">Calendar with your shifts</div><div class="chips">${shiftCals().map(c => `<button class="chip ${S.workCal === c ? 'on' : ''}" data-a="setWorkCal" data-v="${esc(c)}">${esc(c)}</button>`).join('')}</div></div>` : ''}
    <div class="pad muted" style="font-size:13px">Tap 1 on your iPhone, tap <b>Download</b>, then open the downloaded file and tap <b>Add Shortcut</b>. After that, tap 2 whenever you want fresh shifts. The first run asks to allow Calendar access.</div>
    <div class="pad" style="padding-bottom:8px"><input class="input" data-change="calUrl" value="${esc(S.calUrl || '')}" placeholder="Or paste a public calendar link" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false"></div>
    <div class="pad muted" style="font-size:13px;padding-top:0">Only for normal calendar feeds (school, Google, iCloud). Leave empty to use the shortcut.</div>
  </div>

  <div class="settings-label">Work & pay</div>
  <div class="list">
    ${row('🪪', 'Job title', `<input class="inline" data-change="job" value="${esc(S.job || '')}" placeholder="Optional" maxlength="30">`)}
    ${row('💵', 'Hourly pay ($)', `<input class="inline num" type="number" inputmode="decimal" min="0" step="0.01" data-change="rate" value="${S.rate || ''}" placeholder="0">`)}
    ${row('🥪', 'Unpaid break (min)', `<input class="inline num" type="number" inputmode="numeric" min="0" max="120" data-change="unpaidBreak" value="${S.unpaidBreak || ''}" placeholder="0">`)}
    ${row('🏛️', 'Taxes withheld (%)', `<input class="inline num" type="number" inputmode="decimal" min="0" max="60" data-change="taxPct" value="${S.taxPct || ''}" placeholder="0">`)}
    ${row('📆', 'A payday', `<input class="inline" type="date" data-change="payday" value="${esc(S.payday || S.paydaySeen || '')}" style="width:auto">`)}
    ${row('🎯', 'Arrive early (min)', `<input class="inline num" type="number" inputmode="numeric" min="0" max="60" data-change="early" value="${S.early || ''}" placeholder="0">`)}
    ${row('🧭', 'Work address', `<input class="inline" data-change="workAddr" value="${esc(S.workAddr || '')}" placeholder="For directions" maxlength="80" style="width:170px">`)}
    <div class="pad muted" style="font-size:13px;padding:10px 16px 2px">Places you leave from</div>
    ${allPlaces().map(x => row(x.icon, esc(x.name) + (x.lat != null ? ' <span class="muted" style="font-weight:400">· pinned</span>' : ''), `<span class="muted">${x.mins ? x.mins + ' min' : 'Set drive time'}</span>${I.chev}`, 'editPlace', `data-id="${x.id}"`)).join('')}
    ${row('➕', '<span class="accent">Add a place</span>', '', 'addPlace')}
    <div class="pad" style="padding-bottom:6px"><div class="muted" style="font-size:13px;margin-bottom:8px">Before-work checklist (comma separated)</div><input class="input" data-change="kit" value="${esc(S.kit || '')}" placeholder="Badge, Water bottle, Lunch"></div>
    <div class="pad muted" style="font-size:13px;padding-top:4px">Pay weeks run Sunday to Saturday, with time and a half past 40 hours. Unpaid break comes off shifts of 6 hours or more. Pick any one payday and Dash counts every two weeks from it. Set “Taxes withheld” from a real pay stub to see take-home.</div>
  </div>

  <div class="settings-label">Bills</div>
  <div class="list">
    ${(S.bills || []).map(b => row(b.emoji || '🧾', esc(b.name), `<span class="v">${b.amount ? '$' + esc(b.amount) + ' · ' : ''}day ${b.day}${I.chev}</span>`, 'editBill', `data-id="${b.id}"`)).join('')}
    ${row('➕', '<span class="accent">Add a bill or subscription</span>', '', 'addBill')}
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
const VIEWS = { home: viewHome, tasks: viewTasks, habits: viewHabits, money: viewMoney, notes: viewNotes, settings: viewSettings };
const SET_ICON = { 'Notifications': '🔔', 'Account': '👤', 'Cloud sync': '☁️', 'Profile': '👋', 'Appearance': '🎨', 'Home screen': '🏠', 'Home widgets': '🧩', 'Work schedule': '💼', 'Work & pay': '💵',
  'Bills': '🧾', 'Weather': '🌤️', 'Focus & water': '⏱️', 'Quick links': '🔗', 'Countdowns': '⏳', 'Your data': '📦' };
const setOpen = new Set();
// Settings is a menu: each group's heading opens and closes its list.
function tidySettings(root) {
  $$('.settings-label', root).forEach(el => {
    const name = el.textContent.trim();
    el.dataset.a = 'setToggle'; el.dataset.name = name; el.setAttribute('role', 'button');
    el.innerHTML = `<span class="ic">${SET_ICON[name] || '⚙️'}</span><span>${esc(name)}</span>${I.chev}`;
    el.classList.toggle('shut', !setOpen.has(name));
  });
}
function render(animate = false) {
  const v = $('#view');
  const y = scrollY;
  v.innerHTML = (VIEWS[S.tab] || viewHome)();
  if (S.tab === 'settings') tidySettings(v);
  if (animate) { v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter'); scrollTo(0, 0); }
  else scrollTo(0, y);
  renderTabs(); loadWidgets();
}
function renderTabs() {
  const due = todayTasks().open.length;
  const tab = (k, label, icon, badge = 0) => `<button class="tab ${S.tab === k ? 'on' : ''}" data-a="tab" data-tab="${k}" aria-label="${label}">${icon}<span>${label}</span>${badge ? `<span class="badge">${badge}</span>` : ''}</button>`;
  $('#tabs').innerHTML = tab('home', 'Home', I.home) + tab('tasks', 'Tasks', I.tasks, due) +
    `<button class="fab" data-a="quickAdd" aria-label="Quick add">${I.plus}</button>` +
    tab('habits', 'Habits', I.flame) + tab('money', 'Money', I.card) + tab('notes', 'Notes', I.note);
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
  const [item] = list.splice(i, 1); tombstone(id); save(); closeSheet(); render();
  toast(`${label} deleted`, () => { delete S._deleted[id]; S[listName].splice(i, 0, item); save(); render(); });
}

/* ---------- sheet forms ---------- */
function taskSheet(t) {
  const isNew = !t || !t.id;
  t = t || { text: '', due: S.taskFilter === 'today' || S.tab === 'home' ? dkey() : '', priority: 0, tag: S.tab === 'tasks' ? S.tagFilter : '' };
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
    <label class="label">Tag</label>
    <div class="chips" data-group="tag">
      ${['', ...(S.tags || [])].map(v => `<button type="button" class="chip ${(t.tag || '') === v ? 'on' : ''}" data-a="pickChip" data-v="${esc(v)}">${v ? esc(v) : 'None'}</button>`).join('')}
    </div>
    <input type="hidden" name="tag" value="${esc(t.tag || '')}">
    <label class="label">Repeat</label>
    <div class="chips" data-group="repeat">
      ${[['', 'Never'], ...Object.entries(REPEATS)].map(([v, l]) => `<button type="button" class="chip ${(t.repeat || '') === v ? 'on' : ''}" data-a="pickChip" data-v="${v}">${l}</button>`).join('')}
    </div>
    <input type="hidden" name="repeat" value="${t.repeat || ''}">
    <div class="btn-row">
      <button class="btn">${isNew ? 'Add task' : 'Save'}</button>
      ${isNew ? '' : `<button type="button" class="btn danger" data-a="deleteTask" data-id="${t.id}">Delete task</button>`}
    </div>
  </form>`, { onMount: el => isNew && setTimeout(() => $('[name=text]', el).focus(), 350) });
}

function habitSheet(h) {
  const isNew = !h; h = h || { name: '', emoji: HABIT_EMOJI[0], when: 'any', target: 1 };
  openSheet(`
  <form data-form="habit" data-id="${h.id || ''}" autocomplete="off">
    <div class="sheet-title">${isNew ? 'New habit' : 'Edit habit'}</div>
    <input class="input lg" name="name" value="${esc(h.name)}" placeholder="e.g. Meditate 10 min" required>
    <label class="label">When</label>
    <div class="chips" data-group="when">${Object.entries(WHEN).map(([k, [l, ic]]) => `<button type="button" class="chip ${(h.when || 'any') === k ? 'on' : ''}" data-a="pickChip" data-v="${k}">${ic} ${l}</button>`).join('')}</div>
    <input type="hidden" name="when" value="${h.when || 'any'}">
    <label class="label">How often</label>
    <div class="chips" data-group="freq">${[['d', 'Every day'], ...[1, 2, 3, 4, 5, 6].map(n => ['w' + n, n + '× a week'])].map(([v, l]) => `<button type="button" class="chip ${(isWeekly(h) ? 'w' + weekGoal(h) : 'd') === v ? 'on' : ''}" data-a="pickChip" data-v="${v}">${l}</button>`).join('')}</div>
    <input type="hidden" name="freq" value="${isWeekly(h) ? 'w' + weekGoal(h) : 'd'}">
    <label class="label">Times per day</label>
    <div class="chips" data-group="target">${[1, 2, 3, 4].map(n => `<button type="button" class="chip ${hTarget(h) === n ? 'on' : ''}" data-a="pickChip" data-v="${n}">${n}×</button>`).join('')}</div>
    <input type="hidden" name="target" value="${hTarget(h)}">
    <label class="label">Remind me at</label>
    <div class="quick-add"><input class="input" type="time" name="remind" value="${esc(h.remind || '')}"><button type="button" class="chip" data-a="clearRemind" style="flex:none">No reminder</button></div>
    <label class="label">Icon</label>${emojiPicker(HABIT_EMOJI, h.emoji)}
    <div class="btn-row"><button class="btn">${isNew ? 'Create habit' : 'Save'}</button></div>
  </form>`, { onMount: el => isNew && setTimeout(() => $('[name=name]', el).focus(), 350) });
}

function habitDetail(h) {
  const end = new Date(), weeks = 17;
  const start = addDays(end, -((weeks - 1) * 7 + end.getDay()));
  const cells = []; for (let d = start; dkey(d) <= dkey(end); d = addDays(d, 1)) { const k = dkey(d); cells.push(`<i class="${hDone(h, k) ? 'on' : hCount(h, k) ? 'part' : ''} ${k === dkey() ? 't' : ''}" title="${k}"></i>`); }
  openSheet(`
    <div class="habit-top" style="margin-bottom:16px"><div class="habit-emoji" style="width:52px;height:52px;font-size:26px">${h.emoji}</div>
      <div><div class="sheet-title" style="margin:0">${esc(h.name)}</div><div class="habit-sub">${isWeekly(h) ? `${weekGoal(h)}× a week · ` : ''}Since ${Object.keys(h.log).sort()[0] ? fmtDate(Object.keys(h.log).sort()[0]) : 'today'} · best ${bestStreak(h)}${isWeekly(h) ? ' wk' : ''}</div></div></div>
    <div class="stat-grid">
      <div class="stat"><small>Strength</small><b>${strength(h)}%</b></div>
      <div class="stat"><small>Streak</small><b>${streak(h)}${isWeekly(h) ? ' wk' : ''} 🔥</b></div>
      <div class="stat"><small>${isWeekly(h) ? 'This week' : '30 days'}</small><b>${isWeekly(h) ? `${weekDone(h)}/${weekGoal(h)}` : rate(h) + '%'}</b></div>
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
      if (!isNew && !n.title.trim() && !n.body.trim()) { S.notes = S.notes.filter(x => x.id !== n.id); tombstone(n.id); }
      save(); if (S.tab === 'notes') setTimeout(() => render(), 0);
    },
  });
}

function shiftSheet(x) {
  const isNew = !x || !x.id; x = x || { start: `${dkey()}T09:00`, end: `${dkey()}T17:00` };
  openSheet(`
  <form data-form="shift" data-id="${x.id || ''}" autocomplete="off">
    <div class="sheet-title">${isNew ? 'Add a shift' : 'Edit shift'}</div>
    <label class="label" style="margin-top:0">Day</label>
    <input class="input" type="date" name="day" value="${x.start.slice(0, 10)}" required>
    <div class="grid2" style="margin-top:10px">
      <div><label class="label" style="margin-top:6px">Starts</label><input class="input" type="time" name="from" value="${x.start.slice(11, 16)}" required></div>
      <div><label class="label" style="margin-top:6px">Ends</label><input class="input" type="time" name="to" value="${x.end.slice(11, 16)}" required></div>
    </div>
    <p class="muted" style="font-size:13px;margin-top:12px">For shifts your calendar doesn’t show yet. If the calendar later has a shift that day, Dash uses the calendar’s.</p>
    <div class="btn-row"><button class="btn">${isNew ? 'Add shift' : 'Save'}</button>
      ${isNew ? '' : `<button type="button" class="btn danger" data-a="deleteShift" data-id="${x.id}">Delete shift</button>`}</div>
  </form>`);
}

function billSheet(b) {
  const isNew = !b; b = b || { name: '', amount: '', day: new Date().getDate(), emoji: '🧾' };
  openSheet(`
  <form data-form="bill" data-id="${b.id || ''}" autocomplete="off">
    <div class="sheet-title">${isNew ? 'New bill' : 'Edit bill'}</div>
    <input class="input lg" name="name" value="${esc(b.name)}" placeholder="Phone, rent, Spotify…" required maxlength="30">
    <div class="grid2" style="margin-top:10px">
      <div><label class="label" style="margin-top:6px">Amount ($)</label><input class="input" name="amount" type="number" inputmode="decimal" min="0" step="0.01" value="${esc(b.amount)}" placeholder="Optional"></div>
      <div><label class="label" style="margin-top:6px">Due day of month</label><input class="input" name="day" type="number" inputmode="numeric" min="1" max="31" value="${b.day}" required></div>
    </div>
    <label class="label">Icon</label>${emojiPicker(['🧾', '📱', '🏠', '🚗', '⛽', '💳', '🎵', '📺', '🎮', '🛡️', '💪', '☁️', '🎓', '⚡', '🌐', '🍎'], b.emoji)}
    <div class="btn-row"><button class="btn">${isNew ? 'Add bill' : 'Save'}</button>
      ${isNew ? '' : `<button type="button" class="btn danger" data-a="deleteBill" data-id="${b.id}">Delete bill</button>`}</div>
  </form>`, { onMount: el => isNew && setTimeout(() => $('[name=name]', el).focus(), 350) });
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
    <button data-a="addBill"><span>🧾</span>Bill</button>
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
  setMood: el => {
    const t = dkey(), v = +el.dataset.v;
    if (S.moods[t] === v) delete S.moods[t]; else { S.moods[t] = v; navigator.vibrate?.(10); }
    save(); render();
  },

  toggleTask: el => toggleTask(el.dataset.id),
  editTask: el => taskSheet(byId('tasks', el.dataset.id)),
  deleteTask: el => removeWithUndo('tasks', el.dataset.id, 'Task'),
  taskFilter: el => { S.taskFilter = el.dataset.f; save(); render(); },
  clearDone: () => {
    const before = S.tasks, gone = S.tasks.filter(x => x.done);
    gone.forEach(x => tombstone(x.id)); S.tasks = S.tasks.filter(x => !x.done); save(); render();
    toast('Cleared completed', () => { gone.forEach(x => delete S._deleted[x.id]); S.tasks = before; save(); render(); });
  },

  toggleHabit: el => {
    const h = byId('habits', el.dataset.id), k = el.dataset.day; if (!h) return;
    const done = bumpHabit(h, k); if (hCount(h, k)) navigator.vibrate?.(10);
    save(); el.classList.toggle('on', done);
    const left = S.habits.filter(x => !hOk(x)).length;
    if (done && k === dkey() && !left && S.habits.length > 1) toast('Every habit done today 🎉');
    setTimeout(() => render(), 200);
  },
  addIdea: el => {
    const [emoji, name, when, target, wk] = HABIT_IDEAS[+el.dataset.i];
    S.habits.push({ id: uid(), name, emoji, when, target, ...(wk ? { per: 'week', weekGoal: wk } : {}), log: {} }); save(); render(); toast(`Added ${emoji} ${name}`);
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
  openCal: el => calendarSheet(el.dataset.k || dkey()),
  calNav: el => calShift(+el.dataset.n),
  calPick: el => { calView.sel = el.dataset.k; calView.ym = calView.sel.slice(0, 7); calRedraw(); },
  calToday: () => { calView.sel = dkey(); calView.ym = calView.sel.slice(0, 7); calRedraw(); },
  calAddShift: () => shiftSheet({ start: `${calView.sel}T09:00`, end: `${calView.sel}T17:00` }),
  calAddTask: () => taskSheet({ text: '', due: calView.sel, priority: 0, tag: '' }),
  addPlace: () => placeSheet(),
  editPlace: el => placeSheet(allPlaces().find(x => x.id === el.dataset.id)),
  deletePlace: el => { const id = el.dataset.id; if (S.from === id) S.from = 'home'; closeSheet(); removeWithUndo('places', id, 'Place'); },
  unpinPlace: el => { setPlaceLL(el.dataset.id, null); save(); closeSheet(); render(); toast('Pin removed'); },
  setFrom: el => { S.from = el.dataset.id; save(); render(); },
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
  enableSync: () => enableSync(),
  googleSignIn: () => googleSignIn(),
  githubSignIn: () => githubSignIn(),
  ghOpen: async el => {
    try { await navigator.clipboard.writeText(el.dataset.code); toast('Code copied'); } catch { }
    window.open('https://github.com/login/device', '_blank', 'noopener');
  },
  signOut: () => {
    if (!confirm('Sign out on this device? Your data stays here and in your account.')) return;
    SY = {}; saveSY(); syncStatus = 'off'; CAL = {}; render(); toast('Signed out');
  },
  copyVal: async el => { try { await navigator.clipboard.writeText(el.dataset.v); toast('Copied'); } catch { prompt('Copy this:', el.dataset.v); } },
  updateShifts: async () => {
    if (S.calUrl) return loadCal(true);
    if (!SY.vault) { await enableSync(); if (!SY.vault || syncStatus !== 'ok') return toast('Couldn’t turn on sync — try again'); }
    CAL.ts = 0; runShortcut();
  },
  setWorkCal: el => { S.workCal = el.dataset.v; save(); logShifts(); render(); },
  kitToggle: el => {
    const t = dkey(), v = el.dataset.v, cur = S.kitDone && S.kitDone.date === t ? S.kitDone.items : [];
    S.kitDone = { date: t, items: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v] }; save(); render();
  },
  openPay: () => { payMonth = 0; paySheet(); },
  payNav: el => { payMonth += +el.dataset.n; const y = $('.sheet')?.scrollTop || 0; paySheet(); const sh = $('.sheet'); if (sh) { sh.style.transition = 'none'; sh.scrollTop = y; requestAnimationFrame(() => sh.style.transition = ''); } },
  openSearch: () => searchSheet(),
  clearRemind: el => { const i = el.closest('form')?.elements.remind; if (i) i.value = ''; },
  pushOn: () => enablePush(),
  pushOff: () => disablePush(),
  pushTest: async () => { try { const r = await pushCall({ action: 'test', vault: SY.vault }); toast(r.sent ? 'Test sent — it should arrive in a few seconds' : 'No device is signed up yet'); } catch { toast('Couldn’t send the test'); } },
  editBudgets: () => budgetSheet(),
  // Category chips sit outside the form, so set the form's hidden field directly. Tap again to go back to auto.
  pickCat: el => {
    const f = el.closest('section')?.querySelector('form[data-form=spend]'); if (!f) return;
    const on = !el.classList.contains('on');
    $$('.chip', el.parentElement).forEach(c => c.classList.toggle('on', on && c === el));
    f.elements.cat.value = on ? el.dataset.v : '';
  },
  setToggle: el => { const n = el.dataset.name; setOpen.has(n) ? setOpen.delete(n) : setOpen.add(n); el.classList.toggle('shut', !setOpen.has(n)); },
  tagFilter: el => { S.tagFilter = el.dataset.v; persist(); render(); },
  weeklyReview: () => weeklyReview(),
  customizeHome: () => customizeSheet(),
  secToggle: el => {
    const L = layout(), id = el.dataset.id; L.collapsed = L.collapsed.includes(id) ? L.collapsed.filter(x => x !== id) : [...L.collapsed, id];
    save(); render();
  },
  secMove: el => {
    const L = layout(), order = sectionOrder().map(x => x[0]), i = order.indexOf(el.dataset.id), j = i + +el.dataset.n; if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]]; L.sections = order; save();
    const y = $('.sheet')?.scrollTop || 0; customizeSheet(); const sh = $('.sheet'); if (sh) sh.scrollTop = y;
  },
  layReset: () => { S.layout = LAYOUT_DEFAULT(); save(); customizeSheet(); },
  delSpend: el => removeWithUndo('spend', el.dataset.id, 'Expense'),
  addShift: () => shiftSheet(),
  editShift: el => shiftSheet(byId('xShifts', el.dataset.id)),
  deleteShift: el => { unlogShift(byId('xShifts', el.dataset.id)); removeWithUndo('xShifts', el.dataset.id, 'Shift'); logShifts(); render(); },
  addBill: () => billSheet(),
  editBill: el => billSheet(byId('bills', el.dataset.id)),
  deleteBill: el => removeWithUndo('bills', el.dataset.id, 'Bill'),
  payBill: el => {
    const id = el.dataset.id, prev = (S.billPaid || {})[id];
    S.billPaid = { ...(S.billPaid || {}), [id]: el.dataset.ym }; save(); render();
    toast('Marked paid', () => { if (prev) S.billPaid[id] = prev; else delete S.billPaid[id]; save(); render(); });
  },
  disableSync: () => {
    if (!confirm('Stop syncing on this device? Your data stays here and in the cloud.')) return;
    SY = {}; saveSY(); syncStatus = 'off'; render(); toast('Sync turned off here');
  },
  resetAll: () => {
    if (!confirm('Erase all tasks, habits, notes and settings on this device? This can’t be undone.')) return;
    localStorage.removeItem(KEY); localStorage.removeItem('dash.weather'); S = DEFAULTS(); W = {}; save(); applyTheme(); render(true); toast('Fresh start');
  },
};

const FORMS = {
  budgets: f => {
    const B = {}; SPEND_CATS.forEach(([c]) => { const v = +f.elements[c].value; if (v > 0) B[c] = Math.round(v); });
    S.budgets = B; save(); closeSheet(); render(); toast('Budgets saved');
  },
  spend: f => {
    const amt = +f.elements.amt.value; if (!(amt > 0)) return;
    const cutoff = Date.now() - 120 * 864e5;
    const note = f.elements.note.value.trim(), cat = f.elements.cat.value || guessCat(note);
    S.spend = [...(S.spend || []).filter(x => x.ts > cutoff), { id: uid(), amt: +amt.toFixed(2), note, cat, ts: Date.now() }];
    save(); render(); toast(`Logged $${amt.toFixed(2)} · ${catIcon(cat)} ${cat}`);
  },
  shift: f => {
    const d = Object.fromEntries(new FormData(f)), id = f.dataset.id;
    if (!d.day || !d.from || !d.to) return;
    // An end time at or before the start means the shift runs past midnight.
    const endDay = d.to <= d.from ? dkey(addDays(parseKey(d.day), 1)) : d.day;
    const v = { start: `${d.day}T${d.from}`, end: `${endDay}T${d.to}` };
    S.xShifts = S.xShifts || [];
    if (id) { unlogShift(byId('xShifts', id)); Object.assign(byId('xShifts', id), v); } else S.xShifts.push({ id: uid(), ...v });
    save(); logShifts(); closeSheet(); render();
  },
  bill: f => {
    const d = Object.fromEntries(new FormData(f)), id = f.dataset.id;
    const v = { name: d.name.trim(), amount: d.amount ? String(+d.amount) : '', day: Math.max(1, Math.min(31, +d.day || 1)), emoji: d.emoji || '🧾' };
    S.bills = S.bills || [];
    if (id) Object.assign(byId('bills', id), v);
    else {
      const nb = { id: uid(), ...v }; S.bills.push(nb);
      // A new bill whose day already passed this month starts counting from next month.
      const due = billDue(nb); if (due.days < 0) S.billPaid = { ...(S.billPaid || {}), [nb.id]: due.ym };
    }
    save(); closeSheet(); render();
  },
  joinSync: f => joinSync(f.elements.code.value),
  quickTask: f => { addTask(f.elements.text.value, S.taskFilter === 'today' ? dkey() : ''); render(); $('#qt')?.focus(); },
  quick: f => { const v = f.elements.text.value; if (!v.trim()) return; addTask(v, dkey()); closeSheet(); render(); toast('Task added'); },
  task: f => {
    const d = Object.fromEntries(new FormData(f)), id = f.dataset.id;
    if (!d.text.trim()) return;
    const due = d.repeat && !d.due ? dkey() : d.due;
    if (id) Object.assign(byId('tasks', id), { text: d.text.trim(), due, priority: +d.priority, repeat: d.repeat, tag: d.tag });
    else S.tasks.push({ id: uid(), text: d.text.trim(), done: false, due, priority: +d.priority, repeat: d.repeat, tag: d.tag, created: Date.now() });
    save(); closeSheet(); render();
  },
  habit: f => {
    const d = Object.fromEntries(new FormData(f)), id = f.dataset.id;
    const wk = /^w[1-6]$/.test(d.freq || '');
    const v = { name: d.name.trim(), emoji: d.emoji || '✅', when: d.when, target: +d.target || 1, per: wk ? 'week' : 'day', weekGoal: wk ? +d.freq.slice(1) : undefined, remind: d.remind || '' };
    if (id) Object.assign(byId('habits', id), v); else S.habits.push({ id: uid(), ...v, log: {} });
    save(); closeSheet(); render();
  },
  link: f => {
    const d = Object.fromEntries(new FormData(f)), id = f.dataset.id;
    let url = d.url.trim(); if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = 'https://' + url;
    const v = { title: d.title.trim(), url, emoji: d.emoji };
    if (id) Object.assign(byId('links', id), v); else S.links.push({ id: uid(), ...v });
    save(); closeSheet(); render();
  },
  place: f => {
    const d = Object.fromEntries(new FormData(f)), mins = Math.max(0, Math.min(240, +d.mins || 0));
    let id = f.dataset.id;
    if (id === 'home') S.commute = mins;
    else if (id) Object.assign(byId('places', id), { name: d.name.trim(), icon: d.emoji || '📍', mins });
    else { id = 'pl-' + uid(); (S.places = S.places || []).push({ id, name: d.name.trim(), icon: d.emoji || '📍', mins }); }
    save(); closeSheet(); render();
    if (d.pin) {
      if (!navigator.geolocation) return toast('Location isn’t available here');
      toast('Finding you…');
      navigator.geolocation.getCurrentPosition(pos => {
        setPlaceLL(id, { lat: +pos.coords.latitude.toFixed(4), lon: +pos.coords.longitude.toFixed(4) }); save(); render(); toast('Pinned here');
      }, () => toast('Location blocked — allow it for Dash to pin'), { timeout: 12000 });
    }
  },
  countdown: f => {
    const d = Object.fromEntries(new FormData(f)), id = f.dataset.id;
    const v = { title: d.title.trim(), date: d.date, emoji: d.emoji || '⏳', yearly: !!d.yearly };
    if (id) Object.assign(byId('countdowns', id), v); else S.countdowns.push({ id: uid(), ...v });
    save(); closeSheet(); render();
  },
};

const INPUTS = {
  globalSearch: el => { const box = $('#gs'); if (box) box.innerHTML = searchResults(el.value); },
  intention: el => { S.intention = { date: dkey(), text: el.value }; save(); },
  noteSearch: el => { noteQuery = el.value; $('#notes-list').innerHTML = notesList(); },
  city: el => citySearch(el.value),
  pickDate: el => {
    const g = el.closest('[data-group]'); el.closest('form').elements.due.value = el.value;
    $$('.chip', g).forEach(c => c.tagName === 'BUTTON' && c.classList.toggle('on', c.dataset.v === el.value));
  },
};
const CHANGES = {
  ntf: el => { S.notify = { ...S.notify, [el.dataset.k]: el.checked }; save(); },
  ntfTime: el => { if (el.value) { S.notify = { ...S.notify, [el.dataset.k]: el.value }; save(); } },
  ntfLead: el => { S.notify = { ...S.notify, lead: Math.max(0, Math.min(120, +el.value || 0)) }; save(); },
  layToggle: el => {
    const L = layout(), hidden = new Set(L.hidden); el.checked ? hidden.delete(el.dataset.id) : hidden.add(el.dataset.id);
    L.hidden = [...hidden]; save();
    el.closest('.row').querySelector('.row-title').style.opacity = el.checked ? '' : '.45';
  },
  rate: el => { S.rate = Math.max(0, +el.value || 0); save(); },
  job: el => { S.job = el.value.trim().slice(0, 30); save(); },
  taxPct: el => { S.taxPct = Math.max(0, Math.min(60, +el.value || 0)); save(); },
  unpaidBreak: el => { S.unpaidBreak = Math.max(0, Math.min(120, +el.value || 0)); save(); },
  commute: el => { S.commute = Math.max(0, Math.min(180, +el.value || 0)); save(); },
  early: el => { S.early = Math.max(0, Math.min(60, +el.value || 0)); save(); },
  workAddr: el => { S.workAddr = el.value.trim(); save(); },
  payday: el => { S.payday = el.value; save(); },
  kit: el => { S.kit = el.value.split(',').map(x => x.trim()).filter(Boolean).join(', '); el.value = S.kit; save(); },
  wNba: el => { S.widgets.nba = el.checked; save(); },
  wAnime: el => { S.widgets.anime = el.checked; save(); },
  team: el => { S.team = el.value; save(); },
  stocks: el => { S.stocks = el.value; S.stocks = stockList().join(', '); el.value = S.stocks; save(); },
  calUrl: el => {
    const v = el.value.trim();
    if (v && !/^(https|webcal):\/\//i.test(v)) return toast('That doesn’t look like a calendar link');
    S.calUrl = v; save(); CAL = {}; try { localStorage.removeItem('dash.cal'); } catch { }
    if (v) loadCal(true).then(() => S.tab === 'settings' && render()); else render();
  },
  name: el => { S.name = el.value.trim().slice(0, 24); save(); },
  focusMin: el => { S.focus.focusMin = Math.max(1, Math.min(180, +el.value || 25)); if (!S.focus.running && S.focus.mode === 'focus') S.focus.remaining = focusLen('focus'); save(); },
  breakMin: el => { S.focus.breakMin = Math.max(1, Math.min(60, +el.value || 5)); if (!S.focus.running && S.focus.mode === 'break') S.focus.remaining = focusLen('break'); save(); },
  waterGoal: el => { S.waterGoal = Math.max(1, Math.min(20, +el.value || 8)); save(); },
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el) return;
  if (Date.now() - swipeEndedAt < 350 && el.closest('.swipe')) return;
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
  if (ghPoll) pollGithub();
  if (!S.calUrl && SY.vault) { CAL.ts = 0; loadCal().then(() => S.tab === 'settings' && softRender()); }
  loadWeather(); syncNow(); autoFrom();
});
addEventListener('online', syncNow);
setInterval(() => document.visibilityState === 'visible' && (syncNow(), loadWidgets()), 60e3);

/* =========================================================
   BOOT
   ========================================================= */
if (S.tab === 'settings') S.tab = 'home';
if (S.focus.running && focusLeft() <= 0) focusComplete(true);
applyTheme();
logShifts();
render(true);
queueReminders(6000);
setTimeout(autoFrom, 1500);
loadWeather();
syncNow();
// Returning from Google sign-in: the ID token arrives in the URL fragment.
if (location.hash.includes('id_token=') || location.hash.includes('error=')) {
  const h = new URLSearchParams(location.hash.slice(1));
  history.replaceState(null, '', location.pathname);
  if (h.get('id_token')) finishGoogle(h.get('id_token')); else toast('Google sign-in was cancelled');
}
// Home-screen shortcuts: ?add=task / ?add=note
const addParam = new URLSearchParams(location.search).get('add');
if (addParam) { history.replaceState(null, '', location.pathname); setTimeout(() => addParam === 'note' ? noteSheet() : quickAddSheet(), 350); }
setInterval(() => loadWeather(), 15 * 60e3);
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
}
