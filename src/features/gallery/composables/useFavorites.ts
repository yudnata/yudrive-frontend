import { ref } from 'vue';

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

export function useFavorites() {
  function isFavorite(id: string): boolean {
    return favoriteIds.value.has(id);
  }

  function toggleFavorite(id: string): boolean {
    const next = new Set(favoriteIds.value);
    const added = !next.has(id);
    if (added) {
      next.add(id);
    } else {
      next.delete(id);
    }
    favoriteIds.value = next;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
    } catch {
      // storage quota
    }
    return added;
  }

  return {
    favoriteIds,
    isFavorite,
    toggleFavorite,
  };
}
