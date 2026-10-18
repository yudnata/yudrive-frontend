import { apiFetch } from '@/services/api';
import { MediaItem } from '@/types';
import {
  savePersistedUpload,
  deletePersistedUpload,
  PersistedUpload,
} from '../utils/indexed-db';
import { ProcessedMedia } from '../utils/media-processor';

export interface UploadProgressCallback {
  (progressPercent: number, statusText: string): void;
}

// Upload single part with up to 3 retries and exponential backoff
async function uploadPartWithRetry(
  url: string,
  chunk: Blob,
  maxRetries = 3
): Promise<string> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const res = await fetch(url, {
        method: 'PUT',
        body: chunk,
      });

      if (!res.ok) {
        throw new Error(`Upload part gagal dengan HTTP status ${res.status}`);
      }

      // ETag is exposed by Cloudflare R2 CORS config
      const rawEtag = res.headers.get('ETag') || res.headers.get('etag');
      if (!rawEtag) {
        throw new Error('ETag tidak ditemukan di header response R2. Pastikan CORS R2 expose ETag.');
      }

      return rawEtag.replace(/^"|"$/g, '');
    } catch (err) {
      attempt++;
      if (attempt >= maxRetries) throw err;
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt - 1) * 1000;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('Upload part gagal setelah 3 kali percobaan.');
}

// Upload single file directly via XHR to monitor fine-grained progress
function uploadSingleFileViaXhr(
  url: string,
  file: File,
  contentType: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    xhr.setRequestHeader('Content-Type', contentType);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload gagal dengan HTTP status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Koneksi terputus saat mengunggah file.'));
    xhr.onabort = () => reject(new Error('Upload dibatalkan.'));

    xhr.send(file);
  });
}

// Upload thumbnail directly to R2 (non-blocking, server will generate if client fails)
async function uploadThumbnail(thumbUrl: string, thumbBlob: Blob): Promise<void> {
  try {
    const res = await fetch(thumbUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/webp' },
      body: thumbBlob,
    });

    if (!res.ok) {
      console.warn('Gagal mengunggah thumbnail ke storage (non-fatal), status:', res.status);
    }
  } catch (err) {
    console.warn('Thumbnail upload non-fatal error:', err);
  }
}

export class DirectR2Uploader {
  private activeUploads = new Map<string, AbortController>();

