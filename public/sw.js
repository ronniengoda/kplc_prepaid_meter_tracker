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
    event.waitUntil(updatePowerBalance(event.data.storageData));
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

// Get data from client
async function getStorageDataFromClient() {
  const clients = await self.clients.matchAll();
  if (clients && clients.length > 0) {
    // Create a promise that will resolve with the client's response
    return new Promise((resolve, reject) => {
      // Create a message channel to receive the response
      const messageChannel = new MessageChannel();
      
      // Set up the message handler to receive the response
      messageChannel.port1.onmessage = (event) => {
        if (event.data && event.data.storageData) {
          resolve(event.data.storageData);
        } else {
          reject(new Error('No storage data received'));
        }
      };
      
      // Send message to client to request storage data
      clients[0].postMessage(
        { type: 'GET_STORAGE_DATA' },
        [messageChannel.port2]
      );
      
      // Set a timeout in case the client doesn't respond
      setTimeout(() => reject(new Error('Client response timeout')), 3000);
    });
  }
  return null;
}

// Update power balance in the background
async function updatePowerBalance(storageData) {
  try {
    // If no storage data was passed in, try to get it from a client
    if (!storageData) {
      try {
        storageData = await getStorageDataFromClient();
      } catch (err) {
        console.error("Could not get storage data from client:", err);
        return false;
      }
    }
    
    if (!storageData) {
      console.error("No storage data available");
      return false;
    }
    
    // Extract values from passed storage data
    const initialReading = parseFloat(storageData.initialReading || "0");
    if (!initialReading || initialReading === 0) return false;
    
    const readingStartTime = storageData.readingStartTime;
    if (!readingStartTime) return false;
    
    const notificationsEnabled = storageData.notificationsEnabled === true;
    const avgRatePerMinute = parseFloat(storageData.avgRatePerMinute || "0.008333");
    const manualBalance = parseFloat(storageData.manualBalance || "0");
    const hasManualBalance = !isNaN(manualBalance) && storageData.manualBalance !== null;
    const tokensAdded = parseFloat(storageData.tokensAdded || "0");
    const learningFactor = parseFloat(storageData.learningFactor || "0");
    const lastNotifiedLevel = storageData.lastNotifiedLevel ? 
      parseInt(storageData.lastNotifiedLevel) : null;
    
    // Calculate the current balance
    let balance;
    
    // If manual balance is set, use that
    if (hasManualBalance) {
      balance = manualBalance;
    } else {
      // Calculate elapsed minutes
      const start = new Date(readingStartTime);
      const now = new Date();
      const minutesElapsed = (now - start) / 60000;
      
      // Calculate consumption
      const consumed = avgRatePerMinute * minutesElapsed;
      
      // Calculate balance
      balance = initialReading + tokensAdded - consumed + learningFactor;
    }
    
    // Update the client with the new balance
    const clients = await self.clients.matchAll();
    if (clients && clients.length > 0) {
      clients.forEach(client => {
        client.postMessage({
          type: 'UPDATED_POWER_BALANCE',
          balance: balance.toFixed(2),
          timestamp: new Date().toISOString()
        });
      });
    }
    
    // Check and send notifications if needed
    if (notificationsEnabled) {
      await checkBalanceAndNotify(balance, lastNotifiedLevel);
    }
    
    return true;
  } catch (error) {
    console.error("Background update failed:", error);
    return false;
  }
}

// Check balance threshold and show notification if needed
async function checkBalanceAndNotify(balance, lastNotifiedLevel) {
  // Check thresholds and notify if needed
  if (balance <= 1 && lastNotifiedLevel !== 1) {
    await showNotification(
      "Critical Low Power Balance", 
      `Your power balance is ${balance.toFixed(2)} kWh. Purchase more units immediately!`,
      1
    );
    
    // Update the clients with the new notification level
    const clients = await self.clients.matchAll();
    if (clients && clients.length > 0) {
      clients.forEach(client => {
        client.postMessage({
          type: 'UPDATE_NOTIFICATION_LEVEL',
          level: 1
        });
      });
    }
  } else if (balance <= 2 && balance > 1 && lastNotifiedLevel !== 2) {
    await showNotification(
      "Low Power Balance", 
      `Your power balance is ${balance.toFixed(2)} kWh. Consider purchasing more units soon.`,
      2
    );
    
    // Update the clients with the new notification level
    const clients = await self.clients.matchAll();
    if (clients && clients.length > 0) {
      clients.forEach(client => {
        client.postMessage({
          type: 'UPDATE_NOTIFICATION_LEVEL',
          level: 2
        });
      });
    }
  } else if (balance > 2 && lastNotifiedLevel !== null) {
    // Update the clients to clear notification level
    const clients = await self.clients.matchAll();
    if (clients && clients.length > 0) {
      clients.forEach(client => {
        client.postMessage({
          type: 'UPDATE_NOTIFICATION_LEVEL',
          level: null
        });
      });
    }
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
      balance: balance,
      urgency: urgency
    }
  });
} 