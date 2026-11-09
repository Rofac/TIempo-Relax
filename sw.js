/* Guarda la app en el celular para que abra sin internet. Al cambiar VERSION se actualiza. */
const VERSION = 'est-1.0.2';
const ARCHIVOS = ['./', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/util.js', 'js/db.js', 'js/lic.js', 'js/ui.js', 'js/negocio.js', 'js/cobros.js', 'js/agenda.js', 'js/clientas.js', 'js/inicio.js', 'js/caja.js', 'js/config.js', 'js/legal.js', 'js/main.js',
  'img/logo.png', 'img/logo-recibo.png', 'img/favicon.png', 'img/icono-192.png', 'img/icono-512.png', 'img/icono-maskable.png', 'img/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting())); });
/* sólo se borran las versiones viejas DE ESTA APP (las otras apps de rofac.github.io comparten el mismo lugar) */
const PREFIJO = VERSION.split('-')[0] + '-';
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith(PREFIJO) && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
/* si no está guardado y la señal es mala, no se queda colgada esperando: a los 8 segundos usa lo que haya */
const conTiempo = (p, ms) => Promise.race([p, new Promise(ok => setTimeout(() => ok(null), ms))]);
/* primero lo guardado (abre al instante y sin internet); si hay internet, se actualiza de fondo para la próxima vez */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(async c => {
    const g = await c.match(e.request, { ignoreSearch: true });
    const red = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => null);
    if (g) return g;
    const r = await conTiempo(red, 8000);
    return r || (await c.match('index.html')) || (await red) || Response.error();
  }));
});
