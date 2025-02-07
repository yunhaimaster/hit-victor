const CACHE_NAME = 'hit-victor-v1';
const GITHUB_API_CACHE = 'github-api-v1';
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

// Function to handle GitHub API requests
async function handleGitHubApiRequest(request) {
    try {
        // Try network first
        const response = await fetch(request);
        
        // Clone the response before caching
        const responseToCache = response.clone();
        
        // Open cache and store response
        const cache = await caches.open(GITHUB_API_CACHE);
        cache.put(request, responseToCache);
        
        return response;
    } catch (error) {
        // If network fails, try cache
        const cache = await caches.open(GITHUB_API_CACHE);
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
    
    // Handle high scores requests with time-based cache
    if (url.pathname.endsWith('highscores.json')) {
        event.respondWith(
            caches.match(event.request).then(async response => {
                // Check if we have a cached response
                if (response) {
                    const cachedDate = new Date(response.headers.get('date'));
                    const now = new Date();
                    
                    // If cache is fresh (less than 5 minutes old), use it
                    if (now - cachedDate < HIGH_SCORES_CACHE_DURATION) {
                        return response;
                    }
                }
                
                // Cache is stale or doesn't exist, fetch new data
                try {
                    const fetchResponse = await fetch(event.request);
                    const responseToCache = fetchResponse.clone();
                    
                    // Store the new response in cache
                    const cache = await caches.open(CACHE_NAME);
                    await cache.put(event.request, responseToCache);
                    
                    return fetchResponse;
                } catch (error) {
                    // If fetch fails and we have a cached version, return it
                    if (response) {
                        return response;
                    }
                    throw error;
                }
            })
        );
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