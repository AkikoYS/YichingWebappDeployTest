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
    // 必要に応じて卦画像の一部だけ先にキャッシュも可
];
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) return cachedResponse;

                return fetch(event.request)
                    .then(networkResponse => {
                        // SVGやJSONなど静的ファイルのみキャッシュ
                        const shouldCache =
                            event.request.url.endsWith('.svg') ||
                            event.request.url.endsWith('.json');

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
