// Palvelutyöntekijä: tallentaa sovelluksen tiedostot puhelimeen, jotta se toimii ilman nettiä.
// Kun muutat koodia, kasvata versionumeroa, niin puhelin hakee uudet tiedostot.
const CACHE = 'treeni-v2';
const FILES = ['./', './index.html', './style.css', './app.js', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

// Verkko ensin, välimuisti varalla: uusin versio tulee aina kun netti on päällä
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request))
  );
});
