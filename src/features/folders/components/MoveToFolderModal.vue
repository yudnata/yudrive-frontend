<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { Folder as FolderType } from '@/types';
import { useFolderStore } from '@/features/folders/stores/folders.store';
import Button from '@/components/ui/Button.vue';
import {
  FolderInput,
  Folder as FolderIcon,
  Home,
  Check,
  X,
  Search,
  CalendarHeart,
} from 'lucide-vue-next';
import { formatEventDateShort } from '@/utils/date';

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    currentFolderId?: string | null;
    isLoading?: boolean;
    title?: string;
    description?: string;
  }>(),
  {
    title: 'Pindahkan ke Folder',
    description: 'Pilih folder tujuan untuk kenangan ini',
  }
);

const emit = defineEmits<{
  (e: 'move', targetFolderId: string | null): void;
  (e: 'close'): void;
}>();

const folderStore = useFolderStore();
const allFolders = ref<FolderType[]>([]);
const searchQuery = ref('');
const selectedFolderId = ref<string | null>(null);
const isLoadingList = ref(false);

async function loadFolders() {
  isLoadingList.value = true;
  try {
    allFolders.value = await folderStore.fetchAllFolders();
  } catch (err) {
    console.error('Failed to load folders for move modal:', err);
  } finally {
    isLoadingList.value = false;
  }
}

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      selectedFolderId.value = props.currentFolderId || null;
      searchQuery.value = '';
      loadFolders();
    }
  }
);

onMounted(() => {
  if (props.isOpen) {
    loadFolders();
  }
});

const filteredFolders = ref<FolderType[]>([]);
watch(
  [allFolders, searchQuery],
  () => {
    const q = searchQuery.value.trim().toLowerCase();
    if (!q) {
      filteredFolders.value = allFolders.value;
    } else {
      filteredFolders.value = allFolders.value.filter((f) =>
        f.name.toLowerCase().includes(q)
      );
    }
  },
  { immediate: true }
);

