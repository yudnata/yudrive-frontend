<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useSwipe } from '@vueuse/core';
import { useViewerStore } from '../stores/viewer.store';
import { useGalleryStore } from '@/features/gallery/stores/gallery.store';
import CustomVideoPlayer from './CustomVideoPlayer.vue';
import DeleteConfirmModal from './DeleteConfirmModal.vue';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Trash2,
  Heart,
  Calendar,
  RotateCw,
} from 'lucide-vue-next';

const viewerStore = useViewerStore();
const galleryStore = useGalleryStore();

const stageRef = ref<HTMLElement | null>(null);
const isFavorited = ref(false);
const isDeleting = ref(false);
const showDeleteConfirm = ref(false);
const imageError = ref(false);

// Touch swipe navigation for mobile
const { direction } = useSwipe(stageRef, {
  onSwipeEnd() {
    if (direction.value === 'left' && viewerStore.hasNext) {
      viewerStore.next();
    } else if (direction.value === 'right' && viewerStore.hasPrev) {
      viewerStore.prev();
    }
  },
});

function handleKeydown(e: KeyboardEvent) {
  if (!viewerStore.isOpen) return;

  if (e.key === 'Escape' && !showDeleteConfirm.value) {
    viewerStore.close();
  } else if (e.key === 'ArrowRight' && viewerStore.hasNext && !showDeleteConfirm.value) {
    viewerStore.next();
  } else if (e.key === 'ArrowLeft' && viewerStore.hasPrev && !showDeleteConfirm.value) {
    viewerStore.prev();
  }
}

