import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { MediaItem } from '@/types';
import { apiFetch } from '@/services/api';
import { useFolderStore } from '@/features/folders/stores/folders.store';
import { parseYMD, formatEventDate } from '@/utils/date';

export type GallerySortOption =
  | 'date-desc'
  | 'date-asc'
  | 'name-asc'
  | 'name-desc'
  | 'size-desc'
  | 'size-asc';

export interface GallerySortConfig {
  id: GallerySortOption;
  label: string;
  shortLabel: string;
}

export const GALLERY_SORT_OPTIONS: GallerySortConfig[] = [
  { id: 'date-desc', label: 'Tanggal Terbaru (Default)', shortLabel: 'Terbaru' },
  { id: 'date-asc', label: 'Tanggal Terlama', shortLabel: 'Terlama' },
  { id: 'name-asc', label: 'Nama Folder / File (A - Z)', shortLabel: 'A - Z' },
  { id: 'name-desc', label: 'Nama Folder / File (Z - A)', shortLabel: 'Z - A' },
  { id: 'size-desc', label: 'Ukuran Terbesar', shortLabel: 'Ukuran Terbesar' },
  { id: 'size-asc', label: 'Ukuran Terkecil', shortLabel: 'Ukuran Terkecil' },
];

export interface DateGroupedMedia {
  dateKey: string;
  dateLabel: string;
  dateTimestamp?: number;
  items: MediaItem[];
}

export interface FolderGroupedMedia {
  folderId?: string;
  folderName: string;
  folderEventDate?: string;
  folderEventDateFormatted?: string;
  totalCount: number;
  totalBytes: number;
  latestTime: number;
  earliestTime: number;
  dateGroups: DateGroupedMedia[];
}

