import { ref } from 'vue';
import { apiFetch } from '@/services/api';
import { MediaItem } from '@/types';

const STORAGE_KEY = 'yudrive_favorites';

function loadInitialFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

const favoriteIds = ref<Set<string>>(loadInitialFavorites());
const universalFavoriteItems = ref<MediaItem[]>([]);
const isSyncingFavorites = ref(false);

function saveToLocal(set: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // quota
  }
}

export function useFavorites() {
  function isFavorite(id: string): boolean {
    return favoriteIds.value.has(id);
  }

  async function fetchUniversalFavorites(): Promise<MediaItem[]> {
    isSyncingFavorites.value = true;
    try {
      const res = await apiFetch<{ items: MediaItem[] }>('/media?favorite=true&limit=100');
      if (res?.items) {
        universalFavoriteItems.value = res.items;
        const next = new Set(favoriteIds.value);
        for (const item of res.items) {
          next.add(item.id);
        }
        favoriteIds.value = next;
        saveToLocal(next);
        return res.items;
      }
    } catch {
      // fallback to cached
    } finally {
      isSyncingFavorites.value = false;
    }
    return universalFavoriteItems.value;
  }

  async function toggleFavorite(id: string): Promise<boolean> {
    const next = new Set(favoriteIds.value);
    const added = !next.has(id);
    if (added) {
      next.add(id);
    } else {
      next.delete(id);
      universalFavoriteItems.value = universalFavoriteItems.value.filter((i) => i.id !== id);
    }
    favoriteIds.value = next;
    saveToLocal(next);

    try {
      await apiFetch<{ id: string; isFavorite: boolean }>(`/media/${id}/favorite`, {
        method: 'POST',
        body: JSON.stringify({ isFavorite: added }),
      });
    } catch (err) {
      console.error('Failed to sync favorite with server:', err);
    }

    return added;
  }

  async function batchSetFavorites(ids: string[], isFav = true): Promise<void> {
    const next = new Set(favoriteIds.value);
    for (const id of ids) {
      if (isFav) {
        next.add(id);
      } else {
        next.delete(id);
      }
    }
    if (!isFav) {
      const idSet = new Set(ids);
      universalFavoriteItems.value = universalFavoriteItems.value.filter((i) => !idSet.has(i.id));
    }
    favoriteIds.value = next;
    saveToLocal(next);

    try {
      await apiFetch('/media/batch-favorite', {
        method: 'POST',
        body: JSON.stringify({ ids, isFavorite: isFav }),
      });
    } catch (err) {
      console.error('Failed to sync batch favorites with server:', err);
    }
  }

  return {
    favoriteIds,
    universalFavoriteItems,
    isSyncingFavorites,
    isFavorite,
    toggleFavorite,
    batchSetFavorites,
    fetchUniversalFavorites,
  };
}
