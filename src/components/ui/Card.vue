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
      'shadow-soft transition-all',
      tinted ? 'bg-surface-tint' : 'bg-surface',
      rounded === 'sm' ? 'rounded-xl' : rounded === 'md' ? 'rounded-2xl' : 'rounded-3xl',
    ]"
  >
    <slot />
  </div>
</template>
