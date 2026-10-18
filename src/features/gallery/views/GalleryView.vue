<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useIntersectionObserver } from '@vueuse/core';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { useGalleryStore } from '../stores/gallery.store';
import GalleryHeader from '../components/GalleryHeader.vue';
import GalleryDateGroup from '../components/GalleryDateGroup.vue';
import GalleryEmptyState from '../components/GalleryEmptyState.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import { MediaItem } from '@/types';
import { Heart, Coffee } from 'lucide-vue-next';

const authStore = useAuthStore();
const galleryStore = useGalleryStore();

const sentinelRef = ref<HTMLElement | null>(null);

// Trigger infinite scroll when scrolling near bottom
useIntersectionObserver(
  sentinelRef,
  ([{ isIntersecting }]) => {
    if (isIntersecting && galleryStore.hasMore && !galleryStore.isLoading && !galleryStore.isLoadingMore) {
      galleryStore.fetchMedia();
    }
  },
  { rootMargin: '300px' }
);

function handleSelectMedia(item: MediaItem) {
  // Will be connected to Lightbox/Viewer in Fase 4
  console.log('Selected media:', item.id);
}

onMounted(async () => {
  await Promise.all([
    authStore.fetchMe().catch(() => {}),
    galleryStore.fetchMedia(true).catch(() => {}),
  ]);
});
</script>

<template>
  <div class="min-h-screen flex flex-col bg-app text-app pb-safe">
    <!-- Header -->
    <GalleryHeader />

    <!-- Cold Start Wakeup Notice -->
    <div
      v-if="authStore.isColdStarting"
      class="max-w-6xl mx-auto px-4 mt-4 w-full"
    >
      <div class="p-3.5 rounded-[14px] bg-surface-tint border border-app text-xs text-app flex items-center gap-2.5">
        <Coffee class="w-4 h-4 text-[#C93D68] shrink-0" />
        <p class="leading-relaxed">
          Server Azure sedang bangun dari mode tidur. Data akan segera muncul dalam beberapa detik...
        </p>
      </div>
    </div>

    <!-- Main Gallery Container -->
    <main class="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:py-8">
      <!-- Loading Skeleton (Initial Fetch) -->
      <div v-if="galleryStore.isLoading" class="space-y-6">
        <Skeleton width="180px" height="24px" rounded="sm" />
        <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
          <Skeleton
            v-for="n in 18"
            :key="n"
            aspect="square"
            rounded="md"
          />
        </div>
      </div>

      <!-- Empty State -->
      <GalleryEmptyState
        v-else-if="galleryStore.items.length === 0"
      />

      <!-- Populated Gallery Grouped by Date -->
      <div v-else class="space-y-2">
        <GalleryDateGroup
          v-for="group in galleryStore.groupedByDate"
          :key="group.dateKey"
          :date-label="group.dateLabel"
          :items="group.items"
          @select="handleSelectMedia"
        />

        <!-- Sentinel element for infinite scroll -->
        <div ref="sentinelRef" class="h-10 flex items-center justify-center">
          <div
            v-if="galleryStore.isLoadingMore"
            class="flex items-center gap-2 text-xs text-muted"
          >
            <div class="w-2 h-2 rounded-full bg-[#C93D68] animate-ping" />
            <span>Memuat lebih banyak kenangan...</span>
          </div>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="py-6 text-center text-xs text-muted border-t border-app mt-auto">
      <p class="flex items-center justify-center gap-1.5">
        Ruang privat kita berdua
        <Heart class="w-3.5 h-3.5 text-[#E0527A] fill-current inline" />
      </p>
    </footer>
  </div>
</template>
