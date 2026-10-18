<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { onClickOutside } from '@vueuse/core';
import { useUploadStore } from '../stores/upload.store';
import { useFolderStore } from '@/features/folders/stores/folders.store';
import { useToast } from '@/composables/useToast';
import { Plus, UploadCloud, FileUp, FolderPlus } from 'lucide-vue-next';

withDefaults(
  defineProps<{
    hideMainFab?: boolean;
  }>(),
  {
    hideMainFab: false,
  }
);

const emit = defineEmits<{
  (e: 'createFolder'): void;
}>();

const uploadStore = useUploadStore();
const folderStore = useFolderStore();
const toast = useToast();

const fileInputRef = ref<HTMLInputElement | null>(null);
const folderInputRef = ref<HTMLInputElement | null>(null);
const fabContainerRef = ref<HTMLElement | null>(null);
const isDraggingOverWindow = ref(false);
const isMenuOpen = ref(false);

onClickOutside(fabContainerRef, () => {
  isMenuOpen.value = false;
});

let dragCounter = 0;

function handleDragEnter(e: DragEvent) {
  e.preventDefault();
  dragCounter++;
  if (e.dataTransfer?.types?.includes('Files')) {
    isDraggingOverWindow.value = true;
  }
}

function handleDragLeave(e: DragEvent) {
  e.preventDefault();
  dragCounter--;
  if (dragCounter <= 0) {
    dragCounter = 0;
    isDraggingOverWindow.value = false;
  }
}

function handleDragOver(e: DragEvent) {
  e.preventDefault();
}

function handleDrop(e: DragEvent) {
  e.preventDefault();
  dragCounter = 0;
  isDraggingOverWindow.value = false;

  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    uploadStore.addFiles(e.dataTransfer.files, folderStore.currentFolder?.id);
  }
}

function triggerFileInput() {
  isMenuOpen.value = false;
  fileInputRef.value?.click();
}

function triggerFolderInput() {
  isMenuOpen.value = false;
  folderInputRef.value?.click();
}

function handleCreateFolderClick() {
  isMenuOpen.value = false;
  emit('createFolder');
}

function handleFileSelection(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    uploadStore.addFiles(target.files, folderStore.currentFolder?.id);
    target.value = '';
  }
}

async function handleFolderSelection(e: Event) {
  const target = e.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;

  const files = Array.from(target.files);
  target.value = '';

  // Extract folder name from first file's webkitRelativePath
  const firstPath = files[0].webkitRelativePath || '';
  const folderName = firstPath.includes('/') ? firstPath.split('/')[0] : 'Folder Baru';

  try {
    const newFolder = await folderStore.createFolder(folderName, folderStore.currentFolder?.id);
    uploadStore.addFiles(files, newFolder.id);
    folderStore.openFolder(newFolder);
    toast.success(`Folder "${folderName}" dibuat, mengunggah ${files.length} file...`);
  } catch (err: any) {
    toast.error(`Gagal membuat folder: ${err.message}`);
  }
}

onMounted(() => {
  window.addEventListener('dragenter', handleDragEnter);
  window.addEventListener('dragleave', handleDragLeave);
  window.addEventListener('dragover', handleDragOver);
  window.addEventListener('drop', handleDrop);
  uploadStore.loadPersistedState();
});

defineExpose({
  triggerFileInput,
  triggerFolderInput,
});

onUnmounted(() => {
  window.removeEventListener('dragenter', handleDragEnter);
  window.removeEventListener('dragleave', handleDragLeave);
  window.removeEventListener('dragover', handleDragOver);
  window.removeEventListener('drop', handleDrop);
});
</script>

