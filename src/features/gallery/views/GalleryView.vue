<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useIntersectionObserver } from '@vueuse/core';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { useGalleryStore } from '../stores/gallery.store';
import { useFolderStore } from '@/features/folders/stores/folders.store';
import { useViewerStore } from '@/features/viewer/stores/viewer.store';
import { useFavorites } from '@/features/gallery/composables/useFavorites';
import { useToast } from '@/composables/useToast';
import GalleryHeader from '../components/GalleryHeader.vue';
import GalleryHero from '../components/GalleryHero.vue';
import HomeBento from '../components/HomeBento.vue';
import FloatingBottomNav, { NavTab } from '@/components/navigation/FloatingBottomNav.vue';
import GalleryDateGroup from '../components/GalleryDateGroup.vue';
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
import Button from '@/components/ui/Button.vue';
import { apiFetch } from '@/services/api';
import { MediaItem, Folder as FolderType } from '@/types';
import {
  Coffee,
  Folder as FolderIcon,
  FolderPlus,
  ArrowLeft,
  ChevronRight,
  Home,
  Heart,
  Download,
  Trash2,
  FolderInput,
  X,
} from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const galleryStore = useGalleryStore();
const folderStore = useFolderStore();
const viewerStore = useViewerStore();
const { isFavorite, favoriteIds } = useFavorites();
const toast = useToast();

const sentinelRef = ref<HTMLElement | null>(null);
const fabRef = ref<InstanceType<typeof UploadFAB> | null>(null);

// Navigation Tab state ('home' | 'folders' | 'calendar' | 'gallery' | 'favorites')
const initialTab = (route.query.tab as NavTab) || (route.query.folder ? 'folders' : 'home');
const activeTab = ref<NavTab>(
  ['home', 'folders', 'calendar', 'gallery', 'favorites'].includes(initialTab) ? initialTab : 'home'
);

const favoriteCount = computed(() => favoriteIds.value.size);

const favoriteItems = computed<MediaItem[]>(() => {
  return galleryStore.items.filter((item) => isFavorite(item.id));
});

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

// Multi-select state
const isSelectionMode = ref(false);
const selectedIds = ref<Set<string>>(new Set());
const isDownloadingBatch = ref(false);
const isBatchMoveOpen = ref(false);
const isBatchMoving = ref(false);
const isBatchDeleteOpen = ref(false);
const isBatchDeleting = ref(false);

const currentViewItems = computed<MediaItem[]>(() => {
  if (activeTab.value === 'favorites') {
    return favoriteItems.value;
  }
  return galleryStore.items;
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
      galleryStore.fetchMedia(false, folderStore.currentFolder?.id);
    }
  },
  { rootMargin: '300px' }
);

function handleSelectMedia(item: MediaItem) {
  if (isSelectionMode.value) {
    handleToggleSelectMedia(item);
  } else {
    viewerStore.open(item.id);
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
  try {
    const updated = await folderStore.updateFolder(infoTargetFolder.value.id, { eventDate });
    infoTargetFolder.value = updated;
    toast.success(eventDate ? 'Tanggal kenangan berhasil disimpan.' : 'Tanggal kenangan dihapus.');
  } catch (err: any) {
    toast.error(`Gagal mengubah tanggal: ${err.message}`);
  }
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
    await folderStore.deleteFolder(folder.id);
    toast.success(`Folder "${folder.name}" berhasil dihapus.`);
    isDeleteConfirmOpen.value = false;
    folderToDelete.value = null;
    if (isCurrent) {
      handleNavigateRoot();
    } else {
      await galleryStore.fetchMedia(true, folderStore.currentFolder?.id);
    }
  } catch (err: any) {
    toast.error(`Gagal menghapus folder: ${err.message}`);
  } finally {
    isDeletingFolder.value = false;
  }
}

