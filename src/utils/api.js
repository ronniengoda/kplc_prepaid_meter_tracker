import axios from 'axios';

const api = axios.create({
  baseURL: 'https://ronald.payherokenya.com/power',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchPowerData = async (meterNumber) => {
  try {
    const response = await api.get(`/api?meter_number=${meterNumber}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching power data:', error);
    throw error;
  }
}; 