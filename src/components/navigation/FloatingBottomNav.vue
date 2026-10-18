<script setup lang="ts">
import {
  Home,
  Folder as FolderIcon,
  CalendarHeart,
  Images,
  Heart,
} from 'lucide-vue-next';

export type NavTab = 'home' | 'folders' | 'calendar' | 'gallery' | 'favorites';

defineProps<{
  modelValue: NavTab;
  favoriteCount?: number;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', tab: NavTab): void;
}>();
</script>

<template>
  <div
    class="fixed bottom-[max(1.25rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))] sm:bottom-8 left-1/2 -translate-x-1/2 z-40 w-full max-w-100 sm:max-w-md px-3 select-none pointer-events-none"
  >
    <!-- Main Floating Tab Bar -->
    <nav
      class="pointer-events-auto bg-white/95 dark:bg-[#2A1D24]/95 text-app backdrop-blur-xl shadow-2xl rounded-full p-1 sm:p-1.5 flex items-center justify-between ring-1 ring-black/5 dark:ring-white/10"
      aria-label="Navigasi utama"
    >
      <!-- Tab 1: Beranda / Bento Home -->
      <button
        type="button"
        class="flex-1 min-h-11 flex flex-col items-center justify-center gap-0.5 rounded-full transition-all cursor-pointer relative py-1"
        :class="modelValue === 'home' ? 'text-[#C93D68] dark:text-[#FF8FAE] font-bold' : 'text-muted hover:text-app'"
        aria-label="Beranda kenangan"
        @click="emit('update:modelValue', 'home')"
      >
        <Home class="w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform" :class="{ 'scale-110': modelValue === 'home' }" />
        <span class="text-[9.5px] sm:text-[10px] tracking-tight">Beranda</span>
      </button>

      <!-- Tab 2: Folder Explorer -->
      <button
        type="button"
        class="flex-1 min-h-11 flex flex-col items-center justify-center gap-0.5 rounded-full transition-all cursor-pointer relative py-1"
        :class="modelValue === 'folders' ? 'text-[#C93D68] dark:text-[#FF8FAE] font-bold' : 'text-muted hover:text-app'"
        aria-label="Jelajah folder kenangan"
        @click="emit('update:modelValue', 'folders')"
      >
        <FolderIcon class="w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform" :class="{ 'scale-110': modelValue === 'folders' }" />
        <span class="text-[9.5px] sm:text-[10px] tracking-tight">Folder</span>
      </button>

      <!-- Tab 3: Kalender Kenangan -->
      <button
        type="button"
        class="flex-1 min-h-11 flex flex-col items-center justify-center gap-0.5 rounded-full transition-all cursor-pointer relative py-1"
        :class="modelValue === 'calendar' ? 'text-[#C93D68] dark:text-[#FF8FAE] font-bold' : 'text-muted hover:text-app'"
        aria-label="Kalender momen dan kenangan"
        @click="emit('update:modelValue', 'calendar')"
      >
        <CalendarHeart class="w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform" :class="{ 'scale-110': modelValue === 'calendar' }" />
        <span class="text-[9.5px] sm:text-[10px] tracking-tight">Kalender</span>
      </button>

      <!-- Tab 4: Galeri / Timeline -->
      <button
        type="button"
        class="flex-1 min-h-11 flex flex-col items-center justify-center gap-0.5 rounded-full transition-all cursor-pointer relative py-1"
        :class="modelValue === 'gallery' ? 'text-[#C93D68] dark:text-[#FF8FAE] font-bold' : 'text-muted hover:text-app'"
        aria-label="Galeri semua foto dan video"
        @click="emit('update:modelValue', 'gallery')"
      >
        <Images class="w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform" :class="{ 'scale-110': modelValue === 'gallery' }" />
        <span class="text-[9.5px] sm:text-[10px] tracking-tight">Galeri</span>
      </button>

      <!-- Tab 5: Favorit -->
      <button
        type="button"
        class="flex-1 min-h-11 flex flex-col items-center justify-center gap-0.5 rounded-full transition-all cursor-pointer relative py-1"
        :class="modelValue === 'favorites' ? 'text-[#C93D68] dark:text-[#FF8FAE] font-bold' : 'text-muted hover:text-app'"
        aria-label="Kenangan favorit"
        @click="emit('update:modelValue', 'favorites')"
      >
        <div class="relative">
          <Heart
            class="w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform"
            :class="{ 'scale-110 fill-current': modelValue === 'favorites' }"
          />
          <span
            v-if="favoriteCount && favoriteCount > 0"
            class="absolute -top-1 -right-2 px-1 py-0.2 rounded-full bg-[#C93D68] text-white text-[9px] font-bold"
          >
            {{ favoriteCount > 99 ? '99+' : favoriteCount }}
          </span>
        </div>
        <span class="text-[9.5px] sm:text-[10px] tracking-tight">Favorit</span>
      </button>
    </nav>
  </div>
</template>
