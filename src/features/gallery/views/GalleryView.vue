<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useIntersectionObserver, onClickOutside } from '@vueuse/core';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { useGalleryStore, GALLERY_SORT_OPTIONS, GallerySortOption } from '../stores/gallery.store';
import { useFolderStore } from '@/features/folders/stores/folders.store';
import { useViewerStore } from '@/features/viewer/stores/viewer.store';
import { useFavorites } from '@/features/gallery/composables/useFavorites';
import { useToast } from '@/composables/useToast';
import GalleryHeader from '../components/GalleryHeader.vue';
import GalleryHero from '../components/GalleryHero.vue';
import HomeBento from '../components/HomeBento.vue';
import FloatingBottomNav, { NavTab } from '@/components/navigation/FloatingBottomNav.vue';
import GalleryDateGroup from '../components/GalleryDateGroup.vue';
import GalleryItemCard from '../components/GalleryItemCard.vue';
import GalleryEmptyState from '../components/GalleryEmptyState.vue';
import FolderCard from '@/features/folders/components/FolderCard.vue';
import CreateFolderModal from '@/features/folders/components/CreateFolderModal.vue';
import FolderInfoModal from '@/features/folders/components/FolderInfoModal.vue';
import MoveToFolderModal from '@/features/folders/components/MoveToFolderModal.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import MemoryCalendar from '../components/MemoryCalendar.vue';
import UploadFAB from '@/features/upload/components/UploadFAB.vue';
import UploadQueuePanel from '@/features/upload/components/UploadQueuePanel.vue';
import MediaLightbox from '@/features/viewer/components/MediaLightbox.vue';
import FloatingHearts from '@/components/ui/FloatingHearts.vue';
import { apiFetch } from '@/services/api';
import { MediaItem, Folder as FolderType } from '@/types';
import {
  Coffee,
  Folder as FolderIcon,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  Home,
  Heart,
  Download,
  Trash2,
  FolderInput,
  X,
  Search,
  ArrowUpDown,
  Check,
  Calendar,
  Image as ImageIcon,
  Film as FilmIcon,
  Sparkles,
  RotateCcw,
} from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const galleryStore = useGalleryStore();
const folderStore = useFolderStore();
const viewerStore = useViewerStore();
const {
  isFavorite,
  favoriteIds,
  universalFavoriteItems,
  fetchUniversalFavorites,
  batchSetFavorites,
} = useFavorites();
const toast = useToast();

const sentinelRef = ref<HTMLElement | null>(null);
const fabRef = ref<InstanceType<typeof UploadFAB> | null>(null);

// Navigation Tab state ('home' | 'folders' | 'calendar' | 'gallery' | 'favorites')
const initialTab = (route.query.tab as NavTab) || (route.query.folder ? 'folders' : 'home');
const activeTab = ref<NavTab>(
  ['home', 'folders', 'calendar', 'gallery', 'favorites'].includes(initialTab) ? initialTab : 'home'
);

// Active author filter in Tab Favorit: 'all' | 'yudhi' | 'wina'
const favoriteAuthorFilter = ref<'all' | 'yudhi' | 'wina'>('all');

// Strict parent-child folder filter: only show subfolders matching currentFolder, or root folders at root
const displayedFolders = computed(() => {
  if (folderStore.currentFolder) {
    return folderStore.folders.filter((f) => f.parentId === folderStore.currentFolder!.id);
  }
  return folderStore.folders.filter((f) => !f.parentId);
});

// Batch favorite in progress state
const isBatchFavoriting = ref(false);

// Combined universal favorites from both backend query and local loaded items
const allFavoriteItems = computed<MediaItem[]>(() => {
  const map = new Map<string, MediaItem>();
  for (const item of universalFavoriteItems.value) {
    map.set(item.id, item);
  }
  for (const item of galleryStore.items) {
    if (isFavorite(item.id)) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    const timeA = new Date(a.takenAt || a.createdAt).getTime();
    const timeB = new Date(b.takenAt || b.createdAt).getTime();
    return timeB - timeA;
  });
});

const yudhiFavoriteCount = computed(() => {
  return allFavoriteItems.value.filter((i) => {
    const name = (i.ownerName || '').toLowerCase();
    const email = (i.ownerEmail || '').toLowerCase();
    return name.includes('yudhi') || email.includes('yudhi');
  }).length;
});

const winaFavoriteCount = computed(() => {
  return allFavoriteItems.value.filter((i) => {
    const name = (i.ownerName || '').toLowerCase();
    const email = (i.ownerEmail || '').toLowerCase();
    return name.includes('wina') || email.includes('wina');
  }).length;
});

const favoriteItems = computed<MediaItem[]>(() => {
  if (favoriteAuthorFilter.value === 'yudhi') {
    return allFavoriteItems.value.filter((i) => {
      const name = (i.ownerName || '').toLowerCase();
      const email = (i.ownerEmail || '').toLowerCase();
      return name.includes('yudhi') || email.includes('yudhi');
    });
  }
  if (favoriteAuthorFilter.value === 'wina') {
    return allFavoriteItems.value.filter((i) => {
      const name = (i.ownerName || '').toLowerCase();
      const email = (i.ownerEmail || '').toLowerCase();
      return name.includes('wina') || email.includes('wina');
    });
  }
  return allFavoriteItems.value;
});

const favoriteCount = computed(() => allFavoriteItems.value.length || favoriteIds.value.size);

const isAllBatchFavorited = computed(() => {
  if (selectedIds.value.size === 0) return false;
  return Array.from(selectedIds.value).every((id) => isFavorite(id));
});

async function handleBatchToggleFavorite() {
  const ids = Array.from(selectedIds.value);
  if (ids.length === 0 || isBatchFavoriting.value) return;

  isBatchFavoriting.value = true;
  const targetState = !isAllBatchFavorited.value;
  try {
    await batchSetFavorites(ids, targetState);
    if (targetState) {
      toast.success(`${ids.length} kenangan ditambahkan ke Favorit.`);
    } else {
      toast.success(`${ids.length} kenangan dihapus dari Favorit.`);
    }
  } catch (err: any) {
    toast.error('Gagal memperbarui favorit: ' + (err.message || 'kesalahan sistem'));
  } finally {
    isBatchFavoriting.value = false;
  }
}

const groupedFavorites = computed(() => {
  const groups: Record<string, MediaItem[]> = {};
  for (const item of favoriteItems.value) {
    const date = item.takenAt ? new Date(item.takenAt) : new Date(item.createdAt);
    const key = date.toISOString().split('T')[0];
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }

  return Object.entries(groups).map(([dateKey, items]) => {
    const d = new Date(dateKey);
    const label = new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);

    return {
      dateKey,
      dateLabel: label,
      items,
    };
  });
});

