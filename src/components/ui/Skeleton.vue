<script setup lang="ts">
interface Props {
  width?: string;
  height?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
  aspect?: 'square' | 'video' | 'auto';
}

withDefaults(defineProps<Props>(), {
  width: '100%',
  height: 'auto',
  rounded: 'md',
  aspect: 'auto',
});
</script>

<template>
  <div
    :class="[
      'skeleton-shimmer',
      aspect === 'square' ? 'aspect-square' : aspect === 'video' ? 'aspect-video' : '',
      rounded === 'sm'
        ? 'rounded-[10px]'
        : rounded === 'md'
        ? 'rounded-[14px]'
        : rounded === 'lg'
        ? 'rounded-[20px]'
        : 'rounded-full',
    ]"
    :style="{ width, height: aspect !== 'auto' ? undefined : height }"
  />
</template>
