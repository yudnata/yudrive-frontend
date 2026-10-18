<script setup lang="ts">
interface Props {
  modelValue: string | number;
  id?: string;
  label?: string;
  type?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  autocomplete?: string;
}

withDefaults(defineProps<Props>(), {
  type: 'text',
  placeholder: '',
  disabled: false,
  required: false,
});

defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();
</script>

<template>
  <div class="w-full">
    <label
      v-if="label"
      :for="id"
      class="block text-xs font-semibold uppercase tracking-wider text-muted mb-2 select-none"
    >
      {{ label }}
    </label>

    <div class="relative">
      <div
        v-if="$slots.leading"
        class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted"
      >
        <slot name="leading" />
      </div>

      <input
        :id="id"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :autocomplete="autocomplete"
        :class="[
          'w-full py-3 rounded-xl bg-surface text-sm text-app transition-all shadow-sm',
          'focus:outline-none focus:ring-2 focus:ring-[#C93D68]/40 dark:focus:ring-[#FF8FAE]/40',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          $slots.leading ? 'pl-10' : 'pl-4',
          $slots.trailing ? 'pr-10' : 'pr-4',
          error ? 'ring-2 ring-[#D64545]' : '',
        ]"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />

      <div
        v-if="$slots.trailing"
        class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted"
      >
        <slot name="trailing" />
      </div>
    </div>

    <p
      v-if="error"
      class="mt-1.5 text-xs text-[#D64545] dark:text-[#FF8FAE]"
      role="alert"
    >
      {{ error }}
    </p>
  </div>
</template>
