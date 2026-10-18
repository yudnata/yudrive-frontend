import exifr from 'exifr';

export interface ProcessedMedia {
  file: File;
  type: 'photo' | 'video';
  mime: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  takenAt?: string;
  thumbBlob: Blob;
}

const MAX_THUMB_SIZE = 400; // max 400px width/height

// Calculate proportional dimensions capped at MAX_THUMB_SIZE
function calculateDimensions(width: number, height: number): { w: number; h: number } {
  let w = width;
  let h = height;

  if (w > h) {
    if (w > MAX_THUMB_SIZE) {
      h = Math.round((h * MAX_THUMB_SIZE) / w);
      w = MAX_THUMB_SIZE;
    }
  } else {
    if (h > MAX_THUMB_SIZE) {
      w = Math.round((w * MAX_THUMB_SIZE) / h);
      h = MAX_THUMB_SIZE;
    }
  }

  return { w: Math.max(1, w), h: Math.max(1, h) };
}

// Convert canvas to WebP Blob
function canvasToWebpBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Gagal mengonversi canvas ke thumbnail WebP.'));
        }
      },
      'image/webp',
      0.82
    );
  });
}

// Extract EXIF date or fallback to file lastModified
async function extractTakenAt(file: File): Promise<string> {
  try {
    const exif = await exifr.parse(file, ['DateTimeOriginal']);
    if (exif?.DateTimeOriginal instanceof Date && !isNaN(exif.DateTimeOriginal.getTime())) {
      return exif.DateTimeOriginal.toISOString();
    }
  } catch {
    // Ignore exif parse failures
  }

  return new Date(file.lastModified).toISOString();
}

// Process photo: handle HEIC conversion, extract dimensions, produce WebP thumb
async function processPhoto(file: File): Promise<{
  width: number;
  height: number;
  takenAt: string;
  thumbBlob: Blob;
}> {
  const takenAt = await extractTakenAt(file);

  let imageBlob: Blob = file;
  const isHeic =
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    file.name.toLowerCase().endsWith('.heic') ||
    file.name.toLowerCase().endsWith('.heif');

  if (isHeic) {
    try {
      const heic2anyModule = await import('heic2any');
      const heic2any = (heic2anyModule as any).default || heic2anyModule;
      const converted = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.85,
      });
      imageBlob = Array.isArray(converted) ? converted[0] : converted;
    } catch (err) {
      console.warn('heic2any failed to convert, falling back to original blob:', err);
    }
  }

  const url = URL.createObjectURL(imageBlob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });

    const origW = img.naturalWidth || 800;
    const origH = img.naturalHeight || 600;
    const { w, h } = calculateDimensions(origW, origH);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context tidak tersedia.');

    ctx.drawImage(img, 0, 0, w, h);
    const thumbBlob = await canvasToWebpBlob(canvas);

    return {
      width: origW,
      height: origH,
      takenAt,
      thumbBlob,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Process video: seek to second 1, capture frame to canvas, extract duration and size
async function processVideo(file: File): Promise<{
  width: number;
  height: number;
  duration: number;
  takenAt: string;
  thumbBlob: Blob;
}> {
  const takenAt = new Date(file.lastModified).toISOString();
  const url = URL.createObjectURL(file);

  try {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Format video tidak didukung peramban.'));
      video.src = url;
    });

    // Seek to 1 second or halfway if shorter
    const targetTime = Math.min(1.0, video.duration / 2);
    video.currentTime = targetTime;

    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
    });

    const origW = video.videoWidth || 1280;
    const origH = video.videoHeight || 720;
    const { w, h } = calculateDimensions(origW, origH);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context tidak tersedia.');

    ctx.drawImage(video, 0, 0, w, h);
    const thumbBlob = await canvasToWebpBlob(canvas);

    return {
      width: origW,
      height: origH,
      duration: Math.round(video.duration),
      takenAt,
      thumbBlob,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Master media processing function
export async function processMediaFile(file: File): Promise<ProcessedMedia> {
  const isVideo =
    file.type.startsWith('video/') ||
    file.name.toLowerCase().endsWith('.mov') ||
    file.name.toLowerCase().endsWith('.mp4');

  if (isVideo) {
    const res = await processVideo(file);
    return {
      file,
      type: 'video',
      mime: file.type || 'video/mp4',
      size: file.size,
      width: res.width,
      height: res.height,
      duration: res.duration,
      takenAt: res.takenAt,
      thumbBlob: res.thumbBlob,
    };
  } else {
    const res = await processPhoto(file);
    return {
      file,
      type: 'photo',
      mime: file.type || 'image/jpeg',
      size: file.size,
      width: res.width,
      height: res.height,
      takenAt: res.takenAt,
      thumbBlob: res.thumbBlob,
    };
  }
}
