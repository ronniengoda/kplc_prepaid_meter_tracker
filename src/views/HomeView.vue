<script setup>
import { ref, onMounted, computed } from 'vue';
import { usePowerStore } from '../stores/powerStore';
import { Bar } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const powerStore = usePowerStore();
const meterNumberInput = ref('');
const meterLabelInput = ref('');
const searchQuery = ref('');
const currentPage = ref(1);
const itemsPerPage = 10;
const showMeterModal = ref(false);
const meterNumbers = ref(JSON.parse(localStorage.getItem('meterNumbers') || '[]'));

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
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1
      },
      {
        label: 'Units (kWh)',
        data: units,
        backgroundColor: 'rgba(16, 185, 129, 0.7)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 1
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
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        display: true,
        color: 'rgba(0, 0, 0, 0.05)'
      }
    },
    x: {
      grid: {
        display: false
      }
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
  if (meterNumberInput.value) {
    powerStore.setMeterNumber(meterNumberInput.value);
    if (meterLabelInput.value) {
      powerStore.setMeterLabel(meterNumberInput.value, meterLabelInput.value);
    }
    await powerStore.fetchData();
    meterNumberInput.value = '';
    meterLabelInput.value = '';
  }
};

const changePage = (page) => {
  currentPage.value = page;
};

