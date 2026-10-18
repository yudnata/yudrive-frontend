<script setup lang="ts">
import { ref } from 'vue';
import { onClickOutside } from '@vueuse/core';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { useTheme } from '@/composables/useTheme';
import {
  Heart,
  LogOut,
  HardDrive,
  User as UserIcon,
  Sun,
  Moon,
  Laptop,
  AlertCircle,
  Cloud,
  ArrowUpRight,
} from 'lucide-vue-next';
import R2UsageModal from './R2UsageModal.vue';

const authStore = useAuthStore();
const router = useRouter();
const { theme, setTheme } = useTheme();
const isMenuOpen = ref(false);
const isUsageModalOpen = ref(false);
const profileMenuRef = ref<HTMLElement | null>(null);

onClickOutside(profileMenuRef, () => {
  isMenuOpen.value = false;
});

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
  <header class="sticky top-0 z-30 w-full bg-surface shadow-xs border-b border-black/[0.04] dark:border-white/[0.06] transition-colors">
    <div class="max-w-6xl mx-auto px-4 h-12 sm:h-13 flex items-center justify-between">
      <!-- Logo: Bare heart icon without background container -->
      <div class="flex items-center gap-1.5 sm:gap-2">
        <Heart class="w-4.5 h-4.5 sm:w-5 sm:h-5 fill-current text-[#C93D68] dark:text-[#FF8FAE] shrink-0" />
        <span class="text-base sm:text-lg font-semibold font-serif tracking-tight text-[#C93D68] dark:text-[#FF8FAE]">
          Yudhi & Wina
        </span>
      </div>

      <!-- User Profile & Storage Menu -->
      <div ref="profileMenuRef" class="relative">
        <button
          type="button"
          class="relative flex items-center justify-center p-0.5 rounded-full shadow-xs hover:shadow-sm hover:bg-surface-tint focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD9E3] transition-all cursor-pointer"
          aria-label="Menu profil dan pengaturan tampilan"
          @click="isMenuOpen = !isMenuOpen"
        >
          <div class="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-full bg-surface-tint flex items-center justify-center text-xs font-bold text-[#C93D68] dark:text-[#FF8FAE]">
            {{ authStore.user?.name ? authStore.user.name.charAt(0).toUpperCase() : 'U' }}
          </div>

          <!-- Quota alert badge on avatar button if >= 80% -->
          <span
            v-if="(authStore.usage?.percentage || 0) >= 80"
            class="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-[#D64545] border-2 border-white dark:border-surface"
            aria-label="Penyimpanan hampir penuh"
          />
        </button>

        <!-- Dropdown Popup -->
        <div
          v-if="isMenuOpen"
          class="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] p-4 rounded-[20px] bg-surface shadow-2xl z-40 text-left ring-1 ring-black/5 dark:ring-white/10"
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

            <div class="flex items-center justify-between text-[10px] text-muted mt-1.5">
              <span>Persentase Penyimpanan Terpakai</span>
              <span class="font-semibold text-app">{{ authStore.usage?.percentage || 0 }}%</span>
            </div>

            <p
              v-if="(authStore.usage?.percentage || 0) >= 80"
              class="text-[11px] text-[#D64545] font-medium mt-1.5 flex items-center gap-1"
            >
              <AlertCircle class="w-3.5 h-3.5 shrink-0" />
              Kapasitas penyimpanan hampir penuh ({{ authStore.usage?.percentage }}%).
            </p>
          </div>

          <!-- Cloudflare R2 Operations Summary (Class A, Class B, Storage) -->
          <div class="py-2.5 px-3 my-2.5 rounded-2xl bg-surface-tint border border-black/5 dark:border-white/5 space-y-2">
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-app flex items-center gap-1.5 text-[11px]">
                <Cloud class="w-3.5 h-3.5 text-[#F6821F]" />
                Cloudflare R2 Ops / Bln
              </span>
              <button
                type="button"
                class="text-[10px] font-semibold text-[#C93D68] dark:text-[#FF8FAE] hover:underline flex items-center gap-0.5 cursor-pointer py-0.5"
                @click="isUsageModalOpen = true; isMenuOpen = false"
              >
                <span>Rincian</span>
                <ArrowUpRight class="w-3 h-3" />
              </button>
            </div>

            <!-- Mini 2-column counters matching Cloudflare metrics -->
            <div class="grid grid-cols-2 gap-1.5 text-[10px]">
              <div class="bg-surface p-2 rounded-xl border border-black/5 dark:border-white/5">
                <span class="text-muted block text-[9px] truncate">Class A (Tulis/Buat)</span>
                <span class="font-extrabold text-app text-xs block mt-0.5">
                  {{ authStore.r2Usage?.classA.formatted || '257' }}
                </span>
                <span class="text-muted/80 block text-[8px]">dari 1M gratis</span>
              </div>
              <div class="bg-surface p-2 rounded-xl border border-black/5 dark:border-white/5">
                <span class="text-muted block text-[9px] truncate">Class B (Baca/Lihat)</span>
                <span class="font-extrabold text-app text-xs block mt-0.5">
                  {{ authStore.r2Usage?.classB.formatted || '4.8k' }}
                </span>
                <span class="text-muted/80 block text-[8px]">dari 10M gratis</span>
              </div>
            </div>

            <!-- Reset Indicator Badge -->
            <div class="flex items-center justify-between text-[10px] pt-1.5 border-t border-black/5 dark:border-white/5 text-muted">
              <span class="flex items-center gap-1 text-[9px]">
                <span>Reset kuota operasi:</span>
              </span>
              <span class="font-bold text-app text-[9px]">
                {{ authStore.r2Usage?.period.daysRemaining !== undefined ? `${authStore.r2Usage.period.daysRemaining} hari lagi` : '31 hari lagi' }} ({{ authStore.r2Usage?.period.resetDate ? authStore.r2Usage.period.resetDate.split(' ').slice(0, 2).join(' ') : '18 Nov' }})
              </span>
            </div>
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

    <!-- Cloudflare R2 Detailed Usage Modal -->
    <R2UsageModal
      :is-open="isUsageModalOpen"
      @close="isUsageModalOpen = false"
    />
  </header>
</template>