<template>
  <div>
    <!-- Hidden File Input (Single / Multi Files) -->
    <input
      ref="fileInputRef"
      type="file"
      multiple
      accept="image/*,video/*,.heic,.heif,.mov,.mp4"
      class="hidden"
      @change="handleFileSelection"
    />

    <!-- Hidden Folder Input (Directory Upload) -->
    <input
      ref="folderInputRef"
      type="file"
      webkitdirectory
      directory
      multiple
      class="hidden"
      @change="handleFolderSelection"
    />

    <!-- Drag & Drop Screen Overlay -->
    <div
      v-if="isDraggingOverWindow"
      class="fixed inset-0 z-50 bg-[#C93D68]/15 dark:bg-[#FF8FAE]/15 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center pointer-events-none select-none transition-all"
    >
      <UploadCloud class="w-16 h-16 text-[#C93D68] dark:text-[#FF8FAE] mb-3 stroke-[1.5]" />
      <h3 class="text-xl sm:text-2xl font-serif font-semibold text-app mb-2">
        Lepaskan foto atau video di sini
      </h3>
      <p class="text-sm text-muted">
        File akan otomatis diunggah ke {{ folderStore.currentFolder ? `folder "${folderStore.currentFolder.name}"` : 'galeri utama kita' }}
      </p>
    </div>

    <!-- Compact Upload Queue Toggle Pill (when hideMainFab is true) -->
    <div
      v-if="hideMainFab && uploadStore.hasTasks"
      class="fixed bottom-20 sm:bottom-24 right-4 sm:right-6 z-30"
    >
      <button
        type="button"
        class="glass-nav bg-surface/95 text-app px-4 py-2 rounded-full shadow-lg text-xs font-semibold flex items-center gap-2 hover:bg-surface-tint min-h-11 transition-all cursor-pointer ring-1 ring-black/5 dark:ring-white/10"
        @click="uploadStore.isPanelOpen = !uploadStore.isPanelOpen"
      >
        <span
          v-if="uploadStore.activeCount > 0"
          class="w-2 h-2 rounded-full bg-[#C93D68] dark:bg-[#FF8FAE] animate-ping"
        />
        <span v-else class="w-2 h-2 rounded-full bg-[#3F9D7A]" />
        <span>{{ uploadStore.activeCount > 0 ? `${uploadStore.activeCount} Mengunggah` : 'Antrean Upload' }}</span>
      </button>
    </div>

    <!-- Floating Action Speed Dial (when hideMainFab is false) -->
    <div
      v-else-if="!hideMainFab"
      ref="fabContainerRef"
      class="fixed bottom-24 sm:bottom-28 right-4 sm:right-6 z-35 flex flex-col items-end gap-3"
    >
      <!-- Speed Dial Menu (Expanded Options) -->
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 translate-y-2 scale-95"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 translate-y-2 scale-95"
      >
        <div
          v-if="isMenuOpen"
          class="flex flex-col items-end gap-2.5 mb-1"
        >
          <!-- Option: Buat Folder Baru -->
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 rounded-lg bg-surface/95 shadow-md text-xs font-semibold text-app select-none">
              Buat Folder Baru
            </span>
            <button
              type="button"
              class="w-11 h-11 rounded-full bg-surface shadow-md text-[#C93D68] dark:text-[#FF8FAE] hover:bg-surface-tint flex items-center justify-center transition-all cursor-pointer"
              aria-label="Buat folder baru"
              @click="handleCreateFolderClick"
            >
              <FolderPlus class="w-5 h-5" />
            </button>
          </div>

          <!-- Option: Upload File -->
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 rounded-lg bg-surface/95 shadow-md text-xs font-semibold text-app select-none">
              Upload Foto / Video
            </span>
            <button
              type="button"
              class="w-11 h-11 rounded-full bg-surface shadow-md text-[#C93D68] dark:text-[#FF8FAE] hover:bg-surface-tint flex items-center justify-center transition-all cursor-pointer"
              aria-label="Upload foto atau video"
              @click="triggerFileInput"
            >
              <FileUp class="w-5 h-5" />
            </button>
          </div>
        </div>
      </Transition>

      <div class="flex items-center gap-3">
        <!-- Upload Queue Toggle Pill (if tasks exist) -->
        <button
          v-if="uploadStore.hasTasks"
          type="button"
          class="glass-nav bg-surface/90 text-app px-4 py-2 rounded-full shadow-md text-xs font-semibold flex items-center gap-2 hover:bg-surface-tint min-h-11 transition-all cursor-pointer"
          @click="uploadStore.isPanelOpen = !uploadStore.isPanelOpen"
        >
          <span
            v-if="uploadStore.activeCount > 0"
            class="w-2 h-2 rounded-full bg-[#C93D68] dark:bg-[#FF8FAE] animate-ping"
          />
          <span v-else class="w-2 h-2 rounded-full bg-[#3F9D7A]" />
          <span>{{ uploadStore.activeCount > 0 ? `${uploadStore.activeCount} Mengunggah` : 'Antrean Upload' }}</span>
        </button>

        <!-- Main Speed-Dial Trigger Button -->
        <button
          type="button"
          class="relative w-14 h-14 rounded-full bg-linear-to-tr from-[#FF9BB5] to-[#E0527A] text-white shadow-soft flex items-center justify-center hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#FFD9E3] transition-all cursor-pointer"
          aria-label="Menu upload dan buat folder"
          @click="isMenuOpen = !isMenuOpen"
        >
          <Plus
            class="w-7 h-7 stroke-[2.5] transition-transform duration-200"
            :class="{ 'rotate-45': isMenuOpen }"
          />

          <!-- Notification badge if uploading -->
          <span
            v-if="uploadStore.activeCount > 0"
            class="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#C93D68] text-white text-[10px] font-bold flex items-center justify-center shadow-xs"
          >
            {{ uploadStore.activeCount }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