function handleSelectFolder(folder: FolderType) {
  activeTab.value = 'folders';
  folderStore.openFolder(folder);
  galleryStore.fetchMedia(true, folder.id);
  router.push({
    path: '/',
    query: { ...route.query, tab: 'folders', folder: folder.id },
  });
}

function handleBentoSelectFolder(folder: FolderType) {
  handleSelectFolder(folder);
}

function handleNavigateBreadcrumb(index: number) {
  if (index < 0) {
    handleNavigateRoot();
    return;
  }
  const target = folderStore.breadcrumbs[index];
  if (target) {
    folderStore.navigateToBreadcrumb(index);
    galleryStore.fetchMedia(true, target.id);
    router.push({
      path: '/',
      query: { ...route.query, tab: 'folders', folder: target.id },
    });
  } else {
    handleNavigateRoot();
  }
}

function handleNavigateRoot() {
  folderStore.navigateToRoot();
  galleryStore.fetchMedia(true, null);
  const nextQuery = { ...route.query };
  delete nextQuery.folder;
  router.push({
    path: '/',
    query: nextQuery,
  });
}

async function syncFolderFromRoute(folderId?: string) {
  if (!folderId) {
    if (folderStore.currentFolder !== null) {
      folderStore.navigateToRoot();
      await galleryStore.fetchMedia(true, null);
    }
    return;
  }

  activeTab.value = 'folders';

  if (folderStore.currentFolder?.id === folderId) {
    return;
  }

  const breadcrumbIndex = folderStore.breadcrumbs.findIndex((b) => b.id === folderId);
  if (breadcrumbIndex !== -1) {
    folderStore.navigateToBreadcrumb(breadcrumbIndex);
    await galleryStore.fetchMedia(true, folderId);
    return;
  }

  const existingFolder = folderStore.folders.find((f) => f.id === folderId);
  if (existingFolder) {
    folderStore.openFolder(existingFolder);
    await galleryStore.fetchMedia(true, folderId);
    return;
  }

  try {
    await folderStore.loadFolderHierarchy(folderId);
    await galleryStore.fetchMedia(true, folderId);
  } catch (err) {
    console.error('Gagal memuat folder dari route:', err);
    handleNavigateRoot();
  }
}

watch(activeTab, (newTab) => {
  handleCancelSelection();
  if (route.query.tab !== newTab) {
    router.replace({
      path: '/',
      query: { ...route.query, tab: newTab },
    });
  }
});

watch(
  () => route.query.tab,
  (newTab) => {
    if (newTab && ['home', 'folders', 'calendar', 'gallery', 'favorites'].includes(newTab as string)) {
      activeTab.value = newTab as NavTab;
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
  await Promise.all([
    authStore.fetchMe().catch(() => {}),
  ]);

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
      galleryStore.fetchMedia(true, null).catch(() => {}),
    ]);
  }
});
</script>

