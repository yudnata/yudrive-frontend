<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { useTheme } from '@/composables/useTheme';
import { Heart, LogOut, HardDrive, User as UserIcon, Sun, Moon, Laptop, AlertCircle } from 'lucide-vue-next';

const authStore = useAuthStore();
const router = useRouter();
const { theme, setTheme } = useTheme();
const isMenuOpen = ref(false);

function handleLogout() {
  authStore.logout();
  router.push('/login');
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '0 B';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}
</script>

<template>
  <header class="sticky top-0 z-30 glass-nav bg-surface/85 shadow-sm">
    <div class="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
      <!-- Logo: Bare heart icon without background container -->
      <div class="flex items-center gap-2">
        <Heart class="w-6 h-6 fill-current text-[#C93D68] dark:text-[#FF8FAE] shrink-0" />
        <span class="text-xl font-semibold font-serif tracking-tight text-[#C93D68] dark:text-[#FF8FAE]">
          Yudhi & Wina
        </span>
      </div>

      <!-- User Profile & Storage Menu -->
      <div class="relative">
        <button
          type="button"
          class="relative flex items-center gap-2 p-1 rounded-full shadow-sm hover:shadow hover:bg-surface-tint focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD9E3] min-h-11 min-w-11 transition-all cursor-pointer"
          aria-label="Menu profil dan pengaturan tampilan"
          @click="isMenuOpen = !isMenuOpen"
        >
          <div class="w-9 h-9 rounded-full bg-surface-tint flex items-center justify-center text-xs font-bold text-[#C93D68] dark:text-[#FF8FAE]">
            {{ authStore.user?.name ? authStore.user.name.charAt(0).toUpperCase() : 'U' }}
          </div>

          <!-- Quota alert badge on avatar button if >= 80% -->
          <span
            v-if="(authStore.usage?.percentage || 0) >= 80"
            class="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#D64545] border-2 border-surface"
            aria-label="Penyimpanan hampir penuh"
          />
        </button>

        <!-- Dropdown Popup -->
        <div
          v-if="isMenuOpen"
          class="absolute right-0 mt-2 w-72 p-4 rounded-[20px] bg-surface shadow-xl z-40 text-left"
        >
          <!-- User info: Bare icon -->
          <div class="flex items-center gap-3 pb-3 border-b border-transparent">
            <UserIcon class="w-6 h-6 text-[#C93D68] dark:text-[#FF8FAE] shrink-0" />
            <div class="overflow-hidden">
              <p class="text-sm font-semibold text-app truncate">
                {{ authStore.user?.name }}
              </p>
              <p class="text-xs text-muted truncate">
                {{ authStore.user?.email }}
              </p>
            </div>
          </div>

          <!-- Storage Meter -->
          <div class="py-3 border-b border-transparent">
            <div class="flex items-center justify-between text-xs mb-1.5">
              <span class="flex items-center gap-1.5 font-medium text-app">
                <HardDrive class="w-3.5 h-3.5 text-muted" />
                Penyimpanan
              </span>
              <span class="text-muted font-medium">
                {{ formatBytes(authStore.usage?.usedBytes) }} dari {{ formatBytes(authStore.usage?.quotaBytes) }}
              </span>
            </div>

            <!-- Progress bar -->
            <div class="w-full h-2 rounded-full bg-surface-tint overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-300"
                :class="[
                  (authStore.usage?.percentage || 0) >= 80 ? 'bg-[#D64545]' : 'bg-[#C93D68] dark:bg-[#FF8FAE]'
                ]"
                :style="{ width: `${Math.min(100, authStore.usage?.percentage || 0)}%` }"
              />
            </div>

            <p
              v-if="(authStore.usage?.percentage || 0) >= 80"
              class="text-[11px] text-[#D64545] font-medium mt-1.5 flex items-center gap-1"
            >
              <AlertCircle class="w-3.5 h-3.5 shrink-0" />
              Kapasitas penyimpanan hampir penuh ({{ authStore.usage?.percentage }}%).
            </p>
          </div>

          <!-- Theme Preference Selector -->
          <div class="py-3 border-b border-transparent">
            <p class="text-xs font-medium text-app mb-2">Tema Tampilan</p>
            <div class="grid grid-cols-3 gap-1.5 bg-surface-tint p-1 rounded-xl">
              <button
                type="button"
                class="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-medium transition-colors min-h-9 cursor-pointer"
                :class="theme === 'system' ? 'bg-surface text-app shadow-sm font-semibold' : 'text-muted hover:text-app'"
                @click="setTheme('system')"
              >
                <Laptop class="w-3 h-3" />
                Auto
              </button>
              <button
                type="button"
                class="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-medium transition-colors min-h-9 cursor-pointer"
                :class="theme === 'light' ? 'bg-surface text-app shadow-sm font-semibold' : 'text-muted hover:text-app'"
                @click="setTheme('light')"
              >
                <Sun class="w-3 h-3" />
                Terang
              </button>
              <button
                type="button"
                class="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-medium transition-colors min-h-9 cursor-pointer"
                :class="theme === 'dark' ? 'bg-surface text-app shadow-sm font-semibold' : 'text-muted hover:text-app'"
                @click="setTheme('dark')"
              >
                <Moon class="w-3 h-3" />
                Gelap
              </button>
            </div>
          </div>

          <!-- Logout Action -->
          <button
            type="button"
            class="w-full mt-2 flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#D64545] hover:bg-surface-tint rounded-[10px] transition-colors min-h-11 cursor-pointer"
            @click="handleLogout"
          >
            <LogOut class="w-4 h-4" />
            Keluar dari Akun
          </button>
        </div>
      </div>
    </div>
  </header>
</template>
