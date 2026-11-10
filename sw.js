// Bump VERSION whenever you deploy changes so phones pick up the new files.
const VERSION = 'dash-v18';
const ASSETS = [
  './', './index.html', './styles.css', './app.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/favicon-32.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Same-origin: stale-while-revalidate (instant load, updates in background).
// Cross-origin (weather API): network only, the app keeps its own cache.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(VERSION).then(async cache => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const network = fetch(req).then(res => {
        if (res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});

// ---- Push notifications ----
// The server sends an empty push; we ask it what to show for this device, then show it.
const PUSH_FN = 'https://cwlpoykayfrpohfvzrfm.supabase.co/functions/v1/dash-push';
const PUSH_KEY = 'sb_publishable_HNY1baadiiTnSl7CLRFxyg_i_RmTiYB'; // public by design
self.addEventListener('push', e => {
  e.waitUntil((async () => {
    let items = [];
    try {
      const sub = await self.registration.pushManager.getSubscription();
      const r = await fetch(PUSH_FN, {
        method: 'POST', headers: { 'Content-Type': 'application/json', apikey: PUSH_KEY, Authorization: `Bearer ${PUSH_KEY}` },
        body: JSON.stringify({ action: 'pending', endpoint: sub && sub.endpoint }),
      });
      items = (await r.json()).items || [];
    } catch { }
    // A push must always show something, or the phone may stop delivering them.
    if (!items.length) items = [{ title: 'Dash', body: 'You have a reminder.', tag: 'dash' }];
    await Promise.all(items.map(i => self.registration.showNotification(i.title || 'Dash', {
      body: i.body || '', tag: i.tag || undefined, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png',
    })));
  })());
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => (cs[0] ? cs[0].focus() : self.clients.openWindow('./'))));
});
