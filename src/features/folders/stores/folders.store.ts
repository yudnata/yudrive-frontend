import { defineStore } from 'pinia';
import { ref } from 'vue';
import { Folder } from '@/types';
import { apiFetch } from '@/services/api';

export const useFolderStore = defineStore('folders', () => {
  const folders = ref<Folder[]>([]);
  const currentFolder = ref<Folder | null>(null);
  const breadcrumbs = ref<Folder[]>([]);
  const isLoading = ref(false);

  async function fetchFolders(parentId?: string | null): Promise<void> {
    isLoading.value = true;
    try {
      const query = parentId ? `?parentId=${parentId}` : '';
      const data = await apiFetch<{ folders: Folder[] }>(`/folders${query}`);
      folders.value = data.folders || [];
    } catch (err) {
      console.error('Failed to fetch folders:', err);
      folders.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  async function createFolder(name: string, parentId?: string | null): Promise<Folder> {
    const newFolder = await apiFetch<Folder>('/folders', {
      method: 'POST',
      body: JSON.stringify({
        name: name.trim(),
        parentId: parentId || currentFolder.value?.id || null,
      }),
    });
    folders.value.push(newFolder);
    return newFolder;
  }

  async function updateFolder(
    id: string,
    updates: { name?: string; coverMediaId?: string | null }
  ): Promise<Folder> {
    const updated = await apiFetch<Folder>(`/folders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });

    const index = folders.value.findIndex((f) => f.id === id);
    if (index !== -1) {
      folders.value[index] = updated;
    }

    if (currentFolder.value?.id === id) {
      currentFolder.value = updated;
    }

    return updated;
  }

  async function deleteFolder(id: string): Promise<void> {
    await apiFetch(`/folders/${id}`, {
      method: 'DELETE',
    });

    folders.value = folders.value.filter((f) => f.id !== id);

    if (currentFolder.value?.id === id) {
      navigateToRoot();
    }
  }

  function openFolder(folder: Folder): void {
    currentFolder.value = folder;
    breadcrumbs.value.push(folder);
    fetchFolders(folder.id);
  }

  function navigateToBreadcrumb(targetIndex: number): void {
    if (targetIndex < 0 || targetIndex >= breadcrumbs.value.length) {
      navigateToRoot();
      return;
    }

    const target = breadcrumbs.value[targetIndex];
    currentFolder.value = target;
    breadcrumbs.value = breadcrumbs.value.slice(0, targetIndex + 1);
    fetchFolders(target.id);
  }

  function navigateToRoot(): void {
    currentFolder.value = null;
    breadcrumbs.value = [];
    fetchFolders(null);
  }

  async function refreshCurrentFolder(): Promise<void> {
    if (!currentFolder.value) {
      await fetchFolders(null);
      return;
    }

    try {
      const refreshed = await apiFetch<Folder>(`/folders/${currentFolder.value.id}`);
      currentFolder.value = refreshed;
      await fetchFolders(currentFolder.value.id);
    } catch {
      // folder might have been deleted
      navigateToRoot();
    }
  }

  return {
    folders,
    currentFolder,
    breadcrumbs,
    isLoading,
    fetchFolders,
    createFolder,
    updateFolder,
    deleteFolder,
    openFolder,
    navigateToBreadcrumb,
    navigateToRoot,
    refreshCurrentFolder,
  };
});
