<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { useGalleryStore } from '../stores/gallery.store';
import { useFolderStore } from '@/features/folders/stores/folders.store';
import { Heart, FolderPlus, UploadCloud, FolderHeart, Image as ImageIcon, HardDrive } from 'lucide-vue-next';
import Button from '@/components/ui/Button.vue';

defineEmits<{
  (e: 'createFolder'): void;
  (e: 'upload'): void;
}>();

const authStore = useAuthStore();
const galleryStore = useGalleryStore();
const folderStore = useFolderStore();

function formatBytes(bytes?: number): string {
  if (!bytes) return '0 B';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

const memoryCount = computed(() => galleryStore.items.length);
const folderCount = computed(() => folderStore.folders.length);
const usedStorage = computed(() => formatBytes(authStore.usage?.usedBytes));
</script>

<template>
  <section class="relative w-full rounded-3xl bg-surface shadow-soft p-6 sm:p-8 overflow-hidden">
    <!-- Romantic Top Badge -->
    <div class="flex items-center gap-2 mb-3">
      <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C93D68] dark:text-[#FF8FAE] tracking-wide">
        <Heart class="w-4 h-4 fill-current text-[#E0527A] animate-pulse" />
        <span>Yudhi & Wina</span>
      </span>
      <span class="text-xs text-muted">|</span>
      <span class="text-xs text-muted">Ruang Kenangan Cinta Abadi</span>
    </div>

    <!-- Main Heading & Subtitle -->
    <div class="max-w-2xl">
      <h1 class="text-2xl sm:text-3xl lg:text-4xl font-serif font-semibold text-app tracking-tight leading-tight mb-2.5">
        Setiap detik indah kita, tersimpan manis di sini.
      </h1>
      <p class="text-xs sm:text-sm text-muted leading-relaxed">
        Kumpulan momen berharga, senyuman manis, dan cerita perjalanan kita berdua yang selalu bisa dibuka kapan saja.
      </p>
    </div>

    <!-- Live Stats & Quick Actions Row -->
    <div class="mt-6 pt-5 border-t border-transparent grid grid-cols-1 sm:grid-cols-3 gap-3">
      <!-- Stat 1: Total Kenangan -->
      <div class="p-3.5 rounded-2xl bg-surface-tint/60 shadow-sm flex items-center gap-3">
        <ImageIcon class="w-6 h-6 text-[#C93D68] dark:text-[#FF8FAE] shrink-0" />
        <div>
          <p class="text-[11px] text-muted font-medium">Total Kenangan</p>
          <p class="text-base font-semibold text-app tracking-tight">
            {{ memoryCount }} File
          </p>
        </div>
      </div>

      <!-- Stat 2: Folder Tersimpan -->
      <div class="p-3.5 rounded-2xl bg-surface-tint/60 shadow-sm flex items-center gap-3">
        <FolderHeart class="w-6 h-6 text-[#E0527A] dark:text-[#FF8FAE] shrink-0" />
        <div>
          <p class="text-[11px] text-muted font-medium">Folder Kenangan</p>
          <p class="text-base font-semibold text-app tracking-tight">
            {{ folderCount }} Folder
          </p>
        </div>
      </div>

      <!-- Stat 3: Kapasitas -->
      <div class="p-3.5 rounded-2xl bg-surface-tint/60 shadow-sm flex items-center gap-3">
        <HardDrive class="w-6 h-6 text-[#3F9D7A] dark:text-[#52c39a] shrink-0" />
        <div>
          <p class="text-[11px] text-muted font-medium">Penyimpanan</p>
          <p class="text-base font-semibold text-app tracking-tight">
            {{ usedStorage }}
          </p>
        </div>
      </div>
    </div>

    <!-- Actions Bar -->
    <div class="mt-5 flex flex-wrap items-center gap-2.5">
      <Button
        type="button"
        variant="primary"
        size="md"
        class="text-xs flex items-center gap-2"
        @click="$emit('createFolder')"
      >
        <FolderPlus class="w-4 h-4 text-white" />
        <span>Buat Folder Baru</span>
      </Button>

      <Button
        type="button"
        variant="secondary"
        size="md"
        class="text-xs flex items-center gap-2"
        @click="$emit('upload')"
      >
        <UploadCloud class="w-4 h-4 text-[#C93D68] dark:text-[#FF8FAE]" />
        <span>Upload Foto / Video</span>
      </Button>
    </div>
  </section>
</template>
