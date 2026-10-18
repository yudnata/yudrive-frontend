<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';
import { useToast } from '@/composables/useToast';
import Card from '@/components/ui/Card.vue';
import Input from '@/components/ui/Input.vue';
import Button from '@/components/ui/Button.vue';
import { Heart, Mail, Lock, Coffee } from 'lucide-vue-next';

const authStore = useAuthStore();
const router = useRouter();
const toast = useToast();

const email = ref('');
const password = ref('');
const error = ref('');

async function onSubmit() {
  error.value = '';
  if (!email.value || !password.value) {
    error.value = 'Silakan isi email dan kata sandi.';
    return;
  }

  try {
    await authStore.login(email.value, password.value);
    toast.success('Selamat datang kembali!');
    router.push('/');
  } catch (err: any) {
    error.value = err.message || 'Email atau kata sandi tidak sesuai.';
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-[#FFF7F9] via-[#FFF7F9] to-[#FFEEF3] dark:from-[#1E1419] dark:via-[#1E1419] dark:to-[#2A1D24]">
    <div class="w-full max-w-md">
      <Card rounded="lg" class="p-8 sm:p-10">
        <!-- Logo & Header -->
        <div class="text-center mb-8">
          <div class="w-12 h-12 mx-auto mb-4 rounded-full bg-[#FFD9E3] dark:bg-[#4A2635] flex items-center justify-center text-[#C93D68] dark:text-[#FF8FAE]">
            <Heart class="w-6 h-6 fill-current" />
          </div>

          <h1 class="text-2xl sm:text-3xl font-serif font-semibold text-[#C93D68] dark:text-[#FF8FAE] mb-2 tracking-tight">
            Our Memories
          </h1>

          <p class="text-xs sm:text-sm text-muted">
            Ruang privat untuk menyimpan kenangan kita berdua
          </p>
        </div>

        <!-- Azure F1 Cold Start Friendly Notice -->
        <div
          v-if="authStore.isColdStarting"
          class="mb-6 p-3.5 rounded-[14px] bg-surface-tint border border-app text-xs text-app flex items-start gap-2.5 transition-all"
        >
          <Coffee class="w-4 h-4 text-[#C93D68] shrink-0 mt-0.5" />
          <p class="leading-relaxed">
            Server sedang bangun dari mode tidur. Ini membutuhkan beberapa detik pada request pertama...
          </p>
        </div>

        <!-- Error Alert -->
        <div
          v-if="error"
          class="mb-6 p-3.5 rounded-[14px] bg-[#FFD9E3]/50 dark:bg-[#4A2635] text-xs text-[#D64545] dark:text-[#FF8FAE] border border-[#F6D5DF] dark:border-[#4A3340] leading-relaxed"
          role="alert"
        >
          {{ error }}
        </div>

        <!-- Login Form -->
        <form @submit.prevent="onSubmit" class="space-y-5">
          <Input
            id="login-email"
            v-model="email"
            label="Email"
            type="email"
            placeholder="partner@ourmemories.local"
            required
            autocomplete="email"
          >
            <template #leading>
              <Mail class="w-4 h-4" />
            </template>
          </Input>

          <Input
            id="login-password"
            v-model="password"
            label="Kata Sandi"
            type="password"
            placeholder="••••••••"
            required
            autocomplete="current-password"
          >
            <template #leading>
              <Lock class="w-4 h-4" />
            </template>
          </Input>

          <div class="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              class="w-full"
              :loading="authStore.isLoading"
            >
              Masuk ke Galeri
            </Button>
          </div>
        </form>
      </Card>
    </div>
  </div>
</template>
