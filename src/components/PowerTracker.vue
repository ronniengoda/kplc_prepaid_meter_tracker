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
              <span class="text-3xl font-bold text-gray-800">{{ displayBalance }} kWh</span>
            </div>
            <p class="text-xs text-gray-500 mt-1">
              Estimated based on your consumption pattern
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
            <p class="font-medium">{{ avgRate.toFixed(3) }} units/hr</p>
            <p class="text-xs text-gray-500 mt-1">Based on your historical usage patterns</p>
          </div>
        </div>
      </div>

      <div class="mt-4 text-xs text-gray-500 flex items-start">
        <AlertCircle class="w-4 h-4 mr-2 text-gray-400 flex-shrink-0 mt-0.5" />
        <p>If you've recently purchased power tokens, the system will automatically adjust your balance as these are detected.</p>
      </div>
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
            <p class="text-gray-600">Your balance automatically updates every 30 seconds to reflect ongoing consumption.</p>
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

const powerStore = usePowerStore();

const initialReading = ref(parseFloat(localStorage.getItem("initialReading")) || 0);
const readingStartTime = ref(localStorage.getItem("readingStartTime") || new Date().toISOString().slice(0, 16));
const manualBalance = ref(parseFloat(localStorage.getItem("manualBalance")) || null);
const isEditingBalance = ref(false);
const hasInitialReading = ref(Boolean(parseFloat(localStorage.getItem("initialReading"))));
const showInfoModal = ref(false);
const currentTime = ref(new Date()); // Added for auto-updating
let updateTimer = null; // Timer reference

const avgRate = computed(() => {
  if (!powerStore.powerData?.monthlyData) return 0;
  const months = Object.values(powerStore.powerData.monthlyData);
  if (months.length === 0) return 0;
  const totalUnits = months.reduce((sum, m) => sum + m.units, 0);
  const totalDays = months.length * 30;
  return totalUnits / (totalDays * 24); // avg units per hour
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
  const now = currentTime.value; // Use the reactive time reference
  const start = new Date(readingStartTime.value);
  const hoursElapsed = (now - start) / 3_600_000;
  const consumed = avgRate.value * hoursElapsed;
  const latestTokens = getLatestUnits();
  const learnedAdjustment = getLearningFactor();
  const balance = initialReading.value + latestTokens - consumed + learnedAdjustment;
  return manualBalance.value !== null ? manualBalance.value : balance;
});

const displayBalance = computed(() => {
  return estimatedBalance.value.toFixed(2);
});

const confirmInitialReading = () => {
  if (initialReading.value <= 0) {
    return;
  }
  localStorage.setItem("initialReading", initialReading.value);
  localStorage.setItem("readingStartTime", new Date().toISOString().slice(0, 16));
  readingStartTime.value = new Date().toISOString().slice(0, 16);
  hasInitialReading.value = true;
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
  initialReading.value = 0;
  readingStartTime.value = new Date().toISOString().slice(0, 16);
  manualBalance.value = null;
  hasInitialReading.value = false;
  isEditingBalance.value = false;
};

// Start the auto-update timer
const startAutoUpdate = () => {
  // Update immediately
  currentTime.value = new Date();
  
  // Set up the timer to update every 30 seconds
  updateTimer = setInterval(() => {
    currentTime.value = new Date();
  }, 30000); // 30 seconds
};

onMounted(() => {
  // Check if initial reading exists on mount
  hasInitialReading.value = Boolean(parseFloat(localStorage.getItem("initialReading")));
  
  // Start auto-updates
  startAutoUpdate();
});

// Clean up the timer when the component is unmounted
onUnmounted(() => {
  if (updateTimer) {
    clearInterval(updateTimer);
  }
});

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
</script>

<style scoped>
input:focus {
  outline: none;
}
</style>
  