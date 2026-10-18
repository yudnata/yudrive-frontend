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
