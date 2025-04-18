<script setup>
import { ref, onMounted } from 'vue';

const deferredPrompt = ref(null);
const showInstallPrompt = ref(false);

onMounted(() => {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt.value = e;
    showInstallPrompt.value = true;
  });

  window.addEventListener('appinstalled', () => {
    showInstallPrompt.value = false;
    deferredPrompt.value = null;
  });
});

const installApp = async () => {
  if (!deferredPrompt.value) {
    return;
  }
  deferredPrompt.value.prompt();
  const { outcome } = await deferredPrompt.value.userChoice;
  if (outcome === 'accepted') {
  }
  deferredPrompt.value = null;
  showInstallPrompt.value = false;
};

const dismissPrompt = () => {
  showInstallPrompt.value = false;
};
</script>

<template>
  <div v-if="showInstallPrompt" class="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg max-w-sm z-50">
    <div class="flex items-start">
      <div class="flex-shrink-0">
        <svg class="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </div>
      <div class="ml-3">
        <h3 class="text-lg font-medium text-gray-900">Install Power Tracker</h3>
        <p class="mt-1 text-sm text-gray-500">
          Install this app on your device for a better experience. It works offline and loads faster!
        </p>
        <div class="mt-4 flex space-x-3">
          <button
            @click="installApp"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Install
          </button>
          <button
            @click="dismissPrompt"
            class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Not Now
          </button>
        </div>
      </div>
      <button
        @click="dismissPrompt"
        class="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-500"
      >
        <span class="sr-only">Close</span>
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
</template> 