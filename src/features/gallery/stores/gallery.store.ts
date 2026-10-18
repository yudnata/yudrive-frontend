import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { MediaItem } from '@/types';
import { apiFetch } from '@/services/api';

export interface DateGroupedMedia {
  dateKey: string;
  dateLabel: string;
  items: MediaItem[];
}

export const useGalleryStore = defineStore('gallery', () => {
  const items = ref<MediaItem[]>([]);
  const nextCursor = ref<string | undefined>(undefined);
  const hasMore = ref(true);
  const isLoading = ref(false);
  const isLoadingMore = ref(false);

  // Group items by Indonesian formatted date
  const groupedByDate = computed<DateGroupedMedia[]>(() => {
    const groups: Map<string, { label: string; items: MediaItem[] }> = new Map();

    for (const item of items.value) {
      const rawDate = item.takenAt || item.createdAt;
      const d = new Date(rawDate);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      if (!groups.has(dateKey)) {
        // e.g. "Sabtu, 18 Oktober 2026"
        const label = new Intl.DateTimeFormat('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).format(d);

        groups.set(dateKey, { label, items: [] });
      }

      groups.get(dateKey)!.items.push(item);
    }

    return Array.from(groups.entries()).map(([dateKey, val]) => ({
      dateKey,
      dateLabel: val.label,
      items: val.items,
    }));
  });

  async function fetchMedia(refresh = false, folderId?: string | null): Promise<void> {
    if (isLoading.value || isLoadingMore.value) return;

    if (refresh) {
      isLoading.value = true;
      nextCursor.value = undefined;
      hasMore.value = true;
    } else {
      if (!hasMore.value) return;
      isLoadingMore.value = true;
    }

    try {
      const queryParams = new URLSearchParams({ limit: '30' });
      if (!refresh && nextCursor.value) {
        queryParams.set('cursor', nextCursor.value);
      }

      if (folderId !== undefined) {
        if (folderId) {
          queryParams.set('folderId', folderId);
        } else {
          queryParams.set('folderId', 'root');
        }
      }

      const res = await apiFetch<{ items: MediaItem[]; nextCursor?: string }>(
        `/media?${queryParams.toString()}`
      );

      if (refresh) {
        items.value = res.items;
      } else {
        // Prevent duplicate IDs when appending
        const existingIds = new Set(items.value.map((i) => i.id));
        const newItems = res.items.filter((i) => !existingIds.has(i.id));
        items.value.push(...newItems);
      }

      nextCursor.value = res.nextCursor;
      hasMore.value = !!res.nextCursor;
    } finally {
      isLoading.value = false;
      isLoadingMore.value = false;
    }
  }

  function prependItem(item: MediaItem): void {
    if (!items.value.some((i) => i.id === item.id)) {
      items.value.unshift(item);
    }
  }

  function removeItem(mediaId: string): void {
    items.value = items.value.filter((i) => i.id !== mediaId);
  }

  async function moveMedia(mediaId: string, folderId: string | null): Promise<MediaItem> {
    const updated = await apiFetch<MediaItem>(`/media/${mediaId}/move`, {
      method: 'PATCH',
      body: JSON.stringify({ folderId: folderId || null }),
    });

    const index = items.value.findIndex((i) => i.id === mediaId);
    if (index !== -1) {
      items.value[index] = { ...items.value[index], ...updated };
    }

    return updated;
  }

  return {
    items,
    nextCursor,
    hasMore,
    isLoading,
    isLoadingMore,
    groupedByDate,
    fetchMedia,
    prependItem,
    removeItem,
    moveMedia,
  };
});
