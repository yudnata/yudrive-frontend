<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useGalleryStore } from '../stores/gallery.store';
import { useFolderStore } from '@/features/folders/stores/folders.store';
import { apiFetch } from '@/services/api';
import { MediaItem, Folder as FolderType } from '@/types';
import {
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

// Diverse randomized selection for 11 bento slots:
// Guarantees maximum folder variety — slots prioritize different folders first,
// preventing any single folder from flooding the grid.
const bentoSelection = computed<MediaItem[]>(() => {
  // Trigger re-computation on seed change
  void seed.value;

  const pool = [...allMedia.value];
  if (pool.length === 0) return [];
  if (pool.length <= 11) return pool;

  // Group items by folder ID (or '__unfiled__')
  const folderGroups = new Map<string, MediaItem[]>();
  for (const item of pool) {
    const key = item.folderId || '__unfiled__';
    if (!folderGroups.has(key)) {
      folderGroups.set(key, []);
    }
    folderGroups.get(key)!.push(item);
  }

  // Shuffle the items within each folder group
  for (const list of folderGroups.values()) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
  }

  // Randomize the order of folders so different folders take the Hero (Slot 0) every time
  const folderKeys = Array.from(folderGroups.keys());
  for (let i = folderKeys.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [folderKeys[i], folderKeys[j]] = [folderKeys[j], folderKeys[i]];
  }

  const selected: MediaItem[] = [];
  const folderPointers = new Map<string, number>();
  for (const key of folderKeys) {
    folderPointers.set(key, 0);
  }

  // Round-robin distribution:
  // Round 1: Take 1 item from each folder (guarantees up to N different folders!)
  // Round 2+: If more items needed to reach 11, take from different folders, ensuring no two adjacent slots share the same folder
  while (selected.length < 11) {
    let addedInPass = false;

    for (const key of folderKeys) {
      if (selected.length >= 11) break;

      const list = folderGroups.get(key)!;
      const ptr = folderPointers.get(key)!;

      if (ptr < list.length) {
        const candidate = list[ptr];
        // Avoid consecutive items from the same folder
        const lastItem = selected[selected.length - 1];
        if (lastItem && (lastItem.folderId || '__unfiled__') === key && folderKeys.length > 1) {
          continue;
        }

        selected.push(candidate);
        folderPointers.set(key, ptr + 1);
        addedInPass = true;
      }
    }

    if (!addedInPass) {
      // Fallback pass: append remaining available photos
      for (const key of folderKeys) {
        if (selected.length >= 11) break;
        const list = folderGroups.get(key)!;
        const ptr = folderPointers.get(key)!;
        if (ptr < list.length) {
          selected.push(list[ptr]);
          folderPointers.set(key, ptr + 1);
          addedInPass = true;
        }
      }
      if (!addedInPass) break;
    }
  }

  return selected;
});

// Slot layout configuration for the 11-item seamless bento grid (zero white space)
// Mobile has dynamic vertical 2-slot (1x2) cards, stacked 1x1 cards, and wide cards for an authentic Bento rhythm
const slotClasses = [
  'col-span-2 row-span-2 md:col-span-2 md:row-span-2', // 0: Hero 2x2
  'col-span-1 row-span-2 md:col-span-1 md:row-span-2', // 1: Tall vertical 2-slot on mobile & desktop
  'col-span-1 row-span-1 md:col-span-1 md:row-span-1', // 2: 1x1 Square
  'col-span-1 row-span-1 md:col-span-1 md:row-span-1', // 3: 1x1 Square
  'col-span-1 row-span-1 md:col-span-2 md:row-span-1', // 4: Square on mobile, Wide on desktop
  'col-span-1 row-span-2 md:col-span-1 md:row-span-1', // 5: Tall vertical 2-slot on mobile, Square on desktop
  'col-span-1 row-span-1 md:col-span-1 md:row-span-1', // 6: 1x1 Square
  'col-span-2 row-span-1 md:col-span-1 md:row-span-1', // 7: Wide panoramic card on mobile, Square on desktop
  'col-span-1 row-span-2 md:col-span-1 md:row-span-1', // 8: Tall vertical 2-slot on mobile, Square on desktop
  'col-span-1 row-span-1 md:col-span-1 md:row-span-1', // 9: 1x1 Square
  'col-span-1 row-span-1 md:col-span-1 md:row-span-1', // 10: 1x1 Square
];

