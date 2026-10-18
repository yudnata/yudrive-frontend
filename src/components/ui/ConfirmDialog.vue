<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import Button from './Button.vue';
import { AlertTriangle, Trash2 } from 'lucide-vue-next';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  confirmText: 'Ya, Hapus',
  cancelText: 'Batal',
  variant: 'danger',
  isLoading: false,
});

const emit = defineEmits<{
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.isOpen && !props.isLoading) {
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
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-black/50 backdrop-blur-xs select-none overscroll-contain"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        @click="$emit('cancel')"
      >
        <div
          class="w-full max-w-sm my-auto p-5 sm:p-7 rounded-3xl bg-surface shadow-2xl text-center transform transition-all ring-1 ring-black/5 dark:ring-white/10 max-h-[calc(100dvh-1.5rem)] overflow-y-auto"
          @click.stop
        >
          <!-- Bare Icon -->
          <div class="mb-3.5 flex items-center justify-center">
            <Trash2
              v-if="variant === 'danger'"
              class="w-10 h-10 text-[#D64545] stroke-[1.75]"
            />
            <AlertTriangle
              v-else
              class="w-10 h-10 text-[#C93D68] dark:text-[#FF8FAE] stroke-[1.75]"
            />
          </div>

          <!-- Dialog Title -->
          <h3 id="confirm-dialog-title" class="text-base sm:text-lg font-bold text-app mb-2 leading-snug tracking-tight">
            {{ title }}
          </h3>

          <!-- Dialog Message -->
          <p class="text-xs sm:text-sm text-muted mb-6 leading-relaxed">
            {{ message }}
          </p>

          <!-- Action Buttons -->
          <div class="flex items-center gap-2.5 justify-center">
            <Button
              type="button"
              variant="secondary"
              size="md"
              :disabled="isLoading"
              class="flex-1 cursor-pointer"
              @click="$emit('cancel')"
            >
              {{ cancelText }}
            </Button>

            <Button
              type="button"
              :variant="variant === 'danger' ? 'danger' : 'primary'"
              size="md"
              :loading="isLoading"
              class="flex-1 cursor-pointer"
              @click="$emit('confirm')"
            >
              {{ confirmText }}
            </Button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
