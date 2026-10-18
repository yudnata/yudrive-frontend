import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { processMediaFile, ProcessedMedia } from '../utils/media-processor';
import { directR2Uploader } from '../services/uploader';
import {
  getAllPersistedUploads,
  deletePersistedUpload,
  clearCompletedPersistedUploads,
} from '../utils/indexed-db';
import { useGalleryStore } from '@/features/gallery/stores/gallery.store';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { useToast } from '@/composables/useToast';

export interface UploadTask {
  id: string;
  file?: File;
  mediaId?: string;
  folderId?: string | null;
  thumbPreviewUrl: string;
  filename: string;
  sizeBytes: number;
  progress: number;
  statusText: string;
  status: 'queued' | 'processing' | 'uploading' | 'completed' | 'failed' | 'canceled';
  error?: string;
}

export const useUploadStore = defineStore('upload', () => {
  const tasks = ref<UploadTask[]>([]);
  const isPanelOpen = ref(false);

  const activeCount = computed(
    () => tasks.value.filter((t) => t.status === 'uploading' || t.status === 'processing').length
  );
  const queuedCount = computed(
    () => tasks.value.filter((t) => t.status === 'queued').length
  );
  const hasTasks = computed(() => tasks.value.length > 0);

  // Load any unfinished uploads from IndexedDB on startup
  async function loadPersistedState() {
    try {
      const persisted = await getAllPersistedUploads();
      for (const item of persisted) {
        if (item.status !== 'completed' && !tasks.value.some((t) => t.id === item.id)) {
          tasks.value.push({
            id: item.id,
            mediaId: item.mediaId,
            filename: item.filename,
            sizeBytes: item.fileSize,
            progress: item.progressPercent,
            status: 'failed',
            statusText: 'Upload terputus (silakan pilih file kembali untuk melanjutkan)',
            thumbPreviewUrl: '',
          });
        }
      }
    } catch (err) {
      console.warn('Failed to load persisted upload state:', err);
    }
  }

  // Add selected files to the queue
  async function addFiles(fileList: FileList | File[], folderId?: string | null) {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    isPanelOpen.value = true;

    for (const file of files) {
      const id = Math.random().toString(36).substring(2, 9);
      const thumbPreviewUrl = URL.createObjectURL(file);

      const task: UploadTask = {
        id,
        file,
        folderId: folderId !== undefined ? folderId : undefined,
        filename: file.name,
        sizeBytes: file.size,
        thumbPreviewUrl,
        progress: 0,
        statusText: 'Menunggu antrean...',
        status: 'queued',
      };

      tasks.value.unshift(task);
    }

    processQueue();
  }

  // Queue runner
  async function processQueue() {
    // Process at most 2 files at a time to keep client smooth
    const maxConcurrent = 2;
    const currentActive = tasks.value.filter(
      (t) => t.status === 'processing' || t.status === 'uploading'
    ).length;

    if (currentActive >= maxConcurrent) return;

    const nextTask = tasks.value.find((t) => t.status === 'queued');
    if (!nextTask || !nextTask.file) return;

    nextTask.status = 'processing';
    nextTask.statusText = 'Mempersiapkan metadata & thumbnail...';

    const galleryStore = useGalleryStore();
    const authStore = useAuthStore();
    const toast = useToast();

    try {
      // 1. Process media in browser
      const processed: ProcessedMedia = await processMediaFile(nextTask.file);

      // Update thumbnail preview in UI to processed WebP thumb
      try {
        nextTask.thumbPreviewUrl = URL.createObjectURL(processed.thumbBlob);
      } catch {
        // Keep existing preview
      }

      // 2. Direct upload to R2
      nextTask.status = 'uploading';
      const mediaId = await directR2Uploader.upload(
        nextTask.id,
        processed,
        (percent, statusText) => {
          nextTask.progress = percent;
          nextTask.statusText = statusText;
        },
        nextTask.folderId
      );

      nextTask.mediaId = mediaId;
      nextTask.status = 'completed';
      nextTask.statusText = 'Berhasil diunggah!';
      nextTask.progress = 100;

      // Refresh gallery and storage quota
      galleryStore.fetchMedia(true, nextTask.folderId).catch(() => {});
      authStore.fetchMe().catch(() => {});
    } catch (err: any) {
      console.error('Upload failed for task', nextTask.id, err);
      nextTask.status = 'failed';
      const errorMsg =
        err?.message ||
        (typeof err === 'string' ? err : null) ||
        err?.response?.data?.error?.message ||
        'Gagal memproses atau mengunggah file.';
      nextTask.error = errorMsg;
      nextTask.statusText = errorMsg;
      toast.error(`Gagal mengunggah ${nextTask.filename}: ${errorMsg}`);
    } finally {
      processQueue();
    }
  }

  // Retry a failed upload
  async function retryTask(taskId: string, newFile?: File) {
    const task = tasks.value.find((t) => t.id === taskId);
    if (!task) return;

    if (newFile) {
      task.file = newFile;
      task.filename = newFile.name;
      task.sizeBytes = newFile.size;
    }

    if (!task.file) {
      const toast = useToast();
      toast.info('Silakan pilih kembali file untuk melanjutkan upload.');
      return;
    }

    task.status = 'queued';
    task.error = undefined;
    task.statusText = 'Menunggu antrean...';
    processQueue();
  }

  // Cancel an active or queued upload
  async function cancelTask(taskId: string) {
    const task = tasks.value.find((t) => t.id === taskId);
    if (!task) return;

    await directR2Uploader.abort(taskId, task.mediaId);
    task.status = 'canceled';
    tasks.value = tasks.value.filter((t) => t.id !== taskId);
    await deletePersistedUpload(taskId).catch(() => {});
  }

  // Clear completed uploads from queue and IndexedDB
  async function clearFinished() {
    tasks.value = tasks.value.filter((t) => t.status !== 'completed' && t.status !== 'canceled');
    await clearCompletedPersistedUploads().catch(() => {});
  }

  return {
    tasks,
    isPanelOpen,
    activeCount,
    queuedCount,
    hasTasks,
    loadPersistedState,
    addFiles,
    retryTask,
    cancelTask,
    clearFinished,
  };
});
