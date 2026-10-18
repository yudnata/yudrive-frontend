<script setup lang="ts">
import { ref } from 'vue';
import { onClickOutside } from '@vueuse/core';
import { Folder as FolderType } from '@/types';
import { Folder as FolderIcon, MoreVertical, Info, Edit2, Trash2, Image as ImageIcon } from 'lucide-vue-next';

const props = defineProps<{
  folder: FolderType;
}>();

const emit = defineEmits<{
  (e: 'select', folder: FolderType): void;
  (e: 'info', folder: FolderType): void;
  (e: 'rename', folder: FolderType): void;
  (e: 'delete', folder: FolderType): void;
}>();

const isMenuOpen = ref(false);
const menuRef = ref<HTMLElement | null>(null);

onClickOutside(menuRef, () => {
  isMenuOpen.value = false;
});

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(0)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
}

function handleMenuClick(event: Event) {
  event.stopPropagation();
  isMenuOpen.value = !isMenuOpen.value;
}

function onAction(action: 'info' | 'rename' | 'delete', event: Event) {
  event.stopPropagation();
  isMenuOpen.value = false;
  if (action === 'info') emit('info', props.folder);
  else if (action === 'rename') emit('rename', props.folder);
  else if (action === 'delete') emit('delete', props.folder);
}
</script>

<template>
  <div
    class="relative group rounded-2xl bg-surface shadow-soft-sm hover:shadow-soft transition-all duration-200 cursor-pointer flex flex-col"
    :class="isMenuOpen ? 'z-40' : 'z-0'"
    @click="$emit('select', folder)"
  >
    <!-- Cover Photo / Thumbnail Preview Container (no overflow-hidden to allow dropdown to overlay freely) -->
    <div class="relative w-full aspect-16/10 bg-surface-tint rounded-t-2xl flex items-center justify-center">
      <!-- Clipped Image Wrapper for smooth hover scale -->
      <div class="absolute inset-0 rounded-t-2xl overflow-hidden pointer-events-none">
        <img
          v-if="folder.coverUrl"
          :src="folder.coverUrl"
          :alt="folder.name"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <!-- Bare Folder Icon placeholder (No background container) -->
        <div
          v-else
          class="w-full h-full flex flex-col items-center justify-center gap-1.5 text-muted group-hover:text-app transition-colors"
        >
          <FolderIcon class="w-10 h-10 text-[#C93D68]/60 dark:text-[#FF8FAE]/60 fill-current" />
        </div>
      </div>

      <!-- Quick Item Count Badge -->
      <div class="absolute bottom-2 left-2 z-10 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-white text-[10px] font-medium flex items-center gap-1 pointer-events-none">
        <ImageIcon class="w-3 h-3 text-[#FF8FAE]" />
        <span>{{ folder.itemCount }} item</span>
      </div>

      <!-- 3-Dots Action Menu Button & Popover (outside overflow-hidden) -->
      <div ref="menuRef" class="absolute top-2 right-2 z-30">
        <button
          type="button"
          class="w-8 h-8 sm:w-7 sm:h-7 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white flex items-center justify-center transition-colors focus:outline-none cursor-pointer"
          aria-label="Menu opsi folder"
          @click="handleMenuClick"
        >
          <MoreVertical class="w-3.5 h-3.5" />
        </button>

        <!-- Dropdown Menu (Shadow-based, elevated z-index, never clipped) -->
        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="opacity-0 scale-95 -translate-y-1"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 -translate-y-1"
        >
          <div
            v-if="isMenuOpen"
            class="absolute right-0 mt-1.5 w-40 sm:w-44 py-1.5 rounded-2xl bg-surface shadow-2xl z-50 text-left text-xs ring-1 ring-black/5 dark:ring-white/10"
            @click.stop
          >
            <button
              type="button"
              class="w-full px-3 py-2 flex items-center gap-2 text-app hover:bg-surface-tint transition-colors cursor-pointer"
              @click="onAction('info', $event)"
            >
              <Info class="w-3.5 h-3.5 text-muted" />
              <span>Informasi & Cover</span>
            </button>
            <button
              type="button"
              class="w-full px-3 py-2 flex items-center gap-2 text-app hover:bg-surface-tint transition-colors cursor-pointer"
              @click="onAction('rename', $event)"
            >
              <Edit2 class="w-3.5 h-3.5 text-muted" />
              <span>Ubah Nama</span>
            </button>
            <div class="my-1 border-t border-border/40" />
            <button
              type="button"
              class="w-full px-3 py-2 flex items-center gap-2 text-[#D64545] hover:bg-surface-tint transition-colors cursor-pointer"
              @click="onAction('delete', $event)"
            >
              <Trash2 class="w-3.5 h-3.5" />
              <span>Hapus Folder</span>
            </button>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Folder Info Footer: Bare Icon -->
    <div class="p-3 flex items-center justify-between gap-2">
      <div class="overflow-hidden">
        <h3 class="text-sm font-semibold text-app truncate tracking-tight">
          {{ folder.name }}
        </h3>
        <p class="text-[11px] text-muted truncate mt-0.5">
          {{ formatBytes(folder.totalBytes) }}
        </p>
      </div>

      <FolderIcon class="w-4 h-4 text-[#C93D68] dark:text-[#FF8FAE] shrink-0 fill-current" />
    </div>
  </div>
</template>
