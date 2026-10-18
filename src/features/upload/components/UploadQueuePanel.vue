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

    <!-- Queue Drawer / Card yang ringkas (bg white, text hitam, tidak menutupi galeri) -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="transform translate-y-6 opacity-0 scale-95"
      enter-to-class="transform translate-y-0 opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="transform translate-y-0 opacity-100 scale-100"
      leave-to-class="transform translate-y-6 opacity-0 scale-95"
    >
      <div
        v-if="uploadStore.isPanelOpen && uploadStore.hasTasks"
        class="fixed bottom-24 right-4 left-4 sm:left-auto sm:w-96 max-h-56 sm:max-h-64 flex flex-col z-40 bg-white text-black rounded-2xl shadow-2xl border border-black/10 overflow-hidden"
      >
        <!-- Panel Header ringkas -->
        <div class="px-3.5 py-2.5 border-b border-black/10 flex items-center justify-between bg-gray-50 shrink-0">
          <div class="flex items-center gap-2 min-w-0">
            <h3 class="text-xs font-bold text-black truncate">
              Antrean Upload
            </h3>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-pink-100 text-[#C93D68] font-semibold shrink-0">
              {{ uploadStore.activeCount > 0 ? `${uploadStore.activeCount} diproses` : 'Selesai' }}
            </span>
          </div>

          <div class="flex items-center gap-1 shrink-0">
            <button
              v-if="uploadStore.tasks.some((t) => t.status === 'completed')"
              type="button"
              class="text-[11px] font-bold text-[#3F9D7A] hover:underline px-1.5 py-1 rounded transition-colors cursor-pointer"
              @click="uploadStore.clearFinished"
            >
              Upload Selesai Cantik!
            </button>

            <button
              type="button"
              class="text-gray-500 hover:text-black p-1 rounded-full hover:bg-gray-200 transition-colors flex items-center justify-center cursor-pointer"
              aria-label="Perkecil panel antrean"
              title="Perkecil panel antrean"
              @click="uploadStore.isPanelOpen = false"
            >
              <ChevronDown class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Task List yang ringkas & dapat di-scroll -->
        <TransitionGroup
          name="task-item"
          tag="div"
          class="flex-1 overflow-y-auto overscroll-contain p-2.5 space-y-2 no-scrollbar bg-white"
        >
          <div
            v-for="task in uploadStore.tasks"
            :key="task.id"
            class="p-2 rounded-xl bg-gray-50 border border-black/5 hover:border-black/10 transition-colors"
          >
            <div class="flex items-center gap-2.5">
              <!-- Thumbnail Preview -->
              <div class="w-9 h-9 rounded-lg overflow-hidden bg-gray-200 shrink-0 shadow-xs flex items-center justify-center">
                <img
                  v-if="task.thumbPreviewUrl"
                  :src="task.thumbPreviewUrl"
                  alt="Thumbnail"
                  class="w-full h-full object-cover"
                  @error="task.thumbPreviewUrl = ''"
                />
                <FileQuestion v-else class="w-4 h-4 text-gray-400" />
              </div>

              <!-- Info & Progress -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-1.5 mb-1">
                  <p class="text-xs font-semibold text-black truncate">
                    {{ task.filename }}
                  </p>
                  <span class="text-[10px] text-gray-500 shrink-0 font-medium">
                    {{ formatBytes(task.sizeBytes) }}
                  </span>
                </div>

                <!-- Progress Bar -->
                <div class="w-full h-1 rounded-full bg-gray-200 overflow-hidden mb-1">
                  <div
                    class="h-full rounded-full transition-all duration-200"
                    :class="[
                      task.status === 'failed'
                        ? 'bg-[#D64545]'
                        : task.status === 'completed'
                        ? 'bg-[#3F9D7A]'
                        : 'bg-[#C93D68]'
                    ]"
                    :style="{ width: `${task.progress}%` }"
                  />
                </div>

                <!-- Status Text & Actions -->
                <div class="flex items-center justify-between text-[10px]">
                  <span
                    :class="[
                      task.status === 'failed'
                        ? 'text-[#D64545]'
                        : task.status === 'completed'
                        ? 'text-[#3F9D7A]'
                        : 'text-muted'
                    ]"
                    class="truncate mr-1.5"
                  >
                    {{ task.statusText }}
                  </span>

                  <!-- Status Icon & Actions -->
                  <div class="flex items-center gap-1 shrink-0">
                    <CheckCircle2
                      v-if="task.status === 'completed'"
                      class="w-3.5 h-3.5 text-[#3F9D7A]"
                    />

                    <button
                      v-if="task.status === 'failed'"
                      type="button"
                      class="text-[10px] font-semibold text-[#C93D68] dark:text-[#FF8FAE] hover:underline flex items-center gap-0.5 p-0.5 cursor-pointer"
                      title="Coba lagi"
                      @click="promptRetry(task)"
                    >
                      <RotateCw class="w-3 h-3" />
                      Ulangi
                    </button>

                    <button
                      type="button"
                      class="text-muted hover:text-[#D64545] p-0.5 rounded transition-colors cursor-pointer"
                      title="Batalkan / Hapus"
                      @click="uploadStore.cancelTask(task.id)"
                    >
                      <Trash2 class="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TransitionGroup>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.task-item-leave-active {
  transition: all 0.2s ease-out;
}
.task-item-leave-to {
  opacity: 0;
  transform: translateX(12px);
}
</style>
