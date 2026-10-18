<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useSwipe } from '@vueuse/core';
import { useViewerStore } from '../stores/viewer.store';
import { useFavorites } from '@/features/gallery/composables/useFavorites';
import { useToast } from '@/composables/useToast';
import CustomVideoPlayer from './CustomVideoPlayer.vue';
import DeleteConfirmModal from './DeleteConfirmModal.vue';
import MoveToFolderModal from '@/features/folders/components/MoveToFolderModal.vue';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Trash2,
  Heart,
  Calendar,
  RotateCw,
  FolderInput,
} from 'lucide-vue-next';

const viewerStore = useViewerStore();
const { isFavorite, toggleFavorite } = useFavorites();
const toast = useToast();

const stageRef = ref<HTMLElement | null>(null);
const isFavorited = computed(() => {
  return viewerStore.currentMediaId ? isFavorite(viewerStore.currentMediaId) : false;
});
const isDeleting = ref(false);
const showDeleteConfirm = ref(false);
const showMoveModal = ref(false);
const isMoving = ref(false);
const imageError = ref(false);

function handleToggleFavorite() {
  if (viewerStore.currentMediaId) {
    toggleFavorite(viewerStore.currentMediaId);
  }
}

// Touch swipe navigation for mobile (only active when not zoomed in)
const { direction } = useSwipe(stageRef, {
  onSwipeEnd() {
    if (scale.value > 1.05 || isPinching.value) return;
    if (direction.value === 'left' && viewerStore.hasNext) {
      viewerStore.next();
    } else if (direction.value === 'right' && viewerStore.hasPrev) {
      viewerStore.prev();
    }
  },
});

// Mobile Pinch-To-Zoom and Pan states
const scale = ref(1);
const translateX = ref(0);
const translateY = ref(0);
const isPinching = ref(false);
const isPanning = ref(false);
const isGestureMoved = ref(false);

let startDistance = 0;
let initialScale = 1;
let startX = 0;
let startY = 0;
let initialTranslateX = 0;
let initialTranslateY = 0;
let lastTapTime = 0;

function resetZoom() {
  scale.value = 1;
  translateX.value = 0;
  translateY.value = 0;
  isPinching.value = false;
  isPanning.value = false;
}

function handleTouchStart(e: TouchEvent) {
  if (e.touches.length === 2) {
    // Two fingers: Pinch start!
    isPinching.value = true;
    isPanning.value = false;
    isGestureMoved.value = true;
    const t1 = e.touches[0];
    const t2 = e.touches[1];
    startDistance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    initialScale = scale.value;
  } else if (e.touches.length === 1) {
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    initialTranslateX = translateX.value;
    initialTranslateY = translateY.value;
    isGestureMoved.value = false;

    // Double tap check
    const now = Date.now();
    if (now - lastTapTime < 300) {
      lastTapTime = 0;
      if (scale.value > 1.1) {
        resetZoom();
      } else {
        scale.value = 2.5;
        translateX.value = 0;
        translateY.value = 0;
      }
      return;
    }
    lastTapTime = now;

    if (scale.value > 1.05) {
      isPanning.value = true;
    }
  }
}

function handleTouchMove(e: TouchEvent) {
  if (e.touches.length === 2 && isPinching.value) {
    e.preventDefault();
    const t1 = e.touches[0];
    const t2 = e.touches[1];
    const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    if (startDistance > 0) {
      const factor = dist / startDistance;
      const nextScale = Math.min(Math.max(initialScale * factor, 0.8), 4.5);
      scale.value = nextScale;
    }
  } else if (e.touches.length === 1 && isPanning.value && scale.value > 1.05) {
    e.preventDefault();
    const touch = e.touches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    if (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6) {
      isGestureMoved.value = true;
    }
    const maxBoundX = (window.innerWidth * (scale.value - 1)) / 1.8;
    const maxBoundY = (window.innerHeight * (scale.value - 1)) / 1.8;
    translateX.value = Math.max(-maxBoundX, Math.min(maxBoundX, initialTranslateX + deltaX));
    translateY.value = Math.max(-maxBoundY, Math.min(maxBoundY, initialTranslateY + deltaY));
  }
}

function handleTouchEnd(e: TouchEvent) {
  if (e.touches.length === 0) {
    if (scale.value < 1.05) {
      resetZoom();
    }
    isPinching.value = false;
    isPanning.value = false;
  } else if (e.touches.length === 1) {
    isPinching.value = false;
    if (scale.value > 1.05) {
      isPanning.value = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      initialTranslateX = translateX.value;
      initialTranslateY = translateY.value;
    }
  }
}

function handlePhotoClick() {
  const now = Date.now();
  if (now - lastTapTime < 300) {
    lastTapTime = 0;
    if (scale.value > 1.1) {
      resetZoom();
    } else {
      scale.value = 2.5;
      translateX.value = 0;
      translateY.value = 0;
    }
    return;
  }
  lastTapTime = now;
}