function handleConfirm() {
  emit('move', selectedFolderId.value);
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none"
      role="dialog"
      aria-modal="true"
    >
      <div
        class="w-full max-w-md rounded-3xl bg-surface shadow-2xl p-5 sm:p-6 text-left max-h-[85vh] flex flex-col ring-1 ring-black/5 dark:ring-white/10 transform transition-all"
        @click.stop
      >
        <!-- Modal Header -->
        <div class="flex items-center justify-between pb-3.5 border-b border-black/5 dark:border-white/10">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-[#C93D68]/10 dark:bg-[#FF8FAE]/10 text-[#C93D68] dark:text-[#FF8FAE] flex items-center justify-center shrink-0">
              <FolderInput class="w-4 h-4 stroke-2" />
            </div>
            <div>
              <h2 class="text-base font-serif font-bold text-app tracking-tight">
                {{ title }}
              </h2>
              <p class="text-[11px] text-muted">
                {{ description }}
              </p>
            </div>
          </div>
          <button
            type="button"
            class="p-1 rounded-full text-muted hover:text-app transition-colors focus:outline-none min-h-8 min-w-8 flex items-center justify-center cursor-pointer"
            aria-label="Tutup"
            @click="$emit('close')"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Search input if more than 3 folders -->
        <div v-if="allFolders.length > 3" class="pt-3">
          <div class="relative">
            <Search class="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Cari folder tujuan..."
              class="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-surface-tint ring-1 ring-black/5 dark:ring-white/10 text-app focus:outline-none focus:ring-2 focus:ring-[#FF8FAE]"
            />
          </div>
        </div>

        <!-- Scrollable Folder Choices -->
        <div class="flex-1 overflow-y-auto py-3 space-y-1.5 min-h-40 max-h-85">
          <!-- Option 1: Root / Galeri Utama -->
          <button
            type="button"
            class="w-full p-2.5 rounded-2xl flex items-center justify-between gap-3 transition-all cursor-pointer text-left"
            :class="[
              selectedFolderId === null
                ? 'bg-[#C93D68]/10 dark:bg-[#FF8FAE]/15 ring-1.5 ring-[#C93D68] dark:ring-[#FF8FAE]'
                : 'hover:bg-surface-tint',
            ]"
            @click="selectedFolderId = null"
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-10 h-10 rounded-xl bg-surface-tint flex items-center justify-center text-muted shrink-0 shadow-xs">
                <Home class="w-5 h-5 text-[#C93D68] dark:text-[#FF8FAE]" />
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <h4 class="text-xs sm:text-sm font-semibold text-app truncate">
                    Galeri Utama
                  </h4>
                  <span
                    v-if="!currentFolderId"
                    class="px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-muted/20 text-muted"
                  >
                    Lokasi Saat Ini
                  </span>
                </div>
                <p class="text-[11px] text-muted truncate">
                  Tanpa folder (tampil di galeri utama)
                </p>
              </div>
            </div>

            <div
              v-if="selectedFolderId === null"
              class="w-5 h-5 rounded-full bg-[#C93D68] text-white flex items-center justify-center shrink-0 shadow-xs"
            >
              <Check class="w-3 h-3 stroke-[2.5]" />
            </div>
          </button>

          <!-- Loading state -->
          <div v-if="isLoadingList" class="py-8 text-center text-xs text-muted">
            Memuat daftar folder...
          </div>

          <!-- Empty search result -->
          <div
            v-else-if="filteredFolders.length === 0 && searchQuery"
            class="py-8 text-center text-xs text-muted"
          >
            Tidak ada folder dengan nama "{{ searchQuery }}"
          </div>

          <!-- List of User Folders -->
          <button
            v-for="folder in filteredFolders"
            :key="folder.id"
            type="button"
            class="w-full p-2.5 rounded-2xl flex items-center justify-between gap-3 transition-all cursor-pointer text-left"
            :class="[
              selectedFolderId === folder.id
                ? 'bg-[#C93D68]/10 dark:bg-[#FF8FAE]/15 ring-1.5 ring-[#C93D68] dark:ring-[#FF8FAE]'
                : 'hover:bg-surface-tint',
            ]"
            @click="selectedFolderId = folder.id"
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-10 h-10 rounded-xl bg-surface-tint overflow-hidden flex items-center justify-center shrink-0 shadow-xs relative">
                <img
                  v-if="folder.coverUrl"
                  :src="folder.coverUrl"
                  :alt="folder.name"
                  class="w-full h-full object-cover"
                />
                <FolderIcon v-else class="w-5 h-5 text-[#C93D68] dark:text-[#FF8FAE]" />
              </div>

              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <h4 class="text-xs sm:text-sm font-semibold text-app truncate">
                    {{ folder.name }}
                  </h4>
                  <span
                    v-if="currentFolderId === folder.id"
                    class="px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-muted/20 text-muted shrink-0"
                  >
                    Lokasi Saat Ini
                  </span>
                </div>
                <p class="text-[11px] text-muted truncate flex items-center gap-1.5 mt-0.5">
                  <span>{{ folder.itemCount }} item</span>
                  <template v-if="folder.eventDate">
                    <span class="text-muted/40">•</span>
                    <span class="text-[#C93D68] dark:text-[#FF8FAE] flex items-center gap-1">
                      <CalendarHeart class="w-2.5 h-2.5 inline" />
                      {{ formatEventDateShort(folder.eventDate) }}
                    </span>
                  </template>
                </p>
              </div>
            </div>

            <div
              v-if="selectedFolderId === folder.id"
              class="w-5 h-5 rounded-full bg-[#C93D68] text-white flex items-center justify-center shrink-0 shadow-xs"
            >
              <Check class="w-3 h-3 stroke-[2.5]" />
            </div>
          </button>
        </div>

        <!-- Footer Buttons -->
        <div class="pt-3 border-t border-black/5 dark:border-white/10 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="secondary"
            size="md"
            :disabled="isLoading"
            class="cursor-pointer"
            @click="$emit('close')"
          >
            Batal
          </Button>

          <Button
            type="button"
            variant="primary"
            size="md"
            :loading="isLoading"
            :disabled="selectedFolderId === (currentFolderId || null)"
            class="cursor-pointer"
            @click="handleConfirm"
          >
            Pindahkan ke Sini
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
