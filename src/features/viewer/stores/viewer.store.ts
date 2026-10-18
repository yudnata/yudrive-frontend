import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { MediaItem } from '@/types';
import { apiFetch, ApiError } from '@/services/api';
import { useGalleryStore } from '@/features/gallery/stores/gallery.store';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { useToast } from '@/composables/useToast';

interface CachedUrl {
  url: string;
  thumbUrl?: string;
  mime: string;
  filename: string;
  sizeBytes: number;
  fetchedAt: number;
}

export const useViewerStore = defineStore('viewer', () => {
  const isOpen = ref(false);
  const currentMediaId = ref<string | null>(null);
  const activeUrl = ref<string | null>(null);
  const activeThumbUrl = ref<string | null>(null);
  const activeMime = ref<string | null>(null);
  const activeFilename = ref<string | null>(null);
  const isLoadingUrl = ref(false);
  const urlError = ref<string | null>(null);
  const contextItems = ref<MediaItem[]>([]);
  const initialActiveItem = ref<MediaItem | null>(null);

  // Cache presigned URLs in memory for up to 50 minutes (valid for 60 min)
  const urlCache = new Map<string, CachedUrl>();

  const galleryStore = useGalleryStore();
  const authStore = useAuthStore();
  const toast = useToast();

  const currentItems = computed<MediaItem[]>(() => {
    return contextItems.value.length > 0 ? contextItems.value : galleryStore.items;
  });

  const currentIndex = computed(() => {
    if (!currentMediaId.value) return -1;
    return currentItems.value.findIndex((item) => item.id === currentMediaId.value);
  });

  const activeItem = computed<MediaItem | null>(() => {
    if (currentIndex.value !== -1 && currentItems.value[currentIndex.value]) {
      return currentItems.value[currentIndex.value];
    }
    if (initialActiveItem.value && initialActiveItem.value.id === currentMediaId.value) {
      return initialActiveItem.value;
    }
    return galleryStore.items.find((item) => item.id === currentMediaId.value) || null;
  });

  const totalItems = computed(() => currentItems.value.length);
  const hasNext = computed(() => currentIndex.value >= 0 && currentIndex.value < currentItems.value.length - 1);
  const hasPrev = computed(() => currentIndex.value > 0);

  // Fetch or retrieve fresh presigned GET URL
  async function loadMediaUrl(mediaId: string, forceFresh = false): Promise<string> {
    const cached = urlCache.get(mediaId);
    const now = Date.now();

    // 50 minutes = 3000000 ms
    if (!forceFresh && cached && now - cached.fetchedAt < 3000000) {
      activeUrl.value = cached.url;
      activeThumbUrl.value = cached.thumbUrl || null;
      activeMime.value = cached.mime;
      activeFilename.value = cached.filename;
      return cached.url;
    }

    isLoadingUrl.value = true;
    urlError.value = null;

    try {
      const data = await apiFetch<{
        url: string;
        thumbUrl?: string;
        mime: string;
        filename: string;
        sizeBytes: number;
      }>(`/media/${mediaId}/url`);

      urlCache.set(mediaId, {
        ...data,
        fetchedAt: now,
      });

      activeUrl.value = data.url;
      activeThumbUrl.value = data.thumbUrl || null;
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

  // Open viewer with specified media item and optional context list
  async function open(mediaId: string, items?: MediaItem[], initialItem?: MediaItem) {
    if (items && items.length > 0) {
      contextItems.value = items;
    } else {
      contextItems.value = galleryStore.items;
    }
    initialActiveItem.value = initialItem || null;
    currentMediaId.value = mediaId;
    isOpen.value = true;
    activeUrl.value = null;
    activeThumbUrl.value = initialItem?.thumbUrl || null;
    await loadMediaUrl(mediaId).catch(() => {});
  }

  // Close viewer
  function close() {
    isOpen.value = false;
    currentMediaId.value = null;
    initialActiveItem.value = null;
    activeUrl.value = null;
    activeThumbUrl.value = null;
    urlError.value = null;
  }

  // Navigate next item
  async function next() {
    if (!hasNext.value) return;
    const nextItem = currentItems.value[currentIndex.value + 1];
    if (nextItem) {
      currentMediaId.value = nextItem.id;
      initialActiveItem.value = nextItem;
      activeUrl.value = null;
      activeThumbUrl.value = nextItem.thumbUrl || null;
      await loadMediaUrl(nextItem.id).catch(() => {});
    }
  }

  // Navigate previous item
  async function prev() {
    if (!hasPrev.value) return;
    const prevItem = currentItems.value[currentIndex.value - 1];
    if (prevItem) {
      currentMediaId.value = prevItem.id;
      initialActiveItem.value = prevItem;
      activeUrl.value = null;
      activeThumbUrl.value = prevItem.thumbUrl || null;
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

      const ctxIdx = contextItems.value.findIndex((i) => i.id === itemToDelete.id);
      if (ctxIdx !== -1) {
        contextItems.value.splice(ctxIdx, 1);
      }

      authStore.fetchMe().catch(() => {});
      toast.success('Kenangan berhasil dihapus.');

      // Adjust index or close if no items left
      const items = currentItems.value;
      if (items.length === 0) {
        close();
      } else if (currentIndex.value >= items.length) {
        const nextId = items[items.length - 1].id;
        currentMediaId.value = nextId;
        loadMediaUrl(nextId).catch(() => {});
      } else {
        const nextId = items[currentIndex.value].id;
        currentMediaId.value = nextId;
        loadMediaUrl(nextId).catch(() => {});
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

  async function moveCurrentItem(targetFolderId: string | null) {
    if (!activeItem.value) return;
    const mediaId = activeItem.value.id;
    const updated = await galleryStore.moveMedia(mediaId, targetFolderId);
    urlCache.delete(mediaId);
    return updated;
  }

  return {
    isOpen,
    currentMediaId,
    activeItem,
    currentIndex,
    totalItems,
    currentItems,
    activeUrl,
    activeThumbUrl,
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
    moveCurrentItem,
  };
});
