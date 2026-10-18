import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { MediaItem } from '@/types';
import { apiFetch, ApiError } from '@/services/api';
import { useGalleryStore } from '@/features/gallery/stores/gallery.store';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { useToast } from '@/composables/useToast';

interface CachedUrl {
  url: string;
  mime: string;
  filename: string;
  sizeBytes: number;
  fetchedAt: number;
}

export const useViewerStore = defineStore('viewer', () => {
  const isOpen = ref(false);
  const currentMediaId = ref<string | null>(null);
  const activeUrl = ref<string | null>(null);
  const activeMime = ref<string | null>(null);
  const activeFilename = ref<string | null>(null);
  const isLoadingUrl = ref(false);
  const urlError = ref<string | null>(null);

  // Cache presigned URLs in memory for up to 50 minutes (valid for 60 min)
  const urlCache = new Map<string, CachedUrl>();

  const galleryStore = useGalleryStore();
  const authStore = useAuthStore();
  const toast = useToast();

  const currentIndex = computed(() => {
    if (!currentMediaId.value) return -1;
    return galleryStore.items.findIndex((item) => item.id === currentMediaId.value);
  });

  const activeItem = computed<MediaItem | null>(() => {
    if (currentIndex.value === -1) return null;
    return galleryStore.items[currentIndex.value] || null;
  });

  const hasNext = computed(() => currentIndex.value < galleryStore.items.length - 1);
  const hasPrev = computed(() => currentIndex.value > 0);

  // Fetch or retrieve fresh presigned GET URL
  async function loadMediaUrl(mediaId: string, forceFresh = false): Promise<string> {
    const cached = urlCache.get(mediaId);
    const now = Date.now();

    // 50 minutes = 3000000 ms
    if (!forceFresh && cached && now - cached.fetchedAt < 3000000) {
      activeUrl.value = cached.url;
      activeMime.value = cached.mime;
      activeFilename.value = cached.filename;
      return cached.url;
    }

    isLoadingUrl.value = true;
    urlError.value = null;

    try {
      const data = await apiFetch<{
        url: string;
        mime: string;
        filename: string;
        sizeBytes: number;
      }>(`/media/${mediaId}/url`);

      urlCache.set(mediaId, {
        ...data,
        fetchedAt: now,
      });

      activeUrl.value = data.url;
      activeMime.value = data.mime;
      activeFilename.value = data.filename;
      return data.url;
    } catch (err: any) {
      urlError.value = err.message || 'Gagal memuat URL media.';
      throw err;
    } finally {
      isLoadingUrl.value = false;
    }
  }

  // Open viewer with specified media item
  async function open(mediaId: string) {
    currentMediaId.value = mediaId;
    isOpen.value = true;
    activeUrl.value = null;
    await loadMediaUrl(mediaId).catch(() => {});
  }

  // Close viewer
  function close() {
    isOpen.value = false;
    currentMediaId.value = null;
    activeUrl.value = null;
    urlError.value = null;
  }

  // Navigate next item
  async function next() {
    if (!hasNext.value) return;
    const nextItem = galleryStore.items[currentIndex.value + 1];
    if (nextItem) {
      currentMediaId.value = nextItem.id;
      activeUrl.value = null;
      await loadMediaUrl(nextItem.id).catch(() => {});
    }
  }

  // Navigate previous item
  async function prev() {
    if (!hasPrev.value) return;
    const prevItem = galleryStore.items[currentIndex.value - 1];
    if (prevItem) {
      currentMediaId.value = prevItem.id;
      activeUrl.value = null;
      await loadMediaUrl(prevItem.id).catch(() => {});
    }
  }

  // Auto-refresh expired URL (403 retry)
  async function refreshExpiredUrl(): Promise<string> {
    if (!currentMediaId.value) throw new Error('Tidak ada media aktif.');
    console.log('Presigned URL expired, refreshing automatically...');
    return loadMediaUrl(currentMediaId.value, true);
  }

  // Delete current active media item
  async function deleteCurrentItem(): Promise<void> {
    if (!activeItem.value) return;
    const itemToDelete = activeItem.value;

    try {
      await apiFetch(`/media/${itemToDelete.id}`, {
        method: 'DELETE',
      });

      galleryStore.removeItem(itemToDelete.id);
      urlCache.delete(itemToDelete.id);
      authStore.fetchMe().catch(() => {});
      toast.success('Kenangan berhasil dihapus.');

      // Adjust index or close if no items left
      if (galleryStore.items.length === 0) {
        close();
      } else if (currentIndex.value >= galleryStore.items.length) {
        currentMediaId.value = galleryStore.items[galleryStore.items.length - 1].id;
        loadMediaUrl(currentMediaId.value).catch(() => {});
      } else {
        currentMediaId.value = galleryStore.items[currentIndex.value].id;
        loadMediaUrl(currentMediaId.value).catch(() => {});
      }
    } catch (err: any) {
      if (err instanceof ApiError && err.statusCode === 403) {
        toast.error('Hanya pemilik yang dapat menghapus media ini.');
      } else {
        toast.error(err.message || 'Gagal menghapus media.');
      }
      throw err;
    }
  }

  return {
    isOpen,
    currentMediaId,
    activeItem,
    currentIndex,
    activeUrl,
    activeMime,
    activeFilename,
    isLoadingUrl,
    urlError,
    hasNext,
    hasPrev,
    open,
    close,
    next,
    prev,
    loadMediaUrl,
    refreshExpiredUrl,
    deleteCurrentItem,
  };
});