// Modal states
const isCreateFolderOpen = ref(false);
const isRenamingFolder = ref(false);
const targetFolder = ref<FolderType | null>(null);
const createFolderInitialDate = ref('');
const isFolderInfoOpen = ref(false);
const infoTargetFolder = ref<FolderType | null>(null);
const isDeleteConfirmOpen = ref(false);
const folderToDelete = ref<FolderType | null>(null);
const isDeletingFolder = ref(false);

// Custom Sort Dropdown state
const isSortDropdownOpen = ref(false);
const sortDropdownRef = ref<HTMLElement | null>(null);
onClickOutside(sortDropdownRef, () => {
  isSortDropdownOpen.value = false;
});

const currentSortLabel = computed(() => {
  const opt = GALLERY_SORT_OPTIONS.find((o) => o.id === galleryStore.sortBy);
  return opt ? opt.label : 'Tanggal Terbaru';
});

function handleSelectSort(sortId: GallerySortOption) {
  galleryStore.sortBy = sortId;
  isSortDropdownOpen.value = false;
}

const hasActiveGalleryFilters = computed(() => {
  return (
    !!galleryStore.searchQuery.trim() ||
    galleryStore.mediaTypeFilter !== 'all' ||
    galleryStore.sortBy !== 'date-desc'
  );
});

function handleResetGalleryFilters() {
  galleryStore.searchQuery = '';
  galleryStore.mediaTypeFilter = 'all';
  galleryStore.sortBy = 'date-desc';
}

// Watchers for Server-Side Live Filter & Search
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
watch(
  () => galleryStore.searchQuery,
  () => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }
    searchDebounceTimer = setTimeout(() => {
      const targetFolderId = activeTab.value === 'folders' ? folderStore.currentFolder?.id : null;
      galleryStore.fetchMedia(true, targetFolderId);
    }, 350);
  }
);

watch(
  [() => galleryStore.mediaTypeFilter, () => galleryStore.sortBy],
  () => {
    const targetFolderId = activeTab.value === 'folders' ? folderStore.currentFolder?.id : null;
    galleryStore.fetchMedia(true, targetFolderId);
  }
);

onUnmounted(() => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }
});

// Multi-select state
const isSelectionMode = ref(false);
const selectedIds = ref<Set<string>>(new Set());
const isDownloadingBatch = ref(false);
const isBatchMoveOpen = ref(false);
const isBatchMoving = ref(false);
const isBatchDeleteOpen = ref(false);
const isBatchDeleting = ref(false);
const isFolderLoading = ref(false);

const currentFolderItems = computed<MediaItem[]>(() => {
  if (!folderStore.currentFolder) return [];
  return galleryStore.items.filter((item) => item.folderId === folderStore.currentFolder!.id);
});

const currentViewItems = computed<MediaItem[]>(() => {
  if (activeTab.value === 'favorites') {
    return favoriteItems.value;
  }
  if (activeTab.value === 'folders' && folderStore.currentFolder) {
    return currentFolderItems.value;
  }
  return galleryStore.filteredItems;
});

const isAllSelected = computed(() => {
  if (currentViewItems.value.length === 0) return false;
  return currentViewItems.value.every((item) => selectedIds.value.has(item.id));
});

// Trigger infinite scroll when scrolling near bottom
useIntersectionObserver(
  sentinelRef,
  ([{ isIntersecting }]) => {
    if (isIntersecting && galleryStore.hasMore && !galleryStore.isLoading && !galleryStore.isLoadingMore) {
      const targetFolderId = activeTab.value === 'folders' ? folderStore.currentFolder?.id : null;
      galleryStore.fetchMedia(false, targetFolderId);
    }
  },
  { rootMargin: '300px' }
);

function handleSelectMedia(item: MediaItem) {
  if (isSelectionMode.value) {
    handleToggleSelectMedia(item);
  } else {
    const list = currentViewItems.value.some((i) => i.id === item.id)
      ? currentViewItems.value
      : [item, ...currentViewItems.value];
    viewerStore.open(item.id, list, item);
  }
}

function handleLongPressMedia(item: MediaItem) {
  isSelectionMode.value = true;
  selectedIds.value = new Set([item.id]);
}

function handleToggleSelectMedia(item: MediaItem) {
  const next = new Set(selectedIds.value);
  if (next.has(item.id)) {
    next.delete(item.id);
  } else {
    next.add(item.id);
  }
  selectedIds.value = next;
}

function handleToggleSelectAll() {
  if (isAllSelected.value) {
    selectedIds.value = new Set();
  } else {
    selectedIds.value = new Set(currentViewItems.value.map((i) => i.id));
  }
}

function handleCancelSelection() {
  isSelectionMode.value = false;
  selectedIds.value = new Set();
}

