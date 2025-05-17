// Power Tracker Service Worker
const CACHE_NAME = 'power-tracker-v1';
const OFFLINE_URL = '/offline.html';

// Assets to cache for offline use
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/offline.html',
  '/favicon.ico',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/manifest.json',
  '/assets/index.css',
  '/assets/index.js'
];

// Install event - cache assets for offline use
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName !== CACHE_NAME;
        }).map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return the response from the cache
        if (response) {
          return response;
        }

        // Not in cache - return the result from the network
        return fetch(event.request)
          .then(response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response - one to return, one to cache
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(error => {
            // Network request failed, try to serve the offline page
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            
            return null;
          });
      })
  );
});

// Background sync event for offline actions
self.addEventListener('sync', event => {
  if (event.tag === 'power-update') {
    event.waitUntil(updatePowerBalance());
  }
});

// Periodic background sync for regular updates
self.addEventListener('periodicsync', event => {
  if (event.tag === 'power-update') {
    event.waitUntil(updatePowerBalance());
  }
});

// Handle messages from the client
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'UPDATE_POWER_BALANCE') {
    event.waitUntil(updatePowerBalance());
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'buy') {
    // Open the buy tokens page
    event.waitUntil(
      self.clients.matchAll({type: 'window'}).then(clientList => {
        // Check if a window is already open
        for (const client of clientList) {
          if (client.url.includes('/buy-tokens') && 'focus' in client) {
            return client.focus();
          }
        }
        
        // If no window is open, open a new one
        if (self.clients.openWindow) {
          return self.clients.openWindow('/buy-tokens');
        }
      })
    );
  } else {
    // Default action - open the main app
    event.waitUntil(
      self.clients.matchAll({type: 'window'}).then(clientList => {
        // Check if a window is already open
        for (const client of clientList) {
          if ('focus' in client) {
            return client.focus();
          }
        }
        
        // If no window is open, open a new one
        if (self.clients.openWindow) {
          return self.clients.openWindow('/');
        }
      })
    );
  }
});

// Update power balance in the background
async function updatePowerBalance() {
  try {
    // Get stored values
    const initialReading = parseFloat(localStorage.getItem("initialReading") || "0");
    if (!initialReading || initialReading === 0) return;
    
    const readingStartTime = localStorage.getItem("readingStartTime");
    if (!readingStartTime) return;
    
    const notificationsEnabled = localStorage.getItem("notificationsEnabled") === "true";
    
    // Calculate the current balance
    const balance = calculatePowerBalance();
    
    // Store the current balance
    localStorage.setItem("currentBalance", balance.toFixed(2));
    
    // Check and send notifications if needed
    if (notificationsEnabled) {
      await checkBalanceAndNotify(balance);
    }
    
    // Log the update timestamp
    localStorage.setItem("lastBackgroundUpdate", new Date().toISOString());
    
    return true;
  } catch (error) {
    console.error("Background update failed:", error);
    return false;
  }
}

// Calculate the current power balance
function calculatePowerBalance() {
  // Simplified calculation to work within the service worker
  const initialReading = parseFloat(localStorage.getItem("initialReading") || "0");
  const readingStartTime = localStorage.getItem("readingStartTime");
  const manualBalance = parseFloat(localStorage.getItem("manualBalance") || "0");
  const hasManualBalance = !isNaN(manualBalance);
  
  // If manual balance is set, use that
  if (hasManualBalance) {
    return manualBalance;
  }
  
  // Get rate from storage (previously calculated and stored)
  const avgRatePerMinute = parseFloat(localStorage.getItem("avgRatePerMinute") || "0.008333"); // Default ~0.5 units per hour
  
  // Calculate elapsed minutes
  const start = new Date(readingStartTime);
  const now = new Date();
  const minutesElapsed = (now - start) / 60000;
  
  // Calculate consumption
  const consumed = avgRatePerMinute * minutesElapsed;
  
  // Get other factors (simplified for service worker)
  const latestTokens = parseFloat(localStorage.getItem("tokensAdded") || "0");
  const learnedAdjustment = parseFloat(localStorage.getItem("learningFactor") || "0");
  
  // Calculate balance
  return initialReading + latestTokens - consumed + learnedAdjustment;
}

// Check balance threshold and show notification if needed
async function checkBalanceAndNotify(balance) {
  const lastNotifiedLevel = localStorage.getItem("lastNotifiedLevel") ? 
    parseInt(localStorage.getItem("lastNotifiedLevel")) : null;
    
  // Check thresholds and notify if needed
  if (balance <= 1 && lastNotifiedLevel !== 1) {
    await showNotification(
      "Critical Low Power Balance", 
      `Your power balance is ${balance.toFixed(2)} kWh. Purchase more units immediately!`,
      1
    );
    localStorage.setItem("lastNotifiedLevel", "1");
  } else if (balance <= 2 && balance > 1 && lastNotifiedLevel !== 2) {
    await showNotification(
      "Low Power Balance", 
      `Your power balance is ${balance.toFixed(2)} kWh. Consider purchasing more units soon.`,
      2
    );
    localStorage.setItem("lastNotifiedLevel", "2");
  } else if (balance > 2) {
    localStorage.removeItem("lastNotifiedLevel");
  }
}

// Show notification from service worker
async function showNotification(title, message, urgency) {
  return self.registration.showNotification(title, {
    body: message,
    icon: '/icon-192x192.png',
    badge: '/icon-96x96.png',
    vibrate: urgency === 1 ? [200, 100, 200, 100, 200] : [200, 100, 200],
    tag: 'power-balance',
    actions: [
      {
        action: 'view',
        title: 'View Balance'
      },
      {
        action: 'buy',
        title: 'Buy Units'
      }
    ],
    data: {
      balance: parseFloat(localStorage.getItem("currentBalance") || "0"),
      urgency: urgency
    }
  });
} 