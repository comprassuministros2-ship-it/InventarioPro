/**
 * Service Worker para InventarioPro PWA
 * Estrategia: Cache-first para assets estáticos, Network-first para API
 */

const CACHE_NAME = 'inventariopro-v1';
const STATIC_ASSETS = [
  '/InventarioPro/',
  '/InventarioPro/index.html',
  '/InventarioPro/css/style.css',
  '/InventarioPro/js/script.js',
  '/InventarioPro/js/services/ApiService.js',
  '/InventarioPro/js/services/ArticulosService.js',
  '/InventarioPro/js/sidebar.js',
  '/InventarioPro/js/theme-init.js',
  '/InventarioPro/js/Config.js',
  '/InventarioPro/manifest.json',
  '/InventarioPro/img/icons/icon.svg'
];

const API_URL_PATTERN = /script\.google\.com/;

// Install: precache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { credentials: 'same-origin' })));
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch: cache-first for static, network-first for API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo manejar requests del mismo origen o a la API de Google Apps Script
  if (url.origin !== location.origin && !API_URL_PATTERN.test(url.origin)) {
    return;
  }

  // API calls: Network-first (con fallback a cache si falla)
  if (API_URL_PATTERN.test(url.origin) || url.pathname.includes('/api/')) {
    event.respondWith(networkFirstThenCache(request));
    return;
  }

  // Static assets: Cache-first
  event.respondWith(cacheFirstThenNetwork(request));
});

// Cache-first strategy (para assets estáticos)
async function cacheFirstThenNetwork(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    // Actualizar cache en background (stale-while-revalidate)
    fetch(request).then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
    }).catch(() => {}); // Ignorar errores de red
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Fallback para navegación: devolver index.html (SPA)
    if (request.mode === 'navigate') {
      return cache.match('/InventarioPro/index.html');
    }
    throw error;
  }
}

// Network-first strategy (para API calls)
async function networkFirstThenCache(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Solo cachear GET requests exitosos
      if (request.method === 'GET') {
        cache.put(request, networkResponse.clone());
      }
    }
    return networkResponse;
  } catch (error) {
    // Si falla la red, intentar servir desde cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Fallback offline para API
    return new Response(
      JSON.stringify({
        exito: false,
        error: 'Sin conexión. Los datos se sincronizarán al recuperar la conexión.',
        offline: true
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Mensajes desde la app principal
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  if (event.data === 'getCacheInfo') {
    caches.open(CACHE_NAME).then(cache => {
      cache.keys().then(keys => {
        event.ports[0].postMessage({ cacheSize: keys.length, keys: keys.map(k => k.url) });
      });
    });
  }
});

// Notificar a clientes cuando hay nueva versión
self.addEventListener('controllerchange', () => {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: 'SW_UPDATED' });
    });
  });
});