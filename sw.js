const CACHE_NAME = 'hit-victor-v1';
const SCORES_CACHE = 'scores-v1';
const urlsToCache = [
    './',
    './index.html',
    './styles.css',
    './script.js',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './sounds/哎也.mp3',
    './sounds/好痛.mp3',
    './highscores.json'
];

// High scores cache duration (5 minutes)
const HIGH_SCORES_CACHE_DURATION = 5 * 60 * 1000;

// Function to handle high scores requests
async function handleScoresRequest(request) {
    try {
        // Always try network first
        const response = await fetch(request);
        if (response.ok) {
            const responseToCache = response.clone();
            const cache = await caches.open(SCORES_CACHE);
            await cache.put(request, responseToCache);
            return response;
        }
        throw new Error('Network response was not ok');
    } catch (error) {
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
    
    // Handle high scores requests
    if (url.pathname.endsWith('highscores.json')) {
        event.respondWith(handleScoresRequest(event.request));
        return;
    }
    
    // Handle regular requests with cache-first strategy
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }

                const fetchRequest = event.request.clone();
                
                return fetch(fetchRequest)
                    .then(response => {
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        const responseToCache = response.clone();
                        
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch(error => {
                        console.error('Fetch failed:', error);
                        throw error;
                    });
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .catch(error => {
                console.error('Cache cleanup failed:', error);
            })
    );
});