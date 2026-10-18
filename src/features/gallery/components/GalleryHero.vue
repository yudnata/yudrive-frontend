<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useGalleryStore } from '../stores/gallery.store';
import { useFolderStore } from '@/features/folders/stores/folders.store';
import { apiFetch } from '@/services/api';
import { MediaItem, Folder as FolderType } from '@/types';
import { CalendarHeart } from 'lucide-vue-next';
import { formatEventDate } from '@/utils/date';

const galleryStore = useGalleryStore();
const folderStore = useFolderStore();

interface ShowcaseSlide {
  id: string;
  url: string;
  folderName: string;
  eventDate?: string | null;
}

const poolMedia = ref<MediaItem[]>([]);
const allFolders = ref<FolderType[]>([]);
const currentIndex = ref(0);
let timer: ReturnType<typeof setInterval> | null = null;

// Build list of slides from folders and media items
const slides = computed<ShowcaseSlide[]>(() => {
  const result: ShowcaseSlide[] = [];
  const seenUrls = new Set<string>();

  // Lookup folders map with name and eventDate
  const folderMap = new Map<string, { name: string; eventDate?: string | null }>();
  for (const f of folderStore.folders) {
    folderMap.set(f.id, { name: f.name, eventDate: f.eventDate });
  }
  for (const f of allFolders.value) {
    folderMap.set(f.id, { name: f.name, eventDate: f.eventDate });
  }

  // 1. Folders with custom cover URLs
  for (const f of folderStore.folders) {
    if (f.coverUrl && !seenUrls.has(f.coverUrl)) {
      seenUrls.add(f.coverUrl);
      result.push({
        id: `folder-${f.id}`,
        url: f.coverUrl,
        folderName: f.name,
        eventDate: f.eventDate || null,
      });
    }
  }

  // 2. Photos from poolMedia or galleryStore
  const combined = [...poolMedia.value, ...galleryStore.items];
  for (const item of combined) {
    if (item.thumbUrl && !seenUrls.has(item.thumbUrl)) {
      seenUrls.add(item.thumbUrl);
      const folderInfo = item.folderId ? folderMap.get(item.folderId) : null;
      const folderName = folderInfo ? folderInfo.name : 'Kenangan Kita';
      const eventDate = folderInfo?.eventDate || null;

      result.push({
        id: item.id,
        url: item.thumbUrl,
        folderName,
        eventDate,
      });
    }
  }

  return result;
});

function nextSlide() {
  if (slides.value.length <= 1) return;
  let nextIdx = Math.floor(Math.random() * slides.value.length);
  if (nextIdx === currentIndex.value) {
    nextIdx = (currentIndex.value + 1) % slides.value.length;
  }
  currentIndex.value = nextIdx;
}

onMounted(async () => {
  try {
    const [mediaRes, foldersRes] = await Promise.all([
      apiFetch<{ items: MediaItem[] }>('/media?limit=50').catch(() => ({ items: [] })),
      apiFetch<{ folders: FolderType[] }>('/folders?all=true').catch(() => ({ folders: [] })),
    ]);
    if (mediaRes?.items) poolMedia.value = mediaRes.items;
    if (foldersRes?.folders) allFolders.value = foldersRes.folders;

    if (slides.value.length > 0) {
      currentIndex.value = Math.floor(Math.random() * slides.value.length);
    }
  } catch {
    // Graceful fallback
  }

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
  <div class="relative w-full h-44 sm:h-52 md:h-60 rounded-3xl overflow-hidden shadow-soft select-none bg-surface-tint">
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

        <!-- Soft gradient overlay for text readability -->
        <div class="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

        <!-- Clean white text with shadow at bottom left showing folder name and optional event date -->
        <div class="absolute bottom-4 left-5 right-5 pointer-events-none flex items-center gap-2 flex-wrap">
          <p class="text-white text-base sm:text-lg font-semibold tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            {{ slide.folderName }}
          </p>
          <span
            v-if="slide.eventDate"
            class="text-white/95 text-xs sm:text-sm font-medium px-2.5 py-0.5 rounded-full bg-black/40 backdrop-blur-xs drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)] border border-white/15 flex items-center gap-1.5"
          >
            <CalendarHeart class="w-3.5 h-3.5 text-[#FF9BB5]" />
            {{ formatEventDate(slide.eventDate) }}
          </span>
        </div>
      </div>
    </template>

    <!-- Fallback Slide (When no photos uploaded yet) -->
    <div
      v-else
      class="w-full h-full flex items-center justify-center p-6 text-center text-muted text-xs"
    >
      Belum ada foto kenangan
    </div>
  </div>
</template>
