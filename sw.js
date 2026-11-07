// Palvelutyöntekijä: tallentaa sovelluksen tiedostot puhelimeen, jotta se toimii ilman nettiä.
// Kun muutat koodia, kasvata versionumeroa, niin puhelin hakee uudet tiedostot.
const CACHE = 'treeni-v12';
const FILES = ['./', './index.html', './style.css', './app.js', './programs.js', './library.js', './manifest.json', './icon-192.png', './icon-512.png'];
const NETWORK_TIMEOUT = 2500; // ms: näin kauan verkkoa odotetaan, ennen kuin käytetään tallennettua kopiota

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

// Verkko ensin lyhyellä aikarajalla, tallennettu kopio varalla.
// - Netti hyvä: saat aina uusimman version.
// - Netti hidas tai poikki (esim. sali): kun verkko ei vastaa 2,5 sekunnissa, sovellus aukeaa tallennetusta kopiosta.
// - Hidas haku jatkuu taustalla ja päivittää kopion seuraavaa kertaa varten.
// - Vain onnistuneet vastaukset tallennetaan (ei 404-virheitä).
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const network = fetch(req).then(res => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    });
    network.catch(() => {});            // ettei myöhään epäonnistuva haku jää käsittelemättä
    e.waitUntil(network.catch(() => {})); // taustapäivitys saa valmistua

    const timeout = new Promise(resolve => setTimeout(() => resolve(null), NETWORK_TIMEOUT));
    try {
      const res = await Promise.race([network, timeout]);
      if (res) return res;
    } catch (err) { /* verkko poikki: käytetään tallennettua */ }

    const cached = await cache.match(req);
    if (cached) return cached;
    return network; // ei tallennettua kopiota: odotetaan verkkoa
  })());
});
