<script setup lang="ts">
import { ref } from 'vue';
import { Folder as FolderType } from '@/types';
import {
  Folder as FolderIcon,
  Info,
  Edit2,
  Trash2,
  X,
} from 'lucide-vue-next';
import { formatEventDate } from '@/utils/date';

const props = defineProps<{
  folder: FolderType;
  indexNumber?: number;
}>();

const emit = defineEmits<{
  (e: 'select', folder: FolderType): void;
  (e: 'info', folder: FolderType): void;
  (e: 'rename', folder: FolderType): void;
  (e: 'delete', folder: FolderType): void;
}>();

const isMenuOpen = ref(false);
const isPressing = ref(false);
let pressTimer: ReturnType<typeof setTimeout> | null = null;
let isLongPressTriggered = false;

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(0)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
}

function startPress() {
  isLongPressTriggered = false;
  isPressing.value = true;
  pressTimer = setTimeout(() => {
    isLongPressTriggered = true;
    isPressing.value = false;
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
    } catch {
      // Haptics fallback
    }
    isMenuOpen.value = true;
  }, 500);
}

function cancelPress() {
  isPressing.value = false;
  if (pressTimer) {
    clearTimeout(pressTimer);
    pressTimer = null;
  }
}

function handleClick() {
  if (isLongPressTriggered) {
    isLongPressTriggered = false;
    return;
  }
  emit('select', props.folder);
}

function closeMenu() {
  isMenuOpen.value = false;
  isPressing.value = false;
  isLongPressTriggered = false;
}

function onAction(action: 'info' | 'rename' | 'delete') {
  closeMenu();
  if (action === 'info') emit('info', props.folder);
  else if (action === 'rename') emit('rename', props.folder);
  else if (action === 'delete') emit('delete', props.folder);
}
</script>

