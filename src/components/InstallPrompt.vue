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
  <div v-if="showInstallPrompt" class="fixed bottom-4 right-4 bg-gradient-to-br from-white to-blue-50 p-6 rounded-xl shadow-2xl max-w-md z-50 border border-blue-100 backdrop-blur-sm">
    <div class="flex items-start">
      <div class="flex-shrink-0">
        <div class="p-3 bg-blue-100 rounded-lg">
          <svg class="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </div>
      </div>
      <div class="ml-4">
        <h3 class="text-xl font-semibold text-gray-900">Install Power Tracker</h3>
        <p class="mt-2 text-gray-600 leading-relaxed">
          Get the full app experience! Install Power Tracker to:
        </p>
        <ul class="mt-2 text-gray-600 space-y-1">
          <li class="flex items-center">
            <svg class="h-4 w-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Access offline
          </li>
          <li class="flex items-center">
            <svg class="h-4 w-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Faster loading times
          </li>
          <li class="flex items-center">
            <svg class="h-4 w-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Home screen access
          </li>
        </ul>
        <div class="mt-6 flex space-x-4">
          <button
            @click="installApp"
            class="flex items-center px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform transition hover:scale-105"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Install
          </button>
          <button
            @click="dismissPrompt"
            class="px-6 py-2.5 border border-gray-200 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition hover:border-gray-300"
          >
          Later
          </button>
        </div>
      </div>
      <button
        @click="dismissPrompt"
        class="ml-4 flex-shrink-0 p-1 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition"
      >
        <span class="sr-only">Close</span>
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
</template> 