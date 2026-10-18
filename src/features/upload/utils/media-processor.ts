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

// Helper: Decode a Blob into an HTMLImageElement safely
async function decodeImageElementFromBlob(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Peramban tidak dapat mendekode gambar.'));
      el.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Helper: Render an HTMLImageElement to a WebP thumbnail Blob
async function renderImageToWebpThumb(img: HTMLImageElement): Promise<Blob> {
  const origW = img.naturalWidth || 400;
  const origH = img.naturalHeight || 400;
  const { w, h } = calculateDimensions(origW, origH);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context tidak tersedia.');

  ctx.drawImage(img, 0, 0, w, h);
  return await canvasToWebpBlob(canvas);
}

// Helper: Create a graceful fallback WebP thumbnail when image decoding is unsupported in current browser
async function createFallbackThumbnail(filename: string, width = 400, height = 400): Promise<Blob> {
  const { w, h } = calculateDimensions(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#FFF0F4');
    grad.addColorStop(1, '#F7D0DC');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const centerX = w / 2;
    const centerY = h / 2 - 12;
    ctx.beginPath();
    ctx.arc(centerX, centerY, Math.min(w, h) * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(201, 61, 104, 0.12)';
    ctx.fill();

    const ext = filename.split('.').pop()?.toUpperCase() || 'FOTO';
    ctx.fillStyle = '#C93D68';
    ctx.font = `bold ${Math.round(Math.min(w, h) * 0.08)}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ext, centerX, centerY);

    ctx.fillStyle = '#6E4D58';
    ctx.font = `500 ${Math.round(Math.min(w, h) * 0.045)}px system-ui, -apple-system, sans-serif`;
    const cleanName = filename.length > 20 ? filename.slice(0, 17) + '...' : filename;
    ctx.fillText(cleanName, centerX, centerY + Math.min(w, h) * 0.28);
  }

  return await canvasToWebpBlob(canvas);
}

// Extract EXIF date & original dimensions from EXIF/container
async function extractExifMetadata(file: File): Promise<{
  takenAt: string;
  width?: number;
  height?: number;
}> {
  let takenAt = new Date(file.lastModified).toISOString();
  let width: number | undefined;
  let height: number | undefined;

  try {
    const exif = await exifr.parse(file, [
      'DateTimeOriginal',
      'ImageWidth',
      'ImageHeight',
      'ExifImageWidth',
      'ExifImageHeight',
      'Orientation',
    ]);

    if (exif?.DateTimeOriginal instanceof Date && !isNaN(exif.DateTimeOriginal.getTime())) {
      takenAt = exif.DateTimeOriginal.toISOString();
    }

    const rawW = exif?.ExifImageWidth || exif?.ImageWidth;
    const rawH = exif?.ExifImageHeight || exif?.ImageHeight;
    if (rawW && rawH) {
      const orientation = exif?.Orientation || 1;
      if (orientation >= 5 && orientation <= 8) {
        width = rawH;
        height = rawW;
      } else {
        width = rawW;
        height = rawH;
      }
    }
  } catch (err) {
    console.warn('Gagal membaca EXIF dari file:', err);
  }

  return { takenAt, width, height };
}

// Process photo: handle HEIC conversion / embedded thumbnail, extract dimensions, produce WebP thumb
async function processPhoto(file: File): Promise<{
  width: number;
  height: number;
  takenAt: string;
  thumbBlob: Blob;
}> {
  const meta = await extractExifMetadata(file);
  const nameLower = file.name.toLowerCase();
  const isHeic =
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    nameLower.endsWith('.heic') ||
    nameLower.endsWith('.heif');

  let thumbBlob: Blob | null = null;
  let detectedWidth = meta.width;
  let detectedHeight = meta.height;

  if (isHeic) {
    // Strategy 1: Extract embedded JPEG thumbnail using exifr (instant, iOS native JPEG preview)
    try {
      const thumbBuffer = await exifr.thumbnail(file);
      if (thumbBuffer && thumbBuffer.byteLength > 0) {
        const jpegBlob = new Blob([thumbBuffer as unknown as BlobPart], { type: 'image/jpeg' });
        const img = await decodeImageElementFromBlob(jpegBlob);
        thumbBlob = await renderImageToWebpThumb(img);
      }
    } catch (thumbErr) {
      console.warn('Gagal mengekstrak thumbnail tertanam dari HEIC:', thumbErr);
    }

    // Strategy 2: If no embedded thumbnail found, try heic2any
    if (!thumbBlob) {
      try {
        const heic2anyModule = await import('heic2any');
        const heic2any = (heic2anyModule as any).default || heic2anyModule;
        const converted = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.82,
        });
        const jpegBlob = Array.isArray(converted) ? converted[0] : converted;
        const img = await decodeImageElementFromBlob(jpegBlob);
        if (!detectedWidth || !detectedHeight) {
          detectedWidth = img.naturalWidth;
          detectedHeight = img.naturalHeight;
        }
        thumbBlob = await renderImageToWebpThumb(img);
      } catch (hErr) {
        console.warn('heic2any tidak dapat mengonversi file HEIC:', hErr);
      }
    }

    // Strategy 3: Graceful fallback thumbnail if neither succeeded (NEVER block the upload)
    if (!thumbBlob) {
      thumbBlob = await createFallbackThumbnail(file.name, detectedWidth || 400, detectedHeight || 400);
    }

    return {
      width: detectedWidth || 1920,
      height: detectedHeight || 1080,
      takenAt: meta.takenAt,
      thumbBlob,
    };
  }

  // Non-HEIC standard photos (JPEG, PNG, WEBP, GIF, etc.)
  try {
    const img = await decodeImageElementFromBlob(file);
    const origW = img.naturalWidth || 800;
    const origH = img.naturalHeight || 600;
    thumbBlob = await renderImageToWebpThumb(img);

    return {
      width: detectedWidth || origW,
      height: detectedHeight || origH,
      takenAt: meta.takenAt,
      thumbBlob,
    };
  } catch (decodeErr) {
    console.warn('Peramban gagal merender gambar standar, menggunakan thumbnail fallback:', decodeErr);
    const fallbackThumb = await createFallbackThumbnail(file.name, detectedWidth || 400, detectedHeight || 400);
    return {
      width: detectedWidth || 800,
      height: detectedHeight || 600,
      takenAt: meta.takenAt,
      thumbBlob: fallbackThumb,
    };
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
  const nameLower = file.name.toLowerCase();
  const isVideo =
    file.type.startsWith('video/') ||
    nameLower.endsWith('.mov') ||
    nameLower.endsWith('.mp4') ||
    nameLower.endsWith('.webm') ||
    nameLower.endsWith('.m4v');

  const isHeic =
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    nameLower.endsWith('.heic') ||
    nameLower.endsWith('.heif');

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

    let mime = file.type;
    if (!mime || mime === 'application/octet-stream') {
      if (isHeic) {
        mime = 'image/heic';
      } else if (nameLower.endsWith('.png')) {
        mime = 'image/png';
      } else if (nameLower.endsWith('.webp')) {
        mime = 'image/webp';
      } else {
        mime = 'image/jpeg';
      }
    } else if (isHeic && !mime.includes('heic') && !mime.includes('heif')) {
      mime = 'image/heic';
    }

    return {
      file,
      type: 'photo',
      mime,
      size: file.size,
      width: res.width,
      height: res.height,
      takenAt: res.takenAt,
      thumbBlob: res.thumbBlob,
    };
  }
}