function triggerDownload() {
  if (!viewerStore.activeUrl) return;
  const link = document.createElement('a');
  link.href = viewerStore.activeUrl;
  link.download = viewerStore.activeFilename || 'kenangan.jpg';
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function confirmDelete() {
  isDeleting.value = true;
  try {
    await viewerStore.deleteCurrentItem();
    showDeleteConfirm.value = false;
  } finally {
    isDeleting.value = false;
  }
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

function handleImageError() {
  imageError.value = true;
  // Attempt auto-refresh once on 403 expired URL
  viewerStore.refreshExpiredUrl().then(() => {
    imageError.value = false;
  }).catch(() => {});
}

// Reset favorite and image error on media change
watch(
  () => viewerStore.currentMediaId,
  () => {
    isFavorited.value = false;
    imageError.value = false;
  }
);

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="viewerStore.isOpen"
        class="fixed inset-0 z-50 flex flex-col bg-[#1E1419]/95 backdrop-blur-md text-white select-none overflow-hidden"
      >
        <!-- Top Navigation / Action Bar -->
        <header class="h-16 px-4 sm:px-6 flex items-center justify-between z-20 shrink-0 border-b border-white/10 bg-black/20">
          <div class="flex items-center gap-3">
            <button
              type="button"
              class="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors min-h-11 min-w-11 flex items-center justify-center text-white/90"
              aria-label="Tutup penampil kenangan"
              @click="viewerStore.close"
            >
              <X class="w-5 h-5" />
            </button>

            <!-- Counter & Date -->
            <div class="overflow-hidden">
              <p class="text-xs font-medium text-white/90 truncate">
                {{ viewerStore.currentIndex + 1 }} dari {{ galleryStore.items.length }}
              </p>
              <p
                v-if="viewerStore.activeItem?.takenAt"
                class="text-[11px] text-white/60 flex items-center gap-1"
              >
                <Calendar class="w-3 h-3 inline" />
                {{ formatDate(viewerStore.activeItem.takenAt) }}
              </p>
            </div>
          </div>

          <!-- Actions: Favorite, Download, Delete -->
          <div class="flex items-center gap-1 sm:gap-2">
            <!-- Favorite Pop Button -->
            <button
              type="button"
              class="p-2 rounded-full hover:bg-white/10 text-white/90 transition-transform active:scale-125 min-h-11 min-w-11 flex items-center justify-center"
              :class="{ 'text-[#FF8FAE]': isFavorited }"
              aria-label="Tandai favorit"
              @click="isFavorited = !isFavorited"
            >
              <Heart
                class="w-5 h-5 transition-transform"
                :class="{ 'fill-current scale-110': isFavorited }"
              />
            </button>

            <!-- Download Button -->
            <button
              type="button"
              class="p-2 rounded-full hover:bg-white/10 text-white/90 transition-colors min-h-11 min-w-11 flex items-center justify-center"
              aria-label="Unduh file asli"
              @click="triggerDownload"
            >
              <Download class="w-5 h-5" />
            </button>

            <!-- Delete Button -->
            <button
              type="button"
              class="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-[#D64545] transition-colors min-h-11 min-w-11 flex items-center justify-center"
              aria-label="Hapus kenangan ini"
              @click="showDeleteConfirm = true"
            >
              <Trash2 class="w-5 h-5" />
            </button>
          </div>
        </header>

        <!-- Center Stage: Photo or Custom Video Player -->
        <main
          ref="stageRef"
          class="relative flex-1 w-full flex items-center justify-center p-2 sm:p-6 overflow-hidden"
        >
          <!-- Left Arrow (Desktop / Tablet) -->
          <button
            v-if="viewerStore.hasPrev"
            type="button"
            class="hidden sm:flex absolute left-4 z-20 w-11 h-11 rounded-full bg-black/40 hover:bg-black/60 text-white/90 items-center justify-center backdrop-blur-xs transition-transform hover:scale-110 active:scale-95"
            aria-label="Kenangan sebelumnya"
            @click="viewerStore.prev"
          >
            <ChevronLeft class="w-6 h-6 -ml-0.5" />
          </button>

          <!-- Right Arrow (Desktop / Tablet) -->
          <button
            v-if="viewerStore.hasNext"
            type="button"
            class="hidden sm:flex absolute right-4 z-20 w-11 h-11 rounded-full bg-black/40 hover:bg-black/60 text-white/90 items-center justify-center backdrop-blur-xs transition-transform hover:scale-110 active:scale-95"
            aria-label="Kenangan berikutnya"
            @click="viewerStore.next"
          >
            <ChevronRight class="w-6 h-6 ml-0.5" />
          </button>

          <!-- Loading Indicator -->
          <div
            v-if="viewerStore.isLoadingUrl"
            class="flex flex-col items-center gap-3 text-white/80"
          >
            <div class="w-8 h-8 rounded-full border-2 border-[#FF8FAE] border-t-transparent animate-spin" />
            <span class="text-xs">Memuat kenangan...</span>
          </div>

          <!-- Video Player -->
          <CustomVideoPlayer
            v-else-if="viewerStore.activeItem?.type === 'video' && viewerStore.activeUrl"
            :src="viewerStore.activeUrl"
            :poster="viewerStore.activeItem.thumbUrl"
            :filename="viewerStore.activeFilename || undefined"
            @expired="viewerStore.refreshExpiredUrl"
          />

          <!-- Photo View -->
          <div
            v-else-if="viewerStore.activeUrl"
            class="relative max-w-full max-h-full flex items-center justify-center"
          >
            <img
              :src="viewerStore.activeUrl"
              :alt="viewerStore.activeFilename || 'Foto kenangan'"
              class="max-w-full max-h-[82vh] object-contain rounded-[14px] shadow-2xl transition-all"
              @error="handleImageError"
            />
          </div>

          <!-- Image Error Fallback -->
          <div
            v-if="imageError"
            class="text-center p-6 text-white"
          >
            <p class="text-sm mb-3 text-white/80">
              Gagal memuat gambar atau tautan telah kedaluwarsa.
            </p>
            <button
              type="button"
              class="btn-primary px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5"
              @click="viewerStore.refreshExpiredUrl"
            >
              <RotateCw class="w-3.5 h-3.5" />
              Perbarui Tautan
            </button>
          </div>
        </main>
      </div>
    </Transition>

    <!-- Delete Confirmation Modal Dialog -->
    <DeleteConfirmModal
      :is-open="showDeleteConfirm"
      :is-deleting="isDeleting"
      @confirm="confirmDelete"
      @cancel="showDeleteConfirm = false"
    />
  </Teleport>
</template>