  // Main entrypoint: upload a processed media item directly to R2
  async upload(
    taskId: string,
    media: ProcessedMedia,
    onProgress: UploadProgressCallback,
    folderId?: string | null
  ): Promise<{ mediaId: string; media?: MediaItem }> {
    const abortCtrl = new AbortController();
    this.activeUploads.set(taskId, abortCtrl);

    onProgress(5, 'Menginisialisasi upload di server...');

    // 1. Call POST /uploads/init
    const initRes = await apiFetch<{
      mediaId: string;
      mode: 'single' | 'multipart';
      objectKey: string;
      thumbKey: string;
      uploadUrl?: string;
      thumbUploadUrl: string;
      uploadId?: string;
      partSize?: number;
      parts?: Array<{ partNumber: number; uploadUrl: string }>;
    }>('/uploads/init', {
      method: 'POST',
      body: JSON.stringify({
        filename: media.file.name,
        mime: media.mime,
        size: media.size,
        width: media.width,
        height: media.height,
        duration: media.duration,
        takenAt: media.takenAt,
        folderId: folderId || undefined,
      }),
    });

    const persisted: PersistedUpload = {
      id: taskId,
      mediaId: initRes.mediaId,
      filename: media.file.name,
      fileSize: media.size,
      mime: media.mime,
      mode: initRes.mode,
      uploadUrl: initRes.uploadUrl,
      thumbUploadUrl: initRes.thumbUploadUrl,
      uploadId: initRes.uploadId,
      partSize: initRes.partSize,
      parts: initRes.parts,
      completedParts: [],
      thumbUploaded: false,
      status: 'uploading',
      progressPercent: 10,
      updatedAt: Date.now(),
    };

    await savePersistedUpload(persisted);

    try {
      // 2. Upload thumbnail in parallel with file
      const thumbPromise = uploadThumbnail(initRes.thumbUploadUrl, media.thumbBlob).then(
        async () => {
          persisted.thumbUploaded = true;
          await savePersistedUpload(persisted);
        }
      );

      // 3. Upload media body
      if (initRes.mode === 'single' && initRes.uploadUrl) {
        onProgress(15, 'Mengunggah file ke Cloudflare R2...');

        await uploadSingleFileViaXhr(
          initRes.uploadUrl,
          media.file,
          media.mime,
          (pct) => {
            const mapped = Math.round(15 + pct * 0.75); // 15% -> 90%
            onProgress(mapped, `Mengunggah (${pct}%)...`);
          }
        );
      } else if (initRes.mode === 'multipart' && initRes.parts && initRes.partSize) {
        onProgress(15, 'Mengunggah file besar multipart (3 koneksi simultan)...');

        const parts = initRes.parts;
        const partSize = initRes.partSize;
        const totalParts = parts.length;
        const completedParts = persisted.completedParts;

        // 3 parallel workers pool
        const concurrency = 3;
        let nextIndex = 0;

        const runWorker = async () => {
          while (nextIndex < totalParts) {
            if (abortCtrl.signal.aborted) throw new Error('Upload dibatalkan.');

            const index = nextIndex++;
            const partInfo = parts[index];

            // Skip if already completed (e.g. on resume)
            if (completedParts.some((cp) => cp.partNumber === partInfo.partNumber)) {
              continue;
            }

            const startByte = (partInfo.partNumber - 1) * partSize;
            const endByte = Math.min(media.file.size, startByte + partSize);
            const chunk = media.file.slice(startByte, endByte);

            const etag = await uploadPartWithRetry(partInfo.uploadUrl, chunk);

            completedParts.push({ partNumber: partInfo.partNumber, etag });
            const progress = Math.round(15 + (completedParts.length / totalParts) * 75);
            persisted.progressPercent = progress;
            await savePersistedUpload(persisted);

            onProgress(
              progress,
              `Mengunggah part ${completedParts.length} dari ${totalParts} (${progress}%)...`
            );
          }
        };

        const workers = Array.from({ length: concurrency }, () => runWorker());
        await Promise.all(workers);
      }

      await thumbPromise;

      // 4. Call POST /uploads/complete
      onProgress(95, 'Memverifikasi file di server...');
      const completeRes = await apiFetch<{
        success: boolean;
        mediaId: string;
        status: string;
        media?: MediaItem;
      }>('/uploads/complete', {
        method: 'POST',
        body: JSON.stringify({
          mediaId: initRes.mediaId,
          parts: initRes.mode === 'multipart' ? persisted.completedParts : undefined,
        }),
      });

      persisted.status = 'completed';
      persisted.progressPercent = 100;
      await savePersistedUpload(persisted);

      onProgress(100, 'Selesai!');
      return {
        mediaId: initRes.mediaId,
        media: completeRes.media,
      };
    } catch (err: any) {
      persisted.status = 'failed';
      await savePersistedUpload(persisted);
      throw err;
    } finally {
      this.activeUploads.delete(taskId);
    }
  }

  // Cancel in-flight upload and notify backend
  async abort(taskId: string, mediaId?: string): Promise<void> {
    const ctrl = this.activeUploads.get(taskId);
    if (ctrl) {
      ctrl.abort();
      this.activeUploads.delete(taskId);
    }

    if (mediaId) {
      await apiFetch('/uploads/abort', {
        method: 'POST',
        body: JSON.stringify({ mediaId }),
      }).catch(() => {});
    }

    await deletePersistedUpload(taskId).catch(() => {});
  }
}

export const directR2Uploader = new DirectR2Uploader();
