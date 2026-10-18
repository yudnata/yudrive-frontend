<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';
import { useToast } from '@/composables/useToast';
import Card from '@/components/ui/Card.vue';
import Input from '@/components/ui/Input.vue';
import Button from '@/components/ui/Button.vue';
import FloatingHearts from '@/components/ui/FloatingHearts.vue';
import { Heart, Mail, Lock, Coffee, Eye, EyeOff } from 'lucide-vue-next';

const authStore = useAuthStore();
const router = useRouter();
const toast = useToast();

const email = ref('');
const password = ref('');
const error = ref('');
const rememberMe = ref(true);
const showPassword = ref(false);

onMounted(() => {
  const savedEmail = localStorage.getItem('remembered_email');
  if (savedEmail) {
    email.value = savedEmail;
    rememberMe.value = true;
  }
});

async function onSubmit() {
  error.value = '';
  if (!email.value || !password.value) {
    error.value = 'Silakan isi email dan kata sandi.';
    return;
  }

  try {
    await authStore.login(email.value, password.value);
    
    if (rememberMe.value) {
      localStorage.setItem('remembered_email', email.value);
    } else {
      localStorage.removeItem('remembered_email');
    }

    toast.success('Selamat datang kembali!');
    router.push('/');
  } catch (err: any) {
    error.value = err.message || 'Email atau kata sandi tidak sesuai.';
  }
}
</script>

<template>
  <div class="relative min-h-screen flex items-center justify-center p-4 bg-white dark:bg-[#1E1419] overflow-hidden">
    <!-- GPU-Accelerated Lag-Free Background Love Particles -->
    <FloatingHearts />

    <div class="relative z-10 w-full max-w-md">
      <Card rounded="lg" class="p-8 sm:p-10 bg-white dark:bg-[#2A1D24] shadow-2xl">
        <!-- Logo & Header: Bare Heart Icon without background circle -->
        <div class="text-center mb-8">
          <Heart class="w-10 h-10 mx-auto mb-3 text-[#C93D68] dark:text-[#FF8FAE] fill-current drop-shadow-sm" />

          <h1 class="text-2xl sm:text-3xl font-serif font-semibold text-[#C93D68] dark:text-[#FF8FAE] mb-2 tracking-tight">
            Our Memories
          </h1>

          <p class="text-xs sm:text-sm text-muted">
            Ruang privat untuk menyimpan kenangan kita berdua
          </p>
        </div>

        <!-- Azure F1 Cold Start Friendly Notice (Shadow-based, no borders) -->
        <div
          v-if="authStore.isColdStarting"
          class="mb-6 p-3.5 rounded-[14px] bg-surface-tint shadow-sm text-xs text-app flex items-start gap-2.5 transition-all"
        >
          <Coffee class="w-4 h-4 text-[#C93D68] shrink-0 mt-0.5" />
          <p class="leading-relaxed">
            Server sedang bangun dari mode tidur. Ini membutuhkan beberapa detik pada request pertama...
          </p>
        </div>

        <!-- Error Alert -->
        <div
          v-if="error"
          class="mb-6 p-3.5 rounded-[14px] bg-[#FFD9E3]/50 dark:bg-[#4A2635] text-xs text-[#D64545] dark:text-[#FF8FAE] shadow-sm leading-relaxed"
          role="alert"
        >
          {{ error }}
        </div>

        <!-- Login Form -->
        <form @submit.prevent="onSubmit" class="space-y-4">
          <Input
            id="login-email"
            v-model="email"
            label="Email"
            type="email"
            placeholder="nama@email.com"
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
            :type="showPassword ? 'text' : 'password'"
            placeholder="••••••••"
            required
            autocomplete="current-password"
          >
            <template #leading>
              <Lock class="w-4 h-4" />
            </template>
            <template #trailing>
              <button
                type="button"
                class="p-1 text-muted hover:text-app transition-colors focus:outline-none min-h-8 min-w-8 flex items-center justify-center cursor-pointer"
                :aria-label="showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'"
                @click="showPassword = !showPassword"
              >
                <EyeOff v-if="showPassword" class="w-4 h-4" />
                <Eye v-else class="w-4 h-4" />
              </button>
            </template>
          </Input>

          <!-- Remember Me Checkbox -->
          <div class="flex items-center justify-between pt-1">
            <label class="flex items-center gap-2.5 cursor-pointer select-none text-xs text-muted hover:text-app transition-colors min-h-11">
              <input
                type="checkbox"
                v-model="rememberMe"
                class="w-4 h-4 rounded text-[#C93D68] accent-[#C93D68] focus:ring-[#FFD9E3] focus:ring-offset-0 bg-surface cursor-pointer transition-colors shadow-xs"
              />
              <span>Ingat saya di perangkat ini</span>
            </label>
          </div>

          <div class="pt-1">
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
