// Nom du cache pour ce site
const CACHE_NAME = 'cedric-dubai-solutions-v1';

// Fichiers à mettre en cache
const urlsToCache = [
  '/',
  '/index.html',
  '/voyage.html',
  '/expatriation.html',
  '/a-propos.html',
  '/contact.html',
  '/mentions-legales.html',
  '/politique-confidentialite.html',
  '/cgv.html',
  '/cookies.html',
  '/assets/css/style.min.css',
  '/assets/js/main.min.js',
  '/assets/js/accessibility.js',
  '/assets/images/logo.png',
  '/assets/images/icon-192x192.png',
  '/assets/images/icon-512x512.png',
  '/favicon.ico'
];

// Installation du Service Worker
self.addEventListener('install', event => {
  // Effectuer l'installation
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache ouvert');
        return cache.addAll(urlsToCache);
      })
  );
});

// Gestion des requêtes
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        // Cloner la requête
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(
          response => {
            // Vérifier si la réponse est valide
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Cloner la réponse
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
              
            return response;
          }
        );
      })
    );
});

// Mise à jour du cache
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
