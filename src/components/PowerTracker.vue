<template>
  <div class="w-full p-6 bg-white rounded-xl shadow-lg">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-gray-800">Power Balance</h2>
      <div class="flex items-center">
        <Info 
          class="w-5 h-5 mr-3 text-blue-500 cursor-pointer" 
          @click="showInfoModal = true"
        />
        <button @click="resetData" class="flex items-center text-red-500 hover:text-red-700">
          <RefreshCw class="w-5 h-5 mr-1" />
          <span>Reset</span>
        </button>
      </div>
    </div>

    <!-- Initial Reading Input (only shown if not provided) -->
    <div v-if="!hasInitialReading" class="space-y-4 mb-6">
      <div class="bg-blue-50 p-4 rounded-lg mb-4 text-sm text-blue-800">
        <div class="flex">
          <HelpCircle class="w-5 h-5 mr-2 flex-shrink-0" />
          <p>To start tracking your power balance, enter the current meter reading from your electricity meter. This will be used as your starting point.</p>
        </div>
      </div>
      
      <div class="space-y-2">
        <label class="block text-sm font-medium text-gray-700">Initial Units Reading</label>
        <div class="relative">
          <Zap class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            v-model.number="initialReading" 
            type="number" 
            class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
            placeholder="Enter your initial meter reading"
          />
        </div>
        <p class="text-xs text-gray-500 italic">This should be the current reading on your electricity meter in kWh</p>
      </div>
      
      <div class="space-y-2 mb-4">
        <label class="block text-sm font-medium text-gray-700">Notification Settings</label>
        <div class="flex items-center">
          <input 
            v-model="notificationsEnabled" 
            type="checkbox" 
            id="notifications" 
            class="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label for="notifications" class="text-sm text-gray-600">Enable low balance notifications</label>
        </div>
        <p class="text-xs text-gray-500 italic">You'll receive alerts when your balance drops below 2 kWh and 1 kWh</p>
      </div>
      
      <button 
        @click="confirmInitialReading" 
        class="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition duration-200"
      >
        <CheckCircle class="w-5 h-5 mr-2" />
        <span>Confirm Reading</span>
      </button>
    </div>

    <!-- Balance Display & Management (shown after initial reading is provided) -->
    <div v-else class="space-y-6">
      <div class="bg-blue-50 p-4 rounded-lg">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">Current Balance</p>
            <div class="flex items-center mt-1">
              <Battery class="w-6 h-6 mr-2 text-blue-600" />
              <span class="text-3xl font-bold" :class="{'text-red-600': parseFloat(displayBalance) <= 2, 'text-gray-800': parseFloat(displayBalance) > 2}">{{ displayBalance }} kWh</span>
            </div>
            <p class="text-xs text-gray-500 mt-1">
              Last updated: {{ lastUpdated }}
            </p>
          </div>
          <button 
            @click="isEditingBalance = !isEditingBalance" 
            class="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded-full"
            title="Manually update balance"
          >
            <Edit3 class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Manual Balance Edit Form -->
      <div v-if="isEditingBalance" class="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div class="flex items-center mb-2">
          <HelpCircle class="w-4 h-4 mr-2 text-gray-500" />
          <p class="text-xs text-gray-600">If you know your exact balance, you can manually update it here</p>
        </div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Update Balance</label>
        <div class="flex">
          <input 
            v-model.number="manualBalance" 
            type="number" 
            class="flex-1 border border-gray-300 rounded-l-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
            step="0.01"
            placeholder="Enter exact balance in kWh"
          />
          <button 
            @click="confirmBalanceUpdate" 
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-lg"
            title="Save balance update"
          >
            <Save class="w-5 h-5" />
          </button>
        </div>
      </div>

      <div class="bg-gray-50 p-4 rounded-lg">
        <div class="flex items-center space-x-2">
          <Activity class="w-5 h-5 text-orange-500" />
          <div>
            <p class="text-sm text-gray-500">Consumption Rate</p>
            <p class="font-medium">{{ avgRatePerMinute.toFixed(5) }} units/min</p>
            <p class="text-xs text-gray-500 mt-1">Based on your historical usage patterns</p>
          </div>
        </div>
      </div>

      <div class="flex items-center space-x-2 mt-4">
        <input 
          v-model="notificationsEnabled" 
          type="checkbox" 
          id="notificationsToggle" 
          class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label for="notificationsToggle" class="text-sm text-gray-600">Enable low balance notifications</label>
      </div>

              <div class="mt-2 text-xs text-gray-500 flex items-start">          <AlertCircle class="w-4 h-4 mr-2 text-gray-400 flex-shrink-0 mt-0.5" />          <p>Your balance is automatically updated every 30 seconds, even when the app is in the background.</p>        </div>
    </div>

    <!-- Info Modal -->
    <div v-if="showInfoModal" class="fixed inset-0 bg-white/10 backdrop-blur-sm flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-bold text-gray-800">How Power Balance Works</h3>
          <button @click="showInfoModal = false" class="text-gray-500 hover:text-gray-700">
            <X class="w-5 h-5" />
          </button>
        </div>
        
        <div class="space-y-4 text-sm">
          <div>
            <h4 class="font-medium text-gray-800 mb-1">Initial Reading</h4>
            <p class="text-gray-600">This is the starting point for tracking your power usage. You should enter the current reading from your electricity meter.</p>
          </div>
          
          <div>
            <h4 class="font-medium text-gray-800 mb-1">Balance Calculation</h4>
            <p class="text-gray-600">Your balance is calculated using:</p>
            <ul class="list-disc pl-5 mt-1 text-gray-600">
              <li>Initial meter reading</li>
              <li>Power tokens you've purchased</li>
              <li>Estimated consumption based on usage patterns</li>
            </ul>
          </div>
          
          <div>
            <h4 class="font-medium text-gray-800 mb-1">Real-time Updates</h4>
            <p class="text-gray-600">Your balance automatically updates every 30 seconds, even when the app is not open.</p>
          </div>
          
          <div>
            <h4 class="font-medium text-gray-800 mb-1">Notifications</h4>
            <p class="text-gray-600">When enabled, you'll receive alerts when your balance drops below 2 kWh and 1 kWh.</p>
          </div>
          
          <div>
            <h4 class="font-medium text-gray-800 mb-1">Manual Balance Update</h4>
            <p class="text-gray-600">If you check your meter and notice a difference between the actual reading and our estimate, you can manually update the balance.</p>
          </div>
          
          <div>
            <h4 class="font-medium text-gray-800 mb-1">Reset Function</h4>
            <p class="text-gray-600">This clears all stored data and allows you to start fresh with a new meter reading.</p>
          </div>
        </div>
        
        <button 
          @click="showInfoModal = false"
          class="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
        >
          Got it
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { usePowerStore } from '../stores/powerStore';
import { 
  Battery, Activity, Zap, RefreshCw, 
  CheckCircle, Edit3, Save, Info, 
  HelpCircle, X, AlertCircle 
} from 'lucide-vue-next';
import { registerBackgroundTask, checkNotificationPermission } from '../services/backgroundService';