<template>
  <div class="relative min-h-screen flex flex-col bg-app text-app pb-safe overflow-x-hidden">
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

          <!-- Create Folder Quick Action -->
          <Button
            type="button"
            variant="secondary"
            size="sm"
            class="shrink-0 text-xs flex items-center justify-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-xl cursor-pointer"
            aria-label="Buat folder baru"
            @click="handleOpenCreateFolder"
          >
            <FolderPlus class="w-4 h-4 text-[#C93D68] dark:text-[#FF8FAE] shrink-0" />
            <span class="hidden sm:inline">Folder Baru</span>
          </Button>
        </nav>

        <!-- FOLDERS GRID SECTION -->
        <section v-if="folderStore.folders.length > 0" class="space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <FolderIcon class="w-4 h-4 text-[#C93D68] dark:text-[#FF8FAE]" />
              <span>{{ folderStore.currentFolder ? 'Sub-Folder' : 'Folder Kenangan' }}</span>
              <span class="text-xs font-normal">({{ folderStore.folders.length }})</span>
            </h2>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            <FolderCard
              v-for="folder in folderStore.folders"
              :key="folder.id"
              :folder="folder"
              @select="handleSelectFolder"
              @info="handleOpenFolderInfo"
              @rename="handleStartRename"
              @delete="handleDeleteFolder"
            />
          </div>
        </section>

        <!-- MEDIA IN CURRENT FOLDER -->
        <section v-if="folderStore.currentFolder" class="space-y-3">
          <div v-if="galleryStore.items.length > 0" class="flex items-center justify-between pt-2">
            <h2 class="text-sm font-semibold uppercase tracking-wider text-muted">
              File di "{{ folderStore.currentFolder.name }}"
            </h2>
          </div>

          <!-- Empty folder state -->
          <div
            v-if="galleryStore.items.length === 0"
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

          <div v-else class="space-y-2">
            <GalleryDateGroup
              v-for="group in galleryStore.groupedByDate"
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
      </section>

      <!-- TAB 3: KALENDER KENANGAN -->
      <section v-else-if="activeTab === 'calendar'" class="space-y-6">
        <MemoryCalendar
          @select-folder="handleSelectFolder"
          @create-folder-for-date="handleCreateFolderForDate"
          @go-to-folders="activeTab = 'folders'"
        />
      </section>

      <!-- TAB 4: GALERI (CHRONOLOGICAL TIMELINE STREAM) -->
      <section v-else-if="activeTab === 'gallery'" class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-base sm:text-lg font-bold text-app flex items-center gap-2 tracking-tight">
              <span>Semua Kenangan Foto & Video</span>
            </h2>
            <p class="text-xs text-muted mt-0.5">
              Urutan linimasa momen berharga dari waktu ke waktu
            </p>
          </div>
        </div>

        <div
          v-if="galleryStore.isLoading && galleryStore.items.length === 0"
          class="py-8 flex items-center justify-center gap-2 text-xs text-muted"
        >
          <div class="w-2 h-2 rounded-full bg-[#C93D68] animate-ping" />
          <span>Memuat kenangan...</span>
        </div>

        <GalleryEmptyState
          v-else-if="galleryStore.items.length === 0"
          @upload="handleEmptyUpload"
        />

        <div v-else class="space-y-2">
          <GalleryDateGroup
            v-for="group in galleryStore.groupedByDate"
            :key="group.dateKey"
            :date-label="group.dateLabel"
            :items="group.items"
            :is-selection-mode="isSelectionMode"
            :selected-ids="selectedIds"
            @select="handleSelectMedia"
            @longpress="handleLongPressMedia"
            @toggle-select="handleToggleSelectMedia"
          />

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
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-base sm:text-lg font-bold text-app flex items-center gap-2 tracking-tight">
              <span>Momen Terfavorit</span>
            </h2>
            <p class="text-xs text-muted mt-0.5">
              Koleksi foto dan video paling berkesan yang kamu simpan
            </p>
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
          <p class="text-xs text-muted max-w-sm mx-auto">
            Buka foto atau video apa pun, lalu ketuk tombol hati (❤️) di pojok atas untuk menyimpannya ke koleksi favorit ini.
          </p>
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
      @upload-files="fabRef?.triggerFileInput()"
      @upload-folder="fabRef?.triggerFolderInput()"
      @create-folder="handleOpenCreateFolder"
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
        class="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom,0.75rem))] sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-[440px] sm:max-w-lg px-3 select-none"
      >
        <div class="p-2 sm:p-2.5 rounded-3xl bg-surface/95 dark:bg-[#20151C]/95 backdrop-blur-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 flex items-center justify-between gap-1 sm:gap-2">
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

          <!-- Action Buttons (Unduh, Pindah, Hapus) -->
          <div class="flex items-center gap-1 sm:gap-1.5 shrink-0">
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

    <!-- Upload Hidden Inputs & Drag Overlay (Main FAB hidden since integrated in bottom dock) -->
    <UploadFAB
      ref="fabRef"
      :hide-main-fab="true"
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
      message="File di dalamnya akan dipindahkan ke galeri utama."
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