export const useGalleryStore = defineStore('gallery', () => {
  const items = ref<MediaItem[]>([]);
  const nextCursor = ref<string | undefined>(undefined);
  const hasMore = ref(true);
  const isLoading = ref(false);
  const isLoadingMore = ref(false);

  // Search, Filter & Sort state
  const searchQuery = ref('');
  const sortBy = ref<GallerySortOption>('date-desc');
  const mediaTypeFilter = ref<'all' | 'photo' | 'video'>('all');

  // Filtered and sorted items based on searchQuery, filters & active sortBy
  const filteredItems = computed<MediaItem[]>(() => {
    let list = items.value;
    const q = searchQuery.value.trim().toLowerCase();
    const folderStore = useFolderStore();

    if (q) {
      list = list.filter((item) => {
        const folder = item.folderId ? folderStore.folders.find((f) => f.id === item.folderId) : null;
        const folderName = (item.folderName || folder?.name || '').toLowerCase();
        const filename = (item.filename || '').toLowerCase();
        const rawDate = (item.takenAt || item.createdAt || '').toLowerCase();
        const ownerName = (item.ownerName || '').toLowerCase();
        const type = item.type.toLowerCase();

        return (
          folderName.includes(q) ||
          filename.includes(q) ||
          rawDate.includes(q) ||
          ownerName.includes(q) ||
          type.includes(q)
        );
      });
    }

    if (mediaTypeFilter.value !== 'all') {
      list = list.filter((item) => item.type === mediaTypeFilter.value);
    }


    // Sort items
    return [...list].sort((a, b) => {
      const folderA = a.folderId ? folderStore.folders.find((f) => f.id === a.folderId) : null;
      const folderB = b.folderId ? folderStore.folders.find((f) => f.id === b.folderId) : null;
      const dateA = a.folderEventDate || folderA?.eventDate || a.takenAt || a.createdAt;
      const dateB = b.folderEventDate || folderB?.eventDate || b.takenAt || b.createdAt;
      const timeA = new Date(dateA).getTime();
      const timeB = new Date(dateB).getTime();

      switch (sortBy.value) {
        case 'date-asc':
          return timeA - timeB;
        case 'date-desc':
          return timeB - timeA;
        case 'name-asc': {
          const nameA = a.folderName || a.filename || '';
          const nameB = b.folderName || b.filename || '';
          return nameA.localeCompare(nameB);
        }
        case 'name-desc': {
          const nameA = a.folderName || a.filename || '';
          const nameB = b.folderName || b.filename || '';
          return nameB.localeCompare(nameA);
        }
        case 'size-desc':
          return (b.sizeBytes || 0) - (a.sizeBytes || 0);
        case 'size-asc':
          return (a.sizeBytes || 0) - (b.sizeBytes || 0);
        default:
          return timeB - timeA;
      }
    });
  });

  // Group items by Indonesian formatted date
  const groupedByDate = computed<DateGroupedMedia[]>(() => {
    const groups: Map<string, { label: string; dateTimestamp: number; items: MediaItem[] }> = new Map();
    const folderStore = useFolderStore();

    for (const item of filteredItems.value) {
      const folder = item.folderId ? folderStore.folders.find((f) => f.id === item.folderId) : null;
      const folderEventDate = (item.folderEventDate || folder?.eventDate) ?? undefined;

      let dateKey = 'kenangan';
      let label = 'Kenangan Indah';
      let timeMs = Date.now();

      if (folderEventDate) {
        const parsed = parseYMD(folderEventDate);
        if (parsed) {
          const d = new Date(parsed.year, parsed.month - 1, parsed.day);
          timeMs = d.getTime();
          dateKey = `${parsed.year}-${String(parsed.month).padStart(2, '0')}-${String(parsed.day).padStart(2, '0')}`;
          try {
            label = new Intl.DateTimeFormat('id-ID', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }).format(d);
          } catch {
            label = formatEventDate(folderEventDate);
          }
        } else {
          const d = new Date(folderEventDate);
          timeMs = isNaN(d.getTime()) ? Date.now() : d.getTime();
          dateKey = folderEventDate.split('T')[0];
          label = formatEventDate(dateKey);
        }
      } else {
        const rawDate = item.takenAt || item.createdAt;
        const d = new Date(rawDate);
        timeMs = isNaN(d.getTime()) ? Date.now() : d.getTime();
        dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        try {
          label = new Intl.DateTimeFormat('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }).format(d);
        } catch {
          label = 'Kenangan Indah';
        }
      }

      if (!groups.has(dateKey)) {
        groups.set(dateKey, { label, dateTimestamp: timeMs, items: [] });
      }

      groups.get(dateKey)!.items.push(item);
    }

    const isAsc = sortBy.value === 'date-asc';
    return Array.from(groups.entries())
      .sort((a, b) => (isAsc ? a[1].dateTimestamp - b[1].dateTimestamp : b[1].dateTimestamp - a[1].dateTimestamp))
      .map(([dateKey, val]) => ({
        dateKey,
        dateLabel: val.label,
        dateTimestamp: val.dateTimestamp,
        items: val.items,
      }));
  });

  // Group items first by Folder, then within each folder by Indonesian formatted date
  const groupedByFolderAndDate = computed<FolderGroupedMedia[]>(() => {
    try {
      const folderStore = useFolderStore();
      const folderGroups = new Map<
        string,
        {
          folderId?: string;
          folderName: string;
          folderEventDate?: string;
          latestTime: number;
          earliestTime: number;
          totalBytes: number;
          dateMap: Map<string, { label: string; dateTimestamp: number; items: MediaItem[] }>;
        }
      >();

      for (const item of filteredItems.value) {
        const folderKey = item.folderId || '__unfiled__';
        const folder = item.folderId ? folderStore.folders.find((f) => f.id === item.folderId) : null;
        const folderName = item.folderName || folder?.name || (item.folderId ? 'Folder Kenangan' : 'Kenangan Tanpa Folder');
        const folderEventDate = (item.folderEventDate || folder?.eventDate) ?? undefined;

        let dateKey = 'kenangan';
        let label = 'Kenangan Indah';
        let timeMs = Date.now();

        if (folderEventDate) {
          const parsed = parseYMD(folderEventDate);
          if (parsed) {
            const d = new Date(parsed.year, parsed.month - 1, parsed.day);
            timeMs = d.getTime();
            dateKey = `${parsed.year}-${String(parsed.month).padStart(2, '0')}-${String(parsed.day).padStart(2, '0')}`;
            try {
              label = new Intl.DateTimeFormat('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              }).format(d);
            } catch {
              label = formatEventDate(folderEventDate);
            }
          } else {
            const d = new Date(folderEventDate);
            timeMs = isNaN(d.getTime()) ? Date.now() : d.getTime();
            dateKey = folderEventDate.split('T')[0];
            label = formatEventDate(dateKey);
          }
        } else {
          const rawDate = item.takenAt || item.createdAt;
          let d = new Date(rawDate);
          if (isNaN(d.getTime())) {
            d = new Date();
          }
          timeMs = d.getTime();
          try {
            dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            label = new Intl.DateTimeFormat('id-ID', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }).format(d);
          } catch {
            dateKey = 'fallback';
            label = 'Kenangan Indah';
          }
        }

        if (!folderGroups.has(folderKey)) {
          folderGroups.set(folderKey, {
            folderId: item.folderId,
            folderName,
            folderEventDate,
            latestTime: timeMs,
            earliestTime: timeMs,
            totalBytes: 0,
            dateMap: new Map(),
          });
        }

        const fg = folderGroups.get(folderKey)!;
        if (timeMs > fg.latestTime) {
          fg.latestTime = timeMs;
        }
        if (timeMs < fg.earliestTime) {
          fg.earliestTime = timeMs;
        }
        fg.totalBytes += item.sizeBytes || 0;
        if (folderName && fg.folderName === 'Folder Kenangan') {
          fg.folderName = folderName;
        }
        if (folderEventDate && !fg.folderEventDate) {
          fg.folderEventDate = folderEventDate;
        }

        if (!fg.dateMap.has(dateKey)) {
          fg.dateMap.set(dateKey, { label, dateTimestamp: timeMs, items: [] });
        }

        const dg = fg.dateMap.get(dateKey)!;
        if (timeMs > dg.dateTimestamp) {
          dg.dateTimestamp = timeMs;
        }
        dg.items.push(item);
      }

      const result: FolderGroupedMedia[] = [];

      for (const fg of folderGroups.values()) {
        const isAsc = sortBy.value === 'date-asc';
        const dateGroups: DateGroupedMedia[] = Array.from(fg.dateMap.entries())
          .sort((a, b) => (isAsc ? a[1].dateTimestamp - b[1].dateTimestamp : b[1].dateTimestamp - a[1].dateTimestamp))
          .map(([dateKey, val]) => ({
            dateKey,
            dateLabel: val.label,
            dateTimestamp: val.dateTimestamp,
            items: val.items,
          }));

        const totalCount = dateGroups.reduce((acc, dg) => acc + dg.items.length, 0);

        result.push({
          folderId: fg.folderId,
          folderName: fg.folderName,
          folderEventDate: fg.folderEventDate,
          folderEventDateFormatted: fg.folderEventDate ? formatEventDate(fg.folderEventDate) : undefined,
          totalCount,
          totalBytes: fg.totalBytes,
          latestTime: fg.latestTime,
          earliestTime: fg.earliestTime,
          dateGroups,
        });
      }

      // Sort folders based on active sortBy
      result.sort((a, b) => {
        switch (sortBy.value) {
          case 'date-asc':
            return a.earliestTime - b.earliestTime;
          case 'date-desc':
            return b.latestTime - a.latestTime;
          case 'name-asc':
            return a.folderName.localeCompare(b.folderName);
          case 'name-desc':
            return b.folderName.localeCompare(a.folderName);
          case 'size-desc':
            return b.totalBytes - a.totalBytes;
          case 'size-asc':
            return a.totalBytes - b.totalBytes;
          default:
            return b.latestTime - a.latestTime;
        }
      });

      return result;
    } catch (err) {
      console.error('Error grouping gallery items by folder and date:', err);
      return [
        {
          folderId: undefined,
          folderName: 'Semua Kenangan',
          totalCount: filteredItems.value.length,
          totalBytes: 0,
          latestTime: Date.now(),
          earliestTime: Date.now(),
          dateGroups: groupedByDate.value,
        },
      ];
    }
  });

  let currentFetchId = 0;
  const activeFolderFilter = ref<string | null | undefined>(undefined);

  async function fetchMedia(refresh = false, folderId?: string | null): Promise<void> {
    if (!refresh && (isLoading.value || isLoadingMore.value)) return;

    const normalizedFolderId = folderId || undefined;
    const thisFetchId = ++currentFetchId;

    if (refresh) {
      isLoading.value = true;
      isLoadingMore.value = false;
      nextCursor.value = undefined;
      hasMore.value = true;

      // Purge stale items immediately when switching folder context
      if (normalizedFolderId !== activeFolderFilter.value) {
        items.value = [];
        activeFolderFilter.value = normalizedFolderId;
      }
    } else {
      if (!hasMore.value) return;
      isLoadingMore.value = true;
    }

    try {
      const queryParams = new URLSearchParams({ limit: '50' });
      if (!refresh && nextCursor.value) {
        queryParams.set('cursor', nextCursor.value);
      }

      if (normalizedFolderId) {
        queryParams.set('folderId', normalizedFolderId);
      }

      if (searchQuery.value.trim()) {
        queryParams.set('search', searchQuery.value.trim());
      }

      if (mediaTypeFilter.value && mediaTypeFilter.value !== 'all') {
        queryParams.set('type', mediaTypeFilter.value);
      }


      if (sortBy.value) {
        queryParams.set('sortBy', sortBy.value);
      }

      const res = await apiFetch<{ items: MediaItem[]; nextCursor?: string }>(
        `/media?${queryParams.toString()}`
      );

      // Stale request discarded
      if (thisFetchId !== currentFetchId) return;

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
    } catch (err) {
      if (thisFetchId === currentFetchId) {
        console.error('Failed to fetch media:', err);
      }
    } finally {
      if (thisFetchId === currentFetchId) {
        isLoading.value = false;
        isLoadingMore.value = false;
      }
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

  async function batchDelete(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await apiFetch<{ success: boolean; deletedCount: number }>('/media/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
    const idSet = new Set(ids);
    items.value = items.value.filter((i) => !idSet.has(i.id));
  }

  async function batchMove(ids: string[], folderId: string | null): Promise<void> {
    if (ids.length === 0) return;
    await apiFetch<{ success: boolean; movedCount: number }>('/media/batch-move', {
      method: 'POST',
      body: JSON.stringify({ ids, folderId: folderId || null }),
    });
    const idSet = new Set(ids);
    items.value = items.value.map((item) => {
      if (idSet.has(item.id)) {
        return { ...item, folderId: folderId || undefined };
      }
      return item;
    });
  }

  function clearItems(): void {
    items.value = [];
    nextCursor.value = undefined;
    hasMore.value = true;
  }

  return {
    items,
    searchQuery,
    sortBy,
    mediaTypeFilter,
    filteredItems,
    nextCursor,
    hasMore,
    isLoading,
    isLoadingMore,
    activeFolderFilter,
    groupedByDate,
    groupedByFolderAndDate,
    fetchMedia,
    clearItems,
    prependItem,
    removeItem,
    moveMedia,
    batchDelete,
    batchMove,
  };
});
