<script setup lang="ts">
import { MediaItem } from '@/types';
import GalleryItemCard from './GalleryItemCard.vue';

interface Props {
  dateLabel: string;
  items: MediaItem[];
}

defineProps<Props>();
defineEmits<{
  (e: 'select', item: MediaItem): void;
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
        @click="$emit('select', $event)"
      />
    </div>
  </section>
</template>
