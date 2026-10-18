<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  type: 'button',
  disabled: false,
  loading: false,
});

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'primary':
      return 'btn-primary shadow-soft-sm';
    case 'secondary':
      return 'bg-surface text-app border border-app hover:bg-surface-tint active:bg-surface-tint';
    case 'ghost':
      return 'bg-transparent text-app hover:bg-surface-tint active:bg-surface-tint';
    case 'danger':
      return 'bg-[#D64545] text-white hover:bg-[#B83232] active:bg-[#B83232]';
    default:
      return 'btn-primary';
  }
});

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'px-3 py-1.5 text-xs min-h-[36px] rounded-[10px]';
    case 'lg':
      return 'px-6 py-3.5 text-base min-h-[50px] rounded-[16px]';
    case 'md':
    default:
      return 'px-4 py-2.5 text-sm min-h-[44px] rounded-[12px]';
  }
});
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="[
      'inline-flex items-center justify-center font-medium transition-all select-none',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD9E3] dark:focus-visible:ring-[#4A2635]',
      'disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none',
      variantClasses,
      sizeClasses,
    ]"
  >
    <svg
      v-if="loading"
      class="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      ></circle>
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
    <slot />
  </button>
</template>
