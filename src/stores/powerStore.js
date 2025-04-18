import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { fetchPowerData } from '../utils/api';

export const usePowerStore = defineStore('power', () => {
  const meterNumber = ref(localStorage.getItem('meterNumber') || '');
  const powerData = ref(null);
  const loading = ref(false);
  const error = ref(null);
  const cachedData = ref(JSON.parse(localStorage.getItem('cachedPowerData') || '{}'));
  const meterLabels = ref(JSON.parse(localStorage.getItem('meterLabels') || '{}'));

  const hasMeterNumber = computed(() => !!meterNumber.value);
  const hasCachedData = computed(() => !!cachedData.value[meterNumber.value]);

  const setMeterNumber = (number) => {
    meterNumber.value = number;
    localStorage.setItem('meterNumber', number);
  };

  const setMeterLabel = (number, label) => {
    meterLabels.value[number] = label;
    localStorage.setItem('meterLabels', JSON.stringify(meterLabels.value));
  };

  const getMeterLabel = (number) => {
    return meterLabels.value[number] || number;
  };

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
      powerData.value = data;
      
      // Update cache
      cachedData.value[meterNumber.value] = data;
      localStorage.setItem('cachedPowerData', JSON.stringify(cachedData.value));
    } catch (err) {
      error.value = err.message || 'Failed to fetch power data';
    } finally {
      loading.value = false;
    }
  };

  const clearCache = () => {
    cachedData.value = {};
    localStorage.removeItem('cachedPowerData');
  };

  return {
    meterNumber,
    powerData,
    loading,
    error,
    hasMeterNumber,
    hasCachedData,
    setMeterNumber,
    fetchData,
    setMeterLabel,
    getMeterLabel,
    clearCache
  };
}); 