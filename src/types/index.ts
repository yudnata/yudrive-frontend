export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface StorageUsage {
  usedBytes: number;
  quotaBytes: number;
  percentage: number;
}

export interface MediaItem {
  id: string;
  ownerId: string;
  folderId?: string;
  type: 'photo' | 'video';
  mime: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  durationSec?: number;
  takenAt?: string;
  thumbUrl?: string;
  createdAt: string;
}

export interface Folder {
  id: string;
  ownerId: string;
  name: string;
  parentId?: string | null;
  coverMediaId?: string | null;
  coverUrl?: string | null;
  eventDate?: string | null;
  itemCount: number;
  totalBytes: number;
  createdAt: string;
  updatedAt: string;
}
