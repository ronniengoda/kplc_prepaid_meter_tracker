<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { usePowerStore } from '../stores/powerStore';
import { Line } from 'vue-chartjs';
import { useToast } from "vue-toastification";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import InstallPrompt from '../components/InstallPrompt.vue';
import {
  Zap,
  DollarSign,
  TrendingUp,
  BarChart3,
  Calendar,
  Flame,
  Settings,
  CreditCard,
  BarChart2,
  Info,
  ArrowUp,
  ArrowDown,
  Search,
  X,
  Plus,
  List,
  FileText,
  Trash,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Check
} from 'lucide-vue-next';
import { formatBalance } from '../utils/tokenBalancePredictor';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const powerStore = usePowerStore();
const meterNumberInput = ref('');
const meterLabelInput = ref('');
const searchQuery = ref('');
const currentPage = ref(1);
const itemsPerPage = 6;
const showMeterModal = ref(false);
const showBuyTokensModal = ref(false);
const showStatsModal = ref(false);
const buyAmount = ref('');
const mpesaPhone = ref('');
const isProcessing = ref(false);
const meterNumbers = ref(JSON.parse(localStorage.getItem('meterNumbers') || '[]'));
const initialBalanceInput = ref('');
const manualBalanceInput = ref('');
const isEditingBalance = ref(false);
const updateIntervalId = ref(null);

const toast = useToast();

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleString('default', { month: 'short' });
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12;
  const formattedMinutes = minutes.toString().padStart(2, '0');
  
  const ordinal = (n) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return `${ordinal(day)} ${month} ${year} ${formattedHours}:${formattedMinutes} ${ampm}`;
};

const chartData = computed(() => {
  if (!powerStore.powerData?.monthlyData) return null;
  
  const months = Object.keys(powerStore.powerData.monthlyData).reverse();
  const amounts = months.map(month => powerStore.powerData.monthlyData[month].amount);
  const units = months.map(month => powerStore.powerData.monthlyData[month].units);

  return {
    labels: months,
    datasets: [
      {
        label: 'Amount (KSh)',
        data: amounts,
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        fill: true
      },
      {
        label: 'Units (kWh)',
        data: units,
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: 'rgb(16, 185, 129)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        fill: true
      }
    ]
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
    },
    tooltip: {
      mode: 'index',
      intersect: false,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      titleColor: '#333',
      bodyColor: '#666',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      padding: 10,
      displayColors: true,
      callbacks: {
        label: function(context) {
          let label = context.dataset.label || '';
          if (label) {
            label += ': ';
          }
          if (context.parsed.y !== null) {
            label += context.parsed.y;
          }
          return label;
        }
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        display: true,
        color: 'rgba(0, 0, 0, 0.05)'
      },
      ticks: {
        font: {
          size: 10
        }
      }
    },
    x: {
      grid: {
        display: false
      },
      ticks: {
        font: {
          size: 10
        }
      }
    }
  },
  elements: {
    line: {
      tension: 0.4
    }
  }
};

const filteredTransactions = computed(() => {
  if (!powerStore.powerData?.transactions) return [];
  
  return powerStore.powerData.transactions.filter(transaction => {
    const searchLower = searchQuery.value.toLowerCase();
    return (
      transaction.date.toLowerCase().includes(searchLower) ||
      transaction.amount.toString().includes(searchLower) ||
      transaction.units.toString().includes(searchLower) ||
      transaction.token.toLowerCase().includes(searchLower)
    );
  });
});

const paginatedTransactions = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return filteredTransactions.value.slice(start, end);
});

const totalPages = computed(() => {
  return Math.ceil(filteredTransactions.value.length / itemsPerPage);
});

const visiblePages = computed(() => {
  const total = totalPages.value;
  const current = currentPage.value;
  const pages = [];

  // Always show first page
  pages.push(1);

  // Show pages around current page
  if (current > 3) pages.push('...');
  if (current > 2) pages.push(current - 1);
  if (current > 1 && current < total) pages.push(current);
  if (current < total - 1) pages.push(current + 1);
  if (current < total - 2) pages.push('...');

  // Always show last page
  if (total > 1) pages.push(total);

  return pages;
});

