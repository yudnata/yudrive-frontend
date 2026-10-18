<script setup lang="ts">
import { ref } from 'vue';
import { useUploadStore, UploadTask } from '../stores/upload.store';
import {
  RotateCw,
  Trash2,
  CheckCircle2,
  FileQuestion,
  ChevronDown,
} from 'lucide-vue-next';

const uploadStore = useUploadStore();
const reselectInputRef = ref<HTMLInputElement | null>(null);
const currentRetryTaskId = ref<string | null>(null);

function formatBytes(bytes?: number): string {
  if (!bytes) return '0 B';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1000) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(1)} MB`;
}

function handleReselectFile(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0 && currentRetryTaskId.value) {
    uploadStore.retryTask(currentRetryTaskId.value, target.files[0]);
    currentRetryTaskId.value = null;
    target.value = '';
  }
}

function promptRetry(task: UploadTask) {
  if (task.file) {
    uploadStore.retryTask(task.id);
  } else {
    // If browser was reloaded, prompt user to re-select this specific file
    currentRetryTaskId.value = task.id;
    reselectInputRef.value?.click();
  }
}
</script>

<template>
  <div>
    <!-- Hidden input for re-selecting file if browser was closed -->
    <input
      ref="reselectInputRef"
      type="file"
      accept="image/*,video/*,.heic,.heif,.mov,.mp4"
      class="hidden"
      @change="handleReselectFile"
    />

    <!-- Queue Drawer / Card -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="transform translate-y-8 opacity-0"
      enter-to-class="transform translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="transform translate-y-0 opacity-100"
      leave-to-class="transform translate-y-8 opacity-0"
    >
      <div
        v-if="uploadStore.isPanelOpen && uploadStore.hasTasks"
        class="fixed bottom-24 right-4 left-4 sm:left-auto sm:w-[420px] max-h-[75vh] flex flex-col z-40 bg-surface border border-app rounded-[24px] shadow-soft overflow-hidden"
      >
        <!-- Panel Header -->
        <div class="px-5 py-4 border-b border-app flex items-center justify-between bg-surface-tint">
          <div>
            <h3 class="text-sm font-semibold font-serif text-app">
              Antrean Upload
            </h3>
            <p class="text-xs text-muted">
              {{ uploadStore.activeCount > 0 ? `${uploadStore.activeCount} sedang diproses` : 'Semua selesai' }}
            </p>
          </div>

          <div class="flex items-center gap-1">
            <button
              v-if="uploadStore.tasks.some((t) => t.status === 'completed')"
              type="button"
              class="text-[11px] font-medium text-muted hover:text-app px-2 py-1 rounded-md transition-colors"
              @click="uploadStore.clearFinished"
            >
              Bersihkan selesai
            </button>

            <button
              type="button"
              class="text-muted hover:text-app p-1.5 rounded-full hover:bg-surface transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
              aria-label="Tutup panel antrean"
              @click="uploadStore.isPanelOpen = false"
            >
              <ChevronDown class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Task List -->
        <div class="flex-1 overflow-y-auto p-4 space-y-3.5 divide-y divide-app/40">
          <div
            v-for="task in uploadStore.tasks"
            :key="task.id"
            class="pt-3.5 first:pt-0"
          >
            <div class="flex items-start gap-3">
              <!-- Thumbnail Preview -->
              <div class="w-12 h-12 rounded-[10px] overflow-hidden bg-surface-tint shrink-0 border border-app flex items-center justify-center">
                <img
                  v-if="task.thumbPreviewUrl"
                  :src="task.thumbPreviewUrl"
                  alt="Thumbnail"
                  class="w-full h-full object-cover"
                />
                <FileQuestion v-else class="w-5 h-5 text-muted" />
              </div>

              <!-- Info & Progress -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2 mb-1">
                  <p class="text-xs font-semibold text-app truncate">
                    {{ task.filename }}
                  </p>
                  <span class="text-[10px] text-muted shrink-0">
                    {{ formatBytes(task.sizeBytes) }}
                  </span>
                </div>

                <!-- Progress Bar -->
                <div class="w-full h-1.5 rounded-full bg-surface-tint overflow-hidden mb-1.5">
                  <div
                    class="h-full rounded-full transition-all duration-200"
                    :class="[
                      task.status === 'failed'
                        ? 'bg-[#D64545]'
                        : task.status === 'completed'
                        ? 'bg-[#3F9D7A]'
                        : 'bg-[#C93D68] dark:bg-[#FF8FAE]'
                    ]"
                    :style="{ width: `${task.progress}%` }"
                  />
                </div>

                <!-- Status Text -->
                <div class="flex items-center justify-between text-[11px]">
                  <span
                    :class="[
                      task.status === 'failed'
                        ? 'text-[#D64545]'
                        : task.status === 'completed'
                        ? 'text-[#3F9D7A]'
                        : 'text-muted'
                    ]"
                    class="truncate mr-2"
                  >
                    {{ task.statusText }}
                  </span>

                  <!-- Status Icon & Actions -->
                  <div class="flex items-center gap-1.5 shrink-0">
                    <CheckCircle2
                      v-if="task.status === 'completed'"
                      class="w-4 h-4 text-[#3F9D7A]"
                    />

                    <button
                      v-if="task.status === 'failed'"
                      type="button"
                      class="text-xs font-semibold text-[#C93D68] dark:text-[#FF8FAE] hover:underline flex items-center gap-1 p-1"
                      title="Coba lagi"
                      @click="promptRetry(task)"
                    >
                      <RotateCw class="w-3.5 h-3.5" />
                      Coba lagi
                    </button>

                    <button
                      type="button"
                      class="text-muted hover:text-[#D64545] p-1 rounded transition-colors"
                      title="Batalkan / Hapus"
                      @click="uploadStore.cancelTask(task.id)"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
