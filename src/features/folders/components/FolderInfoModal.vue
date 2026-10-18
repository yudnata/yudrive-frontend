<script setup lang="ts">
import { ref, watch } from 'vue';
import { Folder as FolderType, MediaItem } from '@/types';
import { apiFetch } from '@/services/api';
import Button from '@/components/ui/Button.vue';
import { Info, X, Calendar, HardDrive, Files, Image as ImageIcon, Check } from 'lucide-vue-next';

const props = defineProps<{
  isOpen: boolean;
  folder: FolderType | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'coverChanged', coverMediaId: string | null): void;
}>();

const isSelectingCover = ref(false);
const folderPhotos = ref<MediaItem[]>([]);
const isLoadingPhotos = ref(false);
const isUpdatingCover = ref(false);

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      isSelectingCover.value = false;
      folderPhotos.value = [];
    }
  }
);

function formatBytes(bytes?: number): string {
  if (!bytes) return '0 B';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(0)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

async function startSelectCover() {
  if (!props.folder) return;
  isSelectingCover.value = true;
  isLoadingPhotos.value = true;

  try {
    const res = await apiFetch<{ items: MediaItem[] }>(`/media?folderId=${props.folder.id}&limit=50`);
    folderPhotos.value = (res.items || []).filter((i) => i.type === 'photo');
  } catch (err) {
    console.error('Failed to load folder photos for cover:', err);
  } finally {
    isLoadingPhotos.value = false;
  }
}

async function handleChooseCover(media: MediaItem) {
  if (!props.folder) return;
  isUpdatingCover.value = true;
  try {
    emit('coverChanged', media.id);
    isSelectingCover.value = false;
  } finally {
    isUpdatingCover.value = false;
  }
}

async function handleRemoveCover() {
  if (!props.folder) return;
  emit('coverChanged', null);
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen && folder"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div
        class="w-full max-w-md rounded-3xl bg-surface border border-app shadow-soft p-6 sm:p-7 text-left max-h-[90vh] flex flex-col"
        @click.stop
      >
        <!-- Modal Header -->
        <div class="flex items-center justify-between pb-4 border-b border-app">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-surface-tint flex items-center justify-center text-[#C93D68] dark:text-[#FF8FAE]">
              <Info class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-base font-serif font-semibold text-app tracking-tight truncate max-w-60">
                {{ folder.name }}
              </h2>
              <p class="text-[11px] text-muted">Detail dan foto sampul folder</p>
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

        <!-- Modal Body -->
        <div class="flex-1 overflow-y-auto py-4 space-y-4">
          <!-- Cover Photo Preview -->
          <div class="space-y-2">
            <label class="block text-xs font-semibold uppercase tracking-wider text-muted">
              Foto Sampul Folder
            </label>

            <div class="relative w-full aspect-video rounded-2xl bg-surface-tint border border-app overflow-hidden flex items-center justify-center">
              <img
                v-if="folder.coverUrl"
                :src="folder.coverUrl"
                :alt="folder.name"
                class="w-full h-full object-cover"
              />
              <div v-else class="text-center p-4 text-muted">
                <ImageIcon class="w-8 h-8 mx-auto mb-1 text-muted/60" />
                <p class="text-xs">Menggunakan preview otomatis dari foto terbaru</p>
              </div>
            </div>

            <!-- Cover Actions -->
            <div class="flex items-center gap-2 pt-1">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                class="text-xs flex-1"
                @click="startSelectCover"
              >
                {{ isSelectingCover ? 'Tutup Pilihan Foto' : 'Pilih Foto Sampul' }}
              </Button>
              <Button
                v-if="folder.coverMediaId"
                type="button"
                variant="secondary"
                size="sm"
                class="text-xs text-[#D64545]"
                @click="handleRemoveCover"
              >
                Reset Sampul
              </Button>
            </div>
          </div>

          <!-- Cover Photo Picker Grid -->
          <div
            v-if="isSelectingCover"
            class="p-3 rounded-2xl bg-surface-tint border border-app space-y-2"
          >
            <p class="text-xs font-semibold text-app">
              Pilih satu foto dari isi folder ini:
            </p>

            <div v-if="isLoadingPhotos" class="py-4 text-center text-xs text-muted">
              Memuat foto di folder...
            </div>

            <div
              v-else-if="folderPhotos.length === 0"
              class="py-4 text-center text-xs text-muted"
            >
              Belum ada foto di dalam folder ini untuk dijadikan sampul.
            </div>

            <div
              v-else
              class="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1"
            >
              <div
                v-for="photo in folderPhotos"
                :key="photo.id"
                class="relative aspect-square rounded-xl overflow-hidden border border-app cursor-pointer group"
                @click="handleChooseCover(photo)"
              >
                <img
                  v-if="photo.thumbUrl"
                  :src="photo.thumbUrl"
                  class="w-full h-full object-cover group-hover:scale-110 transition-transform"
                />
                <div
                  v-if="folder.coverMediaId === photo.id"
                  class="absolute inset-0 bg-[#C93D68]/40 flex items-center justify-center text-white"
                >
                  <Check class="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          <!-- Information List -->
          <div class="space-y-3 pt-2">
            <div class="flex items-center justify-between text-xs py-1.5 border-b border-app">
              <span class="flex items-center gap-2 text-muted">
                <Files class="w-3.5 h-3.5" />
                Jumlah File
              </span>
              <span class="font-semibold text-app">{{ folder.itemCount }} item</span>
            </div>

            <div class="flex items-center justify-between text-xs py-1.5 border-b border-app">
              <span class="flex items-center gap-2 text-muted">
                <HardDrive class="w-3.5 h-3.5" />
                Ukuran Total
              </span>
              <span class="font-semibold text-app">{{ formatBytes(folder.totalBytes) }}</span>
            </div>

            <div class="flex items-center justify-between text-xs py-1.5 border-b border-app">
              <span class="flex items-center gap-2 text-muted">
                <Calendar class="w-3.5 h-3.5" />
                Tanggal Dibuat
              </span>
              <span class="font-semibold text-app">{{ formatDate(folder.createdAt) }}</span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="pt-3 border-t border-app flex justify-end">
          <Button
            type="button"
            variant="primary"
            size="md"
            @click="$emit('close')"
          >
            Selesai
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