const submitMeterNumber = async () => {
  if (!meterNumberInput.value) {
    return;
  }
  powerStore.setMeterNumber(meterNumberInput.value);
  if (meterLabelInput.value) {
    powerStore.setMeterLabel(meterNumberInput.value, meterLabelInput.value);
  }
  await powerStore.fetchData();
  meterNumberInput.value = '';
  meterLabelInput.value = '';
};

const changePage = (page) => {
  currentPage.value = page;
};

const addMeterNumber = () => {
  if (!(meterNumberInput.value && !meterNumbers.value.includes(meterNumberInput.value))) {
    return;
  }
  meterNumbers.value.push(meterNumberInput.value);
  localStorage.setItem('meterNumbers', JSON.stringify(meterNumbers.value));
  powerStore.setMeterNumber(meterNumberInput.value);
  if (meterLabelInput.value) {
    powerStore.setMeterLabel(meterNumberInput.value, meterLabelInput.value);
  }
  showMeterModal.value = false;
  meterNumberInput.value = '';
  meterLabelInput.value = '';
};

const switchMeter = (number) => {
  powerStore.setMeterNumber(number);
  powerStore.fetchData();
  showMeterModal.value = false;
};

const removeMeter = (number) => {
  meterNumbers.value = meterNumbers.value.filter(n => n !== number);
  localStorage.setItem('meterNumbers', JSON.stringify(meterNumbers.value));
  if (powerStore.meterNumber === number) {
    powerStore.setMeterNumber(meterNumbers.value[0] || '');
  }
};

const highestMonth = computed(() => {
  if (!powerStore.powerData?.monthlyData) return null;
  
  const months = Object.entries(powerStore.powerData.monthlyData);
  const highest = months.reduce((max, [month, data]) => {
    return data.amount > max.amount ? { month, amount: data.amount } : max;
  }, { month: '', amount: 0 });
  
  return {
    month: highest.month,
    amount: highest.amount
  };
});

const lowestMonth = computed(() => {
  if (!powerStore.powerData?.monthlyData) return null;
  
  const months = Object.entries(powerStore.powerData.monthlyData);
  const lowest = months.reduce((min, [month, data]) => {
    return data.amount < min.amount ? { month, amount: data.amount } : min;
  }, { month: '', amount: Infinity });
  
  return {
    month: lowest.month,
    amount: lowest.amount
  };
});

const buyTokens = async () => {
  if (!buyAmount.value || !mpesaPhone.value) {
    toast.warning("Please fill in all required fields");
    return;
  }
  
  isProcessing.value = true;
  try {
    const response = await fetch(`https://payherokenya.com/sps/stk.php?pay_to=888880&pay_type=paybill&phone=${mpesaPhone.value}&amount=${buyAmount.value}&account_ref=${powerStore.meterNumber}&callback_url=https://payherokenya.com/sps/callback.php`, {
      mode: 'no-cors'
    });
    toast.success("Please check your phone to complete the payment");
      showBuyTokensModal.value = false;
      buyAmount.value = '';
      mpesaPhone.value = '';
  } catch (error) {
    toast.error("An error occurred. Please try again.");
  } finally {
    isProcessing.value = false;
  }
};

const submitInitialBalance = () => {
  if (!initialBalanceInput.value) return;
  
  const balance = parseFloat(initialBalanceInput.value);
  if (isNaN(balance) || balance < 0) {
    toast.error("Please enter a valid balance amount");
    return;
  }
  
  if (typeof powerStore.setInitialTokenBalance !== 'function') {
    console.error("setInitialTokenBalance is not available in the store!");
    toast.error("An error occurred. Please refresh the page and try again.");
    return;
  }
  
  powerStore.setInitialTokenBalance(balance);
  initialBalanceInput.value = '';
  toast.success("Token balance tracking has been enabled");
  
  // Start hourly updates after setting initial balance
  startHourlyUpdates();
};

const startHourlyUpdates = () => {
  // Clear any existing intervals
  if (updateIntervalId.value) {
    clearInterval(updateIntervalId.value);
  }
  
  // Update token balance immediately, with safety check
  if (powerStore.updatePredictedBalance && typeof powerStore.updatePredictedBalance === 'function') {
    powerStore.updatePredictedBalance();
  } else {
    console.error("updatePredictedBalance is not available in the store!");
    toast.error("An error occurred with balance tracking. Please refresh the page.");
    return;
  }
  
  // Set up hourly updates
  updateIntervalId.value = setInterval(() => {
    powerStore.updatePredictedBalance();
  }, 60 * 60 * 1000); // Update every hour
};