function handleBackdropClick(e: MouseEvent) {
  if (isGestureMoved.value) {
    isGestureMoved.value = false;
    return;
  }
  const target = e.target as HTMLElement;
  const isDirectBackdrop = target === stageRef.value || target.classList.contains('backdrop-area');
  if (isDirectBackdrop) {
    if (scale.value > 1.05) {
      resetZoom();
    } else {
      handleClose();
    }
  }
}

let isHandlingPopState = false;

function handleClose() {
  resetZoom();
  if (!isHandlingPopState && window.history.state?.modal === 'lightbox') {
    window.history.back();
  } else {
    viewerStore.close();
  }
}

function onPopState() {
  if (showDeleteConfirm.value) {
    showDeleteConfirm.value = false;
    window.history.pushState({ ...window.history.state, modal: 'lightbox' }, '');
    return;
  }
  if (showMoveModal.value) {
    showMoveModal.value = false;
    window.history.pushState({ ...window.history.state, modal: 'lightbox' }, '');
    return;
  }
  if (viewerStore.isOpen) {
    isHandlingPopState = true;
    viewerStore.close();
    isHandlingPopState = false;
  }
}

watch(
  () => viewerStore.isOpen,
  (open) => {
    if (open) {
      window.history.pushState({ ...window.history.state, modal: 'lightbox' }, '');
    }
  }
);

