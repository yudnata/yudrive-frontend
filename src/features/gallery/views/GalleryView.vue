<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useIntersectionObserver } from '@vueuse/core';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { useGalleryStore } from '../stores/gallery.store';
import { useFolderStore } from '@/features/folders/stores/folders.store';
import { useViewerStore } from '@/features/viewer/stores/viewer.store';
import { useToast } from '@/composables/useToast';
import GalleryHeader from '../components/GalleryHeader.vue';
import GalleryHero from '../components/GalleryHero.vue';
import GalleryDateGroup from '../components/GalleryDateGroup.vue';
import GalleryEmptyState from '../components/GalleryEmptyState.vue';
import FolderCard from '@/features/folders/components/FolderCard.vue';
import CreateFolderModal from '@/features/folders/components/CreateFolderModal.vue';
import FolderInfoModal from '@/features/folders/components/FolderInfoModal.vue';
import UploadFAB from '@/features/upload/components/UploadFAB.vue';
import UploadQueuePanel from '@/features/upload/components/UploadQueuePanel.vue';
import MediaLightbox from '@/features/viewer/components/MediaLightbox.vue';
import FloatingHearts from '@/components/ui/FloatingHearts.vue';
import Button from '@/components/ui/Button.vue';
import { MediaItem, Folder as FolderType } from '@/types';
import { Coffee, Folder as FolderIcon, FolderPlus, ArrowLeft, ChevronRight, Home } from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const galleryStore = useGalleryStore();
const folderStore = useFolderStore();
const viewerStore = useViewerStore();
const toast = useToast();

const sentinelRef = ref<HTMLElement | null>(null);
const fabRef = ref<InstanceType<typeof UploadFAB> | null>(null);

// Modal states
const isCreateFolderOpen = ref(false);
const isRenamingFolder = ref(false);
const targetFolder = ref<FolderType | null>(null);
const isFolderInfoOpen = ref(false);
const infoTargetFolder = ref<FolderType | null>(null);

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
  viewerStore.open(item.id);
}

function handleEmptyUpload() {
  fabRef.value?.triggerFileInput?.();
}

function handleOpenCreateFolder() {
  targetFolder.value = null;
  isRenamingFolder.value = false;
  isCreateFolderOpen.value = true;
}

function handleStartRename(folder: FolderType) {
  targetFolder.value = folder;
  isRenamingFolder.value = true;
  isCreateFolderOpen.value = true;
}

