<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Heart } from 'lucide-vue-next';

const apiStatus = ref<'checking' | 'connected' | 'sleeping' | 'error'>('checking');
const apiMessage = ref('Menghubungkan ke server...');

async function checkApiHealth() {
  apiStatus.value = 'checking';
  apiMessage.value = 'Mengecek status server...';

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  try {
    const res = await fetch(`${apiUrl}/health`);
    if (res.ok) {
      apiStatus.value = 'connected';
      apiMessage.value = 'Backend Azure aktif dan terhubung (200 OK)';
    } else {
      apiStatus.value = 'error';
      apiMessage.value = `Server merespon dengan status ${res.status}`;
    }
  } catch (err) {
    apiStatus.value = 'sleeping';
    apiMessage.value = 'Server sedang istirahat (cold start) atau belum dijalankan lokal';
  }
}

onMounted(() => {
  checkApiHealth();
});
</script>

<template>
  <div class="min-h-screen flex flex-col bg-app text-app">
    <!-- Header -->
    <header class="sticky top-0 z-10 backdrop-blur-md bg-[#FFF7F9]/80 dark:bg-[#1E1419]/80 border-b border-app">
      <div class="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full bg-[#FFD9E3] dark:bg-[#4A2635] flex items-center justify-center text-[#C93D68] dark:text-[#FF8FAE]">
            <Heart class="w-4 h-4 fill-current" />
          </div>
          <h1 class="text-xl font-semibold tracking-tight font-serif text-[#C93D68] dark:text-[#FF8FAE]">
            Our Memories
          </h1>
        </div>

        <nav class="flex items-center gap-2">
          <router-link
            to="/login"
            class="text-sm font-medium px-4 py-2 rounded-full border border-app hover:bg-surface-tint transition-colors min-h-[44px] flex items-center"
          >
            Masuk
          </router-link>
        </nav>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 max-w-4xl w-full mx-auto px-4 py-8 flex flex-col items-center justify-center text-center">
      <div class="p-8 md:p-12 rounded-[24px] bg-surface border border-app shadow-sm max-w-lg w-full">
        <div class="w-16 h-16 mx-auto mb-6 rounded-full bg-surface-tint flex items-center justify-center text-[#E0527A]">
          <Heart class="w-8 h-8 fill-current" />
        </div>

        <h2 class="text-2xl md:text-3xl font-semibold font-serif mb-3">
          Ruang Cerita Kita
        </h2>
        <p class="text-sm text-muted mb-8 leading-relaxed">
          Tempat privat untuk menyimpan foto dan video kenangan terindah kita berdua kapan saja, di mana saja.
        </p>

        <!-- Status Card -->
        <div class="p-4 rounded-[16px] bg-surface-tint border border-app text-left flex items-start gap-3">
          <div class="mt-0.5">
            <span
              v-if="apiStatus === 'connected'"
              class="w-3 h-3 rounded-full bg-[#3F9D7A] block"
              title="Terhubung"
            ></span>
            <span
              v-else-if="apiStatus === 'checking'"
              class="w-3 h-3 rounded-full bg-[#E0527A] animate-pulse block"
              title="Memeriksa"
            ></span>
            <span
              v-else
              class="w-3 h-3 rounded-full bg-[#D64545] block"
              title="Perhatian"
            ></span>
          </div>

          <div class="flex-1">
            <p class="text-xs font-semibold text-app mb-0.5">
              Status Koneksi API
            </p>
            <p class="text-xs text-muted">
              {{ apiMessage }}
            </p>
          </div>

          <button
            type="button"
            class="text-xs font-medium text-[#C93D68] dark:text-[#FF8FAE] hover:underline min-h-[44px] px-2 flex items-center"
            @click="checkApiHealth"
          >
            Cek Lagi
          </button>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="py-6 text-center text-xs text-muted border-t border-app">
      <p class="flex items-center justify-center gap-1">
        Dibuat penuh kasih untuk kita berdua
        <Heart class="w-3.5 h-3.5 text-[#E0527A] fill-current inline" />
      </p>
    </footer>
  </div>
</template>
