const CACHE_NAME = 'kyoto-pwa-v1';
const urlsToCache = [
  '/',
  'index.html',
  'style.css',
  'app.js',
  'manifest.json'
];

// 安裝 Service Worker 並快取必要文件
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('快取完成!');
        return cache.addAll(urlsToCache);
      })
  );
});

// 攔截網路請求，回傳快取內容
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 如果快取中有，則回傳快取內容
        if (response) {
          return response;
        }
        // 否則，正常發出網路請求
        return fetch(event.request);
      })
  );
});