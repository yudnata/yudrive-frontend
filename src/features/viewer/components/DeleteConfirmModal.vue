<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import Button from '@/components/ui/Button.vue';
import { Trash2 } from 'lucide-vue-next';

interface Props {
  isOpen: boolean;
  isDeleting?: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.isOpen && !props.isDeleting) {
    emit('cancel');
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-black/60 backdrop-blur-sm overscroll-contain"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        @click="$emit('cancel')"
      >
        <div
          class="w-full max-w-sm my-auto p-5 sm:p-8 rounded-3xl bg-surface shadow-2xl text-center transform transition-all ring-1 ring-black/5 dark:ring-white/10 max-h-[calc(100dvh-1.5rem)] overflow-y-auto"
          @click.stop
        >
          <!-- Bare Trash Icon (No background container) -->
          <Trash2 class="w-10 h-10 mx-auto mb-3 text-[#D64545] stroke-[1.75]" />

          <h3 id="delete-modal-title" class="text-lg font-serif font-semibold text-app mb-2">
            Hapus Kenangan Ini?
          </h3>

          <p class="text-xs sm:text-sm text-muted mb-6 leading-relaxed">
            Foto atau video ini akan dihapus secara permanen dari penyimpanan kita berdua dan tidak dapat dikembalikan.
          </p>

          <div class="flex items-center gap-3 justify-center">
            <Button
              variant="secondary"
              size="md"
              :disabled="isDeleting"
              class="flex-1"
              @click="$emit('cancel')"
            >
              Batal
            </Button>

            <Button
              variant="danger"
              size="md"
              :loading="isDeleting"
              class="flex-1"
              @click="$emit('confirm')"
            >
              Ya, Hapus
            </Button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
