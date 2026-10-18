<script setup lang="ts">
import { ref } from 'vue';
import { onClickOutside } from '@vueuse/core';
import {
  Sparkles,
  Folder as FolderIcon,
  Plus,
  Images,
  Heart,
  FolderPlus,
  FolderUp,
  FileUp,
} from 'lucide-vue-next';

export type NavTab = 'home' | 'folders' | 'gallery' | 'favorites';

defineProps<{
  modelValue: NavTab;
  favoriteCount?: number;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', tab: NavTab): void;
  (e: 'uploadFiles'): void;
  (e: 'uploadFolder'): void;
  (e: 'createFolder'): void;
}>();

const isMenuOpen = ref(false);
const navRef = ref<HTMLElement | null>(null);

onClickOutside(navRef, () => {
  isMenuOpen.value = false;
});

function handleAction(action: 'uploadFiles' | 'uploadFolder' | 'createFolder') {
  isMenuOpen.value = false;
  if (action === 'uploadFiles') {
    emit('uploadFiles');
  } else if (action === 'uploadFolder') {
    emit('uploadFolder');
  } else if (action === 'createFolder') {
    emit('createFolder');
  }
}
</script>

<template>
  <div
    ref="navRef"
    class="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom,0.75rem))] sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm sm:max-w-md px-3 select-none pointer-events-none"
  >
    <!-- Speed Dial Popup Menu (Directly above the center + button) -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 translate-y-3 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-3 scale-95"
    >
      <div
        v-if="isMenuOpen"
        class="pointer-events-auto mb-3 mx-auto max-w-[260px] p-2 rounded-2xl bg-surface/95 backdrop-blur-xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 flex flex-col gap-1 text-xs"
      >
        <button
          type="button"
          class="w-full px-3 py-2.5 rounded-xl hover:bg-surface-tint flex items-center gap-2.5 text-app transition-colors cursor-pointer text-left font-medium min-h-[44px]"
          @click="handleAction('createFolder')"
        >
          <div class="w-7 h-7 rounded-lg bg-[#C93D68]/10 dark:bg-[#FF8FAE]/10 text-[#C93D68] dark:text-[#FF8FAE] flex items-center justify-center shrink-0">
            <FolderPlus class="w-4 h-4" />
          </div>
          <span>Buat Folder Baru</span>
        </button>

        <button
          type="button"
          class="w-full px-3 py-2.5 rounded-xl hover:bg-surface-tint flex items-center gap-2.5 text-app transition-colors cursor-pointer text-left font-medium min-h-[44px]"
          @click="handleAction('uploadFolder')"
        >
          <div class="w-7 h-7 rounded-lg bg-[#C93D68]/10 dark:bg-[#FF8FAE]/10 text-[#C93D68] dark:text-[#FF8FAE] flex items-center justify-center shrink-0">
            <FolderUp class="w-4 h-4" />
          </div>
          <span>Upload Satu Folder</span>
        </button>

        <button
          type="button"
          class="w-full px-3 py-2.5 rounded-xl hover:bg-surface-tint flex items-center gap-2.5 text-app transition-colors cursor-pointer text-left font-medium min-h-[44px]"
          @click="handleAction('uploadFiles')"
        >
          <div class="w-7 h-7 rounded-lg bg-[#C93D68]/10 dark:bg-[#FF8FAE]/10 text-[#C93D68] dark:text-[#FF8FAE] flex items-center justify-center shrink-0">
            <FileUp class="w-4 h-4" />
          </div>
          <span>Upload Foto / Video</span>
        </button>
      </div>
    </Transition>

    <!-- Main Floating Dock -->
    <nav
      class="pointer-events-auto bg-surface/90 backdrop-blur-xl shadow-2xl rounded-full p-1.5 sm:p-2 flex items-center justify-between ring-1 ring-black/5 dark:ring-white/10"
      aria-label="Navigasi utama"
    >
      <!-- Tab 1: Beranda / Bento Home -->
      <button
        type="button"
        class="flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-full transition-all cursor-pointer relative py-1"
        :class="modelValue === 'home' ? 'text-[#C93D68] dark:text-[#FF8FAE] font-bold' : 'text-muted hover:text-app'"
        aria-label="Beranda kenangan"
        @click="emit('update:modelValue', 'home')"
      >
        <Sparkles class="w-4 h-4 sm:w-5 sm:h-5 transition-transform" :class="{ 'scale-110': modelValue === 'home' }" />
        <span class="text-[10px] tracking-tight">Beranda</span>
        <span
          v-if="modelValue === 'home'"
          class="absolute -bottom-0.5 w-1 h-1 rounded-full bg-[#C93D68] dark:bg-[#FF8FAE]"
        />
      </button>

      <!-- Tab 2: Folder Explorer -->
      <button
        type="button"
        class="flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-full transition-all cursor-pointer relative py-1"
        :class="modelValue === 'folders' ? 'text-[#C93D68] dark:text-[#FF8FAE] font-bold' : 'text-muted hover:text-app'"
        aria-label="Jelajah folder kenangan"
        @click="emit('update:modelValue', 'folders')"
      >
        <FolderIcon class="w-4 h-4 sm:w-5 sm:h-5 transition-transform" :class="{ 'scale-110': modelValue === 'folders' }" />
        <span class="text-[10px] tracking-tight">Folder</span>
        <span
          v-if="modelValue === 'folders'"
          class="absolute -bottom-0.5 w-1 h-1 rounded-full bg-[#C93D68] dark:bg-[#FF8FAE]"
        />
      </button>

      <!-- Center Action: Unggah (+) -->
      <div class="px-1 shrink-0">
        <button
          type="button"
          class="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-linear-to-tr from-[#FF9BB5] to-[#E0527A] text-white shadow-soft flex items-center justify-center transition-transform hover:scale-105 active:scale-95 focus:outline-none cursor-pointer"
          aria-label="Menu upload dan buat folder"
          @click="isMenuOpen = !isMenuOpen"
        >
          <Plus
            class="w-6 h-6 stroke-[2.5] transition-transform duration-200"
            :class="{ 'rotate-45': isMenuOpen }"
          />
        </button>
      </div>

      <!-- Tab 3: Galeri / Timeline -->
      <button
        type="button"
        class="flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-full transition-all cursor-pointer relative py-1"
        :class="modelValue === 'gallery' ? 'text-[#C93D68] dark:text-[#FF8FAE] font-bold' : 'text-muted hover:text-app'"
        aria-label="Galeri semua foto dan video"
        @click="emit('update:modelValue', 'gallery')"
      >
        <Images class="w-4 h-4 sm:w-5 sm:h-5 transition-transform" :class="{ 'scale-110': modelValue === 'gallery' }" />
        <span class="text-[10px] tracking-tight">Galeri</span>
        <span
          v-if="modelValue === 'gallery'"
          class="absolute -bottom-0.5 w-1 h-1 rounded-full bg-[#C93D68] dark:bg-[#FF8FAE]"
        />
      </button>

      <!-- Tab 4: Favorit -->
      <button
        type="button"
        class="flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-full transition-all cursor-pointer relative py-1"
        :class="modelValue === 'favorites' ? 'text-[#C93D68] dark:text-[#FF8FAE] font-bold' : 'text-muted hover:text-app'"
        aria-label="Kenangan favorit"
        @click="emit('update:modelValue', 'favorites')"
      >
        <div class="relative">
          <Heart
            class="w-4 h-4 sm:w-5 sm:h-5 transition-transform"
            :class="{ 'scale-110 fill-current': modelValue === 'favorites' }"
          />
          <span
            v-if="favoriteCount && favoriteCount > 0"
            class="absolute -top-1 -right-2 px-1 py-0.2 rounded-full bg-[#C93D68] text-white text-[9px] font-bold"
          >
            {{ favoriteCount > 99 ? '99+' : favoriteCount }}
          </span>
        </div>
        <span class="text-[10px] tracking-tight">Favorit</span>
        <span
          v-if="modelValue === 'favorites'"
          class="absolute -bottom-0.5 w-1 h-1 rounded-full bg-[#C93D68] dark:bg-[#FF8FAE]"
        />
      </button>
    </nav>
  </div>
</template>