const addMeterNumber = () => {
  if (meterNumberInput.value && !meterNumbers.value.includes(meterNumberInput.value)) {
    meterNumbers.value.push(meterNumberInput.value);
    localStorage.setItem('meterNumbers', JSON.stringify(meterNumbers.value));
    powerStore.setMeterNumber(meterNumberInput.value);
    if (meterLabelInput.value) {
      powerStore.setMeterLabel(meterNumberInput.value, meterLabelInput.value);
    }
    showMeterModal.value = false;
    meterNumberInput.value = '';
    meterLabelInput.value = '';
  }
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

onMounted(() => {
  if (powerStore.hasMeterNumber) {
    powerStore.fetchData();
  }
});
</script>

<template>
  <div class="min-h-screen bg-gray-100 p-4 sm:p-6">
    <!-- Meter Number Setup Modal -->
    <div v-if="!powerStore.hasMeterNumber" class="fixed inset-0 bg-gradient-to-br from-blue-600/90 via-indigo-600/90 to-purple-700/90 backdrop-blur-md flex items-center justify-center z-50">
      <div class="bg-white/90 backdrop-blur-sm p-10 rounded-3xl shadow-2xl max-w-md w-full relative overflow-hidden">
        <!-- Decorative elements -->
        <div class="absolute inset-0 opacity-15">
          <div class="absolute top-0 right-0 w-64 h-64 bg-blue-400/30 rounded-full blur-3xl -mr-32 -mt-32"></div>
          <div class="absolute bottom-0 left-0 w-64 h-64 bg-purple-400/30 rounded-full blur-3xl -ml-32 -mb-32"></div>
        </div>

        <div class="relative z-10">
          <div class="flex items-center gap-4 mb-6">
            <div class="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg">
              <svg class="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 class="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Setup Your Prepaid Meter</h2>
          </div>

          <p class="text-gray-600 mb-8 text-lg">Please enter your prepaid meter details to view your power consumption data.</p>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Meter Number</label>
              <input
                v-model="meterNumberInput"
                type="text"
                placeholder="Enter meter number"
                class="w-full px-6 py-4 bg-white border-2 border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg transition-all shadow-sm hover:shadow-md text-gray-900 placeholder-gray-400"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Meter Label (Optional)</label>
              <input
                v-model="meterLabelInput"
                type="text"
                placeholder="e.g., Home, Office, Main House"
                class="w-full px-6 py-4 bg-white dark:bg-gray-700 border-2 border-gray-100 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg transition-all shadow-sm hover:shadow-md text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
            <button
              @click="submitMeterNumber"
              class="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-[1.02] active:scale-[0.98] text-lg font-medium shadow-lg"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="powerStore.loading && !powerStore.hasCachedData" class="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div class="text-center space-y-6">
        <div class="relative w-24 h-24 mx-auto">
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
          <p class="text-lg font-medium text-gray-800">Loading your power consumption data...</p>
          <p class="text-sm text-gray-500 animate-pulse">Please wait while we fetch your latest information</p>
        </div>

        <!-- Progress bar -->
        <div class="w-48 h-1.5 bg-gray-200 rounded-full mx-auto overflow-hidden">
          <div class="h-full bg-blue-600 rounded-full animate-[progressBar_2s_ease-in-out_infinite]"></div>
        </div>
      </div>
    </div>

    <!-- Dashboard Content -->
    <div v-else-if="powerStore.hasMeterNumber" class="space-y-6">
      <!-- Enhanced Header Section -->
      <div class="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-8 sm:p-10 rounded-3xl shadow-2xl text-white relative overflow-hidden">
        <!-- Enhanced decorative elements -->
        <div class="absolute inset-0 opacity-15">
          <div class="absolute top-0 right-0 w-96 h-96 bg-white/30 rounded-full blur-3xl -mr-48 -mt-48 mix-blend-overlay"></div>
          <div class="absolute bottom-0 left-0 w-96 h-96 bg-white/30 rounded-full blur-3xl -ml-48 -mb-48 mix-blend-overlay"></div>
          <div class="absolute inset-0 bg-gradient-to-tr from-black/5 to-transparent"></div>
        </div>
        
        <div class="relative z-10 max-w-7xl mx-auto">
          <div class="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-8">
            <div class="flex-1 space-y-8">
              <div class="flex items-center gap-5">
                <div class="p-3 bg-white/10 rounded-2xl backdrop-blur-sm shadow-lg">
                  <svg class="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h1 class="text-4xl lg:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-white/80">
                  Power Consumption
                </h1>
              </div>
              
              <div class="grid sm:grid-cols-2 gap-6">
                <div class="flex items-start gap-4 bg-white/10 p-5 rounded-2xl backdrop-blur-sm shadow-lg transform transition-all hover:translate-y-[-2px]">
                  <div class="p-3 bg-white/15 rounded-xl shadow-inner">
                    <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div class="space-y-2">
                    <p class="text-sm font-medium text-blue-100/80">Meter Label</p>
                    <p class="text-xl font-bold tracking-tight">{{ powerStore.getMeterLabel(powerStore.meterNumber) }}</p>
                    <p class="text-sm text-blue-200/90 font-medium">{{ powerStore.meterNumber }}</p>
                  </div>
                </div>
                
                <div class="flex items-start gap-4 bg-white/10 p-5 rounded-2xl backdrop-blur-sm shadow-lg transform transition-all hover:translate-y-[-2px]">
                  <div class="p-3 bg-white/15 rounded-xl shadow-inner">
                    <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div class="space-y-2">
                    <p class="text-sm font-medium text-blue-100/80">Date Range</p>
                    <p class="text-xl font-bold tracking-tight">{{ powerStore.powerData?.dateRange }}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="flex flex-col sm:flex-row lg:flex-col gap-6 lg:min-w-[280px]">
              <div class="flex-1 lg:flex-none bg-white/10 p-5 rounded-2xl backdrop-blur-sm shadow-lg">
                <div class="space-y-2">
                  <p class="text-sm font-medium text-blue-100/80">Last Updated</p>
                  <p class="text-xl font-bold tracking-tight">{{ new Date().toLocaleString() }}</p>
                </div>
              </div>
              
              <button
                @click="showMeterModal = true"
                class="flex-1 lg:flex-none px-8 py-4 bg-white/15 hover:bg-white/20 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-3 font-semibold backdrop-blur-sm group"
              >
                <svg class="h-5 w-5 transform group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Manage Meters</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Meter Management Modal -->
      <div v-if="showMeterModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
        <div class="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-2xl shadow-2xl max-w-md w-full text-white border border-white/10">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-200 bg-clip-text text-transparent">Manage Meters</h2>
            <button @click="showMeterModal = false" class="text-white/70 hover:text-white transition-colors">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div class="space-y-6">
            <div class="space-y-3">
              <input
                v-model="meterNumberInput"
                type="text"
                placeholder="Enter new meter number"
                class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-white/50 text-white"
              />
              <input
                v-model="meterLabelInput"
                type="text"
                placeholder="Enter label (e.g., Home, Office)"
                class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-white/50 text-white"
              />
            </div>
            <button
              @click="addMeterNumber"
              class="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-medium shadow-lg shadow-blue-500/25"
            >
              Add New Meter
            </button>

            <div class="bg-white/5 rounded-xl divide-y divide-white/10 border border-white/10">
              <div
                v-for="number in meterNumbers"
                :key="number"
                class="flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
              >
                <div class="flex items-center space-x-3">
                  <div class="p-2 bg-white/10 rounded-lg">
                    <svg class="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <div class="font-medium text-white">{{ powerStore.getMeterLabel(number) }}</div>
                    <div class="text-sm text-white/60">{{ number }}</div>
                  </div>
                </div>
                <div class="flex items-center space-x-3">
                  <button
                    @click="switchMeter(number)"
                    :disabled="powerStore.meterNumber === number"
                    class="px-4 py-2 text-sm bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Switch
                  </button>
                  <button
                    @click="removeMeter(number)"
                    class="p-2 text-white/60 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                  >
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 p-6 rounded-lg shadow-sm text-white">
          <h3 class="text-sm font-medium opacity-90">Total Amount</h3>
          <p class="text-3xl font-bold mt-2">KSh {{ powerStore.powerData?.totalAmount?.toLocaleString() }}</p>
          <p class="text-sm opacity-90 mt-1">Total spent on electricity</p>
        </div>
        <div class="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-lg shadow-sm text-white">
          <h3 class="text-sm font-medium opacity-90">Total Units</h3>
          <p class="text-3xl font-bold mt-2">{{ powerStore.powerData?.totalUnits?.toLocaleString() }} kWh</p>
          <p class="text-sm opacity-90 mt-1">Total units consumed</p>
        </div>
        <div class="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-lg shadow-sm text-white">
          <h3 class="text-sm font-medium opacity-90">Avg Monthly Spend</h3>
          <p class="text-3xl font-bold mt-2">KSh {{ powerStore.powerData?.avgMonthlySpend?.toLocaleString() }}</p>
          <p class="text-sm opacity-90 mt-1">Average monthly expenditure</p>
        </div>
        <div class="bg-gradient-to-br from-amber-500 to-amber-600 p-6 rounded-lg shadow-sm text-white">
          <h3 class="text-sm font-medium opacity-90">Avg Monthly Units</h3>
          <p class="text-3xl font-bold mt-2">{{ powerStore.powerData?.avgMonthlyUnits?.toLocaleString() }} kWh</p>
          <p class="text-sm opacity-90 mt-1">Average monthly consumption</p>
        </div>
      </div>

      <!-- Current Month Stats -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 rounded-lg shadow-sm text-white">
          <h3 class="text-sm font-medium opacity-90">Current Month Spend</h3>
          <p class="text-3xl font-bold mt-2">KSh {{ powerStore.powerData?.currentMonthSpend?.toLocaleString() }}</p>
          <p class="text-sm opacity-90 mt-1">Spent this month</p>
        </div>
        <div class="bg-gradient-to-br from-pink-500 to-pink-600 p-6 rounded-lg shadow-sm text-white">
          <h3 class="text-sm font-medium opacity-90">Current Month Units</h3>
          <p class="text-3xl font-bold mt-2">{{ powerStore.powerData?.currentMonthUnits?.toLocaleString() }} kWh</p>
          <p class="text-sm opacity-90 mt-1">Consumed this month</p>
        </div>
      </div>

      <!-- Charts -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white p-6 rounded-lg shadow-sm">
          <div class="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div class="flex items-start">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="ml-3">
                <h4 class="text-sm font-medium text-blue-800">Monthly Overview</h4>
                <p class="mt-1 text-sm text-blue-600">
                  This chart shows your electricity consumption patterns over the past months, helping you track and compare your usage trends.
                </p>
              </div>
            </div>
          </div>
          
          <h3 class="text-lg font-semibold mb-4 text-gray-900">Monthly Consumption</h3>
          <div class="h-80">
            <Bar v-if="chartData" :data="chartData" :options="chartOptions" />
          </div>

          <!-- Monthly Stats -->
          <div class="mt-6 grid grid-cols-2 gap-4">
            <div class="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
              <div class="flex items-center gap-3">
                <div class="p-2 bg-green-100 rounded-lg">
                  <svg class="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-900">Lowest Month</p>
                  <p class="text-lg font-semibold text-gray-900">{{ lowestMonth?.month }}</p>
                  <p class="text-sm text-gray-700">KSh {{ lowestMonth?.amount?.toLocaleString() }}</p>
                </div>
              </div>
            </div>

            <div class="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border border-red-200">
              <div class="flex items-center gap-3">
                <div class="p-2 bg-red-100 rounded-lg">
                  <svg class="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-900">Highest Month</p>
                  <p class="text-lg font-semibold text-gray-900">{{ highestMonth?.month }}</p>
                  <p class="text-sm text-gray-700">KSh {{ highestMonth?.amount?.toLocaleString() }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="bg-white p-6 rounded-lg shadow-sm">
          <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
            <h3 class="text-lg font-semibold text-gray-900">Transaction History</h3>
            <div class="relative w-full sm:w-auto">
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search transactions..."
                class="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
              />
              <svg class="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <!-- Mobile Card View -->
          <div class="sm:hidden space-y-4">
            <div
              v-for="transaction in paginatedTransactions"
              :key="transaction.token"
              class="bg-gray-50 p-4 rounded-lg shadow-sm"
            >
              <div class="flex justify-between items-start mb-2">
                <div class="text-sm text-gray-500">{{ formatDate(transaction.date) }}</div>
                <div class="text-sm font-medium text-blue-600">KSh {{ transaction.amount }}</div>
              </div>
              <div class="flex flex-col space-y-2">
                <div class="text-sm text-gray-900">{{ transaction.units }} kWh</div>
                <div class="text-xs text-gray-500 break-all">{{ transaction.token }}</div>
              </div>
            </div>
          </div>

          <!-- Desktop Table View -->
          <div class="hidden sm:block">
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Units</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Token</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="transaction in paginatedTransactions" :key="transaction.token" class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatDate(transaction.date) }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">KSh {{ transaction.amount }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ transaction.units }} kWh</td>
                    <td class="px-6 py-4 text-sm text-gray-500 break-all">{{ transaction.token }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Pagination -->
          <div class="flex items-center justify-between mt-6">
            <div class="text-sm text-gray-400 font-medium">
              {{ filteredTransactions.length }} results
            </div>
            <div class="flex items-center gap-2">
              <button
                @click="changePage(currentPage - 1)"
                :disabled="currentPage === 1"
                class="p-1.5 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                <svg class="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div class="flex items-center">
                <template v-for="page in visiblePages" :key="page">
                  <button
                    v-if="page !== '...'"
                    @click="changePage(page)"
                    :class="[
                      'w-8 h-8 rounded-full text-sm font-medium transition-colors',
                      currentPage === page 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'text-gray-600 hover:bg-gray-100'
                    ]"
                  >
                    {{ page }}
                  </button>
                  <span v-else class="px-1 text-gray-400">•••</span>
                </template>
              </div>

              <button
                @click="changePage(currentPage + 1)"
                :disabled="currentPage === totalPages"
                class="p-1.5 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                <svg class="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* Add dark mode styles for Chart.js */
.dark .chart-container {
  background-color: #1f2937;
  border-radius: 0.5rem;
  padding: 1rem;
}

.dark .chartjs-grid {
  color: #374151 !important;
}

.dark .chartjs-tooltip {
  background-color: #1f2937 !important;
  border-color: #374151 !important;
  color: #e5e7eb !important;
}

.dark .chartjs-legend {
  color: #e5e7eb !important;
}

/* Add dark mode styles for table */
.dark table {
  color: #e5e7eb;
}

.dark table thead th {
  color: #9ca3af;
}

.dark table tbody tr {
  border-color: #374151;
}

.dark table tbody tr:hover {
  background-color: #374151;
}

/* Add dark mode styles for inputs */
.dark input {
  background-color: #374151;
  border-color: #4b5563;
  color: #e5e7eb;
}

.dark input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
}

/* Add dark mode styles for buttons */
.dark button:not(.bg-blue-600) {
  color: #e5e7eb;
}

.dark button:hover:not(.bg-blue-600) {
  background-color: #374151;
}

/* Add dark mode styles for cards */
.dark .bg-white {
  background-color: #1f2937;
}

.dark .border-gray-200 {
  border-color: #374151;
}

/* Add dark mode styles for text */
.dark .text-gray-900 {
  color: #e5e7eb;
}

.dark .text-gray-700 {
  color: #d1d5db;
}

.dark .text-gray-500 {
  color: #9ca3af;
}

.dark .text-gray-400 {
  color: #9ca3af;
}
</style>
