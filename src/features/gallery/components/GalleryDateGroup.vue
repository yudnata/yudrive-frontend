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
  <section class="mb-7 last:mb-0 relative">
    <!-- Responsive grid: mobile 3 cols, tablet 4 cols, desktop 5-6 cols -->
    <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3 pl-1">
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

