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
const HABIT_EMOJI = ['💊', '🚿', '🦷', '💪', '📚', '🧘', '🏃', '🥗', '😴', '🧴', '🛏️', '💻', '🚶', '🧹', '✍️', '📵', '🧠', '🌱', '☀️', '🎸'];
const WHEN = { am: ['Morning', '🌅'], any: ['Anytime', '☀️'], pm: ['Evening', '🌙'] };
const HABIT_IDEAS = [
  ['💊', 'Take medicine', 'am', 1], ['🚿', 'Shower', 'am', 1], ['🦷', 'Brush teeth', 'am', 2], ['🛏️', 'Make bed', 'am', 1],
  ['🧴', 'Skincare', 'pm', 1], ['💪', 'Workout', 'any', 1], ['🚶', 'Walk', 'any', 1], ['🧘', 'Meditate', 'any', 1],
  ['📖', 'Study', 'any', 1], ['💻', 'Code', 'any', 1], ['📚', 'Read', 'pm', 1], ['🥗', 'Eat a real meal', 'any', 3],
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
  widgets: { nba: true, anime: true }, team: '', calUrl: '', workCal: '', shiftLog: {}, rate: 0, unpaidBreak: 0, commute: 25, payday: '',
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
    if (raw && typeof raw === 'object') { const d = DEFAULTS(); return { ...d, ...raw, focus: { ...d.focus, ...raw.focus }, widgets: { ...d.widgets, ...raw.widgets } }; }
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
const LOCAL_ONLY = ['tab', 'taskFilter', 'hideInstall'];
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
  const d = DEFAULTS(); S = { ...d, ...data, ...keep, focus: { ...d.focus, ...data.focus }, widgets: { ...d.widgets, ...data.widgets } };
  persist();
}
// Merge for when both sides changed: union lists by id, local edits win, deletions stick.
function merge(local, remote) {
  const dead = { ...(remote._deleted || {}), ...(local._deleted || {}) };
  const out = { ...remote, ...local, _deleted: dead };
  for (const k of ['tasks', 'habits', 'notes', 'links', 'countdowns', 'bills']) {
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
  applyTheme();
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
function parseQuick(text) {
  let due = '', priority = 0, repeat = '';
  const words = text.trim().split(/\s+/), keep = [];
  for (const w of words) {
    const l = w.toLowerCase();
    if (l === '!!' || l === '!!!') priority = 2;
    else if (l === '!') priority = Math.max(priority, 1);
    else if (l === 'today' || l === 'tod') due = dkey();
    else if (l === 'tomorrow' || l === 'tmr' || l === 'tmrw') due = dkey(addDays(new Date(), 1));
    else if (REPEATS[l]) repeat = l;
    else keep.push(w);
  }
  if (repeat && !due) due = dkey();
  return { text: keep.join(' ') || text.trim(), due, priority, repeat };
}
function addTask(raw, defaultDue = '') {
  const p = parseQuick(raw);
  if (!p.text) return;
  S.tasks.push({ id: uid(), text: p.text, done: false, due: p.due || defaultDue, priority: p.priority, repeat: p.repeat, created: Date.now() });
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
  let d = new Date(); if (!hDone(h, dkey(d))) d = addDays(d, -1);
  let n = 0; while (hDone(h, dkey(d))) { n++; d = addDays(d, -1); }
  return n;
}
function bestStreak(h) {
  const keys = Object.keys(h.log).filter(k => hDone(h, k)).sort();
  let best = 0, cur = 0, prev = null;
  for (const k of keys) { cur = prev && dayDiff(parseKey(prev), parseKey(k)) === 1 ? cur + 1 : 1; best = Math.max(best, cur); prev = k; }
  return best;
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
  logShifts();
  const el = $('#work'); if (el && $('#week')) { el.outerHTML = workCard(); $('#week').outerHTML = weekCard() || '<span id="week" hidden></span>'; const p = $('#pay'); if (p) p.outerHTML = payCard(); }
  else if (S.tab === 'home' && workCard()) softRender();
}
const tm = t => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(':00', '').replace(/\s/g, ' ');
const tshort = t => { const d = new Date(t), h = d.getHours(), m = d.getMinutes(); return `${h % 12 || 12}${m ? ':' + pad(m) : ''}${h < 12 ? 'a' : 'p'}`; };
const dur = ms => { const h = ms / 36e5; return h >= 1 ? `${+h.toFixed(1)}h` : `${Math.round(ms / 6e4)}m`; };
const money = n => '$' + Math.round(n).toLocaleString();
// Work shifts currently known (today onward), limited to the chosen work calendar.
function shifts() {
  if (!calSrc() || CAL.url !== calSrc()) return [];
  const cals = S.calUrl ? [] : shiftCals(), pick = cals.includes(S.workCal);
  if (cals.length > 1 && !pick) return [];
  return (CAL.events || []).filter(e => !pick || e.cal === S.workCal);
}
const paidHours = (start, end) => { const h = (end - start) / 36e5; return Math.max(0, h - (h >= 6 ? (S.unpaidBreak || 0) / 60 : 0)); };
// Remember shifts so pay estimates still know about days that have passed.
function logShifts() {
  const now = Date.now(), log = { ...(S.shiftLog || {}) }, before = JSON.stringify(log), cutoff = now - 70 * 864e5;
  for (const k in log) if (Date.parse(k) > now || Date.parse(k) < cutoff) delete log[k];
  for (const e of shifts()) if (!e.allDay && e.end) log[new Date(e.start).toISOString()] = +((e.end - e.start) / 36e5).toFixed(2);
  if (JSON.stringify(log) !== before) { S.shiftLog = log; save(); }
}
// Paid hours between two times, from the log (past) and the live schedule (future).
function hoursBetween(from, to) {
  let h = 0;
  for (const [k, v] of Object.entries(S.shiftLog || {})) { const t = Date.parse(k); if (t >= from && t < to) h += Math.max(0, v - (v >= 6 ? (S.unpaidBreak || 0) / 60 : 0)); }
  return h;
}
const weekStart = (d = new Date()) => { const x = parseKey(dkey(d)); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x.getTime(); };
function nextPayday() {
  if (!S.payday) return null;
  const a = parseKey(S.payday), n = Math.max(0, Math.ceil(dayDiff(a, new Date()) / 14));
  return addDays(a, n * 14);
}
function hourlyAt(t) {
  const d = W.sig === locSig() && W.data; if (!d) return null;
  const x = new Date(t), i = d.hourly.time.indexOf(`${dkey(x)}T${pad(x.getHours())}:00`);
  return i < 0 ? null : { temp: Math.round(d.hourly.temperature_2m[i]), rain: d.hourly.precipitation_probability[i], icon: wmo(d.hourly.weather_code[i], d.hourly.is_day[i]).icon };
}
function workCard() {
  const src = calSrc(), mine = CAL.url === src;
  if (!src || (!S.calUrl && !(mine && CAL.at))) return '';
  const cals = S.calUrl ? [] : shiftCals();
  if (cals.length > 1 && !cals.includes(S.workCal)) return `<section class="card" id="work">${secHead('💼 Work')}
    <div class="muted" style="margin-bottom:10px">Which calendar has your shifts?</div>
    <div class="chips">${cals.map(c => `<button class="chip" data-a="setWorkCal" data-v="${esc(c)}">${esc(c)}</button>`).join('')}</div></section>`;
  const now = Date.now(), all = shifts(), evs = all.filter(e => (e.end || e.start + 36e5) > now);
  const head = secHead('💼 Work', !S.calUrl ? `<button class="link-btn" data-a="updateShifts">Update</button>` : '');
  if (!evs.length) return `<section class="card" id="work">${head}<div class="muted">${CAL.error && S.calUrl ? 'Couldn’t load your schedule from that link.' : mine ? `No shifts coming up 🎉${CAL.at && now - CAL.at > 3 * 864e5 ? ' (last update from your iPhone was ' + ago(CAL.at).toLowerCase() + ')' : ''}` : 'Loading your schedule…'}</div></section>`;
  const dayName = t => { const n = dayDiff(new Date(), new Date(t)); return n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : new Date(t).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }); };
  const range = e => e.allDay ? 'All day' : `${tm(e.start)} – ${tm(e.end || e.start)}`;
  const [n, ...rest] = evs, on = n.start <= now && !n.allDay, soon = !n.allDay && !on && n.start - now < 30 * 36e5;
  const status = n.allDay ? dayName(n.start) : on ? `On shift · ${dur(n.end - now)} left` : n.start - now < 864e5 ? `Starts in ${dur(n.start - now)}` : dayName(n.start);

  // Helpful times around the shift
  const tips = [];
  if (soon) {
    const leave = n.start - (S.commute || 0) * 6e4;
    if (S.commute) tips.push(`<span class="tip ${leave - now < 30 * 6e4 && leave > now ? 'hot' : ''}">🚗 Leave by <b>${tm(leave)}</b></span>`);
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
    <div class="shift ${on ? 'on' : ''}">
      <div class="shift-when"><b>${dayName(n.start)}</b><span>${range(n)}</span></div>
      <div class="shift-meta"><span class="pill ${on ? 'live' : ''}">${status}</span><span class="muted">${esc(n.loc || n.title || '')}${!n.allDay && n.end ? ` · ${dur(n.end - n.start)}` : ''}</span></div>
      ${on ? `<div class="progress" style="margin:12px 0 0"><i style="width:${Math.min(100, (now - n.start) / (n.end - n.start) * 100)}%"></i></div>` : ''}
    </div>
    ${tips.length ? `<div class="tips">${tips.join('')}</div>` : ''}
    ${showKit ? `<div class="kit"><small>${done.length >= kit.length ? 'Ready to go ✓' : 'Before you go'}</small><div class="chip-row" style="margin-top:6px">${kit.map(k => `<button class="habit-chip ${done.includes(k) ? 'on' : ''}" data-a="kitToggle" data-v="${esc(k)}">${done.includes(k) ? '✓ ' : ''}${esc(k)}</button>`).join('')}</div></div>` : ''}
    ${rest.length ? `<div class="shift-list">${rest.slice(0, 4).map(e => `<div class="shift-row"><b>${dayName(e.start)}</b><span>${range(e)}</span><span class="muted">${e.allDay || !e.end ? esc(e.title || '') : dur(e.end - e.start)}</span></div>`).join('')}</div>` : ''}
  </section>`;
}
// 7-day strip: shifts, days off and tasks due, at a glance.
function weekCard() {
  const all = shifts(); if (!all.length) return '';
  const days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));
  let hrs = 0, count = 0;
  const cells = days.map((d, i) => {
    const k = dkey(d), sh = all.filter(e => !e.allDay && dkey(new Date(e.start)) === k), due = S.tasks.filter(t => !t.done && t.due === k).length;
    sh.forEach(e => { hrs += ((e.end || e.start) - e.start) / 36e5; count++; });
    return `<div class="wkd ${i === 0 ? 't' : ''} ${sh.length ? 'has' : ''}"><small>${d.toLocaleDateString(undefined, { weekday: 'short' })}</small><b>${d.getDate()}</b>
      ${sh.length ? `<span class="blk">${tshort(sh[0].start)}</span><span class="blk2">${tshort(sh[sh.length - 1].end || sh[0].start)}</span>` : '<span class="off">Off</span>'}
      ${due ? `<i>${due}</i>` : ''}</div>`;
  }).join('');
  return `<section class="card" id="week">${secHead('Next 7 days', `<span class="muted" style="font-size:13px;font-weight:600">${count} shift${count === 1 ? '' : 's'} · ${+hrs.toFixed(1)}h</span>`)}<div class="wk">${cells}</div></section>`;
}
function payCard() {
  if (!S.rate) return '';
  const ws = weekStart(), wk = 7 * 864e5, h1 = hoursBetween(ws, ws + wk), h2 = hoursBetween(ws + wk, ws + 2 * wk), pd = nextPayday();
  const worked = hoursBetween(ws, Date.now());
  return `<section class="card" id="pay">${secHead('💵 Pay estimate', `<span class="muted" style="font-size:13px;font-weight:600">before taxes</span>`)}
    <div class="pay"><div><b>${money(h1 * S.rate)}</b><small>this week · ${+h1.toFixed(1)}h</small></div><div><b>${money(h2 * S.rate)}</b><small>next week · ${+h2.toFixed(1)}h</small></div></div>
    <div class="progress" style="margin:14px 0 8px"><i style="width:${h1 ? Math.min(100, worked / h1 * 100) : 0}%"></i></div>
    <div class="shift-meta" style="margin:0"><span class="muted">${money(worked * S.rate)} earned so far this week</span>${pd ? `<span class="pill" style="margin-left:auto">Payday ${dayDiff(new Date(), pd) === 0 ? 'today 🎉' : 'in ' + dayDiff(new Date(), pd) + 'd'}</span>` : ''}</div>
  </section>`;
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
const loadWidgets = () => { if (S.tab === 'home') { loadNBA(); loadAnime(); loadCal(); loadStocks(); } };

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
  const nDone = S.habits.filter(x => hDone(x, t)).length;
  const total = tt.total + S.habits.length, done = tt.done.length + nDone;
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
    <button class="icon-btn" data-a="goSettings" aria-label="Settings">${I.gear}${SY.vault ? `<span class="sync-dot" data-sync-dot="${syncStatus}"></span>` : ''}</button>
  </header>

  ${!S.hideInstall && !isStandalone() ? `<div class="banner"><span style="font-size:24px">📲</span><div><b>Add to Home Screen</b>${isIOS() ? 'Tap Share, then “Add to Home Screen”.' : 'Use your browser menu → Install app.'}</div><button class="x" data-a="hideInstall" aria-label="Dismiss">${I.x}</button></div>` : ''}

  ${weatherCard()}

  ${workCard()}
  ${weekCard() || '<span id="week" hidden></span>'}
  ${payCard()}

  <section class="card">
    <div class="today">
      <div class="ring-wrap">${ring(pct)}<div class="ring-label"><div>${Math.round(pct * 100)}%<small>today</small></div></div></div>
      <div class="today-stats">
        <div class="ts"><span class="dot"></span>Tasks<b>${tt.done.length}/${tt.total}</b></div>
        <div class="ts"><span class="dot" style="background:#ff8a3d"></span>Habits<b>${nDone}/${S.habits.length}</b></div>
        <div class="ts"><span class="dot" style="background:#4aa8ff"></span>Focus<b>${sessions} ${sessions === 1 ? 'session' : 'sessions'}</b></div>
      </div>
    </div>
    <label class="intention"><span>🎯</span><input data-input="intention" value="${esc(S.intention.text)}" placeholder="Today’s one big thing…" enterkeyhint="done"></label>
  </section>

  ${moodCard()}

  <section class="card">
    ${secHead('Up next', `<button class="link-btn" data-a="tab" data-tab="tasks">See all</button>`)}
    ${upNext.length ? `<div class="task-list">${upNext.map(taskRow).join('')}</div>`
      : `<div class="empty"><div class="big">✨</div><b>All clear</b>Nothing on your plate.</div>`}
  </section>

  ${S.habits.length ? `<section class="card">
    ${secHead('Habits', `<button class="link-btn" data-a="tab" data-tab="habits">${nDone}/${S.habits.length}</button>`)}
    <div class="chip-row">${[...S.habits].sort((a, b) => hDone(a, t) - hDone(b, t) || byWhen(a, b)).map(x => `<button class="habit-chip ${hDone(x, t) ? 'on' : ''}" data-a="toggleHabit" data-id="${x.id}" data-day="${t}"><span>${x.emoji}</span>${esc(x.name)}${hTarget(x) > 1 ? `<small>${hCount(x, t)}/${hTarget(x)}</small>` : ''}</button>`).join('')}</div>
  </section>` : ''}

  ${billsCard()}
  ${nbaCard()}
  ${animeCard()}
  ${stocksCard()}

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
    <input class="input" id="qt" name="text" placeholder="Add a task… try “gym daily !”" enterkeyhint="done">
    <button class="add-btn" aria-label="Add task">${I.plus}</button>
  </form>
  <div class="seg">${[['today', 'Today'], ['upcoming', 'Upcoming'], ['all', 'All'], ['done', 'Done']].map(([k, l]) => `<button class="${f === k ? 'on' : ''}" data-a="taskFilter" data-f="${k}">${l}</button>`).join('')}</div>
  <div>${body}</div>`;
}

function viewHabits() {
  const t = new Date(), tk = dkey();
  const week = Array.from({ length: 7 }, (_, i) => addDays(t, i - 6));
  const nDone = S.habits.filter(x => hDone(x)).length;
  let wk = 0; S.habits.forEach(h => week.forEach(d => { if (hDone(h, dkey(d))) wk++; }));
  const wkPct = S.habits.length ? Math.round(wk / (S.habits.length * 7) * 100) : 0;
  const card = h => {
    const s = streak(h), tg = hTarget(h), c = hCount(h, tk), done = c >= tg;
    return `<section class="card habit ${done ? 'is-done' : ''}">
      <div class="habit-top">
        <button class="habit-emoji" data-a="habitDetail" data-id="${h.id}" aria-label="Details">${h.emoji}</button>
        <div class="habit-info" data-a="habitDetail" data-id="${h.id}"><div class="habit-name">${esc(h.name)}</div>
          <div class="habit-sub">${s ? `🔥 ${s} day${s === 1 ? '' : 's'} · ` : ''}${rate(h)}% this month</div></div>
        <button class="habit-go ${done ? 'on' : ''}" data-a="toggleHabit" data-id="${h.id}" data-day="${tk}" aria-label="${done ? 'Undo' : 'Mark done'}">${done ? I.check : tg > 1 ? `<b>${c}/${tg}</b>` : I.check}</button>
      </div>
      <div class="week">${week.map(d => { const k = dkey(d), today = k === tk, part = hCount(h, k) > 0 && !hDone(h, k); return `<div class="wd ${today ? 'is-today' : ''}">${today ? 'Today' : d.toLocaleDateString(undefined, { weekday: 'narrow' })}
        <button class="${hDone(h, k) ? 'on' : part ? 'part' : ''}" data-a="toggleHabit" data-id="${h.id}" data-day="${k}" aria-label="${k}">${I.check}</button></div>`; }).join('')}</div>
    </section>`;
  };
  const groups = Object.entries(WHEN).map(([k, [label, icon]]) => {
    const list = S.habits.filter(h => (h.when || 'any') === k); if (!list.length) return '';
    const d = list.filter(h => hDone(h)).length;
    return `<div class="group-label">${icon} ${label} <span class="muted" style="font-weight:600">· ${d}/${list.length}</span></div>${list.map(card).join('')}`;
  }).join('');
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
    ${row('💵', 'Hourly pay ($)', `<input class="inline num" type="number" inputmode="decimal" min="0" step="0.01" data-change="rate" value="${S.rate || ''}" placeholder="0">`)}
    ${row('🥪', 'Unpaid break (min)', `<input class="inline num" type="number" inputmode="numeric" min="0" max="120" data-change="unpaidBreak" value="${S.unpaidBreak || ''}" placeholder="0">`)}
    ${row('📆', 'A payday', `<input class="inline" type="date" data-change="payday" value="${esc(S.payday || '')}" style="width:auto">`)}
    ${row('🚗', 'Commute (min)', `<input class="inline num" type="number" inputmode="numeric" min="0" max="180" data-change="commute" value="${S.commute || ''}" placeholder="0">`)}
    <div class="pad" style="padding-bottom:6px"><div class="muted" style="font-size:13px;margin-bottom:8px">Before-work checklist (comma separated)</div><input class="input" data-change="kit" value="${esc(S.kit || '')}" placeholder="Badge, Water bottle, Lunch"></div>
    <div class="pad muted" style="font-size:13px;padding-top:4px">Pay is an estimate before taxes. Unpaid break is taken off shifts of 6 hours or more. Pick any one payday and Dash counts every two weeks from it.</div>
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
const VIEWS = { home: viewHome, tasks: viewTasks, habits: viewHabits, notes: viewNotes, settings: viewSettings };
function render(animate = false) {
  const v = $('#view');
  const y = scrollY;
  v.innerHTML = (VIEWS[S.tab] || viewHome)();
  if (animate) { v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter'); scrollTo(0, 0); }
  else scrollTo(0, y);
  renderTabs(); loadWidgets();
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
  const [item] = list.splice(i, 1); tombstone(id); save(); closeSheet(); render();
  toast(`${label} deleted`, () => { delete S._deleted[id]; S[listName].splice(i, 0, item); save(); render(); });
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
    <label class="label">Times per day</label>
    <div class="chips" data-group="target">${[1, 2, 3, 4].map(n => `<button type="button" class="chip ${hTarget(h) === n ? 'on' : ''}" data-a="pickChip" data-v="${n}">${n}×</button>`).join('')}</div>
    <input type="hidden" name="target" value="${hTarget(h)}">
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
      if (!isNew && !n.title.trim() && !n.body.trim()) { S.notes = S.notes.filter(x => x.id !== n.id); tombstone(n.id); }
      save(); if (S.tab === 'notes') setTimeout(() => render(), 0);
    },
  });
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
    const left = S.habits.filter(x => !hDone(x)).length;
    if (done && k === dkey() && !left && S.habits.length > 1) toast('Every habit done today 🎉');
    setTimeout(() => render(), 200);
  },
  addIdea: el => {
    const [emoji, name, when, target] = HABIT_IDEAS[+el.dataset.i];
    S.habits.push({ id: uid(), name, emoji, when, target, log: {} }); save(); render(); toast(`Added ${emoji} ${name}`);
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
    if (id) Object.assign(byId('tasks', id), { text: d.text.trim(), due, priority: +d.priority, repeat: d.repeat });
    else S.tasks.push({ id: uid(), text: d.text.trim(), done: false, due, priority: +d.priority, repeat: d.repeat, created: Date.now() });
    save(); closeSheet(); render();
  },
  habit: f => {
    const d = Object.fromEntries(new FormData(f)), id = f.dataset.id;
    const v = { name: d.name.trim(), emoji: d.emoji || '✅', when: d.when, target: +d.target || 1 };
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
  rate: el => { S.rate = Math.max(0, +el.value || 0); save(); },
  unpaidBreak: el => { S.unpaidBreak = Math.max(0, Math.min(120, +el.value || 0)); save(); },
  commute: el => { S.commute = Math.max(0, Math.min(180, +el.value || 0)); save(); },
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
  loadWeather(); syncNow();
});
addEventListener('online', syncNow);
setInterval(() => document.visibilityState === 'visible' && (syncNow(), loadWidgets()), 60e3);

/* =========================================================
   BOOT
   ========================================================= */
if (S.tab === 'settings') S.tab = 'home';
if (S.focus.running && focusLeft() <= 0) focusComplete(true);
applyTheme();
render(true);
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
