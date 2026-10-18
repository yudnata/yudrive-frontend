<script setup lang="ts">
import { Heart } from 'lucide-vue-next';

defineEmits<{
  (e: 'upload'): void;
}>();
</script>

<template>
  <div class="py-16 sm:py-24 px-4 text-center max-w-sm mx-auto flex flex-col items-center">
    <!-- Bare Heart Icon (No background container) -->
    <Heart class="w-16 h-16 text-[#E0527A] dark:text-[#FF8FAE] mb-4 fill-current drop-shadow-sm" />

    <h3 class="text-xl font-serif font-semibold text-app mb-2">
      Belum Ada Kenangan
    </h3>

    <p class="text-sm text-muted mb-6 leading-relaxed">
      Ruang ini masih kosong. Yuk upload foto atau video pertama kita berdua untuk mulai mengabadikan momen indah.
    </p>

    <slot>
      <button
        type="button"
        class="btn-primary px-5 py-2.5 text-sm font-medium shadow-soft-sm inline-flex items-center gap-2"
        @click="$emit('upload')"
      >
        <Heart class="w-4 h-4 fill-current" />
        Mulai Upload
      </button>
    </slot>
  </div>
</template>
