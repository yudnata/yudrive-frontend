<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useGalleryStore } from '../stores/gallery.store';
import { useFolderStore } from '@/features/folders/stores/folders.store';
import { apiFetch } from '@/services/api';
import { MediaItem, Folder as FolderType } from '@/types';
import {
  Sparkles,
  Shuffle,
  Heart,
  Folder as FolderIcon,
  Play,
  Calendar,
} from 'lucide-vue-next';

const emit = defineEmits<{
  (e: 'selectMedia', item: MediaItem): void;
  (e: 'selectFolder', folder: FolderType): void;
  (e: 'exploreFolders'): void;
}>();

const galleryStore = useGalleryStore();
const folderStore = useFolderStore();

const poolMedia = ref<MediaItem[]>([]);
const extraFolders = ref<FolderType[]>([]);
const isShuffling = ref(false);
const seed = ref(1);

// Map of folderId -> folder
const folderMap = computed(() => {
  const map = new Map<string, FolderType>();
  for (const f of folderStore.folders) {
    map.set(f.id, f);
  }
  for (const f of extraFolders.value) {
    map.set(f.id, f);
  }
  return map;
});

// All available photos & videos
const allMedia = computed(() => {
  const seen = new Set<string>();
  const list: MediaItem[] = [];
  for (const m of [...poolMedia.value, ...galleryStore.items]) {
    if (m.thumbUrl && !seen.has(m.id)) {
      seen.add(m.id);
      list.push(m);
    }
  }
  return list;
});

// Shuffled randomized selection for bento slots
const bentoItems = computed(() => {
  // Trigger re-computation on seed change
  void seed.value;
  const items = [...allMedia.value];
  if (items.length <= 1) return items;

  // Fisher-Yates shuffle
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
});

// Specific slots for the bento layout
const heroItem = computed(() => bentoItems.value[0] || null);
const tallItem = computed(() => bentoItems.value[1] || null);
const wideItem = computed(() => bentoItems.value[2] || null);
const tile1 = computed(() => bentoItems.value[3] || null);
const tile2 = computed(() => bentoItems.value[4] || null);
const tile3 = computed(() => bentoItems.value[5] || null);

function shuffleBento() {
  isShuffling.value = true;
  seed.value++;
  setTimeout(() => {
    isShuffling.value = false;
  }, 400);
}

function getFolderName(folderId?: string | null): string {
  if (!folderId) return 'Galeri Kenangan';
  return folderMap.value.get(folderId)?.name || 'Folder Kenangan';
}

