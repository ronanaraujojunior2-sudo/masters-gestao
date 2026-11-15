/* MASTERS GESTÃO - service worker.
   Regra principal: NUNCA manter versão antiga. Arquivos do próprio sistema são sempre conferidos na internet primeiro
   (com revalidação, ignorando o cache do navegador); a cópia guardada só é usada se a internet falhar.
   Dados do Supabase NÃO passam por aqui: não são guardados no aparelho (nada de dados de usuários no cache). */
const CACHE = 'masters-pwa-v1';
const BASICO = ['./', 'index.html', 'manifest.json', 'assets/logo.png', 'icons/icon-192.png', 'icons/apple-touch-icon.png'];
const ESPERA = 8000;

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(BASICO.map(async u => { try { const r = await fetch(u, { cache: 'reload' }); if (r.ok) await c.put(u, r); } catch (x) { } }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin === self.location.origin) { e.respondWith(redePrimeiro(req)); return; }
  if (u.hostname === 'cdn.jsdelivr.net' && /@\d/.test(u.pathname)) { e.respondWith(copiaPrimeiro(req)); return; }
});

async function redePrimeiro(req) {
  const c = await caches.open(CACHE);
  const chave = req.mode === 'navigate' ? './' : req.url;
  try {
    const r = await Promise.race([
      fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }),
      new Promise((_, no) => setTimeout(() => no(new Error('lento')), ESPERA))
    ]);
    if (r && r.status === 200 && r.type === 'basic') c.put(chave, r.clone());
    return r;
  } catch (err) {
    const g = await c.match(chave, { ignoreSearch: true }) || (req.mode === 'navigate' ? await c.match('index.html') : null);
    if (g) return g;
    try { return await fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }); } catch (x) { return Response.error(); }
  }
}

async function copiaPrimeiro(req) {
  const c = await caches.open(CACHE);
  const g = await c.match(req);
  if (g) return g;
  try { const r = await fetch(req); if (r && (r.status === 200 || r.type === 'opaque')) c.put(req, r.clone()); return r; } catch (x) { return Response.error(); }
}
