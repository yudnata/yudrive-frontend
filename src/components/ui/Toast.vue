<script setup lang="ts">
import { useToast } from '@/composables/useToast';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-vue-next';

const { toasts, remove } = useToast();
</script>

<template>
  <div
    class="fixed bottom-6 right-4 left-4 sm:left-auto sm:w-96 z-50 flex flex-col gap-2.5 pointer-events-none"
  >
    <TransitionGroup
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="transform translate-y-4 opacity-0"
      enter-to-class="transform translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="transform translate-y-0 opacity-100"
      leave-to-class="transform translate-y-2 opacity-0"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="[
          'pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-soft border text-sm',
          toast.type === 'success'
            ? 'bg-surface text-app border-[#3F9D7A]/30'
            : toast.type === 'error'
            ? 'bg-surface text-app border-[#D64545]/30'
            : 'bg-surface text-app border-app',
        ]"
        :role="toast.type === 'error' ? 'alert' : 'status'"
      >
        <div class="mt-0.5 shrink-0">
          <CheckCircle2
            v-if="toast.type === 'success'"
            class="w-4 h-4 text-[#3F9D7A]"
          />
          <AlertCircle
            v-else-if="toast.type === 'error'"
            class="w-4 h-4 text-[#D64545]"
          />
          <Info
            v-else
            class="w-4 h-4 text-[#C93D68] dark:text-[#FF8FAE]"
          />
        </div>

        <p class="flex-1 text-xs leading-relaxed font-medium">
          {{ toast.message }}
        </p>

        <button
          type="button"
          class="shrink-0 text-muted hover:text-app p-1 rounded-md transition-colors min-h-8 min-w-8 flex items-center justify-center -mr-1 -mt-1"
          aria-label="Tutup pemberitahuan"
          @click="remove(toast.id)"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
