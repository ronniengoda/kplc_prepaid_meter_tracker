// Background processing service for power tracking
// Handles service worker registration, background sync, and notifications

// Check and request notification permissions if needed
export const checkNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.log("This browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
};

// Register the service worker for background processing
export const registerBackgroundTask = async () => {
  try {
    // Check if service workers are supported
    if ("serviceWorker" in navigator) {
      // With Vite PWA plugin, registration is handled automatically
      // We just need to wait for the registration to be available
      const registration = await navigator.serviceWorker.ready;
      console.log("ServiceWorker registration successful:", registration.scope);
      
      // Setup periodic sync if available (Chrome 80+)
      if ("periodicSync" in registration) {
        try {
          // Check permission for periodic background sync
          const status = await navigator.permissions.query({
            name: "periodic-background-sync",
          });
          
          if (status.state === "granted") {
            await registration.periodicSync.register("power-update", {
              minInterval: 30 * 60 * 1000, // 30 minutes minimum
            });
            console.log("Periodic background sync registered");
          }
        } catch (err) {
          console.log("Periodic background sync not available", err);
        }
      }
      
      return registration;
    } else {
      console.log("Service workers not supported");
      return null;
    }
  } catch (error) {
    console.error("Service worker registration failed:", error);
    return null;
  }
};

// Function to manually trigger a balance update from the service worker
export const triggerBackgroundUpdate = async () => {
  if (!("serviceWorker" in navigator)) return;
  
  try {
    const registration = await navigator.serviceWorker.ready;
    // Post a message to the service worker to update the balance
    registration.active.postMessage({
      type: "UPDATE_POWER_BALANCE"
    });
  } catch (error) {
    console.error("Error triggering background update:", error);
  }
};

// Calculate current power balance (also used by service worker)
export const calculatePowerBalance = () => {
  // Get stored values from localStorage
  const initialReading = parseFloat(localStorage.getItem("initialReading") || "0");
  const readingStartTime = localStorage.getItem("readingStartTime");
  const manualBalance = parseFloat(localStorage.getItem("manualBalance") || "0");
  const hasManualBalance = !isNaN(manualBalance);
  const avgRatePerMinute = getAverageRatePerMinute();
  
  if (!readingStartTime || initialReading === 0) {
    return null;
  }
  
  // If manual balance is set, use that
  if (hasManualBalance) {
    return manualBalance;
  }
  
  // Calculate elapsed minutes since initial reading
  const start = new Date(readingStartTime);
  const now = new Date();
  const minutesElapsed = (now - start) / 60000; // Convert to minutes
  
  // Calculate consumption
  const consumed = avgRatePerMinute * minutesElapsed;
  
  // Get other factors
  const latestTokens = getLatestTokens(readingStartTime);
  const learnedAdjustment = getLearningFactorFromStorage();
  
  // Calculate balance
  const balance = initialReading + latestTokens - consumed + learnedAdjustment;
  return balance;
};

// Helper function to get the consumption rate per minute
const getAverageRatePerMinute = () => {
  // Try to get from localStorage cache first
  const cachedRate = localStorage.getItem("avgRatePerMinute");
  if (cachedRate) {
    return parseFloat(cachedRate);
  }
  
  // Fallback to a default value if no data is available
  // In a real app, this would be calculated from historical data
  const defaultRatePerHour = 0.5; // 0.5 units per hour as a fallback
  return defaultRatePerHour / 60;
};

// Get added power tokens since the last reading
const getLatestTokens = (readingStartTime) => {
  // In a real app, this would access the transaction history
  // For now, we'll use a simplified approach with localStorage
  const tokensAdded = parseFloat(localStorage.getItem("tokensAdded") || "0");
  return tokensAdded;
};

// Get learning factor adjustment from storage
const getLearningFactorFromStorage = () => {
  const userFactor = parseFloat(localStorage.getItem("learningFactor") || "0");
  return isNaN(userFactor) ? 0 : userFactor;
};

// Check balance threshold and show notification if needed
export const checkBalanceAndNotify = async () => {
  if (localStorage.getItem("notificationsEnabled") !== "true") return;
  
  const balance = calculatePowerBalance();
  if (balance === null) return;
  
  const lastNotifiedLevel = localStorage.getItem("lastNotifiedLevel") ? 
    parseInt(localStorage.getItem("lastNotifiedLevel")) : null;
    
  // Check thresholds and notify if needed
  if (balance <= 1 && lastNotifiedLevel !== 1) {
    await showBalanceNotification(
      "Critical Low Power Balance", 
      `Your power balance is ${balance.toFixed(2)} kWh. Purchase more units immediately!`,
      1
    );
    localStorage.setItem("lastNotifiedLevel", "1");
  } else if (balance <= 2 && balance > 1 && lastNotifiedLevel !== 2) {
    await showBalanceNotification(
      "Low Power Balance", 
      `Your power balance is ${balance.toFixed(2)} kWh. Consider purchasing more units soon.`,
      2
    );
    localStorage.setItem("lastNotifiedLevel", "2");
  } else if (balance > 2) {
    localStorage.removeItem("lastNotifiedLevel");
  }
};

// Show notification from service worker
const showBalanceNotification = async (title, message, urgency) => {
  if (!("Notification" in window)) return;
  
  if (Notification.permission === "granted") {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.showNotification(title, {
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
            balance: parseFloat(localStorage.getItem("balance") || "0"),
            urgency: urgency
          }
        });
      }
    } catch (error) {
      console.error("Error showing notification:", error);
    }
  }
}; 