<template>
  <div
    class="relative group rounded-2xl bg-surface shadow-soft-sm transition-all duration-300 cursor-pointer flex flex-col select-none"
    :class="[
      isMenuOpen || isPressing
        ? 'scale-[1.04] ring-2.5 ring-[#C93D68] dark:ring-[#FF8FAE] shadow-xl z-20'
        : 'hover:scale-[1.02] hover:shadow-soft'
    ]"
    @touchstart.passive="startPress"
    @touchend="cancelPress"
    @touchmove="cancelPress"
    @touchcancel="cancelPress"
    @mousedown="startPress"
    @mouseup="cancelPress"
    @mouseleave="cancelPress"
    @contextmenu.prevent
    @click="handleClick"
  >
    <!-- Cover Photo / Thumbnail Preview Container (Clean, no 3-dots, no 0 item badge) -->
    <div class="relative w-full aspect-16/10 bg-surface-tint rounded-t-2xl flex items-center justify-center overflow-hidden">
      <!-- Clipped Image / Placeholder Wrapper -->
      <div class="absolute inset-0 pointer-events-none">
        <img
          v-if="folder.coverUrl"
          :src="folder.coverUrl"
          :alt="folder.name"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <!-- Bare Folder Icon placeholder -->
        <div
          v-else
          class="w-full h-full flex flex-col items-center justify-center gap-1.5 text-muted group-hover:text-app transition-colors"
        >
          <FolderIcon class="w-10 h-10 text-[#C93D68]/60 dark:text-[#FF8FAE]/60 fill-current" />
        </div>
      </div>

      <!-- Sequential Folder Number Badge (#1, #2, #3... always consecutive, no gaps) -->
      <div
        v-if="indexNumber !== undefined"
        class="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-white text-[10px] font-bold tracking-tight flex items-center gap-0.5 pointer-events-none shadow-xs border border-white/10"
      >
        <span class="text-[#FF8FAE] font-normal">#</span>
        <span>{{ indexNumber }}</span>
      </div>
    </div>

    <!-- Folder Info Footer -->
    <div class="p-3 flex items-center justify-between gap-2">
      <div class="overflow-hidden">
        <h3 class="text-sm font-semibold text-app truncate tracking-tight">
          {{ folder.name }}
        </h3>
        <p class="text-[11px] text-muted truncate mt-0.5 flex items-center gap-1.5">
          <span>{{ formatBytes(folder.totalBytes) }}</span>
          <template v-if="folder.eventDate">
            <span class="text-muted/40">•</span>
            <span class="text-[#C93D68] dark:text-[#FF8FAE] font-medium">{{ formatEventDate(folder.eventDate) }}</span>
          </template>
        </p>
      </div>

      <FolderIcon class="w-4 h-4 text-[#C93D68] dark:text-[#FF8FAE] shrink-0 fill-current" />
    </div>

    <!-- Long-Press Action Modal / Sheet -->
    <Teleport to="body">
      <div
        v-if="isMenuOpen"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs select-none"
        role="dialog"
        aria-modal="true"
        @click="closeMenu"
      >
        <div
          class="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-surface p-5 text-left shadow-2xl ring-1 ring-black/5 dark:ring-white/10 transform transition-all"
          @click.stop
        >
          <!-- Header with Folder Name & Sequential Index -->
          <div class="flex items-center justify-between pb-3.5 border-b border-black/5 dark:border-white/10">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-9 h-9 rounded-xl bg-[#C93D68]/10 dark:bg-[#FF8FAE]/10 text-[#C93D68] dark:text-[#FF8FAE] flex items-center justify-center shrink-0">
                <FolderIcon class="w-5 h-5 fill-current" />
              </div>
              <div class="min-w-0">
                <h3 class="text-sm font-bold text-app truncate">
                  {{ indexNumber !== undefined ? `#${indexNumber} ` : '' }}{{ folder.name }}
                </h3>
                <p class="text-[11px] text-muted truncate">
                  {{ folder.itemCount }} item • {{ formatBytes(folder.totalBytes) }}
                </p>
              </div>
            </div>
            <button
              type="button"
              class="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-app hover:bg-surface-tint transition-colors cursor-pointer"
              aria-label="Tutup menu"
              @click="closeMenu"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <!-- Actions List -->
          <div class="py-2.5 space-y-1.5">
            <button
              type="button"
              class="w-full px-3.5 py-3 rounded-2xl flex items-center gap-3 text-app hover:bg-surface-tint transition-all cursor-pointer text-xs font-semibold"
              @click="onAction('info')"
            >
              <div class="w-8 h-8 rounded-xl bg-surface-tint flex items-center justify-center text-muted shrink-0">
                <Info class="w-4 h-4 text-[#C93D68] dark:text-[#FF8FAE]" />
              </div>
              <span>Informasi & Cover</span>
            </button>

            <button
              type="button"
              class="w-full px-3.5 py-3 rounded-2xl flex items-center gap-3 text-app hover:bg-surface-tint transition-all cursor-pointer text-xs font-semibold"
              @click="onAction('rename')"
            >
              <div class="w-8 h-8 rounded-xl bg-surface-tint flex items-center justify-center text-muted shrink-0">
                <Edit2 class="w-4 h-4 text-[#C93D68] dark:text-[#FF8FAE]" />
              </div>
              <span>Ubah Nama</span>
            </button>

            <div class="my-1 border-t border-black/5 dark:border-white/10" />

            <button
              type="button"
              class="w-full px-3.5 py-3 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer text-xs font-semibold"
              @click="onAction('delete')"
            >
              <div class="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                <Trash2 class="w-4 h-4" />
              </div>
              <span>Hapus Folder</span>
            </button>
          </div>

          <!-- Close Button -->
          <button
            type="button"
            class="w-full mt-1 py-2.5 rounded-2xl bg-surface-tint text-muted hover:text-app text-xs font-semibold transition-colors cursor-pointer"
            @click="closeMenu"
          >
            Tutup
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>
