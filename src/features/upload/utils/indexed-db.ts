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

let cachedDb: IDBDatabase | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (cachedDb) return Promise.resolve(cachedDb);
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);

  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e) => {
        try {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        } catch {}
      };

      req.onsuccess = () => {
        cachedDb = req.result;
        cachedDb.onclose = () => {
          cachedDb = null;
        };
        resolve(cachedDb);
      };

      req.onerror = () => {
        console.warn('IndexedDB open error:', req.error);
        resolve(null);
      };

      req.onblocked = () => {
        console.warn('IndexedDB blocked');
        resolve(null);
      };

      // Guard against hanging forever
      setTimeout(() => resolve(null), 1500);
    } catch {
      resolve(null);
    }
  });
}

export async function savePersistedUpload(upload: PersistedUpload): Promise<void> {
  try {
    const db = await openDb();
    if (!db) return;
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put({ ...upload, updatedAt: Date.now() });
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
        setTimeout(resolve, 1500);
      } catch {
        resolve();
      }
    });
  } catch (err) {
    console.warn('savePersistedUpload non-fatal error:', err);
  }
}

export async function getPersistedUpload(id: string): Promise<PersistedUpload | null> {
  try {
    const db = await openDb();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
        setTimeout(() => resolve(null), 1500);
      } catch {
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}

export async function getAllPersistedUploads(): Promise<PersistedUpload[]> {
  try {
    const db = await openDb();
    if (!db) return [];
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
        setTimeout(() => resolve([]), 1500);
      } catch {
        resolve([]);
      }
    });
  } catch {
    return [];
  }
}

export async function deletePersistedUpload(id: string): Promise<void> {
  try {
    const db = await openDb();
    if (!db) return;
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
        setTimeout(resolve, 1500);
      } catch {
        resolve();
      }
    });
  } catch (err) {
    console.warn('deletePersistedUpload non-fatal error:', err);
  }
}

export async function clearCompletedPersistedUploads(): Promise<void> {
  try {
    const db = await openDb();
    if (!db) return;
    const all = await getAllPersistedUploads();
    if (!all || all.length === 0) return;

    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        let count = 0;
        for (const item of all) {
          if (item.status === 'completed') {
            store.delete(item.id);
            count++;
          }
        }
        if (count === 0) {
          resolve();
          return;
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
        setTimeout(resolve, 1500);
      } catch {
        resolve();
      }
    });
  } catch (err) {
    console.warn('clearCompletedPersistedUploads non-fatal error:', err);
  }
}