const powerStore = usePowerStore();

const initialReading = ref(parseFloat(localStorage.getItem("initialReading")) || 0);
const readingStartTime = ref(localStorage.getItem("readingStartTime") || new Date().toISOString().slice(0, 16));
const manualBalance = ref(parseFloat(localStorage.getItem("manualBalance")) || null);
const isEditingBalance = ref(false);
const hasInitialReading = ref(Boolean(parseFloat(localStorage.getItem("initialReading"))));
const showInfoModal = ref(false);
const currentTime = ref(new Date());
const lastUpdated = ref('Just now');
const notificationsEnabled = ref(localStorage.getItem("notificationsEnabled") === 'true');
let updateTimer = null;
let lastNotifiedLevel = null;

// Calculate consumption rate per minute instead of per hour
const avgRate = computed(() => {
  if (!powerStore.powerData?.monthlyData) return 0;
  const months = Object.values(powerStore.powerData.monthlyData);
  if (months.length === 0) return 0;
  const totalUnits = months.reduce((sum, m) => sum + m.units, 0);
  const totalDays = months.length * 30;
  return totalUnits / (totalDays * 24); // avg units per hour
});

const avgRatePerMinute = computed(() => {
  return avgRate.value / 60; // Convert from units/hour to units/minute
});

const getLatestUnits = () => {
  const lastReadingTime = new Date(readingStartTime.value);
  if (!powerStore.powerData?.transactions) return 0;
  const tokens = powerStore.powerData.transactions.filter(tx => new Date(tx.date) > lastReadingTime);
  return tokens.reduce((sum, tx) => sum + tx.units, 0);
};

const getLearningFactor = () => {
  const userFactor = parseFloat(localStorage.getItem("learningFactor"));
  return isNaN(userFactor) ? 0 : userFactor;
};

const estimatedBalance = computed(() => {
  const now = currentTime.value;
  const start = new Date(readingStartTime.value);
  const minutesElapsed = (now - start) / 60000; // Convert to minutes
  const consumed = avgRatePerMinute.value * minutesElapsed;
  const latestTokens = getLatestUnits();
  const learnedAdjustment = getLearningFactor();
  const balance = initialReading.value + latestTokens - consumed + learnedAdjustment;
  return manualBalance.value !== null ? manualBalance.value : balance;
});

const displayBalance = computed(() => {
  return estimatedBalance.value.toFixed(2);
});