async function handleSaveFolder(name: string) {
  try {
    if (isRenamingFolder.value && targetFolder.value) {
      await folderStore.updateFolder(targetFolder.value.id, { name });
      toast.success('Nama folder berhasil diubah.');
    } else {
      await folderStore.createFolder(name, folderStore.currentFolder?.id);
      toast.success(`Folder "${name}" berhasil dibuat.`);
    }
    isCreateFolderOpen.value = false;
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

async function handleDeleteFolder(folder: FolderType) {
  if (!confirm(`Hapus folder "${folder.name}"? File di dalamnya akan dipindahkan ke galeri utama.`)) {
    return;
  }
  try {
    const isCurrent = folderStore.currentFolder?.id === folder.id;
    await folderStore.deleteFolder(folder.id);
    toast.success('Folder berhasil dihapus.');
    if (isCurrent) {
      handleNavigateRoot();
    } else {
      await galleryStore.fetchMedia(true, folderStore.currentFolder?.id);
    }
  } catch (err: any) {
    toast.error(`Gagal menghapus folder: ${err.message}`);
  }
}

function handleSelectFolder(folder: FolderType) {
  folderStore.openFolder(folder);
  galleryStore.fetchMedia(true, folder.id);
  router.push({
    path: '/',
    query: { ...route.query, folder: folder.id },
  });
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
      query: { ...route.query, folder: target.id },
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

  // Already on this folder
  if (folderStore.currentFolder?.id === folderId) {
    return;
  }

  // Target folder is in breadcrumbs
  const breadcrumbIndex = folderStore.breadcrumbs.findIndex((b) => b.id === folderId);
  if (breadcrumbIndex !== -1) {
    folderStore.navigateToBreadcrumb(breadcrumbIndex);
    await galleryStore.fetchMedia(true, folderId);
    return;
  }

  // Target folder is in current visible folders list
  const existingFolder = folderStore.folders.find((f) => f.id === folderId);
  if (existingFolder) {
    folderStore.openFolder(existingFolder);
    await galleryStore.fetchMedia(true, folderId);
    return;
  }

  // Otherwise, load full hierarchy from API (deep link / browser history jump)
  try {
    await folderStore.loadFolderHierarchy(folderId);
    await galleryStore.fetchMedia(true, folderId);
  } catch (err) {
    console.error('Gagal memuat folder dari route:', err);
    handleNavigateRoot();
  }
}

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

    <!-- Main Explorer / Gallery Container -->
    <main class="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 py-5 sm:py-7 space-y-6 pb-28">
      <!-- HERO SECTION AT TOP -->
      <GalleryHero v-if="!folderStore.currentFolder" />

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

      <!-- FOLDERS SECTION (Placed directly below Hero / Explorer nav) -->
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

      <!-- MEDIA FILES SECTION -->
      <section class="space-y-3">
        <div v-if="folderStore.folders.length > 0 && galleryStore.items.length > 0" class="flex items-center justify-between pt-2">
          <h2 class="text-sm font-semibold uppercase tracking-wider text-muted">
            {{ folderStore.currentFolder ? `File di "${folderStore.currentFolder.name}"` : 'Foto & Video' }}
          </h2>
        </div>

        <!-- Minimal Subtle Loading Indicator (No bulky skeleton) -->
        <div
          v-if="galleryStore.isLoading && galleryStore.items.length === 0"
          class="py-8 flex items-center justify-center gap-2 text-xs text-muted"
        >
          <div class="w-2 h-2 rounded-full bg-[#C93D68] animate-ping" />
          <span>Memuat kenangan...</span>
        </div>

        <!-- Empty State (No media and no folders) -->
        <GalleryEmptyState
          v-else-if="galleryStore.items.length === 0 && folderStore.folders.length === 0"
          @upload="handleEmptyUpload"
        />

        <!-- Empty Folder State (Has no media in current folder) -->
        <div
          v-else-if="galleryStore.items.length === 0 && folderStore.currentFolder"
          class="text-center py-12 px-4 rounded-3xl bg-surface shadow-soft-sm space-y-3"
        >
          <!-- Bare Icon (No background container) -->
          <FolderIcon class="w-12 h-12 mx-auto text-[#C93D68]/80 dark:text-[#FF8FAE]/80 stroke-[1.5]" />
          <h3 class="text-base font-serif font-semibold text-app">
            Folder "{{ folderStore.currentFolder.name }}" masih kosong
          </h3>
          <p class="text-xs text-muted max-w-sm mx-auto">
            Gunakan tombol tambah (+) di pojok kanan bawah untuk mengunggah foto atau video langsung ke folder ini.
          </p>
        </div>

        <!-- Populated Gallery Grouped by Date -->
        <div v-else class="space-y-2">
          <GalleryDateGroup
            v-for="group in galleryStore.groupedByDate"
            :key="group.dateKey"
            :date-label="group.dateLabel"
            :items="group.items"
            @select="handleSelectMedia"
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
    </main>

    <!-- Upload Controls -->
    <UploadFAB
      ref="fabRef"
      @create-folder="handleOpenCreateFolder"
    />
    <UploadQueuePanel />

    <!-- Lightbox / Fullscreen Viewer -->
    <MediaLightbox />

    <!-- Modals -->
    <CreateFolderModal
      :is-open="isCreateFolderOpen"
      :initial-name="targetFolder?.name || ''"
      :is-renaming="isRenamingFolder"
      @save="handleSaveFolder"
      @close="isCreateFolderOpen = false"
    />

    <FolderInfoModal
      :is-open="isFolderInfoOpen"
      :folder="infoTargetFolder"
      @cover-changed="handleCoverChanged"
      @close="isFolderInfoOpen = false"
    />
  </div>
</template>
