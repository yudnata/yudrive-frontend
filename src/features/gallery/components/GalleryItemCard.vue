<script setup lang="ts">
import { ref } from 'vue';
import { MediaItem } from '@/types';
import { Play } from 'lucide-vue-next';

interface Props {
  item: MediaItem;
}

defineProps<Props>();
defineEmits<{
  (e: 'click', item: MediaItem): void;
}>();

const imageLoaded = ref(false);
const imageError = ref(false);

function formatDuration(sec?: number): string {
  if (!sec) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
</script>

<template>
  <button
    type="button"
    class="group relative aspect-square w-full rounded-[14px] overflow-hidden bg-surface-tint border border-app/60 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD9E3] photo-card"
    :aria-label="item.type === 'video' ? 'Putar video kenangan' : 'Lihat foto kenangan'"
    @click="$emit('click', item)"
  >
    <!-- Shimmer placeholder while image is loading -->
    <div
      v-if="!imageLoaded && !imageError"
      class="absolute inset-0 skeleton-shimmer"
    />

    <!-- Thumbnail Image -->
    <img
      v-if="item.thumbUrl && !imageError"
      :src="item.thumbUrl"
      :alt="item.type === 'video' ? 'Cuplikan video' : 'Foto kenangan'"
      loading="lazy"
      class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      :class="{ 'opacity-0': !imageLoaded, 'opacity-100': imageLoaded }"
      @load="imageLoaded = true"
      @error="imageError = true"
    />

    <!-- Video duration badge -->
    <div
      v-if="item.type === 'video'"
      class="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-[#3A2A31]/70 dark:bg-[#1E1419]/80 backdrop-blur-xs text-white text-[10px] font-medium flex items-center gap-1 pointer-events-none select-none"
    >
      <Play class="w-2.5 h-2.5 fill-current" />
      <span>{{ formatDuration(item.durationSec) }}</span>
    </div>
  </button>
</template>
