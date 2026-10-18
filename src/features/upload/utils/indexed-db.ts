export interface PersistedUpload {
  id: string;
  mediaId: string;
  filename: string;
  fileSize: number;
  mime: string;
  mode: 'single' | 'multipart';
  uploadUrl?: string;
  thumbUploadUrl: string;
  uploadId?: string;
  partSize?: number;
  parts?: Array<{ partNumber: number; uploadUrl: string }>;
  completedParts: Array<{ partNumber: number; etag: string }>;
  thumbUploaded: boolean;
  status: 'queued' | 'uploading' | 'completed' | 'failed' | 'paused';
  progressPercent: number;
  updatedAt: number;
}

const DB_NAME = 'our_memories_storage';
const DB_VERSION = 1;
const STORE_NAME = 'active_uploads';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function savePersistedUpload(upload: PersistedUpload): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put({ ...upload, updatedAt: Date.now() });

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getPersistedUpload(id: string): Promise<PersistedUpload | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);

    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllPersistedUploads(): Promise<PersistedUpload[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function deletePersistedUpload(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clearCompletedPersistedUploads(): Promise<void> {
  const db = await openDb();
  const all = await getAllPersistedUploads();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    for (const item of all) {
      if (item.status === 'completed') {
        store.delete(item.id);
      }
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
