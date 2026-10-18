<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Heart, Lock, Mail } from 'lucide-vue-next';

const router = useRouter();
const email = ref('');
const password = ref('');
const errorMessage = ref('');
const isLoading = ref(false);

async function handleLogin() {
  errorMessage.value = '';
  if (!email.value || !password.value) {
    errorMessage.value = 'Silakan isi email dan kata sandi.';
    return;
  }

  isLoading.value = true;
  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const res = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value }),
    });

    const data = await res.json();
    if (!res.ok) {
      errorMessage.value = data.error?.message || 'Email atau kata sandi tidak sesuai.';
      return;
    }

    if (data.token) {
      localStorage.setItem('auth_token', data.token);
      router.push('/');
    }
  } catch (err) {
    errorMessage.value = 'Tidak dapat menghubungi server. Coba beberapa saat lagi.';
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-[#FFF7F9] to-[#FFEEF3] dark:from-[#1E1419] dark:to-[#2A1D24]">
    <div class="w-full max-w-md p-8 md:p-10 rounded-[24px] bg-surface border border-app shadow-sm">
      <!-- Brand & Title -->
      <div class="text-center mb-8">
        <div class="w-12 h-12 mx-auto mb-4 rounded-full bg-surface-tint flex items-center justify-center text-[#C93D68] dark:text-[#FF8FAE]">
          <Heart class="w-6 h-6 fill-current" />
        </div>
        <h1 class="text-2xl md:text-3xl font-serif font-semibold text-[#C93D68] dark:text-[#FF8FAE] mb-2">
          Our Memories
        </h1>
        <p class="text-sm text-muted">
          Masuk ke ruang privat kenangan kita
        </p>
      </div>

      <!-- Error Alert -->
      <div
        v-if="errorMessage"
        class="mb-6 p-4 rounded-[12px] bg-[#FFD9E3]/50 dark:bg-[#4A2635] text-xs text-[#D64545] dark:text-[#FF8FAE] border border-[#F6D5DF] dark:border-[#4A3340]"
        role="alert"
      >
        {{ errorMessage }}
      </div>

      <!-- Form -->
      <form @submit.prevent="handleLogin" class="space-y-5">
        <div>
          <label for="email" class="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
            Email
          </label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
              <Mail class="w-4 h-4" />
            </span>
            <input
              id="email"
              v-model="email"
              type="email"
              required
              autocomplete="email"
              placeholder="nama@email.com"
              class="w-full pl-10 pr-4 py-3 rounded-[12px] border border-app bg-surface focus:outline-none focus:ring-2 focus:ring-[#FFD9E3] dark:focus:ring-[#4A2635] text-sm text-app transition-all"
            />
          </div>
        </div>

        <div>
          <label for="password" class="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
            Kata Sandi
          </label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
              <Lock class="w-4 h-4" />
            </span>
            <input
              id="password"
              v-model="password"
              type="password"
              required
              autocomplete="current-password"
              placeholder="••••••••"
              class="w-full pl-10 pr-4 py-3 rounded-[12px] border border-app bg-surface focus:outline-none focus:ring-2 focus:ring-[#FFD9E3] dark:focus:ring-[#4A2635] text-sm text-app transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="w-full btn-primary font-medium text-sm flex items-center justify-center gap-2 mt-2 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <span v-if="isLoading">Menghubungkan...</span>
          <span v-else>Masuk</span>
        </button>
      </form>
    </div>
  </div>
</template>
