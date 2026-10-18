<script setup lang="ts">
import { ref } from 'vue';
import { Folder as FolderType } from '@/types';
import {
  Folder as FolderIcon,
  Info,
  Edit2,
  Trash2,
  X,
  CalendarHeart,
  Heart,
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
    class="relative group transition-all duration-300 cursor-pointer flex flex-col select-none"
    :class="[
      isMenuOpen || isPressing
        ? 'scale-[1.04] z-20'
        : 'hover:scale-[1.02]'
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
    <!-- AUTHENTIC FOLDER CARD DESIGN -->
    <div
      class="relative w-full flex flex-col transition-all duration-300"
      :class="isMenuOpen || isPressing ? 'drop-shadow-xl' : 'drop-shadow-sm group-hover:drop-shadow-md'"
    >
      <!-- 1. FOLDER TAB (Top-left tab shaped like a real physical file folder) -->
      <div class="flex items-end pl-2 -mb-px relative z-10">
        <!-- Tab Base with Index Number -->
        <div
          class="h-6 sm:h-7 px-3.5 rounded-t-xl bg-[#FFD6E3] dark:bg-[#3D202F] flex items-center gap-1 text-[11px] font-bold text-[#C93D68] dark:text-[#FF8FAE] border-t border-l border-[#FFCCD9] dark:border-white/10 shadow-xs"
        >
          <span class="text-[9px] opacity-75">#</span>
          <span>{{ indexNumber !== undefined ? indexNumber : '1' }}</span>
        </div>

        <!-- Smooth Tab Shoulder Curve connecting Tab to Folder Body -->
        <svg class="h-4 w-4 text-[#FFD6E3] dark:text-[#3D202F] -ml-px fill-current shrink-0" viewBox="0 0 16 16">
          <path d="M0,0 Q6,0 10,8 Q13,16 16,16 L0,16 Z" />
        </svg>
      </div>

      <!-- 2. FOLDER BODY (Tabbed silhouette with cover photo or cute folder pocket interior) -->
      <div
        class="relative w-full aspect-16/10 rounded-2xl rounded-tl-none overflow-hidden bg-gradient-to-b from-[#FFD6E3] via-[#FFEBF1] to-[#FFE0EA] dark:from-[#3D202F] dark:via-[#2F1724] dark:to-[#25121C] border border-[#FFCCD9]/80 dark:border-white/10 shadow-xs"
      >
        <!-- A. When Folder has Cover Photo -->
        <template v-if="folder.coverUrl">
          <img
            :src="folder.coverUrl"
            :alt="folder.name"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <!-- Soft gradient vignette -->
          <div class="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
        </template>

        <!-- B. When Folder is Empty / No Cover: Cute Skeuomorphic Stationery Folder Interior -->
        <template v-else>
          <!-- Peeking document / photo paper sheet inside the folder -->
          <div class="absolute top-2 inset-x-3.5 h-14 rounded-t-xl bg-white/90 dark:bg-white/10 shadow-xs border border-white/60 dark:border-white/5 flex flex-col justify-center px-3 gap-1.5 transition-transform duration-300 group-hover:-translate-y-1">
            <div class="w-16 h-1.5 rounded-full bg-[#FFCCD9]/70 dark:bg-white/20" />
            <div class="w-10 h-1.5 rounded-full bg-[#FFCCD9]/50 dark:bg-white/10" />
            <Heart class="w-3 h-3 text-[#FF8FAE]/50 fill-current absolute right-3 top-3" />
          </div>

          <!-- Front Pocket Flap (Curved front flap holding the paper) -->
          <div class="absolute bottom-0 inset-x-0 h-14 bg-gradient-to-t from-[#FFC2D3] to-[#FFD6E3] dark:from-[#361A28] dark:to-[#452234] border-t border-white/50 dark:border-white/10 shadow-sm flex items-center justify-center">
            <div class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/30 dark:bg-black/20 backdrop-blur-xs text-[#C93D68] dark:text-[#FF8FAE] shadow-2xs">
              <FolderIcon class="w-4 h-4 fill-current opacity-90" />
              <span class="text-[10px] font-bold tracking-tight">Kenangan</span>
            </div>
          </div>
        </template>
      </div>

      <!-- 3. BOTTOM WHITESPACE SECTION (Clean whitespace area for folder title & metadata) -->
      <div
        class="mt-2 p-3 sm:p-3.5 rounded-2xl bg-surface border border-black/5 dark:border-white/10 shadow-soft-sm transition-colors"
      >
        <h3 class="text-sm font-bold text-app truncate tracking-tight">
          {{ folder.name }}
        </h3>

        <div class="flex items-center gap-1.5 text-[11px] text-muted mt-0.5 truncate">
          <span>{{ folder.itemCount }} item</span>
          <span class="text-muted/40">•</span>
          <span>{{ formatBytes(folder.totalBytes) }}</span>
        </div>

        <!-- Optional Event Date Badge -->
        <div
          v-if="folder.eventDate"
          class="mt-2 pt-2 border-t border-black/5 dark:border-white/10 flex items-center gap-1 text-[10px] font-medium text-[#C93D68] dark:text-[#FF8FAE]"
        >
          <CalendarHeart class="w-3 h-3 shrink-0" />
          <span class="truncate">{{ formatEventDate(folder.eventDate) }}</span>
        </div>
      </div>
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
