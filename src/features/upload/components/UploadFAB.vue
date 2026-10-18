<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useUploadStore } from '../stores/upload.store';
import { Plus, UploadCloud } from 'lucide-vue-next';

const uploadStore = useUploadStore();
const fileInputRef = ref<HTMLInputElement | null>(null);
const isDraggingOverWindow = ref(false);

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
    uploadStore.addFiles(e.dataTransfer.files);
  }
}

function triggerFileInput() {
  fileInputRef.value?.click();
}

function handleFileSelection(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    uploadStore.addFiles(target.files);
    target.value = ''; // Reset input so same file can be selected again
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
    <!-- Hidden File Input -->
    <input
      ref="fileInputRef"
      type="file"
      multiple
      accept="image/*,video/*,.heic,.heif,.mov,.mp4"
      class="hidden"
      @change="handleFileSelection"
    />

    <!-- Drag & Drop Screen Overlay -->
    <div
      v-if="isDraggingOverWindow"
      class="fixed inset-0 z-50 bg-[#C93D68]/15 dark:bg-[#FF8FAE]/15 backdrop-blur-sm border-4 border-dashed border-[#C93D68] dark:border-[#FF8FAE] flex flex-col items-center justify-center p-6 text-center pointer-events-none select-none transition-all"
    >
      <div class="w-20 h-20 rounded-full bg-surface shadow-soft flex items-center justify-center text-[#C93D68] dark:text-[#FF8FAE] mb-4 scale-110 transition-transform">
        <UploadCloud class="w-10 h-10" />
      </div>
      <h3 class="text-xl sm:text-2xl font-serif font-semibold text-app mb-2">
        Lepaskan foto atau video di sini
      </h3>
      <p class="text-sm text-muted">
        File akan otomatis masuk ke antrean upload privat kita
      </p>
    </div>

    <!-- Floating Action Button (FAB) -->
    <div class="fixed bottom-6 right-6 z-40 flex items-center gap-3">
      <!-- Upload Queue Toggle Pill (if tasks exist) -->
      <button
        v-if="uploadStore.hasTasks"
        type="button"
        class="glass-nav bg-surface/90 text-app px-4 py-2 rounded-full border border-app shadow-soft text-xs font-semibold flex items-center gap-2 hover:bg-surface-tint min-h-11 transition-all"
        @click="uploadStore.isPanelOpen = !uploadStore.isPanelOpen"
      >
        <span
          v-if="uploadStore.activeCount > 0"
          class="w-2 h-2 rounded-full bg-[#C93D68] dark:bg-[#FF8FAE] animate-ping"
        />
        <span v-else class="w-2 h-2 rounded-full bg-[#3F9D7A]" />
        <span>{{ uploadStore.activeCount > 0 ? `${uploadStore.activeCount} Mengunggah` : 'Antrean Upload' }}</span>
      </button>

      <!-- Main FAB Button -->
      <button
        type="button"
        class="relative w-14 h-14 rounded-full bg-linear-to-tr from-[#FF9BB5] to-[#E0527A] text-white shadow-soft flex items-center justify-center hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#FFD9E3] transition-all"
        aria-label="Upload foto atau video baru"
        @click="triggerFileInput"
      >
        <Plus class="w-7 h-7 stroke-[2.5]" />

        <!-- Notification badge if uploading -->
        <span
          v-if="uploadStore.activeCount > 0"
          class="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#C93D68] text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-[#1E1419]"
        >
          {{ uploadStore.activeCount }}
        </span>
      </button>
    </div>
  </div>
</template>
