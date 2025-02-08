const CACHE_NAME = 'hit-victor-v1.6.0';
const SCORES_CACHE = 'scores-v1.6.0';
const urlsToCache = [
    './',
    './index.html',
    './styles.css',
    './script.js',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './sounds/ouch.mp3',
    './sounds/pain.mp3',
    './sounds/no.mp3',
    './faces/normal.webp',
    './faces/surprised.webp',
    './faces/hurt.webp',
    './faces/sad.webp',
    './faces/angry.webp'
];

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
    console.log('Installing new service worker version');
    self.skipWaiting();
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('Cache installation failed:', error);
            })
    );
});

// Fetch event - handle high scores and regular requests
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // Skip non-HTTP(S) requests
    if (!['http:', 'https:'].includes(url.protocol)) {
        return;
    }
    
    if (event.request.mode === 'navigate' || 
        event.request.headers.get('accept').includes('text/html')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    if (!response || response.status !== 200) {
                        return caches.match(event.request);
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match(event.request);
                })
        );
        return;
    }
    
    if (url.pathname.endsWith('highscores.json')) {
        event.respondWith(handleScoresRequest(event.request));
        return;
    }
    
    event.respondWith(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.match(event.request)
                    .then(cachedResponse => {
                        const fetchPromise = fetch(event.request)
                            .then(networkResponse => {
                                if (networkResponse && networkResponse.status === 200 &&
                                    ['http:', 'https:'].includes(url.protocol)) {
                                    cache.put(event.request, networkResponse.clone())
                                        .catch(error => console.warn('Cache put error:', error));
                                }
                                return networkResponse;
                            })
                            .catch(error => {
                                console.warn('Fetch failed:', error);
                                return cachedResponse;
                            });
                            
                        return cachedResponse || fetchPromise;
                    })
                    .catch(error => {
                        console.warn('Cache match error:', error);
                        return fetch(event.request);
                    });
            })
            .catch(error => {
                console.warn('Cache open error:', error);
                return fetch(event.request);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Activating new service worker version');
    
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