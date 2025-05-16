<script setup>
import { ref, onMounted } from 'vue';
import { Download, Check, X } from 'lucide-vue-next';

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
  deferredPrompt.value = null;
  showInstallPrompt.value = false;
};

const dismissPrompt = () => {
  showInstallPrompt.value = false;
};
</script>

<template>
  <div v-if="showInstallPrompt" class="fixed bottom-4 right-4 bg-gradient-to-br from-slate-50 to-sky-100 p-6 rounded-xl shadow-2xl max-w-md z-50 border border-sky-200 backdrop-blur-md">
    <div class="flex items-start">
      <div class="flex-shrink-0">
        <div class="p-3 bg-sky-100 rounded-lg">
          <Download class="h-8 w-8 text-sky-600" />
        </div>
      </div>
      <div class="ml-4">
        <h3 class="text-xl font-semibold text-slate-800">Install Power Tracker</h3>
        <p class="mt-2 text-slate-600 leading-relaxed">
          Get the full app experience! Install Power Tracker to:
        </p>
        <ul class="mt-2 text-slate-600 space-y-1">
          <li class="flex items-center">
            <Check class="h-4 w-4 text-emerald-500 mr-2" />
            Access offline
          </li>
          <li class="flex items-center">
            <Check class="h-4 w-4 text-emerald-500 mr-2" />
            Faster loading times
          </li>
          <li class="flex items-center">
            <Check class="h-4 w-4 text-emerald-500 mr-2" />
            Home screen access
          </li>
        </ul>
        <div class="mt-6 flex space-x-4">
          <button
            @click="installApp"
            class="flex items-center px-6 py-2.5 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transform transition hover:scale-105"
          >
            <Download class="w-5 h-5 mr-2" />
            Install
          </button>
          <button
            @click="dismissPrompt"
            class="px-6 py-2.5 border border-slate-300 text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition hover:border-slate-400"
          >
          Later
          </button>
        </div>
      </div>
      <button
        @click="dismissPrompt"
        class="ml-4 flex-shrink-0 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
      >
        <span class="sr-only">Close</span>
        <X class="h-5 w-5" />
      </button>
    </div>
  </div>
</template> 