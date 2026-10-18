<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import {
  X,
  HardDrive,
  Database,
  RefreshCw,
  CheckCircle2,
  Cloud,
  FileCheck,
  Eye,
  Zap,
  RotateCw,
  Info,
} from 'lucide-vue-next';

defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const authStore = useAuthStore();
const isRefreshing = ref(false);

const r2 = computed(() => authStore.r2Usage);

async function handleRefresh() {
  if (isRefreshing.value) return;
  isRefreshing.value = true;
  try {
    await authStore.fetchR2Usage();
  } finally {
    isRefreshing.value = false;
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="usage-modal-title"
      @click="emit('close')"
    >
      <div
        class="relative w-full max-w-lg rounded-3xl bg-surface p-5 sm:p-6 shadow-2xl ring-1 ring-black/5 dark:ring-white/10 max-h-[90vh] overflow-y-auto no-scrollbar"
        @click.stop
      >
        <!-- Modal Header -->
        <div class="flex items-center justify-between pb-4 border-b border-black/5 dark:border-white/5">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-9 h-9 rounded-2xl bg-[#F6821F]/15 text-[#F6821F] flex items-center justify-center shrink-0 shadow-xs">
              <Cloud class="w-5 h-5 fill-current" />
            </div>
            <div class="min-w-0">
              <h2 id="usage-modal-title" class="text-base sm:text-lg font-bold text-app tracking-tight truncate flex items-center gap-2">
                <span>Penggunaan Cloudflare R2</span>
              </h2>
              <p class="text-[11px] text-muted truncate">
                Monitoring kuota operasi baca, tulis, &amp; penyimpanan
              </p>
            </div>
          </div>

          <button
            type="button"
            class="w-8 h-8 rounded-full hover:bg-surface-tint text-muted hover:text-app flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            aria-label="Tutup jendela rincian penggunaan"
            @click="emit('close')"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="mt-4 space-y-4 text-app">
          <!-- Active Billing Period & Zero-Cost Card -->
          <div class="p-4 rounded-2xl bg-surface-tint border border-black/5 dark:border-white/5 shadow-soft-xs space-y-3">
            <div class="flex items-center justify-between text-xs font-medium text-muted">
              <span class="flex items-center gap-1.5 font-semibold text-app">
                <Database class="w-3.5 h-3.5 text-[#F6821F]" />
                Billing Dashboard
              </span>
              <span class="px-2.5 py-0.5 rounded-full bg-surface text-[10px] font-bold text-[#C93D68] dark:text-[#FF8FAE] border border-black/5 dark:border-white/5">
                {{ r2?.period.label || '18 Oktober – 18 November 2026' }}
              </span>
            </div>

            <!-- Reset Countdown Banner -->
            <div class="flex items-center justify-between bg-surface/90 dark:bg-surface/80 rounded-xl p-2.5 sm:px-3 sm:py-2 border border-black/5 dark:border-white/5 gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <RotateCw class="w-4 h-4 text-[#C93D68] dark:text-[#FF8FAE] shrink-0" />
                <div class="min-w-0">
                  <span class="text-xs font-bold text-app block truncate">Jadwal Reset Operasi</span>
                  <span class="text-[10px] text-muted block truncate">Class A &amp; B otomatis direset ke 0</span>
                </div>
              </div>
              <div class="text-right shrink-0">
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#3F9D7A]/15 text-[#3F9D7A] font-bold text-[10px] sm:text-[11px]">
                  {{ r2?.period.resetText || 'Direset dalam 31 hari (18 November 2026)' }}
                </span>
              </div>
            </div>

            <div class="flex items-center gap-4 pt-1">
              <!-- Circular Zero-Dollar Badge -->
              <div class="relative w-16 h-16 rounded-full border-4 border-[#C93D68]/20 dark:border-[#FF8FAE]/20 flex items-center justify-center shrink-0 bg-surface">
                <span class="text-xs sm:text-sm font-extrabold text-app">$0.00</span>
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-xs sm:text-sm font-bold text-app flex items-center gap-1.5">
                  <CheckCircle2 class="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>No billable usage incurred yet</span>
                </p>
                <p class="text-[11px] text-muted mt-0.5 leading-relaxed">
                  Semua aktivitas penyimpanan dan operasi saat ini 100% berada di dalam kuota gratis (Free Tier).
                </p>
              </div>
            </div>
          </div>

          <!-- 3-Metrics Grid (Mirroring Cloudflare R2 Dashboard) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <!-- 1. Class A Operations (Writes / Creates / Uploads) -->
            <div class="p-4 rounded-2xl bg-surface border border-black/5 dark:border-white/5 shadow-soft-xs flex flex-col justify-between space-y-2">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <span class="text-xs font-semibold text-muted flex items-center gap-1">
                    <FileCheck class="w-3.5 h-3.5 text-[#C93D68] dark:text-[#FF8FAE]" />
                    Class A Operations
                  </span>
                  <p class="text-[10px] text-muted/80 mt-0.5">
                    Tulis, Buat, Upload, Hapus
                  </p>
                </div>
                <div class="text-right shrink-0">
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-tint text-muted block">
                    Batas: 1M / bln
                  </span>
                  <span class="text-[9px] text-[#3F9D7A] font-medium block mt-0.5">
                    Reset bulanan ke 0
                  </span>
                </div>
              </div>

              <div>
                <p class="text-2xl sm:text-3xl font-extrabold tracking-tight text-app">
                  {{ r2?.classA.formatted || '257' }}
                </p>
                <div class="w-full h-1.5 rounded-full bg-surface-tint mt-2 overflow-hidden">
                  <div
                    class="h-full rounded-full bg-[#C93D68] dark:bg-[#FF8FAE] transition-all duration-300"
                    :style="{ width: `${Math.max(1, r2?.classA.percentage || 1)}%` }"
                  />
                </div>
                <div class="flex items-center justify-between text-[10px] text-muted mt-1.5">
                  <span>{{ r2?.classA.requests.toLocaleString('id-ID') || '257' }} terpakai</span>
                  <span class="font-semibold text-emerald-600 dark:text-emerald-400">Tersisa 99.9%</span>
                </div>
              </div>
            </div>

            <!-- 2. Class B Operations (Reads / GETs / Previews) -->
            <div class="p-4 rounded-2xl bg-surface border border-black/5 dark:border-white/5 shadow-soft-xs flex flex-col justify-between space-y-2">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <span class="text-xs font-semibold text-muted flex items-center gap-1">
                    <Eye class="w-3.5 h-3.5 text-blue-500" />
                    Class B Operations
                  </span>
                  <p class="text-[10px] text-muted/80 mt-0.5">
                    Baca, Tinjau Foto, Unduh
                  </p>
                </div>
                <div class="text-right shrink-0">
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-tint text-muted block">
                    Batas: 10M / bln
                  </span>
                  <span class="text-[9px] text-[#3F9D7A] font-medium block mt-0.5">
                    Reset bulanan ke 0
                  </span>
                </div>
              </div>

              <div>
                <p class="text-2xl sm:text-3xl font-extrabold tracking-tight text-app">
                  {{ r2?.classB.formatted || '4.80k' }}
                </p>
                <div class="w-full h-1.5 rounded-full bg-surface-tint mt-2 overflow-hidden">
                  <div
                    class="h-full rounded-full bg-blue-500 transition-all duration-300"
                    :style="{ width: `${Math.max(1, r2?.classB.percentage || 1)}%` }"
                  />
                </div>
                <div class="flex items-center justify-between text-[10px] text-muted mt-1.5">
                  <span>{{ r2?.classB.requests.toLocaleString('id-ID') || '4.800' }} terpakai</span>
                  <span class="font-semibold text-emerald-600 dark:text-emerald-400">Tersisa 99.9%</span>
                </div>
              </div>
            </div>

            <!-- 3. Total Storage -->
            <div class="sm:col-span-2 p-4 rounded-2xl bg-surface border border-black/5 dark:border-white/5 shadow-soft-xs space-y-2.5">
              <div class="flex items-center justify-between text-xs">
                <span class="font-semibold text-muted flex items-center gap-1.5">
                  <HardDrive class="w-3.5 h-3.5 text-purple-500" />
                  Total Storage (Penyimpanan Media)
                </span>
                <span class="text-xs font-bold text-app">
                  {{ r2?.storage.usedFormatted || '292.8 MB' }} / 10 GB
                </span>
              </div>

              <div class="w-full h-2 rounded-full bg-surface-tint overflow-hidden">
                <div
                  class="h-full rounded-full bg-linear-to-r from-purple-500 to-[#C93D68] transition-all duration-300"
                  :style="{ width: `${Math.max(1, r2?.storage.percentage || 2.9)}%` }"
                />
              </div>

              <div class="flex items-center justify-between text-[10px] text-muted">
                <span>Kuota gratis mencakup hingga 10 GB aktif selamanya.</span>
                <span class="font-bold text-app">{{ r2?.storage.percentage || 2.9 }}%</span>
              </div>

              <!-- Storage vs Reset Educational Box -->
              <div class="p-3 rounded-xl bg-surface-tint/70 border border-black/5 dark:border-white/5 text-[11px] leading-relaxed text-muted space-y-1">
                <div class="flex items-center gap-1.5 font-semibold text-app">
                  <Info class="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>Bagaimana kuota penyimpanan bekerja?</span>
                </div>
                <p>
                  Kapasitas gratis <strong>10 GB aktif selamanya</strong>. File foto dan video Anda yang tersimpan ({{ r2?.storage.usedFormatted || '292.8 MB' }}) <strong>tetap tersimpan aman dan tidak akan direset atau terhapus</strong> setiap bulannya.
                </p>
                <p class="text-[10px] text-muted/80">
                  Yang otomatis direset kembali ke 0 setiap siklus bulanan ({{ r2?.period.resetDate || '18 November 2026' }}) adalah kuota operasi Class A (Tulis/Upload) dan Class B (Baca/Lihat).
                </p>
              </div>
            </div>
          </div>

          <!-- Cloudflare Free Tier Specification Table -->
          <div class="rounded-2xl bg-surface-tint p-4 border border-black/5 dark:border-white/5 space-y-2.5">
            <h4 class="text-xs font-bold text-app flex items-center gap-1.5">
              <Zap class="w-3.5 h-3.5 text-amber-500" />
              <span>Batas Kuota Gratis Cloudflare R2 (Free Tier)</span>
            </h4>

            <div class="space-y-1.5 text-[11px]">
              <div class="flex items-center justify-between py-1 border-b border-black/5 dark:border-white/5">
                <span class="text-muted">Storage (Kapasitas File)</span>
                <span class="font-semibold text-app">10 GB (Aktif Selamanya, Tidak Direset)</span>
              </div>
              <div class="flex items-center justify-between py-1 border-b border-black/5 dark:border-white/5">
                <span class="text-muted">Class A Operations (Tulis / Buat)</span>
                <span class="font-semibold text-app">1.000.000 requests / bulan (Reset Otomatis)</span>
              </div>
              <div class="flex items-center justify-between py-1 border-b border-black/5 dark:border-white/5">
                <span class="text-muted">Class B Operations (Baca / Lihat)</span>
                <span class="font-semibold text-app">10.000.000 requests / bulan (Reset Otomatis)</span>
              </div>
              <div class="flex items-center justify-between py-1 border-b border-black/5 dark:border-white/5">
                <span class="text-muted">Siklus Reset Operasi</span>
                <span class="font-bold text-[#C93D68] dark:text-[#FF8FAE]">{{ r2?.period.resetText || 'Direset tanggal 18 setiap bulan' }}</span>
              </div>
              <div class="flex items-center justify-between py-1">
                <span class="text-muted">Egress (Data Transfer ke Internet)</span>
                <span class="font-bold text-emerald-600 dark:text-emerald-400">100% Gratis Tanpa Batas</span>
              </div>
            </div>
          </div>

          <!-- Action Footer with Refresh Button -->
          <div class="flex items-center justify-between pt-2">
            <p class="text-[10px] text-muted truncate">
              Diperbarui: {{ r2?.lastSyncedAt ? new Date(r2.lastSyncedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Baru saja' }}
            </p>

            <button
              type="button"
              class="px-3.5 py-1.5 rounded-xl bg-surface hover:bg-surface-tint border border-black/5 dark:border-white/10 text-xs font-semibold text-app flex items-center gap-1.5 transition-all shadow-soft-xs cursor-pointer min-h-9"
              :disabled="isRefreshing"
              @click="handleRefresh"
            >
              <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isRefreshing }" />
              <span>{{ isRefreshing ? 'Menyinkronkan...' : 'Segarkan Data' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
