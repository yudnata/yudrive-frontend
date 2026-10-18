import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { User, StorageUsage, CloudflareUsage } from '@/types';
import { apiFetch, ApiError } from '@/services/api';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('auth_token'));
  const user = ref<User | null>(null);
  const usage = ref<StorageUsage | null>(null);
  const r2Usage = ref<CloudflareUsage | null>(null);
  const isLoading = ref(false);
  const isColdStarting = ref(false);

  const isAuthenticated = computed(() => !!token.value);

  async function login(email: string, password: string): Promise<void> {
    isLoading.value = true;
    isColdStarting.value = false;

    // Detect if Azure server is in cold start (>2.5s)
    const coldStartTimer = setTimeout(() => {
      if (isLoading.value) {
        isColdStarting.value = true;
      }
    }, 2500);

    try {
      const data = await apiFetch<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      token.value = data.token;
      user.value = data.user;
      localStorage.setItem('auth_token', data.token);

      await fetchMe();
    } finally {
      clearTimeout(coldStartTimer);
      isLoading.value = false;
      isColdStarting.value = false;
    }
  }

  async function fetchMe(): Promise<void> {
    if (!token.value) return;

    isLoading.value = true;
    isColdStarting.value = false;

    // Detect if server is in Azure cold start (request takes > 2.5s)
    const coldStartTimer = setTimeout(() => {
      if (isLoading.value) {
        isColdStarting.value = true;
      }
    }, 2500);

    try {
      const data = await apiFetch<{ user: User; usage: StorageUsage; r2Usage?: CloudflareUsage }>('/me');
      user.value = data.user;
      usage.value = data.usage;
      if (data.r2Usage) {
        r2Usage.value = data.r2Usage;
      }
    } catch (err: any) {
      if (err instanceof ApiError && err.statusCode === 401) {
        logout();
      }
      throw err;
    } finally {
      clearTimeout(coldStartTimer);
      isLoading.value = false;
      isColdStarting.value = false;
    }
  }

  async function fetchR2Usage(): Promise<CloudflareUsage | null> {
    if (!token.value) return null;
    try {
      const data = await apiFetch<CloudflareUsage>('/me/r2-usage');
      r2Usage.value = data;
      return data;
    } catch (err) {
      console.error('Failed to fetch Cloudflare R2 usage:', err);
      return null;
    }
  }

  function logout(): void {
    token.value = null;
    user.value = null;
    usage.value = null;
    r2Usage.value = null;
    localStorage.removeItem('auth_token');
  }

  return {
    token,
    user,
    usage,
    r2Usage,
    isLoading,
    isColdStarting,
    isAuthenticated,
    login,
    fetchMe,
    fetchR2Usage,
    logout,
  };
});
