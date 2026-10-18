<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useGalleryStore } from '../stores/gallery.store';
import { useFolderStore } from '@/features/folders/stores/folders.store';
import { apiFetch } from '@/services/api';
import { MediaItem } from '@/types';
import { Heart, Folder as FolderIcon, FolderPlus, UploadCloud } from 'lucide-vue-next';

defineEmits<{
  (e: 'createFolder'): void;
  (e: 'upload'): void;
}>();

const galleryStore = useGalleryStore();
const folderStore = useFolderStore();

interface ShowcaseSlide {
  id: string;
  url: string;
  folderName: string;
}

const poolMedia = ref<MediaItem[]>([]);
const currentIndex = ref(0);
let timer: ReturnType<typeof setInterval> | null = null;

// Build list of slides from folders and media items
const slides = computed<ShowcaseSlide[]>(() => {
  const result: ShowcaseSlide[] = [];
  const seenUrls = new Set<string>();

  // 1. Folders with custom cover URLs
  for (const f of folderStore.folders) {
    if (f.coverUrl && !seenUrls.has(f.coverUrl)) {
      seenUrls.add(f.coverUrl);
      result.push({
        id: `folder-${f.id}`,
        url: f.coverUrl,
        folderName: f.name,
      });
    }
  }

  // 2. Photos from poolMedia or galleryStore
  const combined = [...poolMedia.value, ...galleryStore.items];
  for (const item of combined) {
    if (item.thumbUrl && !seenUrls.has(item.thumbUrl)) {
      seenUrls.add(item.thumbUrl);
      const matchedFolder = item.folderId
        ? folderStore.folders.find((f) => f.id === item.folderId)
        : null;
      result.push({
        id: item.id,
        url: item.thumbUrl,
        folderName: matchedFolder ? matchedFolder.name : 'Galeri Kenangan',
      });
    }
  }

  return result;
});

const currentSlide = computed<ShowcaseSlide | null>(() => {
  if (slides.value.length === 0) return null;
  return slides.value[currentIndex.value % slides.value.length] || null;
});

function nextSlide() {
  if (slides.value.length <= 1) return;
  // Pick random next slide
  let nextIdx = Math.floor(Math.random() * slides.value.length);
  if (nextIdx === currentIndex.value) {
    nextIdx = (currentIndex.value + 1) % slides.value.length;
  }
  currentIndex.value = nextIdx;
}

onMounted(async () => {
  // Fetch a rich pool of photos across all folders
  try {
    const res = await apiFetch<{ items: MediaItem[] }>('/media?limit=50');
    if (res.items && res.items.length > 0) {
      poolMedia.value = res.items;
      // Randomize initial starting slide
      currentIndex.value = Math.floor(Math.random() * res.items.length);
    }
  } catch {
    // Graceful fallback to gallery store items
  }

  // 3-second minimal fade cross-switch
  timer = setInterval(nextSlide, 3000);
});

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
});
</script>

<template>
  <div class="relative w-full h-48 sm:h-56 md:h-64 lg:h-72 rounded-3xl overflow-hidden shadow-soft select-none bg-surface-tint">
    <!-- Active Slide Showcase with 1s Smooth Cross-Fade -->
    <template v-if="slides.length > 0">
      <div
        v-for="(slide, index) in slides"
        :key="slide.id"
        class="absolute inset-0 transition-opacity duration-1000 ease-in-out"
        :class="index === (currentIndex % slides.length) ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'"
      >
        <img
          :src="slide.url"
          :alt="slide.folderName"
          class="w-full h-full object-cover"
        />
      </div>
    </template>

    <!-- Romantic Fallback Slide (When no photos uploaded yet) -->
    <div
      v-else
      class="w-full h-full bg-linear-to-tr from-[#FFCCD5] via-[#FFF0F4] to-[#FFE6ED] dark:from-[#2A1D24] dark:via-[#35242D] dark:to-[#4A2635] flex items-center justify-center p-6 text-center"
    >
      <div class="space-y-1">
        <Heart class="w-8 h-8 text-[#C93D68] dark:text-[#FF8FAE] fill-current mx-auto animate-pulse" />
        <h2 class="text-base sm:text-lg font-semibold text-app">
          Ruang Kenangan Yudhi & Wina
        </h2>
        <p class="text-xs text-muted">
          Unggah foto untuk mulai mengisi showcase kenangan
        </p>
      </div>
    </div>

    <!-- Soft Ambient Vignette Overlay -->
    <div class="absolute inset-0 bg-linear-to-t from-black/65 via-black/10 to-black/35 pointer-events-none z-15" />

    <!-- Top Left: Couple Name Badge -->
    <div class="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/35 backdrop-blur-md text-white text-xs font-semibold">
      <Heart class="w-3.5 h-3.5 text-[#FF8FAE] fill-current animate-pulse" />
      <span>Yudhi & Wina</span>
    </div>

    <!-- Top Right: Compact Action Buttons -->
    <div class="absolute top-4 right-4 z-20 flex items-center gap-2">
      <button
        type="button"
        class="px-3 py-1.5 rounded-full bg-black/35 hover:bg-black/55 backdrop-blur-md text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
        aria-label="Buat folder baru"
        @click="$emit('createFolder')"
      >
        <FolderPlus class="w-3.5 h-3.5 text-[#FF8FAE]" />
        <span class="hidden sm:inline">Folder Baru</span>
      </button>

      <button
        type="button"
        class="px-3 py-1.5 rounded-full bg-black/35 hover:bg-black/55 backdrop-blur-md text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
        aria-label="Upload file"
        @click="$emit('upload')"
      >
        <UploadCloud class="w-3.5 h-3.5 text-[#FF8FAE]" />
        <span class="hidden sm:inline">Upload</span>
      </button>
    </div>

    <!-- Bottom Left: Folder Name Badge -->
    <div
      v-if="currentSlide"
      class="absolute bottom-4 left-4 z-20 flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-black/45 backdrop-blur-md text-white text-xs font-semibold shadow-sm"
    >
      <FolderIcon class="w-3.5 h-3.5 text-[#FF8FAE] shrink-0 fill-current" />
      <span class="truncate max-w-[200px] sm:max-w-xs">{{ currentSlide.folderName }}</span>
    </div>
  </div>
</template>