async function shuffleBento() {
  if (isShuffling.value) return;
  isShuffling.value = true;
  seed.value++;

  try {
    const res = await apiFetch<{ items: MediaItem[] }>('/media/random?limitPerFolder=3&limit=60');
    if (res?.items && res.items.length > 0) {
      poolMedia.value = res.items;
    }
  } catch {
    // fallback keeps existing pool, seed will re-shuffle locally
  } finally {
    setTimeout(() => {
      isShuffling.value = false;
    }, 350);
  }
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
      apiFetch<{ items: MediaItem[] }>('/media/random?limitPerFolder=3&limit=60')
        .catch(() => apiFetch<{ items: MediaItem[] }>('/media?limit=50'))
        .catch(() => ({ items: [] })),
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
          <span>Kilas Kenangan</span>
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

    <!-- BENTO GRID (Seamless zero-whitespace responsive grid) -->
    <div
      v-else-if="bentoSelection.length >= 11"
      class="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 auto-rows-35 sm:auto-rows-38.75 md:auto-rows-42.5 lg:auto-rows-46.25 grid-flow-dense"
    >
      <div
        v-for="(item, index) in bentoSelection"
        :key="item.id"
        class="group relative rounded-3xl overflow-hidden shadow-soft cursor-pointer bg-surface-tint"
        :class="slotClasses[index]"
        @click="$emit('selectMedia', item)"
      >
        <img
          :src="item.thumbUrl || ''"
          :alt="getFolderName(item.folderId)"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        <!-- Soft Vignette Gradient -->
        <div class="absolute inset-0 bg-linear-to-t from-black/75 via-black/20 to-transparent pointer-events-none" />

        <!-- Top Badge for Hero Card -->
        <div v-if="index === 0" class="absolute top-3.5 left-3.5 z-10">
          <span class="px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-xs">
            <Heart class="w-3 h-3 text-[#FF8FAE] fill-current" />
            <span>Momen Pilihan</span>
          </span>
        </div>

        <!-- Video Badge -->
        <div
          v-if="item.type === 'video'"
          class="absolute top-3 right-3 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center z-10"
        >
          <Play class="w-3.5 h-3.5 fill-current ml-0.5" />
        </div>

        <!-- Bottom Overlay Info -->
        <div class="absolute bottom-2.5 sm:bottom-3 left-2.5 sm:left-3 right-2.5 sm:right-3 z-10">
          <button
            type="button"
            class="px-2 py-0.5 sm:py-1 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-[10px] sm:text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer max-w-full truncate"
            @click.stop="handleFolderClick(item.folderId, $event)"
          >
            <FolderIcon class="w-3 h-3 text-[#FF8FAE] shrink-0 fill-current" />
            <span class="truncate">{{ getFolderName(item.folderId) }}</span>
          </button>
          <p
            v-if="(item.takenAt || item.createdAt) && [0, 1, 4, 5, 7, 8].includes(index)"
            class="text-white/80 text-[10px] sm:text-[11px] flex items-center gap-1 drop-shadow-sm mt-1"
          >
            <Calendar class="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
            <span>{{ formatDate(item.takenAt || item.createdAt) }}</span>
          </p>
        </div>
      </div>
    </div>

    <!-- Fallback Grid if fewer than 11 items -->
    <div
      v-else
      class="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 auto-rows-35 sm:auto-rows-40 md:auto-rows-43.75"
    >
      <div
        v-for="item in allMedia"
        :key="item.id"
        class="group relative col-span-1 row-span-1 rounded-3xl overflow-hidden shadow-soft cursor-pointer bg-surface-tint"
        @click="$emit('selectMedia', item)"
      >
        <img
          :src="item.thumbUrl || ''"
          :alt="getFolderName(item.folderId)"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div class="absolute inset-0 bg-linear-to-t from-black/75 via-black/20 to-transparent pointer-events-none" />
        <div v-if="item.type === 'video'" class="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center z-10">
          <Play class="w-3.5 h-3.5 fill-current ml-0.5" />
        </div>
        <div class="absolute bottom-2.5 left-2.5 right-2.5 z-10">
          <span class="text-white text-[11px] font-semibold drop-shadow-sm truncate block">
            {{ getFolderName(item.folderId) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Explore Folders Quick Action Pill -->
    <div class="flex items-center justify-center pt-2">
      <button
        type="button"
        class="px-5 py-2.5 rounded-full bg-surface shadow-soft-sm hover:shadow-soft text-app text-xs font-semibold hover:bg-surface-tint active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
        aria-label="Jelajahi semua folder kenangan"
        @click="$emit('exploreFolders')"
      >
        <FolderIcon class="w-3.5 h-3.5 text-[#C93D68] dark:text-[#FF8FAE]" />
        <span>Jelajahi Semua Folder Kenangan</span>
        <span class="text-muted text-[11px]">({{ allMedia.length }})</span>
      </button>
    </div>
  </div>
</template>