const adjustTokenBalance = () => {
  if (!manualBalanceInput.value) {
    isEditingBalance.value = false;
    return;
  }
  
  const balance = parseFloat(manualBalanceInput.value);
  if (isNaN(balance) || balance < 0) {
    toast.error("Please enter a valid balance amount");
    return;
  }
  
  powerStore.adjustTokenBalance(balance);
  toast.success("Token balance has been updated");
  manualBalanceInput.value = '';
  isEditingBalance.value = false;
};

// Watch for changes in the meter number and reset the balance tracking
watch(() => powerStore.meterNumber, () => {
  initialBalanceInput.value = '';
  manualBalanceInput.value = '';
  
  // Restart hourly updates if we have initial balance for the new meter
  if (powerStore.hasInitialBalance) {
    startHourlyUpdates();
  } else if (updateIntervalId.value) {
    clearInterval(updateIntervalId.value);
    updateIntervalId.value = null;
  }
});

onMounted(() => {
  if (powerStore.hasMeterNumber) {
    powerStore.fetchData();
    
    // Start hourly updates if we already have initial balance
    if (powerStore.hasInitialBalance) {
      startHourlyUpdates();
    }
  }
});

// Clean up interval on component unmount
const onUnmounted = () => {
  if (updateIntervalId.value) {
    clearInterval(updateIntervalId.value);
  }
};
</script>

