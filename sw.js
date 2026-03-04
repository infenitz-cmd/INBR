const CACHE_NAME = 'br-ims-v1';
const ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './css/animations.css',
    './js/app.js',
    './js/auth.js',
    './js/db.js',
    './js/inventory.js',
    './js/attendance.js',
    './js/reports.js',
    './js/ui.js',
    './manifest.json',
    'https://unpkg.com/@phosphor-icons/web',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((res) => res || fetch(e.request))
    );
});
