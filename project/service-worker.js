const CACHE_NAME = 'ichingapp-cache-v2';
const urlsToCache = [
    './',
    './index.html',
    './style/base.css',
    './style/style.css',
    './style/spinner.css',
    './hexagram.json',
    './ui.js',
    './logic.js',
    './spinner.js',
    './firebase/firebase.js',
    './firebase/auth.js',
    './assets/animations/spinner-animation.json',
    './assets/icons/icon-192.png',
    './assets/icons/icon-512.png',
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            )
        )
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) return cachedResponse;

                return fetch(event.request).then(networkResponse => {
                    const shouldCache = /\.(svg|json|css|js|png|jpg|webp|woff2?)$/.test(event.request.url);

                    if (shouldCache) {
                        return caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, networkResponse.clone());
                            return networkResponse;
                        });
                    } else {
                        return networkResponse;
                    }
                });
            })
            .catch(error => {
                console.error('❌ Fetch error:', error);
                return new Response("Service Worker fetch error", {
                    status: 500,
                    statusText: "SW Fetch Failed"
                });
            })
    );
});