const updateLastUpdated = () => {
  const now = new Date();
  lastUpdated.value = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const checkLowBalanceAndNotify = () => {
  const balance = parseFloat(displayBalance.value);
  if (!notificationsEnabled.value) return;
  
  // Check for notification thresholds
  if (balance <= 1 && lastNotifiedLevel !== 1) {
    sendNotification("Critical Low Power Balance", "Your power balance is below 1 kWh. Please purchase more units immediately!");
    lastNotifiedLevel = 1;
  } else if (balance <= 2 && balance > 1 && lastNotifiedLevel !== 2) {
    sendNotification("Low Power Balance", "Your power balance is below 2 kWh. Consider purchasing more units soon.");
    lastNotifiedLevel = 2;
  } else if (balance > 2) {
    lastNotifiedLevel = null;
  }
};

const sendNotification = async (title, message) => {
  if (!("Notification" in window)) return;
  
  if (Notification.permission === "granted") {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        registration.showNotification(title, {
          body: message,
          icon: '/icon-192x192.png',
          vibrate: [200, 100, 200],
          tag: 'power-balance'
        });
      }
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  }
};

const confirmInitialReading = async () => {
  if (initialReading.value <= 0) {
    return;
  }
  
  localStorage.setItem("initialReading", initialReading.value);
  localStorage.setItem("readingStartTime", new Date().toISOString().slice(0, 16));
  localStorage.setItem("notificationsEnabled", notificationsEnabled.value);
  readingStartTime.value = new Date().toISOString().slice(0, 16);
  hasInitialReading.value = true;
  
  if (notificationsEnabled.value) {
    await checkNotificationPermission();
  }
  
  // Register background task
  registerBackgroundTask();
};

const confirmBalanceUpdate = () => {
  localStorage.setItem("manualBalance", manualBalance.value);
  isEditingBalance.value = false;
};

const resetData = () => {
  if (!confirm("This will reset all your power tracking data. Are you sure?")) {
    return;
  }
  localStorage.removeItem("initialReading");
  localStorage.removeItem("readingStartTime");
  localStorage.removeItem("manualBalance");
  localStorage.removeItem("learningFactor");
  localStorage.removeItem("lastNotifiedLevel");
  initialReading.value = 0;
  readingStartTime.value = new Date().toISOString().slice(0, 16);
  manualBalance.value = null;
  hasInitialReading.value = false;
  isEditingBalance.value = false;
  lastNotifiedLevel = null;
};

// Start the auto-update timer
const startAutoUpdate = () => {
  // Update immediately
  currentTime.value = new Date();
  updateLastUpdated();
  
  // Set up the timer to update every 30 seconds
  updateTimer = setInterval(() => {
    currentTime.value = new Date();
    updateLastUpdated();
    checkLowBalanceAndNotify();
  }, 30000); // 30 seconds
};

onMounted(async () => {
  // Check if initial reading exists on mount
  hasInitialReading.value = Boolean(parseFloat(localStorage.getItem("initialReading")));
  
  // Load last notified level
  lastNotifiedLevel = localStorage.getItem("lastNotifiedLevel") ? 
    parseInt(localStorage.getItem("lastNotifiedLevel")) : null;
    
  // Start auto-updates
  startAutoUpdate();
  
  // Register for service worker
  if (hasInitialReading.value && notificationsEnabled.value) {
    await checkNotificationPermission();
    registerBackgroundTask();
  }
  
  // Listen for background updates
  window.addEventListener('power-balance-updated', handleBackgroundUpdate);
});

// Clean up the timer when the component is unmounted
onUnmounted(() => {
  if (updateTimer) {
    clearInterval(updateTimer);
  }
  
  // Remove event listener
  window.removeEventListener('power-balance-updated', handleBackgroundUpdate);
});

// Handle background updates from service worker
const handleBackgroundUpdate = (event) => {
  if (event.detail) {
    // Update the stored values based on the service worker calculation
    const { balance, timestamp } = event.detail;
    manualBalance.value = balance;
    lastUpdated.value = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Update the UI immediately
    currentTime.value = new Date(timestamp);
  }
};

// Add a method to update token purchases
const addTokenUnits = (units) => {
  const currentTokens = parseFloat(localStorage.getItem("tokensAdded") || "0");
  const newTotal = currentTokens + units;
  localStorage.setItem("tokensAdded", newTotal.toString());
  
  // Trigger a background update to recalculate everything
  triggerBackgroundUpdate();
};

watch(initialReading, (newVal) => {
  localStorage.setItem("initialReading", newVal);
});

watch(readingStartTime, (newVal) => {
  localStorage.setItem("readingStartTime", newVal);
});

watch(manualBalance, (newVal) => {
  if (newVal === null) {
    localStorage.removeItem("manualBalance");
  } else {
    localStorage.setItem("manualBalance", newVal);
  }
});

watch(notificationsEnabled, (newVal) => {
  localStorage.setItem("notificationsEnabled", newVal);
  if (newVal && hasInitialReading.value) {
    checkNotificationPermission();
  }
});

watch(() => parseFloat(displayBalance.value), (newVal) => {
  if (notificationsEnabled.value) {
    checkLowBalanceAndNotify();
  }
  
  // Update last notified level in storage
  if (lastNotifiedLevel !== null) {
    localStorage.setItem("lastNotifiedLevel", lastNotifiedLevel);
  }
});
</script>

<style scoped>
input:focus {
  outline: none;
}
</style>
  