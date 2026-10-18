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

export interface CloudflareUsage {
  period: {
    start: string;
    end: string;
    label: string;
    resetDate?: string;
    daysRemaining?: number;
    resetText?: string;
  };
  storage: {
    usedBytes: number;
    usedFormatted: string;
    quotaBytes: number;
    quotaFormatted: string;
    percentage: number;
    description?: string;
  };
  classA: {
    requests: number;
    formatted: string;
    freeLimit: number;
    freeLimitFormatted: string;
    percentage: number;
    description: string;
    resetsMonthly?: boolean;
  };
  classB: {
    requests: number;
    formatted: string;
    freeLimit: number;
    freeLimitFormatted: string;
    percentage: number;
    description: string;
    resetsMonthly?: boolean;
  };
  egress: {
    freeLimitFormatted: string;
    status: string;
  };
  cost: {
    estimatedTotal: string;
    statusText: string;
  };
  lastSyncedAt: string;
}

export interface MediaItem {
  id: string;
  ownerId: string;
  ownerName?: string;
  ownerEmail?: string;
  folderId?: string;
  folderName?: string;
  folderEventDate?: string;
  filename?: string;
  type: 'photo' | 'video';
  mime: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  durationSec?: number;
  takenAt?: string;
  thumbUrl?: string;
  isFavorite?: boolean;
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
