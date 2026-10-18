import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { processMediaFile, ProcessedMedia } from '../utils/media-processor';
import { directR2Uploader } from '../services/uploader';
import {
  getAllPersistedUploads,
  deletePersistedUpload,
  clearCompletedPersistedUploads,
  savePersistedUpload,
} from '../utils/indexed-db';
import { useGalleryStore } from '@/features/gallery/stores/gallery.store';
import { useFolderStore } from '@/features/folders/stores/folders.store';
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

  // Automatically remove completed task from memory & IndexedDB
  function autoRemoveCompleted(taskId: string, delayMs = 1200) {
    setTimeout(async () => {
      tasks.value = tasks.value.filter((t) => t.id !== taskId);
      await deletePersistedUpload(taskId).catch(() => {});
      if (tasks.value.length === 0) {
        isPanelOpen.value = false;
      }
    }, delayMs);
  }

  // Load any unfinished uploads from IndexedDB on startup & automatically resume
  async function loadPersistedState() {
    try {
      const persisted = await getAllPersistedUploads();
      let hasRecoveredQueued = false;

      for (const item of persisted) {
        if (item.status !== 'completed' && !tasks.value.some((t) => t.id === item.id)) {
          let thumbPreviewUrl = '';
          if (item.file) {
            try {
              thumbPreviewUrl = URL.createObjectURL(item.file);
            } catch {}
          }

          if (item.file) {
            // File is preserved in IndexedDB: automatically resume async upload!
            const fileObj =
              item.file instanceof File
                ? item.file
                : new File([item.file], item.filename, { type: item.mime });

            tasks.value.push({
              id: item.id,
              file: fileObj,
              mediaId: item.mediaId || undefined,
              folderId: item.folderId,
              filename: item.filename,
              sizeBytes: item.fileSize,
              progress: item.progressPercent,
              status: 'queued',
              statusText:
                item.progressPercent > 0
                  ? `Melanjutkan upload (${item.progressPercent}%)...`
                  : 'Menunggu antrean...',
              thumbPreviewUrl,
            });
            hasRecoveredQueued = true;
            isPanelOpen.value = true;
          } else {
            // Task metadata only (e.g. without file pointer)
            tasks.value.push({
              id: item.id,
              mediaId: item.mediaId,
              folderId: item.folderId,
              filename: item.filename,
              sizeBytes: item.fileSize,
              progress: item.progressPercent,
              status: 'failed',
              statusText: 'Upload terputus (silakan pilih file kembali untuk melanjutkan)',
              thumbPreviewUrl: '',
            });
            isPanelOpen.value = true;
          }
        }
      }

      if (hasRecoveredQueued) {
        processQueue();
      }
    } catch (err) {
      console.warn('Failed to load persisted upload state:', err);
    }
  }

  // Add selected files to the queue
  function addFiles(fileList: FileList | File[], folderId?: string | null) {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    console.log('[UploadStore] addFiles dipanggil dengan', files.length, 'file. Folder ID:', folderId);

    // Clear already finished tasks before queuing new ones
    tasks.value = tasks.value.filter((t) => t.status !== 'completed' && t.status !== 'canceled');
    clearCompletedPersistedUploads().catch(() => {});

    isPanelOpen.value = true;

    for (const file of files) {
      const id = Math.random().toString(36).substring(2, 9);
      let thumbPreviewUrl = '';
      try {
        thumbPreviewUrl = URL.createObjectURL(file);
      } catch (e) {
        console.warn('Gagal membuat preview URL:', e);
      }

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

      // Persist File into IndexedDB immediately so page refresh never loses progress!
      savePersistedUpload({
        id,
        mediaId: '',
        filename: file.name,
        fileSize: file.size,
        mime: file.type || 'application/octet-stream',
        mode: 'single',
        thumbUploadUrl: '',
        completedParts: [],
        thumbUploaded: false,
        status: 'queued',
        progressPercent: 0,
        updatedAt: Date.now(),
        file,
        folderId: folderId !== undefined ? folderId : undefined,
      }).catch((err) => {
        console.warn('Gagal menyimpan file ke IndexedDB:', err);
      });
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

    console.log('[UploadStore] Memproses file:', nextTask.filename, 'ID:', nextTask.id);
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
      const uploadResult = await directR2Uploader.upload(
        nextTask.id,
        processed,
        (percent, statusText) => {
          nextTask.progress = percent;
          nextTask.statusText = statusText;
        },
        nextTask.folderId
      );

      nextTask.mediaId = uploadResult.mediaId;
      nextTask.status = 'completed';
      nextTask.statusText = 'Berhasil diunggah!';
      nextTask.progress = 100;

      // Non-intrusive quota update in background
      authStore.fetchMe().catch(() => {});

      // Non-destructive memory update:
      // Prepend newly uploaded media item directly into gallery store.
      // - If user is on 'gallery' tab, it immediately appears in its folder group without wiping any existing images or folders.
      // - If user is inside the uploaded folder (e.g. Folder A), currentFolderItems reactively includes it at the top.
      // - If user is inside a different folder (e.g. Folder B), it is filtered out and Folder B remains 100% untouched.
      if (uploadResult.media) {
        if (!galleryStore.activeFolderFilter || galleryStore.activeFolderFilter === nextTask.folderId) {
          galleryStore.prependItem(uploadResult.media);
        }
      }

      // Update folder metadata (e.g. cover & count) reactively without wiping
      if (nextTask.folderId) {
        const folderStore = useFolderStore();
        const targetFolder = folderStore.folders.find((f) => f.id === nextTask.folderId);
        if (targetFolder) {
          targetFolder.itemCount = (targetFolder.itemCount || 0) + 1;
          if (!targetFolder.coverUrl && uploadResult.media?.thumbUrl) {
            targetFolder.coverUrl = uploadResult.media.thumbUrl;
          }
        }
      }

      // Automatically clean up and remove completed task from queue after brief delay
      autoRemoveCompleted(nextTask.id);
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