function handleKeydown(e: KeyboardEvent) {
  if (!viewerStore.isOpen) return;

  if (e.key === 'Escape' && !showDeleteConfirm.value && !showMoveModal.value) {
    handleClose();
  } else if (e.key === 'ArrowRight' && viewerStore.hasNext && !showDeleteConfirm.value && !showMoveModal.value) {
    viewerStore.next();
  } else if (e.key === 'ArrowLeft' && viewerStore.hasPrev && !showDeleteConfirm.value && !showMoveModal.value) {
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

async function handleMoveMedia(targetFolderId: string | null) {
  if (!viewerStore.activeItem) return;
  isMoving.value = true;
  try {
    await viewerStore.moveCurrentItem(targetFolderId);
    showMoveModal.value = false;
    toast.success('Foto berhasil dipindahkan.');
  } catch (err: any) {
    toast.error(`Gagal memindahkan foto: ${err.message}`);
  } finally {
    isMoving.value = false;
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

const usedThumbFallback = ref(false);
const refreshAttempted = ref(false);

const activeDisplayUrl = computed(() => {
  const item = viewerStore.activeItem;
  const thumb = item?.thumbUrl || viewerStore.activeThumbUrl;

  // Proactively display thumbUrl for HEIC/HEIF files because browsers cannot display raw HEIC natively
  const isHeic =
    item?.mime === 'image/heic' ||
    viewerStore.activeMime === 'image/heic' ||
    item?.filename?.toLowerCase().endsWith('.heic') ||
    viewerStore.activeFilename?.toLowerCase().endsWith('.heic');

  // Browsers cannot display raw HEIC. Always use the WebP thumbnail preview for HEIC.
  if (isHeic) {
    return thumb || null;
  }

  if (usedThumbFallback.value && thumb) {
    return thumb;
  }

  return viewerStore.activeUrl || thumb || null;
});

function handleImageError() {
  const thumb = viewerStore.activeItem?.thumbUrl || viewerStore.activeThumbUrl;
  if (!usedThumbFallback.value && thumb) {
    usedThumbFallback.value = true;
    return;
  }

  // Flag error so user sees the reload card
  imageError.value = true;

  // Only auto-retry ONCE to avoid infinite loops on unrenderable media
  if (!refreshAttempted.value) {
    refreshAttempted.value = true;
    viewerStore.refreshExpiredUrl().catch(() => {});
  }
}

async function handleManualRefresh() {
  imageError.value = false;
  usedThumbFallback.value = false;
  refreshAttempted.value = false;
  try {
    await viewerStore.refreshExpiredUrl();
  } catch {
    imageError.value = true;
  }
}

// Reset image error and zoom on media change
watch(
  () => viewerStore.currentMediaId,
  () => {
    usedThumbFallback.value = false;
    imageError.value = false;
    refreshAttempted.value = false;
    resetZoom();
  }
);

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('popstate', onPopState);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('popstate', onPopState);
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
              @click="handleClose"
            >
              <X class="w-5 h-5" />
            </button>

            <!-- Counter & Date -->
            <div class="overflow-hidden">
              <p class="text-xs font-medium text-white/90 truncate">
                {{ viewerStore.currentIndex + 1 }} dari {{ viewerStore.totalItems }}
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
              class="p-2 rounded-full hover:bg-white/10 text-white/90 transition-transform active:scale-125 min-h-11 min-w-11 flex items-center justify-center cursor-pointer"
              :class="{ 'text-[#FF8FAE]': isFavorited }"
              aria-label="Tandai favorit"
              @click="handleToggleFavorite"
            >
              <Heart
                class="w-5 h-5 transition-transform"
                :class="{ 'fill-current scale-110': isFavorited }"
              />
            </button>

            <!-- Move to Folder Button -->
            <button
              type="button"
              class="p-2 rounded-full hover:bg-white/10 text-white/90 transition-colors min-h-11 min-w-11 flex items-center justify-center cursor-pointer"
              aria-label="Pindahkan foto ke folder"
              title="Pindahkan ke folder"
              @click="showMoveModal = true"
            >
              <FolderInput class="w-5 h-5" />
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
          class="relative flex-1 w-full flex items-center justify-center p-2 sm:p-6 overflow-hidden cursor-zoom-out"
          @click="handleBackdropClick"
        >
          <!-- Left Arrow (Desktop / Tablet) -->
          <button
            v-if="viewerStore.hasPrev"
            type="button"
            class="hidden sm:flex absolute left-4 z-20 w-11 h-11 rounded-full bg-black/40 hover:bg-black/60 text-white/90 items-center justify-center backdrop-blur-xs transition-transform hover:scale-110 active:scale-95"
            aria-label="Kenangan sebelumnya"
            @click.stop="viewerStore.prev"
          >
            <ChevronLeft class="w-6 h-6 -ml-0.5" />
          </button>

          <!-- Right Arrow (Desktop / Tablet) -->
          <button
            v-if="viewerStore.hasNext"
            type="button"
            class="hidden sm:flex absolute right-4 z-20 w-11 h-11 rounded-full bg-black/40 hover:bg-black/60 text-white/90 items-center justify-center backdrop-blur-xs transition-transform hover:scale-110 active:scale-95"
            aria-label="Kenangan berikutnya"
            @click.stop="viewerStore.next"
          >
            <ChevronRight class="w-6 h-6 ml-0.5" />
          </button>

          <!-- 1. Error Fallback (mutually exclusive) -->
          <div
            v-if="imageError"
            class="text-center p-6 text-white max-w-sm z-10"
          >
            <p class="text-sm mb-3 text-white/80">
              Gagal memuat gambar atau tautan telah kedaluwarsa.
            </p>
            <button
              type="button"
              class="btn-primary px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              @click="handleManualRefresh"
            >
              <RotateCw class="w-3.5 h-3.5" :class="{ 'animate-spin': viewerStore.isLoadingUrl }" />
              Perbarui Tautan
            </button>
          </div>

          <!-- 2. Loading Indicator (mutually exclusive) -->
          <div
            v-else-if="viewerStore.isLoadingUrl && !activeDisplayUrl"
            class="flex flex-col items-center gap-3 text-white/80"
          >
            <div class="w-8 h-8 rounded-full border-2 border-[#FF8FAE] border-t-transparent animate-spin" />
            <span class="text-xs">Memuat kenangan...</span>
          </div>

          <!-- 3. Video Player (mutually exclusive) -->
          <CustomVideoPlayer
            v-else-if="viewerStore.activeItem?.type === 'video' && viewerStore.activeUrl"
            :src="viewerStore.activeUrl"
            :poster="viewerStore.activeItem.thumbUrl || viewerStore.activeThumbUrl || undefined"
            :filename="viewerStore.activeFilename || undefined"
            @expired="viewerStore.refreshExpiredUrl"
            @click.stop
          />

          <!-- 4. Photo View with Pinch-to-Zoom & Pan (mutually exclusive) -->
          <div
            v-else-if="activeDisplayUrl"
            class="relative max-w-full max-h-full flex items-center justify-center touch-none select-none cursor-default"
            :style="{
              transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`,
              transition: isPinching || isPanning ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)',
            }"
            @touchstart="handleTouchStart"
            @touchmove="handleTouchMove"
            @touchend="handleTouchEnd"
            @touchcancel="handleTouchEnd"
            @click.stop="handlePhotoClick"
          >
            <img
              :src="activeDisplayUrl"
              :alt="viewerStore.activeFilename || 'Foto kenangan'"
              class="max-w-full max-h-[82vh] object-contain rounded-[14px] shadow-2xl pointer-events-none select-none"
              draggable="false"
              @error="handleImageError"
            />
          </div>

          <!-- Fallback when loading -->
          <div
            v-else
            class="flex flex-col items-center gap-3 text-white/80"
          >
            <div class="w-8 h-8 rounded-full border-2 border-[#FF8FAE] border-t-transparent animate-spin" />
            <span class="text-xs">Memuat kenangan...</span>
          </div>

          <!-- Zoom Reset Pill Indicator (Floating Overlay) -->
          <div
            v-if="scale > 1.15 && !imageError"
            class="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto"
          >
            <button
              type="button"
              class="px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs font-medium flex items-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer"
              @click.stop="resetZoom"
            >
              <span>{{ Math.round(scale * 100) }}% • Ketuk untuk reset</span>
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

    <!-- Move To Folder Modal Dialog -->
    <MoveToFolderModal
      :is-open="showMoveModal"
      :current-folder-id="viewerStore.activeItem?.folderId"
      :is-loading="isMoving"
      @move="handleMoveMedia"
      @close="showMoveModal = false"
    />
  </Teleport>
</template>