async function handleBatchDownload() {
  if (selectedIds.value.size === 0 || isDownloadingBatch.value) return;
  isDownloadingBatch.value = true;
  const ids = Array.from(selectedIds.value);
  toast.info(`Mempersiapkan pengunduhan ${ids.length} kenangan...`);

  try {
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      try {
        const res = await apiFetch<{ url: string; filename: string }>(`/media/${id}/url?download=true`);
        if (res?.url) {
          const link = document.createElement('a');
          link.href = res.url;
          link.download = res.filename || 'kenangan.jpg';
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } catch (err) {
        console.error(`Gagal mengunduh media ${id}:`, err);
      }
      if (i < ids.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
    }
    toast.success(`Berhasil mengunduh ${ids.length} kenangan.`);
    handleCancelSelection();
  } catch (err: any) {
    toast.error(`Gagal mengunduh: ${err.message || 'Terjadi kesalahan'}`);
  } finally {
    isDownloadingBatch.value = false;
  }
}

async function handleConfirmBatchMove(targetFolderId: string | null) {
  if (selectedIds.value.size === 0 || isBatchMoving.value) return;
  isBatchMoving.value = true;
  try {
    const ids = Array.from(selectedIds.value);
    await galleryStore.batchMove(ids, targetFolderId);
    toast.success(`Berhasil memindahkan ${ids.length} kenangan.`);
    isBatchMoveOpen.value = false;
    handleCancelSelection();
    await galleryStore.fetchMedia(true, folderStore.currentFolder?.id);
  } catch (err: any) {
    toast.error(`Gagal memindahkan file: ${err.message || 'Terjadi kesalahan'}`);
  } finally {
    isBatchMoving.value = false;
  }
}

async function handleConfirmBatchDelete() {
  if (selectedIds.value.size === 0 || isBatchDeleting.value) return;
  isBatchDeleting.value = true;
  try {
    const ids = Array.from(selectedIds.value);
    await galleryStore.batchDelete(ids);
    toast.success(`Berhasil menghapus ${ids.length} kenangan.`);
    isBatchDeleteOpen.value = false;
    handleCancelSelection();
    await folderStore.fetchFolders(folderStore.currentFolder?.parentId || null);
  } catch (err: any) {
    toast.error(`Gagal menghapus file: ${err.message || 'Terjadi kesalahan'}`);
  } finally {
    isBatchDeleting.value = false;
  }
}

function handleEmptyUpload() {
  fabRef.value?.triggerFileInput?.();
}

function handleOpenCreateFolder() {
  targetFolder.value = null;
  isRenamingFolder.value = false;
  createFolderInitialDate.value = '';
  isCreateFolderOpen.value = true;
}

function handleCreateFolderForDate(dateStr: string) {
  targetFolder.value = null;
  isRenamingFolder.value = false;
  createFolderInitialDate.value = dateStr;
  isCreateFolderOpen.value = true;
}

function handleStartRename(folder: FolderType) {
  targetFolder.value = folder;
  isRenamingFolder.value = true;
  createFolderInitialDate.value = folder.eventDate || '';
  isCreateFolderOpen.value = true;
}

async function handleSaveFolder(name: string, eventDate: string | null) {
  try {
    if (isRenamingFolder.value && targetFolder.value) {
      const updated = await folderStore.updateFolder(targetFolder.value.id, { name, eventDate });
      toast.success('Nama folder berhasil diubah.');
      if (infoTargetFolder.value?.id === targetFolder.value.id) {
        infoTargetFolder.value = updated;
      }
    } else {
      await folderStore.createFolder(name, folderStore.currentFolder?.id, eventDate);
      toast.success(`Folder "${name}" berhasil dibuat.`);
    }
    isCreateFolderOpen.value = false;
    createFolderInitialDate.value = '';
  } catch (err: any) {
    toast.error(`Gagal menyimpan folder: ${err.message}`);
  }
}

function handleOpenFolderInfo(folder: FolderType) {
  infoTargetFolder.value = folder;
  isFolderInfoOpen.value = true;
}

async function handleCoverChanged(coverMediaId: string | null) {
  if (!infoTargetFolder.value) return;
  try {
    const updated = await folderStore.updateFolder(infoTargetFolder.value.id, { coverMediaId });
    infoTargetFolder.value = updated;
    toast.success('Foto sampul folder berhasil diperbarui.');
  } catch (err: any) {
    toast.error(`Gagal mengubah sampul: ${err.message}`);
  }
}

async function handleEventDateChanged(eventDate: string | null) {
  if (!infoTargetFolder.value) return;
  infoTargetFolder.value = { ...infoTargetFolder.value, eventDate };
}

function handleDeleteFolder(folder: FolderType) {
  folderToDelete.value = folder;
  isDeleteConfirmOpen.value = true;
}

async function confirmDeleteFolder() {
  if (!folderToDelete.value) return;
  const folder = folderToDelete.value;
  isDeletingFolder.value = true;
  try {
    const isCurrent = folderStore.currentFolder?.id === folder.id;
    const deletedFolderId = folder.id;
    await folderStore.deleteFolder(deletedFolderId);

    // Also remove items from local galleryStore in memory that belonged to this folder
    galleryStore.items = galleryStore.items.filter((item) => item.folderId !== deletedFolderId);
    authStore.fetchMe().catch(() => {});

    toast.success(`Folder "${folder.name}" beserta foto di dalamnya berhasil dihapus.`);
    isDeleteConfirmOpen.value = false;
    folderToDelete.value = null;
    if (isCurrent) {
      handleNavigateRoot();
      await galleryStore.fetchMedia(true, null);
    } else {
      await galleryStore.fetchMedia(true, folderStore.currentFolder?.id);
    }
  } catch (err: any) {
    toast.error(`Gagal menghapus folder: ${err.message}`);
  } finally {
    isDeletingFolder.value = false;
  }
}

async function handleSelectFolder(folder: FolderType) {
  activeTab.value = 'folders';
  folderStore.openFolder(folder);
  isFolderLoading.value = true;
  router.push({
    path: '/',
    query: { tab: 'folders', folder: folder.id },
  });
  try {
    await galleryStore.fetchMedia(true, folder.id);
  } finally {
    isFolderLoading.value = false;
  }
}

function handleBentoSelectFolder(folder: FolderType) {
  handleSelectFolder(folder);
}

async function handleNavigateToFolder(folderId: string) {
  const target = folderStore.folders.find((f) => f.id === folderId);
  if (target) {
    handleSelectFolder(target);
  } else {
    try {
      const folder = await folderStore.getFolderById(folderId);
      if (folder) {
        handleSelectFolder(folder);
      }
    } catch (err) {
      console.error('Failed to open folder:', err);
    }
  }
}

async function handleNavigateBreadcrumb(index: number) {
  if (index < 0) {
    handleNavigateRoot();
    return;
  }
  const target = folderStore.breadcrumbs[index];
  if (target) {
    folderStore.navigateToBreadcrumb(index);
    isFolderLoading.value = true;
    router.push({
      path: '/',
      query: { tab: 'folders', folder: target.id },
    });
    try {
      await galleryStore.fetchMedia(true, target.id);
    } finally {
      isFolderLoading.value = false;
    }
  } else {
    handleNavigateRoot();
  }
}

function handleNavigateRoot() {
  folderStore.navigateToRoot();
  router.replace({
    path: '/',
    query: { tab: 'folders' },
  });
}

async function syncFolderFromRoute(folderId?: string) {
  if (!folderId) {
    if (folderStore.currentFolder !== null) {
      folderStore.navigateToRoot();
    }
    return;
  }

  activeTab.value = 'folders';

  if (folderStore.currentFolder?.id === folderId) {
    if (galleryStore.activeFolderFilter === folderId && galleryStore.items.length > 0) {
      return;
    }
  }

  isFolderLoading.value = true;
  try {
    const breadcrumbIndex = folderStore.breadcrumbs.findIndex((b) => b.id === folderId);
    if (breadcrumbIndex !== -1) {
      folderStore.navigateToBreadcrumb(breadcrumbIndex);
    } else {
      const existingFolder = folderStore.folders.find((f) => f.id === folderId);
      if (existingFolder) {
        folderStore.openFolder(existingFolder);
      } else {
        await folderStore.loadFolderHierarchy(folderId);
      }
    }
    await galleryStore.fetchMedia(true, folderId);
  } catch (err) {
    console.error('Gagal memuat folder dari route:', err);
    handleNavigateRoot();
  } finally {
    isFolderLoading.value = false;
  }
}

function handleTabClick(tab: NavTab) {
  if (tab === 'folders') {
    // If clicking Folder tab while already on folders, pop back to root folder list
    if (activeTab.value === 'folders' && folderStore.currentFolder) {
      handleNavigateRoot();
    }
  }
}

watch(activeTab, async (newTab) => {
  handleCancelSelection();

  if (newTab !== 'folders') {
    folderStore.currentFolder = null;
  }

  const nextQuery: Record<string, any> = {};
  if (newTab !== 'home') {
    nextQuery.tab = newTab;
  }

  if (newTab === 'gallery') {
    if (galleryStore.items.length === 0 || !!galleryStore.activeFolderFilter) {
      await galleryStore.fetchMedia(true);
    }
  } else if (newTab === 'folders') {
    if (folderStore.currentFolder) {
      nextQuery.folder = folderStore.currentFolder.id;
    } else {
      folderStore.navigateToRoot();
    }
  } else if (newTab === 'favorites') {
    await fetchUniversalFavorites().catch(() => {});
    if (galleryStore.items.length === 0) {
      await galleryStore.fetchMedia(true);
    }
  }

  router.replace({
    path: '/',
    query: nextQuery,
  });
});

watch(
  () => route.query.tab,
  (newTab) => {
    const tabName = (newTab as NavTab) || 'home';
    if (['home', 'folders', 'calendar', 'gallery', 'favorites'].includes(tabName) && activeTab.value !== tabName) {
      activeTab.value = tabName;
    }
  }
);

watch(
  () => route.query.folder,
  async (newFolderId, oldFolderId) => {
    if (newFolderId === oldFolderId) return;
    await syncFolderFromRoute(newFolderId as string | undefined);
  }
);

onMounted(async () => {
  // Fire background auth and favorites non-blocking
  authStore.fetchMe().catch(() => {});
  fetchUniversalFavorites().catch(() => {});

  const initialFolderId = route.query.folder as string | undefined;
  if (initialFolderId) {
    try {
      await folderStore.loadFolderHierarchy(initialFolderId);
      await galleryStore.fetchMedia(true, initialFolderId);
    } catch {
      handleNavigateRoot();
    }
  } else {
    await Promise.all([
      folderStore.fetchFolders(null).catch(() => {}),
      galleryStore.fetchMedia(true).catch(() => {}),
    ]);
  }
});
</script>

<template>
  <div class="relative min-h-screen flex flex-col bg-app text-app pb-safe overflow-x-clip">
    <!-- GPU-Accelerated Lag-Free Background Love Particles -->
    <FloatingHearts />

    <!-- Header -->
    <GalleryHeader />

    <!-- Cold Start Wakeup Notice (Shadow-based, no border) -->
    <div
      v-if="authStore.isColdStarting"
      class="relative z-10 max-w-6xl mx-auto px-4 mt-4 w-full"
    >
      <div class="p-3.5 rounded-[14px] bg-surface-tint shadow-sm text-xs text-app flex items-center gap-2.5">
        <Coffee class="w-4 h-4 text-[#C93D68] shrink-0" />
        <p class="leading-relaxed">
          Server Azure sedang bangun dari mode tidur. Data akan segera muncul dalam beberapa detik...
        </p>
      </div>
    </div>

    <!-- Main Explorer / Gallery Container with generous bottom padding for floating dock -->
    <main class="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 py-5 sm:py-7 pb-32 sm:pb-36">
      
      <!-- TAB 1: BERANDA (HERO SLIDESHOW + BENTO GRID) -->
      <section v-if="activeTab === 'home'" class="space-y-6">
        <!-- HERO SECTION AT TOP OF BERANDA -->
        <GalleryHero />

        <HomeBento
          @select-media="handleSelectMedia"
          @select-folder="handleBentoSelectFolder"
          @explore-folders="activeTab = 'folders'"
        />
      </section>

      <!-- TAB 2: FOLDERS (WINDOWS EXPLORER STYLE BREADCRUMBS & FOLDERS) -->
      <section v-else-if="activeTab === 'folders'" class="space-y-6">
        <!-- Breadcrumb Navigation Bar (Windows Explorer Style, Shadow-based) -->
        <nav
          class="flex items-center justify-between gap-2 p-2 sm:p-2.5 rounded-2xl bg-surface shadow-soft-sm"
          aria-label="Navigasi folder"
        >
          <div class="flex-1 min-w-0 flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
            <!-- Back button if inside folder -->
            <button
              v-if="folderStore.currentFolder"
              type="button"
              class="w-8 h-8 rounded-lg hover:bg-surface-tint text-muted hover:text-app flex items-center justify-center transition-colors shrink-0 cursor-pointer"
              aria-label="Kembali ke folder sebelumnya"
              @click="handleNavigateBreadcrumb(folderStore.breadcrumbs.length - 2)"
            >
              <ArrowLeft class="w-4 h-4" />
            </button>

            <!-- Root Galeri -->
            <button
              type="button"
              class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors font-medium shrink-0 cursor-pointer h-8"
              :class="!folderStore.currentFolder ? 'bg-surface-tint text-[#C93D68] dark:text-[#FF8FAE] font-semibold' : 'text-muted hover:text-app'"
              @click="handleNavigateRoot"
              title="Semua Kenangan"
            >
              <Home class="w-3.5 h-3.5 shrink-0" />
              <span :class="folderStore.currentFolder ? 'hidden sm:inline' : 'inline'">Semua Kenangan</span>
            </button>

            <!-- Breadcrumb Segments -->
            <template v-for="(b, idx) in folderStore.breadcrumbs" :key="b.id">
              <ChevronRight class="w-3.5 h-3.5 text-muted shrink-0" />
              <button
                type="button"
                class="px-2.5 py-1.5 rounded-lg transition-colors font-medium truncate max-w-36 sm:max-w-56 shrink-0 cursor-pointer h-8"
                :class="idx === folderStore.breadcrumbs.length - 1 ? 'bg-surface-tint text-[#C93D68] dark:text-[#FF8FAE] font-semibold' : 'text-muted hover:text-app'"
                @click="handleNavigateBreadcrumb(idx)"
                :title="b.name"
              >
                {{ b.name }}
              </button>
            </template>
          </div>
        </nav>

        <!-- FOLDERS GRID SECTION (STRICTLY ISOLATED BY PARENT ID) -->
        <section v-if="displayedFolders.length > 0" class="space-y-3">
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            <FolderCard
              v-for="(folder, index) in displayedFolders"
              :key="`${folder.id}-${folder.coverUrl || ''}`"
              :folder="folder"
              :index-number="index + 1"
              @select="handleSelectFolder"
              @info="handleOpenFolderInfo"
              @rename="handleStartRename"
              @delete="handleDeleteFolder"
            />
          </div>
        </section>

        <!-- MEDIA IN CURRENT FOLDER (CLEAN UNIFIED GRID WITHOUT DATE HEADERS) -->
        <section v-if="folderStore.currentFolder" class="space-y-4">
          <div v-if="currentFolderItems.length > 0" class="flex items-center justify-between pt-2">
            <h2 class="text-sm font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <span>Momen di "{{ folderStore.currentFolder.name }}"</span>
            </h2>
          </div>

          <!-- Loading Skeleton State when opening/fetching folder -->
          <div
            v-if="(galleryStore.isLoading || isFolderLoading) && currentFolderItems.length === 0"
            class="space-y-4 py-2"
          >
            <div class="h-4 w-32 bg-surface-tint rounded-lg animate-pulse" />
            <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3 pl-1">
              <div
                v-for="n in 6"
                :key="n"
                class="aspect-square rounded-2xl bg-surface-tint/70 animate-pulse border border-black/5 dark:border-white/5"
              />
            </div>
          </div>

          <!-- Empty folder state (only shown when NOT loading and confirmed 0 items) -->
          <div
            v-else-if="!galleryStore.isLoading && !isFolderLoading && currentFolderItems.length === 0"
            class="text-center py-12 px-4 rounded-3xl bg-surface shadow-soft-sm space-y-3"
          >
            <FolderIcon class="w-12 h-12 mx-auto text-[#C93D68]/80 dark:text-[#FF8FAE]/80 stroke-[1.5]" />
            <h3 class="text-base font-semibold text-app">
              Folder "{{ folderStore.currentFolder.name }}" masih kosong
            </h3>
            <p class="text-xs text-muted max-w-sm mx-auto">
              Ketuk tombol tambah (+) di bawah untuk mengunggah foto atau video langsung ke folder ini.
            </p>
          </div>

          <!-- Direct cohesive grid of photos in this folder -->
          <div v-else class="space-y-4">
            <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3 pl-1">
              <GalleryItemCard
                v-for="item in currentFolderItems"
                :key="item.id"
                :item="item"
                :is-selection-mode="isSelectionMode"
                :is-selected="selectedIds.has(item.id)"
                @click="handleSelectMedia"
                @longpress="handleLongPressMedia"
                @toggle-select="handleToggleSelectMedia"
              />
            </div>

            <!-- Sentinel element for infinite scroll inside folder -->
            <div ref="sentinelRef" class="h-10 flex items-center justify-center">
              <div
                v-if="galleryStore.isLoadingMore"
                class="flex items-center gap-2 text-xs text-muted"
              >
                <div class="w-2 h-2 rounded-full bg-[#C93D68] animate-ping" />
                <span>Memuat lebih banyak kenangan...</span>
              </div>
            </div>
          </div>
        </section>
      </section>

      <!-- TAB 3: KALENDER KENANGAN -->
      <section v-else-if="activeTab === 'calendar'" class="space-y-6">
        <MemoryCalendar
          @select-folder="handleSelectFolder"
          @create-folder-for-date="handleCreateFolderForDate"
          @go-to-folders="activeTab = 'folders'"
        />
      </section>

      <!-- TAB 4: GALERI (GROUPED BY FOLDER & DATE) -->
      <section v-else-if="activeTab === 'gallery'" class="space-y-4 sm:space-y-5">
        <!-- Gallery Header & Total Moments Count -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h2 class="text-base sm:text-lg font-bold text-app flex items-center gap-2 tracking-tight">
              <span>Semua Kenangan Foto &amp; Video</span>
            </h2>
            <p class="text-xs text-muted mt-0.5">
              Dikelompokkan rapi berdasarkan folder kenangan dan tanggal momen
            </p>
          </div>
        </div>

        <!-- Controls: Search (by Folder Name & File) & Sort By -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <!-- Search Bar with Live Folder & File Search -->
          <div class="relative flex-1">
            <Search class="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              v-model="galleryStore.searchQuery"
              type="text"
              placeholder="Cari nama folder (misal: Twozza, Liburan) atau foto..."
              class="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-white dark:bg-surface text-xs sm:text-sm font-medium text-app placeholder:text-muted/70 shadow-soft-sm border border-black/5 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#C93D68]/30 transition-all"
            />
            <button
              v-if="galleryStore.searchQuery"
              type="button"
              class="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-muted hover:text-app flex items-center justify-center transition-colors cursor-pointer"
              title="Hapus pencarian"
              @click="galleryStore.searchQuery = ''"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </div>

          <!-- Sort By Custom Dropdown Selector -->
          <div ref="sortDropdownRef" class="relative shrink-0">
            <button
              type="button"
              class="w-full sm:w-auto flex items-center justify-between gap-2.5 pl-3.5 pr-3 py-2.5 rounded-2xl bg-white dark:bg-surface text-xs font-semibold text-app shadow-soft-sm border border-black/5 dark:border-white/10 hover:border-[#C93D68]/30 dark:hover:border-[#FF8FAE]/30 focus:outline-none focus:ring-2 focus:ring-[#C93D68]/30 transition-all cursor-pointer select-none"
              aria-haspopup="listbox"
              :aria-expanded="isSortDropdownOpen"
              @click="isSortDropdownOpen = !isSortDropdownOpen"
            >
              <div class="flex items-center gap-2 truncate">
                <ArrowUpDown class="w-3.5 h-3.5 text-[#C93D68] dark:text-[#FF8FAE] shrink-0" />
                <span class="truncate max-w-44 sm:max-w-none">
                  Urut: {{ currentSortLabel }}
                </span>
              </div>
              <ChevronDown
                class="w-3.5 h-3.5 text-muted shrink-0 transition-transform duration-200"
                :class="{ 'rotate-180': isSortDropdownOpen }"
              />
            </button>

            <!-- Custom Glassmorphic Popover Menu -->
            <Transition
              enter-active-class="transition duration-150 ease-out"
              enter-from-class="opacity-0 scale-95 -translate-y-1"
              enter-to-class="opacity-100 scale-100 translate-y-0"
              leave-active-class="transition duration-100 ease-in"
              leave-from-class="opacity-100 scale-100 translate-y-0"
              leave-to-class="opacity-0 scale-95 -translate-y-1"
            >
              <div
                v-if="isSortDropdownOpen"
                class="absolute right-0 mt-2 z-40 w-64 p-1.5 rounded-2xl bg-white/95 dark:bg-[#2A1D24]/95 backdrop-blur-xl shadow-xl ring-1 ring-black/5 dark:ring-white/10 space-y-1 select-none focus:outline-none"
                role="listbox"
              >
                <div class="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted border-b border-black/5 dark:border-white/5">
                  Urutkan Kenangan
                </div>

                <button
                  v-for="opt in GALLERY_SORT_OPTIONS"
                  :key="opt.id"
                  type="button"
                  role="option"
                  :aria-selected="galleryStore.sortBy === opt.id"
                  class="w-full px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer text-left"
                  :class="[
                    galleryStore.sortBy === opt.id
                      ? 'bg-[#C93D68]/10 dark:bg-[#FF8FAE]/15 text-[#C93D68] dark:text-[#FF8FAE] font-bold'
                      : 'text-app/80 hover:bg-black/5 dark:hover:bg-white/5 hover:text-app font-medium'
                  ]"
                  @click="handleSelectSort(opt.id)"
                >
                  <span>Urut: {{ opt.label }}</span>
                  <Check
                    v-if="galleryStore.sortBy === opt.id"
                    class="w-4 h-4 text-[#C93D68] dark:text-[#FF8FAE] shrink-0 stroke-[2.5]"
                  />
                </button>
              </div>
            </Transition>
          </div>
        </div>

        <!-- Filter Pills Bar: Media Type (Server-Side Filtered) -->
        <div class="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          <!-- Media Type Filter Pills -->
          <div
            class="flex items-center gap-1 p-1 rounded-2xl bg-white dark:bg-surface shadow-soft-xs border border-black/5 dark:border-white/10 text-xs font-semibold"
            role="radiogroup"
            aria-label="Filter tipe media"
          >
            <button
              type="button"
              class="px-2.5 sm:px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer select-none"
              :class="galleryStore.mediaTypeFilter === 'all' ? 'bg-[#C93D68] text-white shadow-xs font-bold' : 'text-muted hover:text-app hover:bg-surface-tint'"
              @click="galleryStore.mediaTypeFilter = 'all'"
            >
              <Sparkles class="w-3.5 h-3.5" />
              <span>Semua</span>
            </button>
            <button
              type="button"
              class="px-2.5 sm:px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer select-none"
              :class="galleryStore.mediaTypeFilter === 'photo' ? 'bg-[#C93D68] text-white shadow-xs font-bold' : 'text-muted hover:text-app hover:bg-surface-tint'"
              @click="galleryStore.mediaTypeFilter = 'photo'"
            >
              <ImageIcon class="w-3.5 h-3.5" />
              <span>Foto</span>
            </button>
            <button
              type="button"
              class="px-2.5 sm:px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer select-none"
              :class="galleryStore.mediaTypeFilter === 'video' ? 'bg-[#C93D68] text-white shadow-xs font-bold' : 'text-muted hover:text-app hover:bg-surface-tint'"
              @click="galleryStore.mediaTypeFilter = 'video'"
            >
              <FilmIcon class="w-3.5 h-3.5" />
              <span>Video</span>
            </button>
          </div>

          <!-- Quick Reset Filter CTA Button if filters active -->
          <button
            v-if="hasActiveGalleryFilters"
            type="button"
            class="px-3 py-1.5 rounded-xl bg-surface-tint hover:bg-surface-tint/80 text-xs font-semibold text-[#C93D68] dark:text-[#FF8FAE] transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            title="Kembalikan semua filter ke awal"
            @click="handleResetGalleryFilters"
          >
            <RotateCcw class="w-3.5 h-3.5" />
            <span>Reset Filter</span>
          </button>
        </div>

        <!-- Filter Summary Bar if filters are active -->
        <div
          v-if="hasActiveGalleryFilters"
          class="flex items-center justify-between px-3.5 py-2 rounded-xl bg-surface-tint text-xs text-app flex-wrap gap-2"
        >
          <div class="flex items-center gap-2 flex-wrap text-muted">
            <span>Filter aktif:</span>
            <span v-if="galleryStore.searchQuery" class="font-semibold text-app px-2 py-0.5 rounded-lg bg-surface shadow-soft-xs">
              "{{ galleryStore.searchQuery }}"
            </span>
            <span v-if="galleryStore.mediaTypeFilter !== 'all'" class="font-semibold text-app px-2 py-0.5 rounded-lg bg-surface shadow-soft-xs capitalize">
              Tipe: {{ galleryStore.mediaTypeFilter === 'photo' ? 'Foto' : 'Video' }}
            </span>
            <span class="text-[11px] text-[#C93D68] dark:text-[#FF8FAE] font-bold">
              ({{ galleryStore.filteredItems.length }} kenangan ditemukan)
            </span>
          </div>

          <button
            type="button"
            class="text-[11px] font-semibold text-[#C93D68] dark:text-[#FF8FAE] hover:underline cursor-pointer shrink-0 ml-auto"
            @click="handleResetGalleryFilters"
          >
            Reset Semua
          </button>
        </div>

        <!-- Loading Spinner -->
        <div
          v-if="galleryStore.isLoading && galleryStore.items.length === 0"
          class="py-12 flex flex-col items-center justify-center gap-3 text-xs text-muted"
        >
          <div class="w-6 h-6 rounded-full border-2 border-[#C93D68] border-t-transparent animate-spin" />
          <span>Memuat kenangan...</span>
        </div>

        <!-- Filter Empty State (checked BEFORE total empty state) -->
        <div
          v-else-if="hasActiveGalleryFilters && galleryStore.filteredItems.length === 0"
          class="py-14 sm:py-16 text-center rounded-3xl bg-surface shadow-soft-sm p-6 space-y-3"
        >
          <div class="w-12 h-12 rounded-full bg-[#C93D68]/10 text-[#C93D68] dark:text-[#FF8FAE] flex items-center justify-center mx-auto">
            <Search class="w-6 h-6 stroke-[1.75]" />
          </div>
          <h3 class="text-base font-bold text-app">
            Tidak ada kenangan yang sesuai filter
          </h3>
          <p class="text-xs text-muted max-w-sm mx-auto">
            Tidak ditemukan foto atau video yang cocok di seluruh galeri. Coba ubah kata kunci pencarian atau tipe media.
          </p>
          <button
            type="button"
            class="mt-2 px-4 py-2 rounded-xl bg-surface-tint hover:bg-surface-tint/80 text-xs font-semibold text-[#C93D68] dark:text-[#FF8FAE] transition-all cursor-pointer inline-flex items-center gap-1.5"
            @click="handleResetGalleryFilters"
          >
            <RotateCcw class="w-3.5 h-3.5" />
            <span>Reset Semua Filter</span>
          </button>
        </div>

        <!-- Truly Empty Gallery State -->
        <GalleryEmptyState
          v-else-if="!galleryStore.isLoading && galleryStore.items.length === 0"
          @upload="handleEmptyUpload"
        />

        <div v-else class="space-y-6 sm:space-y-8">
          <!-- Folder Section Card -->
          <template v-if="galleryStore.groupedByFolderAndDate.length > 0">
            <div
              v-for="folderGroup in galleryStore.groupedByFolderAndDate"
              :key="folderGroup.folderId || 'unfiled'"
              class="rounded-3xl bg-surface/80 backdrop-blur-xs border border-white/60 dark:border-white/5 shadow-soft-sm p-4 sm:p-5 transition-all"
            >
              <!-- Folder Header with Cute Badge, Name & Direct Jump -->
              <div class="flex items-center justify-between pb-3 mb-4 border-b border-black/5 dark:border-white/5">
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-[#C93D68] dark:text-[#FF8FAE] shrink-0">
                    <FolderIcon class="w-4 h-4 sm:w-4.5 sm:h-4.5 fill-current" />
                  </div>
                  <div class="min-w-0">
                    <h3 class="text-sm sm:text-base font-bold text-app truncate flex items-center gap-2">
                      <span class="truncate">{{ folderGroup.folderName }}</span>
                    </h3>
                    <p
                      v-if="folderGroup.folderEventDateFormatted"
                      class="text-[11px] text-muted flex items-center gap-1 mt-0.5"
                    >
                      <Calendar class="w-3 h-3 text-[#C93D68] dark:text-[#FF8FAE]" />
                      <span>{{ folderGroup.folderEventDateFormatted }}</span>
                    </p>
                  </div>
                </div>

                <!-- Action to navigate to that folder directly in Folders tab -->
                <button
                  v-if="folderGroup.folderId"
                  type="button"
                  class="px-2.5 py-1 text-xs font-semibold text-[#C93D68] dark:text-[#FF8FAE] hover:bg-[#C93D68]/10 dark:hover:bg-[#FF8FAE]/10 rounded-xl transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                  title="Buka folder ini"
                  @click="handleNavigateToFolder(folderGroup.folderId)"
                >
                  <span>Buka Folder</span>
                  <ChevronRight class="w-3.5 h-3.5" />
                </button>
              </div>

              <!-- Date Groups inside this Folder -->
              <div class="space-y-5">
                <GalleryDateGroup
                  v-for="group in folderGroup.dateGroups"
                  :key="group.dateKey"
                  :date-label="group.dateLabel"
                  :items="group.items"
                  :is-selection-mode="isSelectionMode"
                  :selected-ids="selectedIds"
                  @select="handleSelectMedia"
                  @longpress="handleLongPressMedia"
                  @toggle-select="handleToggleSelectMedia"
                />
              </div>
            </div>
          </template>

          <!-- Fallback direct grid if grouping produced 0 groups but items exist -->
          <div v-else class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3 pl-1">
            <GalleryItemCard
              v-for="item in galleryStore.filteredItems"
              :key="item.id"
              :item="item"
              :is-selection-mode="isSelectionMode"
              :is-selected="selectedIds.has(item.id)"
              @click="handleSelectMedia"
              @longpress="handleLongPressMedia"
              @toggle-select="handleToggleSelectMedia"
            />
          </div>

          <!-- Sentinel element for infinite scroll -->
          <div ref="sentinelRef" class="h-10 flex items-center justify-center">
            <div
              v-if="galleryStore.isLoadingMore"
              class="flex items-center gap-2 text-xs text-muted"
            >
              <div class="w-2 h-2 rounded-full bg-[#C93D68] animate-ping" />
              <span>Memuat lebih banyak kenangan...</span>
            </div>
          </div>
        </div>
      </section>

      <!-- TAB 5: FAVORIT (STARRED / LIKED MOMENTS) -->
      <section v-else-if="activeTab === 'favorites'" class="space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 class="text-base sm:text-lg font-bold text-app flex items-center gap-2 tracking-tight">
              <span>Momen Terfavorit</span>
            </h2>
            <p class="text-xs text-muted mt-0.5">
              Koleksi kenangan favorit bersama Yudhi Adinata &amp; Wina Sugianti
            </p>
          </div>

          <!-- Author Filter Pills (Universal Couple Filters: Semua, Yudhi, Wina) -->
          <div class="flex items-center gap-1.5 p-1 rounded-2xl bg-surface shadow-soft-xs text-xs font-semibold self-start sm:self-auto">
            <button
              type="button"
              class="px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              :class="favoriteAuthorFilter === 'all' ? 'bg-[#C93D68] text-white shadow-xs font-bold' : 'text-muted hover:text-app hover:bg-surface-tint'"
              @click="favoriteAuthorFilter = 'all'"
            >
              <Heart class="w-3.5 h-3.5 fill-current" />
              <span>Semua</span>
              <span class="text-[11px] opacity-80">({{ allFavoriteItems.length }})</span>
            </button>

            <button
              type="button"
              class="px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              :class="favoriteAuthorFilter === 'yudhi' ? 'bg-[#C93D68] text-white shadow-xs font-bold' : 'text-muted hover:text-app hover:bg-surface-tint'"
              @click="favoriteAuthorFilter = 'yudhi'"
            >
              <span class="w-4 h-4 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-300 text-[10px] flex items-center justify-center font-bold">Y</span>
              <span>Yudhi</span>
              <span class="text-[11px] opacity-80">({{ yudhiFavoriteCount }})</span>
            </button>

            <button
              type="button"
              class="px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              :class="favoriteAuthorFilter === 'wina' ? 'bg-[#C93D68] text-white shadow-xs font-bold' : 'text-muted hover:text-app hover:bg-surface-tint'"
              @click="favoriteAuthorFilter = 'wina'"
            >
              <span class="w-4 h-4 rounded-full bg-rose-500/20 text-[#C93D68] dark:text-[#FF8FAE] text-[10px] flex items-center justify-center font-bold">W</span>
              <span>Wina</span>
              <span class="text-[11px] opacity-80">({{ winaFavoriteCount }})</span>
            </button>
          </div>
        </div>

        <div
          v-if="favoriteItems.length === 0"
          class="text-center py-16 px-4 rounded-3xl bg-surface shadow-soft-sm space-y-3"
        >
          <Heart class="w-12 h-12 mx-auto text-[#FF8FAE] fill-current/30 stroke-[1.5]" />
          <h3 class="text-base font-semibold text-app">
            Belum ada kenangan favorit
          </h3>
        </div>

        <div v-else class="space-y-2">
          <GalleryDateGroup
            v-for="group in groupedFavorites"
            :key="group.dateKey"
            :date-label="group.dateLabel"
            :items="group.items"
            :is-selection-mode="isSelectionMode"
            :selected-ids="selectedIds"
            @select="handleSelectMedia"
            @longpress="handleLongPressMedia"
            @toggle-select="handleToggleSelectMedia"
          />
        </div>
      </section>
    </main>

    <!-- FLOATING BOTTOM NAVIGATION DOCK (Sticky, Centered, Hidden in Selection Mode) -->
    <FloatingBottomNav
      v-if="!isSelectionMode"
      v-model="activeTab"
      :favorite-count="favoriteCount"
      @tab-click="handleTabClick"
    />

    <!-- MULTI-SELECT FLOATING ACTION DOCK -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-6 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-6 scale-95"
    >
      <div
        v-if="isSelectionMode"
        class="fixed bottom-[max(1.25rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))] sm:bottom-8 left-1/2 -translate-x-1/2 z-40 w-full max-w-110 sm:max-w-lg px-3 select-none"
      >
        <div class="p-2 sm:p-2.5 rounded-3xl bg-white/95 dark:bg-[#2A1D24]/95 text-app backdrop-blur-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 flex items-center justify-between gap-1 sm:gap-2">
          <!-- Left Info & Select All & Cancel -->
          <div class="flex items-center gap-1.5 sm:gap-2 pl-1.5 min-w-0">
            <button
              type="button"
              class="w-9 h-9 rounded-full bg-surface-tint hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-muted hover:text-app transition-colors cursor-pointer shrink-0"
              title="Batal Memilih"
              aria-label="Batal Memilih"
              @click="handleCancelSelection"
            >
              <X class="w-4 h-4" />
            </button>

            <div class="flex flex-col min-w-0">
              <span class="text-xs sm:text-sm font-bold text-app leading-tight truncate">
                {{ selectedIds.size }} Dipilih
              </span>
              <button
                type="button"
                class="text-[10px] text-[#C93D68] dark:text-[#FF8FAE] font-semibold hover:underline text-left cursor-pointer truncate"
                @click="handleToggleSelectAll"
              >
                {{ isAllSelected ? 'Batal Semua' : 'Pilih Semua' }}
              </button>
            </div>
          </div>

          <!-- Action Buttons (Favorit, Unduh, Pindah, Hapus) -->
          <div class="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <!-- Favorite Button -->
            <button
              type="button"
              class="h-10 px-2.5 sm:px-3 rounded-2xl bg-surface-tint hover:bg-[#C93D68]/10 text-app flex items-center gap-1.5 text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              :disabled="selectedIds.size === 0 || isBatchFavoriting"
              @click="handleBatchToggleFavorite"
              :title="isAllBatchFavorited ? 'Hapus dari Favorit' : 'Simpan ke Favorit'"
            >
              <Heart
                class="w-4 h-4 text-[#C93D68] dark:text-[#FF8FAE] shrink-0 transition-transform"
                :class="{ 'fill-current scale-110': isAllBatchFavorited }"
              />
              <span class="hidden xs:inline">Favorit</span>
            </button>

            <!-- Download Button -->
            <button
              type="button"
              class="h-10 px-2.5 sm:px-3 rounded-2xl bg-surface-tint hover:bg-[#C93D68]/10 text-app flex items-center gap-1.5 text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              :disabled="selectedIds.size === 0 || isDownloadingBatch"
              @click="handleBatchDownload"
              title="Unduh file terpilih"
            >
              <Download class="w-4 h-4 text-[#C93D68] dark:text-[#FF8FAE] shrink-0" />
              <span class="hidden xs:inline">Unduh</span>
            </button>

            <!-- Move to Folder Button -->
            <button
              type="button"
              class="h-10 px-2.5 sm:px-3 rounded-2xl bg-surface-tint hover:bg-[#C93D68]/10 text-app flex items-center gap-1.5 text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              :disabled="selectedIds.size === 0 || isBatchMoving"
              @click="isBatchMoveOpen = true"
              title="Pindahkan ke folder lain"
            >
              <FolderInput class="w-4 h-4 text-[#C93D68] dark:text-[#FF8FAE] shrink-0" />
              <span class="hidden xs:inline">Pindah</span>
            </button>

            <!-- Delete Button -->
            <button
              type="button"
              class="h-10 px-2.5 sm:px-3 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center gap-1.5 text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              :disabled="selectedIds.size === 0 || isBatchDeleting"
              @click="isBatchDeleteOpen = true"
              title="Hapus file terpilih"
            >
              <Trash2 class="w-4 h-4 shrink-0" />
              <span class="hidden xs:inline">Hapus</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Upload Floating Action Button (Hanya muncul di halaman folder, tersembunyi saat mode seleksi) -->
    <UploadFAB
      ref="fabRef"
      :hide-main-fab="activeTab !== 'folders' || isSelectionMode"
      @create-folder="handleOpenCreateFolder"
    />
    <UploadQueuePanel />

    <!-- Lightbox / Fullscreen Viewer -->
    <MediaLightbox />

    <!-- Modals -->
    <CreateFolderModal
      :is-open="isCreateFolderOpen"
      :initial-name="targetFolder?.name || ''"
      :initial-event-date="targetFolder?.eventDate || createFolderInitialDate"
      :is-renaming="isRenamingFolder"
      @save="handleSaveFolder"
      @close="isCreateFolderOpen = false"
    />

    <FolderInfoModal
      :is-open="isFolderInfoOpen"
      :folder="infoTargetFolder"
      @cover-changed="handleCoverChanged"
      @date-changed="handleEventDateChanged"
      @close="isFolderInfoOpen = false"
    />

    <ConfirmDialog
      :is-open="isDeleteConfirmOpen"
      :title="`Hapus Folder &quot;${folderToDelete?.name}&quot;?`"
      message="Semua foto dan video di dalam folder ini juga akan dihapus secara permanen dari penyimpanan kita."
      confirm-text="Ya, Hapus Folder"
      cancel-text="Batal"
      variant="danger"
      :is-loading="isDeletingFolder"
      @confirm="confirmDeleteFolder"
      @cancel="isDeleteConfirmOpen = false"
    />

    <!-- Batch Move to Folder Modal -->
    <MoveToFolderModal
      :is-open="isBatchMoveOpen"
      :current-folder-id="folderStore.currentFolder?.id || null"
      :is-loading="isBatchMoving"
      :title="`Pindahkan ${selectedIds.size} Kenangan`"
      description="Pilih folder tujuan untuk semua file yang dipilih"
      @move="handleConfirmBatchMove"
      @close="isBatchMoveOpen = false"
    />

    <!-- Batch Delete Confirm Dialog -->
    <ConfirmDialog
      :is-open="isBatchDeleteOpen"
      :title="`Hapus ${selectedIds.size} Kenangan Terpilih?`"
      message="Foto atau video yang dihapus tidak dapat dipulihkan kembali dari penyimpanan cloud."
      confirm-text="Ya, Hapus Semua"
      cancel-text="Batal"
      variant="danger"
      :is-loading="isBatchDeleting"
      @confirm="handleConfirmBatchDelete"
      @cancel="isBatchDeleteOpen = false"
    />
  </div>
</template>
