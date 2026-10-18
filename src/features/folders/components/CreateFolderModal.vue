<script setup lang="ts">
import { ref, watch } from 'vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import { FolderPlus, X } from 'lucide-vue-next';

const props = defineProps<{
  isOpen: boolean;
  initialName?: string;
  initialEventDate?: string | null;
  isRenaming?: boolean;
}>();

const emit = defineEmits<{
  (e: 'save', name: string, eventDate: string | null): void;
  (e: 'close'): void;
}>();

const folderName = ref('');
const eventDate = ref('');
const error = ref('');
const isSubmitting = ref(false);

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      folderName.value = props.initialName || '';
      eventDate.value = props.initialEventDate || '';
      error.value = '';
      isSubmitting.value = false;
    }
  }
);

function handleSubmit() {
  const trimmed = folderName.value.trim();
  if (!trimmed) {
    error.value = 'Silakan masukkan nama folder.';
    return;
  }
  emit('save', trimmed, eventDate.value || null);
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div
        class="w-full max-w-sm rounded-3xl bg-surface shadow-2xl p-6 sm:p-7 text-left transform transition-all ring-1 ring-black/5 dark:ring-white/10"
        @click.stop
      >
        <div class="flex items-center justify-between mb-5">
          <div class="flex items-center gap-2.5">
            <FolderPlus class="w-6 h-6 text-[#C93D68] dark:text-[#FF8FAE] shrink-0" />
            <h2 class="text-base font-serif font-semibold text-app tracking-tight">
              {{ isRenaming ? 'Ubah Nama Folder' : 'Buat Folder Baru' }}
            </h2>
          </div>
          <button
            type="button"
            class="p-1 rounded-full text-muted hover:text-app transition-colors focus:outline-none min-h-8 min-w-8 flex items-center justify-center cursor-pointer"
            aria-label="Tutup"
            @click="$emit('close')"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <Input
            id="folder-name-input"
            v-model="folderName"
            label="Nama Folder"
            placeholder="misal: Liburan Bali 2026"
            required
            :error="error"
            autofocus
          />

          <div class="flex items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              @click="$emit('close')"
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              :loading="isSubmitting"
            >
              {{ isRenaming ? 'Simpan' : 'Buat Folder' }}
            </Button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
