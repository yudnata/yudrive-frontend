<script setup lang="ts">
import { ref } from 'vue';
import { MediaItem } from '@/types';
import { Play, Check, Heart, Image as ImageIcon } from 'lucide-vue-next';
import { useFavorites } from '../composables/useFavorites';

const { isFavorite } = useFavorites();

interface Props {
  item: MediaItem;
  isSelectionMode?: boolean;
  isSelected?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isSelectionMode: false,
  isSelected: false,
});

const emit = defineEmits<{
  (e: 'click', item: MediaItem): void;
  (e: 'longpress', item: MediaItem): void;
  (e: 'toggleSelect', item: MediaItem): void;
}>();

const imageLoaded = ref(false);
const imageError = ref(false);

let pressTimer: ReturnType<typeof setTimeout> | null = null;
let isLongPressTriggered = false;

function startPress() {
  isLongPressTriggered = false;
  pressTimer = setTimeout(() => {
    isLongPressTriggered = true;
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(40);
      }
    } catch {
      // Haptics not supported or permitted
    }
    emit('longpress', props.item);
  }, 500);
}

function cancelPress() {
  if (pressTimer) {
    clearTimeout(pressTimer);
    pressTimer = null;
  }
}

function handleClick() {
  if (isLongPressTriggered) {
    isLongPressTriggered = false;
    return;
  }
  if (props.isSelectionMode) {
    emit('toggleSelect', props.item);
  } else {
    emit('click', props.item);
  }
}

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
    class="group relative aspect-square w-full rounded-[14px] overflow-hidden bg-surface-tint shadow-sm text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD9E3] photo-card cursor-pointer transition-all duration-200 select-none"
    :class="[
      isSelected
        ? 'ring-2.5 ring-[#C93D68] dark:ring-[#FF8FAE] scale-[0.96] shadow-md'
        : isSelectionMode
          ? 'hover:scale-[0.98]'
          : 'hover:scale-[1.02]'
    ]"
    :aria-label="item.type === 'video' ? 'Putar video kenangan' : 'Lihat foto kenangan'"
    @touchstart.passive="startPress"
    @touchend="cancelPress"
    @touchmove="cancelPress"
    @touchcancel="cancelPress"
    @mousedown="startPress"
    @mouseup="cancelPress"
    @mouseleave="cancelPress"
    @contextmenu.prevent
    @click="handleClick"
  >
    <!-- Shimmer placeholder while image is loading in background -->
    <div
      v-if="!imageLoaded && !imageError"
      class="absolute inset-0 skeleton-shimmer pointer-events-none"
    />

    <!-- Thumbnail Image (Rendered directly with no opacity-0 so cached or fresh images are always visible) -->
    <img
      v-if="item.thumbUrl && !imageError"
      :src="item.thumbUrl"
      :alt="item.type === 'video' ? 'Cuplikan video' : 'Foto kenangan'"
      loading="lazy"
      decoding="async"
      class="w-full h-full object-cover transition-transform duration-300 relative z-10"
      :class="{
        'brightness-90': isSelected,
      }"
      @load="imageLoaded = true"
      @error="imageError = true"
    />

    <!-- Fallback if thumbnail missing or error -->
    <div
      v-else-if="imageError || !item.thumbUrl"
      class="absolute inset-0 flex flex-col items-center justify-center bg-surface-tint text-muted gap-1 text-center p-2 z-10"
    >
      <ImageIcon class="w-6 h-6 text-muted/60" />
      <span class="text-[9px] text-muted/80">Foto</span>
    </div>

    <!-- Multi-select overlay badge (appears during selection mode or when selected) -->
    <div
      v-if="isSelectionMode || isSelected"
      class="absolute top-2 left-2 z-20 transition-all duration-200"
    >
      <div
        class="w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm"
        :class="[
          isSelected
            ? 'bg-[#C93D68] dark:bg-[#FF8FAE] text-white'
            : 'bg-black/40 border-2 border-white/90 backdrop-blur-xs'
        ]"
      >
        <Check v-if="isSelected" class="w-3.5 h-3.5 stroke-3" />
      </div>
    </div>

    <!-- Favorite indicator badge (small heart) -->
    <div
      v-if="isFavorite(item.id) && !isSelectionMode"
      class="absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center text-[#FF8FAE] pointer-events-none shadow-xs"
    >
      <Heart class="w-3 h-3 fill-current" />
    </div>

    <!-- Video duration badge -->
    <div
      v-if="item.type === 'video'"
      class="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-[#3A2A31]/70 dark:bg-[#1E1419]/80 backdrop-blur-xs text-white text-[10px] font-medium flex items-center gap-1 pointer-events-none select-none z-10"
    >
      <Play class="w-2.5 h-2.5 fill-current" />
      <span>{{ formatDuration(item.durationSec) }}</span>
    </div>
  </button>
</template>
