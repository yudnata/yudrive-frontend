<script setup lang="ts">
import { MediaItem } from '@/types';
import GalleryItemCard from './GalleryItemCard.vue';

interface Props {
  dateLabel: string;
  items: MediaItem[];
  isSelectionMode?: boolean;
  selectedIds?: Set<string>;
}

withDefaults(defineProps<Props>(), {
  isSelectionMode: false,
  selectedIds: () => new Set<string>(),
});

defineEmits<{
  (e: 'select', item: MediaItem): void;
  (e: 'longpress', item: MediaItem): void;
  (e: 'toggleSelect', item: MediaItem): void;
}>();
</script>

<template>
  <section class="mb-8 last:mb-0">
    <!-- Date Header in Fraunces Serif -->
    <h2 class="text-base sm:text-lg font-serif font-medium text-app mb-3 tracking-tight">
      {{ dateLabel }}
    </h2>

    <!-- Tight responsive grid: mobile 3 cols, tablet 4 cols, desktop 5-6 cols -->
    <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
      <GalleryItemCard
        v-for="item in items"
        :key="item.id"
        :item="item"
        :is-selection-mode="isSelectionMode"
        :is-selected="selectedIds.has(item.id)"
        @click="$emit('select', $event)"
        @longpress="$emit('longpress', $event)"
        @toggle-select="$emit('toggleSelect', $event)"
      />
    </div>
  </section>
</template>

