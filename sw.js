const VERSION = '1.6.1';
const CACHE_NAME = `hit-victor-${VERSION}`;
const SCORES_CACHE = `scores-${VERSION}`;
const urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/script.js',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/sounds/ouch.mp3',
    '/sounds/pain.mp3',
    '/sounds/no.mp3',
    '/faces/normal.webp',
    '/faces/surprised.webp',
    '/faces/hurt.webp',
    '/faces/sad.webp',
    '/faces/angry.webp'
].map(url => url + '?v=' + VERSION);

// High scores cache duration (5 minutes)
const HIGH_SCORES_CACHE_DURATION = 5 * 60 * 1000;

// Function to handle high scores requests
async function handleScoresRequest(request) {
    try {
        // Check if the request URL scheme is supported
        const url = new URL(request.url);
        if (!['http:', 'https:'].includes(url.protocol)) {
            throw new Error('Unsupported URL scheme');
        }

        // Always try network first
        const response = await fetch(request);
        if (response.ok) {
            const responseToCache = response.clone();
            const cache = await caches.open(SCORES_CACHE);
            // Only cache http/https requests
            if (['http:', 'https:'].includes(url.protocol)) {
                await cache.put(request, responseToCache);
            }
            return response;
        }
        throw new Error('Network response was not ok');
    } catch (error) {
        console.warn('Cache operation failed:', error);
        // If network fails, try cache
        const cache = await caches.open(SCORES_CACHE);
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        throw error;
    }
}

// Install event - cache all required files
self.addEventListener('install', event => {
    console.log('Installing new service worker version:', VERSION);
    self.skipWaiting();
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache:', CACHE_NAME);
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('Cache installation failed:', error);
            })
    );
});

// 檢查請求是否可以緩存
function isCacheableRequest(request) {
    try {
        const url = new URL(request.url);
        
        // 不緩存 WebSocket 請求
        if (request.headers.get('Upgrade') === 'websocket') return false;
        
        // 不緩存非 GET 請求
        if (request.method !== 'GET') return false;
        
        // 不緩存非 HTTP/HTTPS 請求
        if (!['http:', 'https:'].includes(url.protocol)) return false;
        
        // 不緩存 HMR 相關請求
        if (url.pathname.includes('__vite') || url.pathname.includes('@vite')) return false;
        
        // 不緩存開發服務器的 WebSocket 請求
        if (url.searchParams.has('t') || url.searchParams.has('token')) return false;

        return true;
    } catch (error) {
        console.warn('Error checking cacheable request:', error);
        return false;
    }
}

// Fetch event - handle requests
self.addEventListener('fetch', event => {
    try {
        // 跳過不可緩存的請求
        if (!isCacheableRequest(event.request)) {
            return;
        }

        event.respondWith(
            caches.match(event.request)
                .then(cachedResponse => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }

                    return fetch(event.request)
                        .then(response => {
                            // 檢查響應是否有效
                            if (!response || response.status !== 200) {
                                return response;
                            }

                            // 緩存新的響應
                            if (isCacheableRequest(event.request)) {
                                const responseToCache = response.clone();
                                caches.open(CACHE_NAME)
                                    .then(cache => {
                                        try {
                                            cache.put(event.request, responseToCache);
                                        } catch (error) {
                                            console.warn('Cache put failed:', error);
                                        }
                                    })
                                    .catch(error => {
                                        console.warn('Cache open failed:', error);
                                    });
                            }

                            return response;
                        })
                        .catch(error => {
                            console.warn('Fetch failed:', error);
                            return caches.match('/index.html');
                        });
                })
                .catch(error => {
                    console.warn('Cache match failed:', error);
                    return caches.match('/index.html');
                })
        );
    } catch (error) {
        console.warn('Service Worker fetch error:', error);
    }
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Activating new service worker version:', VERSION);
    
    event.waitUntil(
        Promise.all([
            self.clients.claim(),
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME && cacheName !== SCORES_CACHE) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
        ])
    );
});