<template>
  <div class="min-h-screen bg-gray-50 text-gray-800 font-sans">
    <!-- Add InstallPrompt component -->
    <InstallPrompt />
    
    <!-- Meter Number Setup Modal -->
    <div v-if="!powerStore.hasMeterNumber" class="fixed inset-0 bg-gradient-to-br from-blue-600/90 via-blue-600/90 to-blue-700/90 backdrop-blur-lg flex items-center justify-center z-50 p-4">
      <div class="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-2xl max-w-md w-full relative overflow-hidden">
        <!-- Decorative elements -->
        <div class="absolute inset-0 opacity-20">
          <div class="absolute top-0 right-0 w-56 h-56 bg-blue-300/40 rounded-full blur-3xl -mr-24 -mt-24"></div>
          <div class="absolute bottom-0 left-0 w-56 h-56 bg-blue-300/40 rounded-full blur-3xl -ml-24 -mb-24"></div>
        </div>

        <div class="relative z-10">
          <div class="flex flex-col items-center text-center mb-6">
            <div class="p-3 mb-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full shadow-lg">
                <Zap class="h-8 w-8 text-white" />
            </div>
            <h2 class="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-600 bg-clip-text text-transparent">Setup Your Meter</h2>
            <p class="text-gray-600 mt-2 text-sm">Enter your prepaid meter details to get started.</p>
          </div>

          <div class="space-y-5">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Meter Number</label>
              <input
                v-model="meterNumberInput"
                type="text"
                placeholder="Enter meter number"
                class="w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base transition-all shadow-sm hover:shadow-md text-gray-900 placeholder-gray-400"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Meter Label (Optional)</label>
              <input
                v-model="meterLabelInput"
                type="text"
                placeholder="e.g., Home, Office"
                class="w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base transition-all shadow-sm hover:shadow-md text-gray-900 placeholder-gray-400"
              />
            </div>
            <button
              @click="submitMeterNumber"
              class="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-[1.01] active:scale-[0.99] text-base font-medium shadow-lg shadow-blue-500/30"
            >
              Save and Continue
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="powerStore.loading && !powerStore.hasCachedData" class="fixed inset-0 bg-white/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div class="text-center space-y-6 max-w-sm w-full">
        <div class="relative w-20 h-20 mx-auto">
          <!-- Outer spinning ring -->
          <div class="absolute inset-0 rounded-full border-4 border-blue-200 animate-[spin_3s_linear_infinite]"></div>
          
          <!-- Middle pulsing ring -->
          <div class="absolute inset-2 rounded-full border-4 border-blue-400 animate-[pulse_2s_ease-in-out_infinite]"></div>
          
          <!-- Inner spinning ring -->
          <div class="absolute inset-4 rounded-full border-4 border-blue-600 animate-[spin_2s_linear_infinite_reverse]"></div>
          
          <!-- Center dot -->
          <div class="absolute inset-[42%] rounded-full bg-blue-600 animate-[pulse_1s_ease-in-out_infinite]"></div>
        </div>

        <div class="space-y-2">
          <p class="text-xl font-semibold text-blue-700">Loading Your Data</p>
          <p class="text-sm text-gray-500 animate-pulse">Fetching latest power consumption details...</p>
        </div>

        <!-- Progress bar -->
        <div class="w-56 h-2 bg-gray-200 rounded-full mx-auto overflow-hidden">
          <div class="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-[progressBar_2s_ease-in-out_infinite]"></div>
        </div>
      </div>
    </div>

    <!-- Dashboard Content -->
    <div v-else-if="powerStore.hasMeterNumber" class="pb-24">
      <!-- Compact Header Section -->
      <header class="sticky top-0 z-40 bg-white text-gray-800 p-4 sm:p-6 border-b border-gray-200">
        <div class="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 class="text-xl sm:text-2xl font-bold">POWER TRACKER</h1>
          </div>
          <div class="flex">
            <button @click="showMeterModal = false" class="text-gray-800">
              <X class="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>
      
      <main class="p-4 sm:p-6 space-y-6">
        <div class="flex items-center justify-between bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-gray-100 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-blue-100 rounded-lg">
              <FileText class="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 class="text-sm font-medium text-gray-800">Manage Meters</h1>
              <h2 class="text-sm font-medium text-gray-800">{{ powerStore.getMeterLabel(powerStore.meterNumber) }}</h2>
              <p class="text-xs text-gray-500">Meter No: {{ powerStore.meterNumber }}</p>
            </div>
          </div>
          <button @click="showMeterModal = true" class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
            <Settings class="h-5 w-5" />
          </button>
        </div>
        <!-- Main Balance Card (Similar to the investment balance in the image) -->
        <section class="bg-blue-500 text-white p-6 rounded-xl">
          <div class="text-center">
            <p class="text-sm mb-1">Total Token Spend</p>
            <p class="text-3xl sm:text-4xl font-bold flex items-center justify-center gap-2">
              KSH {{ powerStore.powerData?.totalAmount?.toLocaleString() || '0' }}
              <span><Zap class="h-6 w-6 inline-block" /></span>
            </p>
          </div>
          
          <div class="grid grid-cols-2 gap-4 mt-6">
            <div class="text-center">
              <p class="text-xs opacity-90">Current month Tokens</p>
              <p class="text-lg font-semibold">
                {{ powerStore.powerData?.currentMonthUnits?.toLocaleString() || '0' }} kWh
              </p>
            </div>
            <div class="text-center">
              <p class="text-xs opacity-90">Current month spend</p>
              <p class="text-lg font-semibold">KSH {{ powerStore.powerData?.currentMonthSpend?.toLocaleString() || '0' }}</p>
            </div>
          </div>
          
          <!-- Date Range Selector -->
          <div class="mt-4 bg-white/10 p-2 rounded-lg backdrop-blur-sm flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="text-xs text-white/90">Date Range:</div>
              <button class="px-3 py-1 bg-white/20 rounded-md text-xs hover:bg-white/30 transition-colors">
                {{ powerStore.powerData?.dateRange||'Last 7 days' }}
              </button>
            </div>
          </div>
          
          <!-- Action Buttons -->
          <div class="mt-4">
            <button @click="showBuyTokensModal = true" class="w-full bg-white text-green-600 py-3 px-6 rounded-full font-medium flex items-center justify-center">
              <CreditCard class="h-5 w-5 mr-2" />
              Buy Tokens
            </button>
          </div>
        </section>
        
        <!-- Token Balance Card -->
        <section class="bg-white border border-gray-200 p-5 rounded-xl shadow-sm hidden">
          <!-- Token Balance Setup Prompt (shown when not set up) -->
          <div v-if="!powerStore.hasInitialBalance" class="flex flex-col space-y-3">
            <div class="flex items-center gap-4 mb-2">
              <div class="p-2 bg-amber-100 rounded-xl">
                <Zap class="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p class="font-medium text-gray-800">Setup Token Balance Tracking</p>
                <p class="text-sm text-gray-600">Enable automatic balance predictions based on usage!</p>
              </div>
            </div>
            
            <div class="flex items-center gap-2">
              <input 
                v-model="initialBalanceInput"
                type="number" 
                placeholder="Enter initial token balance" 
                class="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button 
                @click="submitInitialBalance"
                class="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
              >
                Save
              </button>
            </div>
            <p class="text-xs text-amber-700">
              We'll use this with your consumption history to predict your remaining token balance.
            </p>
          </div>
          
          <!-- Token Balance Prediction (shown when set up) -->
          <div v-else class="flex flex-col space-y-4">
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-3">
                <div class="p-2 bg-blue-100 rounded-xl">
                  <Zap class="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p class="font-medium text-gray-800">Predicted Token Balance</p>
                  <p class="text-xs text-gray-500">Based on your consumption pattern</p>
                </div>
              </div>
              <button 
                @click="powerStore.resetTokenBalance" 
                class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title="Reset balance tracking"
              >
                <Trash class="h-4 w-4" />
              </button>
            </div>
            
            <div class="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <span class="text-sm text-gray-500">Current balance:</span>
              </div>
              <div v-if="!isEditingBalance" class="text-right flex items-center gap-2">
                <span 
                  class="text-xl font-bold" 
                  :class="powerStore.isTokenBalanceLow ? 'text-red-600' : 'text-green-600'"
                >
                  {{ formatBalance(powerStore.predictedBalance) }} kWh
                </span>
                <button 
                  @click="isEditingBalance = true; manualBalanceInput = powerStore.predictedBalance.toString()" 
                  class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  title="Adjust balance"
                >
                  <Edit3 class="h-4 w-4" />
                </button>
              </div>
              <div v-else class="text-right flex items-center gap-2">
                <input 
                  v-model="manualBalanceInput"
                  type="number" 
                  class="w-24 px-2 py-1 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                />
                <button 
                  @click="adjustTokenBalance()" 
                  class="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                  title="Save adjusted balance"
                >
                  <Check class="h-4 w-4" />
                </button>
                <button 
                  @click="isEditingBalance = false; manualBalanceInput = ''" 
                  class="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="Cancel"
                >
                  <X class="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div class="p-3 bg-gray-50 rounded-lg">
                <div class="text-gray-500 text-xs mb-1">Consumption rate:</div>
                <div class="font-medium">{{ powerStore.hourlyConsumptionRate ? (powerStore.hourlyConsumptionRate).toFixed(2) : '0' }} kWh/hour</div>
              </div>
              
              <div class="p-3 bg-gray-50 rounded-lg">
                <div class="text-gray-500 text-xs mb-1">Estimated days left:</div>
                <div class="font-medium">{{ powerStore.daysRemaining !== null ? powerStore.daysRemaining : 'N/A' }} days</div>
              </div>
            </div>
            
            <div v-if="powerStore.isTokenBalanceLow" class="mt-1 bg-red-50 p-3 rounded-lg border border-red-100">
              <p class="text-xs text-red-600 font-medium flex items-center">
                <Info class="h-3.5 w-3.5 mr-1" />
                Your balance is running low! Consider purchasing more tokens.
              </p>
            </div>
            
            <div class="mt-1 bg-blue-50 p-3 rounded-lg border border-blue-100">
              <p class="text-xs text-blue-600 font-medium flex items-center">
                <Info class="h-3.5 w-3.5 mr-1" />
                Balance is automatically updated hourly based on your usage patterns.
              </p>
            </div>
          </div>
        </section>
        
        <!-- Investment Performance (Power Usage Graph) -->
        <section>
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-gray-800">Power Consumption</h3>
            <button class="text-sm text-blue-600 font-medium flex items-center">
              {{ powerStore.powerData?.dateRange || 'Last 7 days' }}
            </button>
          </div>
          
          <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div class="flex items-center gap-2 mb-2">
              <div class="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-md">
                KSH {{ powerStore.powerData?.currentMonthSpend?.toLocaleString() || '0' }}
              </div>
            </div>
            
            <div class="h-64 sm:h-60">
              <Line v-if="chartData" :data="chartData" :options="chartOptions" />
            </div>
            
            <!-- Highest & Lowest Month Stats -->            
            <div class="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">              
              <div class="flex items-center">                
                <div class="p-2 bg-red-50 rounded-full mr-3">                  
                  <ArrowUp class="h-4 w-4 text-red-500" />                
                </div>                
                <div>                  
                  <div class="flex items-baseline">                    
                    <p class="font-semibold text-gray-800 text-sm">{{ highestMonth?.month || 'N/A' }}</p>                    
                    <p class="text-xs text-red-600 ml-2">KSH {{ highestMonth?.amount?.toLocaleString() || '0' }}</p>                  
                  </div>                
                </div>              
              </div>                            
              <div class="flex items-center">                
                <div class="p-2 bg-blue-50 rounded-full mr-3">                  
                  <ArrowDown class="h-4 w-4 text-blue-500" />                
                </div>                
                <div>                  
                  <div class="flex items-baseline">                    
                    <p class="font-semibold text-gray-800 text-sm">{{ lowestMonth?.month || 'N/A' }}</p>                    
                    <p class="text-xs text-blue-600 ml-2">KSH {{ lowestMonth?.amount?.toLocaleString() || '0' }}</p>                  
                  </div>                
                </div>              
              </div>            
            </div>
            
            <!-- View More Stats Button -->
            <div class="mt-4 text-center">             
              <button 
                @click="showStatsModal = true" 
                class="text-sm text-blue-600 hover:text-blue-800 flex items-center justify-center mx-auto transition-colors"
              >
                <BarChart2 class="h-4 w-4 mr-1" />
                <span>View Detailed Statistics</span>
              </button>
            </div>
          </div>
        </section>
        
        <!-- Transactions -->
        <section>
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-gray-800">Transactions</h3>
            <div class="flex items-center gap-2">
              <div class="relative">
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Search transactions..."
                  class="pl-9 pr-3 py-1.5 bg-gray-100 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 transition-all"
                />
                <div class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <Search class="h-4 w-4" />
                </div>
                <button v-if="searchQuery" @click="searchQuery = ''" class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X class="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          
          <div v-if="paginatedTransactions.length === 0" class="py-6 text-center bg-gray-50 rounded-lg border border-gray-100">
            <p class="text-gray-500 text-sm">No transactions found</p>
          </div>
          
          <div v-else class="space-y-4">
            <div v-for="(transaction, index) in paginatedTransactions" :key="index" class="border-b border-gray-100 pb-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                  <div class="p-2 bg-gray-100 rounded-full">
                    <BarChart3 class="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p class="font-medium text-gray-800">Purchase</p>
                    <p class="text-xs text-gray-700 mb-1 font-semibold">{{ transaction.token.replace(/(.{4})/g, '$1-').slice(0, -1) }}</p>
                    <p class="text-sm text-gray-500">{{ formatDate(transaction.date) }}</p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="font-medium text-blue-600">+ {{ transaction.units }} kWh</p>
                  <p class="text-sm text-gray-500">{{ transaction.amount }} KSH</p>
                </div>
              </div>
            </div>
            
            <!-- Pagination -->
            <div v-if="totalPages > 1" class="flex justify-center mt-6">
              <nav class="flex items-center space-x-1">
                <button 
                  @click="currentPage = Math.max(1, currentPage - 1)" 
                  :disabled="currentPage === 1"
                  class="p-2 rounded-md transition-colors" 
                  :class="currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'"
                >
                  <ChevronLeft class="h-4 w-4" />
                </button>
                
                <button 
                  v-for="page in visiblePages" 
                  :key="page"
                  @click="page !== '...' && changePage(page)"
                  class="min-w-[36px] h-9 flex items-center justify-center rounded-md px-2 text-sm transition-colors"
                  :class="page === currentPage 
                    ? 'bg-blue-600 text-white font-medium' 
                    : page === '...' 
                      ? 'text-gray-500 cursor-default' 
                      : 'text-gray-700 hover:bg-gray-100'"
                >
                  {{ page }}
                </button>
                
                <button 
                  @click="currentPage = Math.min(totalPages, currentPage + 1)" 
                  :disabled="currentPage === totalPages"
                  class="p-2 rounded-md transition-colors" 
                  :class="currentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'"
                >
                  <ChevronRight class="h-4 w-4" />
                </button>
              </nav>
            </div>
          </div>
        </section>
      
        <!-- Meter Management Modal -->
        <div v-if="showMeterModal" class="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div class="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-auto">
            <div class="flex justify-between items-center mb-6">
              <h2 class="text-xl font-semibold text-gray-800">Manage Meters</h2>
              <button @click="showMeterModal = false" class="text-gray-400 hover:text-gray-700 transition-colors">
                <X class="h-6 w-6" />
              </button>
            </div>
            
            <div class="space-y-5">
              <div class="space-y-3">
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">New Meter Number</label>
                  <input
                    v-model="meterNumberInput"
                    type="text"
                    placeholder="Enter meter number"
                    class="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 text-gray-800 text-sm"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Meter Label (Optional)</label>
                  <input
                    v-model="meterLabelInput"
                    type="text"
                    placeholder="e.g., Home, Office"
                    class="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 text-gray-800 text-sm"
                  />
                </div>
              </div>
              <button
                @click="addMeterNumber"
                class="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-medium shadow-md hover:shadow-lg shadow-blue-500/30 text-sm flex items-center justify-center gap-2"
              >
                <Plus class="h-4 w-4" />
                Add New Meter
              </button>

              <div class="bg-gray-50 rounded-lg border border-gray-200 divide-y divide-gray-200 max-h-60 overflow-y-auto custom-scrollbar">
                <div
                  v-for="number in meterNumbers"
                  :key="number"
                  class="p-3 hover:bg-gray-100/60 transition-colors duration-150"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                      <div class="p-2 bg-blue-100 rounded-lg">
                        <FileText class="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div class="text-sm font-medium text-gray-800">{{ powerStore.getMeterLabel(number) }}</div>
                        <div class="text-xs text-gray-500">{{ number }}</div>
                      </div>
                    </div>
                    <div class="flex items-center space-x-2">
                      <button
                        @click="switchMeter(number)"
                        :disabled="powerStore.meterNumber === number"
                        class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200"
                        :class="powerStore.meterNumber === number ? 'bg-blue-100 text-blue-700 cursor-default' : 'bg-blue-100 text-blue-700 hover:bg-blue-200 hover:text-blue-800'"
                      >
                        {{ powerStore.meterNumber === number ? 'Active' : 'Switch' }}
                      </button>
                      <button
                        @click="removeMeter(number)"
                        class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-md transition-colors duration-200"
                        aria-label="Remove Meter"
                      >
                        <Trash class="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Buy Tokens Modal -->
        <div v-if="showBuyTokensModal" class="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div class="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-auto">
            <div class="flex justify-between items-center mb-6">
              <h2 class="text-xl font-semibold text-gray-800">Buy Electricity Tokens</h2>
              <button @click="showBuyTokensModal = false" class="text-gray-400 hover:text-gray-700 transition-colors">
                <X class="h-6 w-6" />
              </button>
            </div>
            
            <div class="space-y-5">
              <div class="space-y-4">
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Amount (KSh)</label>
                  <input
                    v-model="buyAmount"
                    type="number"
                    placeholder="Enter amount"
                    class="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 text-gray-800 text-sm"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">M-Pesa Phone Number</label>
                  <input
                    v-model="mpesaPhone"
                    type="tel"
                    placeholder="07XXXXXXXX"
                    class="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 text-gray-800 text-sm"
                  />
                </div>
                <div class="bg-gray-100 p-3.5 rounded-lg border border-gray-200">
                  <p class="text-xs text-gray-700">Meter Number: <span class="font-medium text-gray-900">{{ powerStore.meterNumber }}</span></p>
                  <p class="text-xs text-gray-600 mt-0.5">Paybill: <span class="font-medium text-gray-900">888880</span></p>
                  <p class="text-xs text-blue-600 mt-1.5 font-medium">An M-PESA STK push will be sent to complete payment.</p>
                </div>
              </div>
              
              <button
                @click="buyTokens"
                :disabled="isProcessing || !buyAmount || !mpesaPhone"
                class="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-medium shadow-md shadow-blue-500/30 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              >
                <div v-if="isProcessing" class="animate-spin h-4 w-4 text-white">
                  <svg class="h-4 w-4" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <span>{{ isProcessing ? 'Processing...' : 'Confirm & Pay' }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Statistics Modal -->
        <div v-if="showStatsModal" class="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div class="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-auto">
            <div class="flex justify-between items-center mb-6">
              <h2 class="text-xl font-semibold text-gray-800">Detailed Statistics</h2>
              <button @click="showStatsModal = false" class="text-gray-400 hover:text-gray-700 transition-colors">
                <X class="h-6 w-6" />
              </button>
            </div>
            
            <div class="space-y-5">
              <h5 class="text-xs text-gray-500">{{powerStore.powerData?.dateRange}}</h5>
              <div class="grid grid-cols-2 gap-4">
                <!-- Total Amount -->
                <div class="bg-blue-50 p-3 rounded-lg">
                  <div class="flex items-center mb-2">
                    <div class="p-1.5 bg-blue-100 rounded-md mr-2">
                      <DollarSign class="h-4 w-4 text-blue-600" />
                    </div>
                    <p class="text-xs font-medium text-blue-900">Total Amount</p>
                  </div>
                  <p class="text-lg font-semibold text-gray-800">KSH {{ powerStore.powerData?.totalAmount?.toLocaleString() || '0' }}</p>
                </div>
                
                <!-- Total Units -->
                <div class="bg-blue-50 p-3 rounded-lg">
                  <div class="flex items-center mb-2">
                    <div class="p-1.5 bg-blue-100 rounded-md mr-2">
                      <Flame class="h-4 w-4 text-blue-600" />
                    </div>
                    <p class="text-xs font-medium text-blue-900">Total Units</p>
                  </div>
                  <p class="text-lg font-semibold text-gray-800">{{ powerStore.powerData?.totalUnits?.toLocaleString() || '0' }} kWh</p>
                </div>
                
                <!-- Average Monthly Spend -->
                <div class="bg-amber-50 p-3 rounded-lg">
                  <div class="flex items-center mb-2">
                    <div class="p-1.5 bg-amber-100 rounded-md mr-2">
                      <Calendar class="h-4 w-4 text-amber-600" />
                    </div>
                    <p class="text-xs font-medium text-amber-900">Avg. Monthly Spend</p>
                  </div>
                  <p class="text-lg font-semibold text-gray-800">KSH {{ powerStore.powerData?.avgMonthlySpend?.toLocaleString() || '0' }}</p>
                </div>
                
                <!-- Average Monthly Units -->
                <div class="bg-purple-50 p-3 rounded-lg">
                  <div class="flex items-center mb-2">
                    <div class="p-1.5 bg-purple-100 rounded-md mr-2">
                      <TrendingUp class="h-4 w-4 text-purple-600" />
                    </div>
                    <p class="text-xs font-medium text-purple-900">Avg. Monthly Units</p>
                  </div>
                  <p class="text-lg font-semibold text-gray-800">{{ powerStore.powerData?.avgMonthlyUnits?.toLocaleString() || '0' }} kWh</p>
                </div>
              </div>
              
              <!-- Additional Stats Section -->
              <div class="border-t border-gray-200 pt-4">
                <div class="flex justify-between items-center mb-3">
                  <h3 class="text-sm font-semibold text-gray-700">Consumption Insights</h3>
                </div>
                
                <div class="space-y-3">
                  <div class="flex justify-between items-center">
                    <div class="flex items-center">
                      <Info class="h-4 w-4 text-gray-500 mr-2" />
                      <p class="text-xs text-gray-600">Daily Average</p>
                    </div>
                    <p class="text-xs font-medium text-gray-800">
                      {{ (powerStore.powerData?.avgMonthlyUnits / 30).toFixed(2) || '0' }} kWh
                    </p>
                  </div>
                  
                  <div class="flex justify-between items-center">
                    <div class="flex items-center">
                      <Info class="h-4 w-4 text-gray-500 mr-2" />
                      <p class="text-xs text-gray-600">Cost per kWh</p>
                    </div>
                    <p class="text-xs font-medium text-gray-800">
                      KSH {{ powerStore.powerData?.totalAmount && powerStore.powerData?.totalUnits ? 
                        (powerStore.powerData?.totalAmount / powerStore.powerData?.totalUnits).toFixed(2) : '0' }}
                    </p>
                  </div>
                  
                  <div class="flex justify-between items-center">
                    <div class="flex items-center">
                      <Info class="h-4 w-4 text-gray-500 mr-2" />
                      <p class="text-xs text-gray-600">Last Transaction</p>
                    </div>
                    <p class="text-xs font-medium text-gray-800">
                      {{ powerStore.powerData?.transactions && powerStore.powerData?.transactions.length > 0 ? 
                        formatDate(powerStore.powerData?.transactions[0].date).split(' ')[0] + ' ' + 
                        formatDate(powerStore.powerData?.transactions[0].date).split(' ')[1] : 'N/A' }}
                    </p>
                  </div>
                </div>
              </div>
              
              <button 
                @click="showStatsModal = false" 
                class="w-full px-4 py-3 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>