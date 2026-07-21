/* Türkçe Quiz SW v21 — мережа перш за все; помилки НЕ кешуються */
const CACHE = 'tq-cache-v21';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* кешуємо лише успішні (ok) відповіді того ж походження — 404 не отруїть кеш */
function cachePut(req, res) {
  if (res && res.ok && req.url.startsWith(self.location.origin)) {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(req, copy));
  }
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  /* HTML — завжди свіжий з мережі, кеш лише як запасний аеродром */
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(
      fetch(req).then(res => cachePut(req, res)).catch(() => caches.match(req))
    );
    return;
  }

  /* CSS та JS — мережа перш за все (щоб оновлення долітали одразу), кеш — запасний */
  if (req.destination === 'style' || req.destination === 'script') {
    e.respondWith(
      fetch(req).then(res => cachePut(req, res)).catch(() => caches.match(req))
    );
    return;
  }

  /* решта (фото, шрифти) — кеш перш за все */
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => cachePut(req, res)))
  );
});
