const CACHE_NAME = 'hit-victor-v1';
const FIREBASE_CACHE = 'firebase-api-v1';
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

// Function to handle Firebase API requests
async function handleFirebaseRequest(request) {
    try {
        // Always try network first for Firebase
        const response = await fetch(request);
        
        // Only cache GET requests
        if (request.method === 'GET') {
            const responseToCache = response.clone();
            const cache = await caches.open(FIREBASE_CACHE);
            cache.put(request, responseToCache);
        }
        
        return response;
    } catch (error) {
        // For GET requests, try cache if network fails
        if (request.method === 'GET') {
            const cache = await caches.open(FIREBASE_CACHE);
            const cachedResponse = await cache.match(request);
            
            if (cachedResponse) {
                return cachedResponse;
            }
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
    
    // Handle Firebase requests
    if (url.hostname.includes('firebasedatabase.app')) {
        event.respondWith(handleFirebaseRequest(event.request));
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