function handleFolderClick(folderId?: string | null, e?: Event) {
  if (e) e.stopPropagation();
  if (!folderId) {
    emit('exploreFolders');
    return;
  }
  const folder = folderMap.value.get(folderId);
  if (folder) {
    emit('selectFolder', folder);
  } else {
    emit('exploreFolders');
  }
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

onMounted(async () => {
  try {
    const [mediaRes, foldersRes] = await Promise.all([
      apiFetch<{ items: MediaItem[] }>('/media?limit=50').catch(() => ({ items: [] })),
      apiFetch<{ folders: FolderType[] }>('/folders?all=true').catch(() => ({ folders: [] })),
    ]);
    if (mediaRes?.items) poolMedia.value = mediaRes.items;
    if (foldersRes?.folders) extraFolders.value = foldersRes.folders;
  } catch {
    // fallback
  }
});
</script>

<template>
  <div class="space-y-4 sm:space-y-5">
    <!-- Header Controls: Title & Shuffle Button -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-base sm:text-lg font-bold text-app flex items-center gap-2 tracking-tight">
          <Sparkles class="w-4 h-4 text-[#C93D68] dark:text-[#FF8FAE]" />
          <span>Kilas Kenangan Kita</span>
        </h2>
        <p class="text-xs text-muted mt-0.5">
          Koleksi momen acak penuh cerita indah berdua
        </p>
      </div>

      <button
        type="button"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface shadow-soft-sm hover:shadow-soft text-app text-xs font-semibold transition-all hover:bg-surface-tint active:scale-95 cursor-pointer"
        aria-label="Acak ulang foto kenangan"
        @click="shuffleBento"
      >
        <Shuffle
          class="w-3.5 h-3.5 text-[#C93D68] dark:text-[#FF8FAE] transition-transform duration-300"
          :class="{ 'rotate-180': isShuffling }"
        />
        <span>Acak Kenangan</span>
      </button>
    </div>

    <!-- Empty State (No media yet) -->
    <div
      v-if="allMedia.length === 0"
      class="text-center py-16 px-4 rounded-3xl bg-surface shadow-soft-sm space-y-3"
    >
      <Heart class="w-12 h-12 mx-auto text-[#C93D68]/80 dark:text-[#FF8FAE]/80 stroke-[1.5] animate-pulse" />
      <h3 class="text-base font-semibold text-app">
        Belum ada kenangan yang diunggah
      </h3>
      <p class="text-xs text-muted max-w-sm mx-auto">
        Ketuk tombol tambah (+) di bawah untuk mulai mengunggah foto atau video pertama kalian berdua.
      </p>
    </div>

    <!-- BENTO GRID CONTAINER -->
    <div
      v-else
      class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 auto-rows-[160px] sm:auto-rows-[180px]"
    >
      <!-- 1. HERO CARD (Large 2x2 Feature Card) -->
      <div
        v-if="heroItem"
        class="group relative col-span-2 row-span-2 rounded-3xl overflow-hidden shadow-soft cursor-pointer bg-surface-tint"
        @click="$emit('selectMedia', heroItem)"
      >
        <img
          :src="heroItem.thumbUrl || ''"
          :alt="getFolderName(heroItem.folderId)"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        <!-- Soft Vignette Gradient -->
        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

        <!-- Top Badge -->
        <div class="absolute top-3.5 left-3.5 z-10">
          <span class="px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md text-white text-[11px] font-semibold flex items-center gap-1.5">
            <Heart class="w-3 h-3 text-[#FF8FAE] fill-current" />
            <span>Momen Pilihan</span>
          </span>
        </div>

        <!-- Video badge if video -->
        <div
          v-if="heroItem.type === 'video'"
          class="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center z-10"
        >
          <Play class="w-4 h-4 fill-current ml-0.5" />
        </div>

        <!-- Bottom Info -->
        <div class="absolute bottom-3.5 left-3.5 right-3.5 z-10 flex items-end justify-between gap-2">
          <div class="overflow-hidden">
            <button
              type="button"
              class="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer mb-1.5 max-w-full truncate"
              @click="handleFolderClick(heroItem.folderId, $event)"
            >
              <FolderIcon class="w-3 h-3 text-[#FF8FAE] shrink-0 fill-current" />
              <span class="truncate">{{ getFolderName(heroItem.folderId) }}</span>
            </button>
            <p v-if="heroItem.takenAt" class="text-white/80 text-xs flex items-center gap-1 drop-shadow-sm">
              <Calendar class="w-3 h-3 shrink-0" />
              <span>{{ formatDate(heroItem.takenAt) }}</span>
            </p>
          </div>
        </div>
      </div>

      <!-- 2. COUPLE STORY / STATS CARD (Playful Bento Card inspired by reference) -->
      <div class="col-span-2 sm:col-span-1 row-span-1 rounded-3xl bg-linear-to-tr from-[#FFCCD5] via-[#FFF0F4] to-[#FFE6ED] dark:from-[#2A1D24] dark:via-[#35242D] dark:to-[#4A2635] p-4 flex flex-col justify-between shadow-soft-sm">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold tracking-widest uppercase text-[#C93D68] dark:text-[#FF8FAE]">
            Kenangan Kita
          </span>
          <Heart class="w-4 h-4 text-[#C93D68] dark:text-[#FF8FAE] fill-current animate-pulse" />
        </div>

        <div>
          <h3 class="text-base sm:text-lg font-bold text-app leading-snug">
            Yudhi & Wina
          </h3>
          <p class="text-[11px] text-muted mt-0.5">
            {{ allMedia.length }} kenangan tersimpan rapi
          </p>
        </div>

        <button
          type="button"
          class="self-start text-[11px] font-semibold text-[#C93D68] dark:text-[#FF8FAE] hover:underline flex items-center gap-1 cursor-pointer"
          @click="$emit('exploreFolders')"
        >
          <span>Jelajah Semua Folder</span>
          <span>→</span>
        </button>
      </div>

      <!-- 3. TALL PORTRAIT CARD (1 col, 2 rows) -->
      <div
        v-if="tallItem"
        class="group relative col-span-1 row-span-2 rounded-3xl overflow-hidden shadow-soft cursor-pointer bg-surface-tint"
        @click="$emit('selectMedia', tallItem)"
      >
        <img
          :src="tallItem.thumbUrl || ''"
          :alt="getFolderName(tallItem.folderId)"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent pointer-events-none" />

        <div class="absolute bottom-3 left-3 right-3 z-10">
          <span class="text-white text-[11px] font-semibold drop-shadow-sm truncate block">
            {{ getFolderName(tallItem.folderId) }}
          </span>
        </div>
      </div>

      <!-- 4. WIDE CARD (2 cols, 1 row on desktop / responsive) -->
      <div
        v-if="wideItem"
        class="group relative col-span-2 sm:col-span-1 md:col-span-2 row-span-1 rounded-3xl overflow-hidden shadow-soft cursor-pointer bg-surface-tint"
        @click="$emit('selectMedia', wideItem)"
      >
        <img
          :src="wideItem.thumbUrl || ''"
          :alt="getFolderName(wideItem.folderId)"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

        <div class="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between">
          <span class="text-white text-xs font-semibold drop-shadow-sm truncate">
            {{ getFolderName(wideItem.folderId) }}
          </span>
          <span v-if="wideItem.type === 'video'" class="w-6 h-6 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center shrink-0">
            <Play class="w-3 h-3 fill-current ml-0.5" />
          </span>
        </div>
      </div>

      <!-- 5. MINI TILE 1 (Square) -->
      <div
        v-if="tile1"
        class="group relative col-span-1 row-span-1 rounded-3xl overflow-hidden shadow-soft cursor-pointer bg-surface-tint"
        @click="$emit('selectMedia', tile1)"
      >
        <img
          :src="tile1.thumbUrl || ''"
          :alt="getFolderName(tile1.folderId)"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
        <div class="absolute bottom-2.5 left-2.5 right-2.5 z-10">
          <p class="text-white text-[10px] font-semibold truncate drop-shadow-sm">
            {{ getFolderName(tile1.folderId) }}
          </p>
        </div>
      </div>

      <!-- 6. MINI TILE 2 (Square) -->
      <div
        v-if="tile2"
        class="group relative col-span-1 row-span-1 rounded-3xl overflow-hidden shadow-soft cursor-pointer bg-surface-tint"
        @click="$emit('selectMedia', tile2)"
      >
        <img
          :src="tile2.thumbUrl || ''"
          :alt="getFolderName(tile2.folderId)"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
        <div class="absolute bottom-2.5 left-2.5 right-2.5 z-10">
          <p class="text-white text-[10px] font-semibold truncate drop-shadow-sm">
            {{ getFolderName(tile2.folderId) }}
          </p>
        </div>
      </div>

      <!-- 7. MINI TILE 3 or Quick Folder Action (Square) -->
      <div
        v-if="tile3"
        class="group relative col-span-1 row-span-1 rounded-3xl overflow-hidden shadow-soft cursor-pointer bg-surface-tint"
        @click="$emit('selectMedia', tile3)"
      >
        <img
          :src="tile3.thumbUrl || ''"
          :alt="getFolderName(tile3.folderId)"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
        <div class="absolute bottom-2.5 left-2.5 right-2.5 z-10">
          <p class="text-white text-[10px] font-semibold truncate drop-shadow-sm">
            {{ getFolderName(tile3.folderId) }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
