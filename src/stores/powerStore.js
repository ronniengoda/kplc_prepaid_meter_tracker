import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { fetchPowerData } from '../utils/api';
import { 
  calculateHourlyConsumption, 
  predictCurrentBalance, 
  isBalanceLow,
  estimateDaysRemaining
} from '../utils/tokenBalancePredictor';

export const usePowerStore = defineStore('power', () => {
  const meterNumber = ref(localStorage.getItem('meterNumber') || '');
  const powerData = ref(null);
  const loading = ref(false);
  const error = ref(null);
  const cachedData = ref(JSON.parse(localStorage.getItem('cachedPowerData') || '{}'));
  const meterLabels = ref(JSON.parse(localStorage.getItem('meterLabels') || '{}'));
  const initialTokenBalances = ref(JSON.parse(localStorage.getItem('initialTokenBalances') || '{}'));
  const lastUpdated = ref(JSON.parse(localStorage.getItem('lastBalanceUpdate') || '{}'));
  const manualAdjustments = ref(JSON.parse(localStorage.getItem('manualAdjustments') || '{}'));

  const hasMeterNumber = computed(() => !!meterNumber.value);
  const hasCachedData = computed(() => !!cachedData.value[meterNumber.value]);
  const hasInitialBalance = computed(() => 
    !!initialTokenBalances.value[meterNumber.value] || 
    initialTokenBalances.value[meterNumber.value] === 0
  );

  // Compute hourly consumption rate
  const hourlyConsumptionRate = computed(() => {
    if (!powerData.value?.transactions || powerData.value.transactions.length < 2) {
      return null;
    }
    return calculateHourlyConsumption(powerData.value.transactions);
  });

  // Compute predicted current balance
  const predictedBalance = computed(() => {
    if (!hasInitialBalance.value || !hourlyConsumptionRate.value) {
      return null;
    }
    
    return predictCurrentBalance(
      initialTokenBalances.value[meterNumber.value],
      powerData.value?.transactions,
      hourlyConsumptionRate.value
    );
  });

  // Compute if balance is low
  const isTokenBalanceLow = computed(() => {
    return isBalanceLow(predictedBalance.value);
  });

  // Compute estimated days remaining
  const daysRemaining = computed(() => {
    if (!predictedBalance.value || !hourlyConsumptionRate.value) {
      return null;
    }
    return estimateDaysRemaining(predictedBalance.value, hourlyConsumptionRate.value);
  });

  function setMeterNumber(number) {
    meterNumber.value = number;
    localStorage.setItem('meterNumber', number);
  }

  function setMeterLabel(number, label) {
    meterLabels.value[number] = label;
    localStorage.setItem('meterLabels', JSON.stringify(meterLabels.value));
  }

  function getMeterLabel(number) {
    return meterLabels.value[number] || number;
  }

  function setInitialTokenBalance(balance) {
    initialTokenBalances.value[meterNumber.value] = Number(balance);
    lastUpdated.value[meterNumber.value] = new Date().toISOString();
    
    localStorage.setItem('initialTokenBalances', JSON.stringify(initialTokenBalances.value));
    localStorage.setItem('lastBalanceUpdate', JSON.stringify(lastUpdated.value));
  }

  function resetTokenBalance() {
    delete initialTokenBalances.value[meterNumber.value];
    delete lastUpdated.value[meterNumber.value];
    
    // Also clear any manual adjustments for this meter
    if (manualAdjustments.value[meterNumber.value]) {
      delete manualAdjustments.value[meterNumber.value];
      localStorage.setItem('manualAdjustments', JSON.stringify(manualAdjustments.value));
    }
    
    localStorage.setItem('initialTokenBalances', JSON.stringify(initialTokenBalances.value));
    localStorage.setItem('lastBalanceUpdate', JSON.stringify(lastUpdated.value));
  }

  // Update predicted balance (used for hourly background updates)
  function updatePredictedBalance() {
    if (!hasInitialBalance.value || !hourlyConsumptionRate.value) {
      return;
    }
    
    // Don't just record the time of this update, actually recalculate the balance
    if (predictCurrentBalance && typeof predictCurrentBalance === 'function') {
      // The calculation is already handled by the predictedBalance computed property
      // Just trigger a recalculation by updating the timestamp
      lastUpdated.value[meterNumber.value] = new Date().toISOString();
      localStorage.setItem('lastBalanceUpdate', JSON.stringify(lastUpdated.value));
    }
  }

  // Manually adjust token balance
  function adjustTokenBalance(newBalance) {
    // Store the new balance
    initialTokenBalances.value[meterNumber.value] = Number(newBalance);
    
    // Record the adjustment time
    lastUpdated.value[meterNumber.value] = new Date().toISOString();
    
    // Keep track of manual adjustments for predictive analysis
    if (!manualAdjustments.value[meterNumber.value]) {
      manualAdjustments.value[meterNumber.value] = [];
    }
    
    manualAdjustments.value[meterNumber.value].push({
      date: new Date().toISOString(),
      balance: Number(newBalance),
      predicted: predictedBalance.value
    });
    
    // Save all changes to localStorage
    localStorage.setItem('initialTokenBalances', JSON.stringify(initialTokenBalances.value));
    localStorage.setItem('lastBalanceUpdate', JSON.stringify(lastUpdated.value));
    localStorage.setItem('manualAdjustments', JSON.stringify(manualAdjustments.value));
  }

  const fetchData = async () => {
    if (!meterNumber.value) return;
    
    // Show cached data immediately if available
    if (cachedData.value[meterNumber.value]) {
      powerData.value = cachedData.value[meterNumber.value];
    }
    
    // Only show loading if we don't have cached data
    if (!hasCachedData.value) {
      loading.value = true;
    }
    
    error.value = null;
    
    try {
      const data = await fetchPowerData(meterNumber.value);
      
      // Only update cache if we received valid data from the API
      if (data) {
        powerData.value = data;
        
        // Update cache only if we have valid data
        cachedData.value[meterNumber.value] = data;
        localStorage.setItem('cachedPowerData', JSON.stringify(cachedData.value));
      }
    } catch (err) {
      error.value = err.message || 'Failed to fetch power data';
    } finally {
      loading.value = false;
    }
  };

  function clearCache() {
    cachedData.value = {};
    localStorage.removeItem('cachedPowerData');
  }

  return {
    meterNumber,
    powerData,
    loading,
    error,
    hasMeterNumber,
    hasCachedData,
    hasInitialBalance,
    predictedBalance,
    hourlyConsumptionRate,
    isTokenBalanceLow,
    daysRemaining,
    setMeterNumber,
    fetchData,
    setMeterLabel,
    getMeterLabel,
    setInitialTokenBalance,
    resetTokenBalance,
    updatePredictedBalance,
    adjustTokenBalance,
    clearCache
  };
}); 