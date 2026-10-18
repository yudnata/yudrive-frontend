<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useUploadStore } from '@/features/upload/stores/upload.store';
import Toast from '@/components/ui/Toast.vue';

const uploadStore = useUploadStore();

function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (uploadStore.activeCount > 0) {
    e.preventDefault();
    e.returnValue = '';
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload);
});

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
});
</script>

<template>
  <router-view />
  <Toast />
</template>
