import { ref } from 'vue';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

const toasts = ref<ToastItem[]>([]);

export function useToast() {
  function add(type: 'success' | 'error' | 'info', message: string, duration = 4000) {
    const id = Math.random().toString(36).substring(2, 9);
    const item: ToastItem = { id, type, message };
    toasts.value.push(item);

    setTimeout(() => {
      remove(id);
    }, duration);
  }

  function remove(id: string) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  return {
    toasts,
    success: (msg: string) => add('success', msg),
    error: (msg: string) => add('error', msg, 5000),
    info: (msg: string) => add('info', msg),
    remove,
  };
}
