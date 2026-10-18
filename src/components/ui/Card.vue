<script setup lang="ts">
interface Props {
  rounded?: 'sm' | 'md' | 'lg';
  tinted?: boolean;
}

withDefaults(defineProps<Props>(), {
  rounded: 'lg',
  tinted: false,
});
</script>

<template>
  <div
    :class="[
      'border border-app shadow-soft transition-all',
      tinted ? 'bg-surface-tint' : 'bg-surface',
      rounded === 'sm' ? 'rounded-[12px]' : rounded === 'md' ? 'rounded-[16px]' : 'rounded-[24px]',
    ]"
  >
    <slot />
  </div>
</template>
