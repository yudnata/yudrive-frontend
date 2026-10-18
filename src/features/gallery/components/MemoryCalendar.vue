<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Folder as FolderType } from '@/types';
import { useFolderStore } from '@/features/folders/stores/folders.store';
import {
  CalendarHeart,
  ChevronLeft,
  ChevronRight,
  Folder as FolderIcon,
  Sparkles,
  ArrowRight,
  CalendarDays,
  ArrowUpDown,
  Heart,
} from 'lucide-vue-next';
import {
  MONTH_NAMES_ID,
  DAY_NAMES_SHORT_ID,
  formatEventDate,
  parseYMD,
} from '@/utils/date';
import Button from '@/components/ui/Button.vue';

const emit = defineEmits<{
  (e: 'selectFolder', folder: FolderType): void;
  (e: 'createFolderForDate', dateStr: string): void;
  (e: 'goToFolders'): void;
}>();

const folderStore = useFolderStore();
const allFolders = ref<FolderType[]>([]);
const isLoading = ref(true);

// Calendar Navigation State
const today = new Date();
const currentYear = ref(today.getFullYear());
const currentMonth = ref(today.getMonth()); // 0-indexed (0 = Januari, 11 = Desember)
const selectedDate = ref<string | null>(null); // 'YYYY-MM-DD'

onMounted(async () => {
  isLoading.value = true;
  try {
    allFolders.value = await folderStore.fetchAllFolders();
  } catch (err) {
    console.error('Failed to load folders for calendar:', err);
  } finally {
    isLoading.value = false;
  }
});

// Map of 'YYYY-MM-DD' -> FolderType[]
const foldersByDate = computed(() => {
  const map = new Map<string, FolderType[]>();
  for (const f of allFolders.value) {
    if (f.eventDate) {
      const list = map.get(f.eventDate) || [];
      list.push(f);
      map.set(f.eventDate, list);
    }
  }
  return map;
});

// Folders with dates in the currently viewed month
const currentMonthFolders = computed(() => {
  const m = currentMonth.value + 1;
  const monthPrefix = `${currentYear.value}-${String(m).padStart(2, '0')}`;
  return allFolders.value
    .filter((f) => f.eventDate && f.eventDate.startsWith(monthPrefix))
    .sort((a, b) => (a.eventDate! > b.eventDate! ? 1 : -1));
});

// All folders with event dates sorted chronologically
const allDatedFolders = computed(() => {
  return allFolders.value
    .filter((f) => !!f.eventDate)
    .sort((a, b) => (a.eventDate! > b.eventDate! ? 1 : -1));
});

const sortOrder = ref<'asc' | 'desc'>('asc');

function toggleSortOrder() {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
}

interface TimelineMonthGroup {
  key: string;
  monthName: string;
  year: number;
  month: number;
  folders: FolderType[];
}

const timelineGroups = computed<TimelineMonthGroup[]>(() => {
  const folders = [...allDatedFolders.value];
  if (sortOrder.value === 'desc') {
    folders.reverse();
  }

  const groupMap = new Map<string, TimelineMonthGroup>();
  for (const f of folders) {
    if (!f.eventDate) continue;
    const parsed = parseYMD(f.eventDate);
    if (!parsed) continue;

    const key = `${parsed.year}-${String(parsed.month).padStart(2, '0')}`;
    const monthName = `${MONTH_NAMES_ID[parsed.month - 1]} ${parsed.year}`;

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        key,
        monthName,
        year: parsed.year,
        month: parsed.month,
        folders: [],
      });
    }
    groupMap.get(key)!.folders.push(f);
  }

  return Array.from(groupMap.values());
});

// Folders for the currently selected date
const selectedDateFolders = computed(() => {
  if (!selectedDate.value) return [];
  return foldersByDate.value.get(selectedDate.value) || [];
});

// Days of the current calendar month view
interface CalendarDay {
  dateStr: string; // 'YYYY-MM-DD'
  dayNum: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasFolders: boolean;
  folderCount: number;
}

const calendarDays = computed<CalendarDay[]>(() => {
  const year = currentYear.value;
  const month = currentMonth.value;

  // First day of month (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const firstDay = new Date(year, month, 1).getDay();
  // Adjust so Monday is 0, Sunday is 6
  const startOffset = (firstDay + 6) % 7;

  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days: CalendarDay[] = [];
  const todayYMD = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // 1. Padding days from previous month
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevMonth = month === 0 ? 12 : month;
    const prevYear = month === 0 ? year - 1 : year;
    const dateStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const fList = foldersByDate.value.get(dateStr) || [];
    days.push({
      dateStr,
      dayNum: d,
      isCurrentMonth: false,
      isToday: dateStr === todayYMD,
      hasFolders: fList.length > 0,
      folderCount: fList.length,
    });
  }

  // 2. Days of current month
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const fList = foldersByDate.value.get(dateStr) || [];
    days.push({
      dateStr,
      dayNum: d,
      isCurrentMonth: true,
      isToday: dateStr === todayYMD,
      hasFolders: fList.length > 0,
      folderCount: fList.length,
    });
  }

  // 3. Trailing days to fill standard 6-row or 5-row grid (multiples of 7)
  const remainder = (7 - (days.length % 7)) % 7;
  for (let d = 1; d <= remainder; d++) {
    const nextMonth = month === 11 ? 1 : month + 2;
    const nextYear = month === 11 ? year + 1 : year;
    const dateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const fList = foldersByDate.value.get(dateStr) || [];
    days.push({
      dateStr,
      dayNum: d,
      isCurrentMonth: false,
      isToday: dateStr === todayYMD,
      hasFolders: fList.length > 0,
      folderCount: fList.length,
    });
  }

  return days;
});

function prevMonth() {
  if (currentMonth.value === 0) {
    currentMonth.value = 11;
    currentYear.value--;
  } else {
    currentMonth.value--;
  }
}

function nextMonth() {
  if (currentMonth.value === 11) {
    currentMonth.value = 0;
    currentYear.value++;
  } else {
    currentMonth.value++;
  }
}

function goToToday() {
  currentYear.value = today.getFullYear();
  currentMonth.value = today.getMonth();
  const todayYMD = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  selectedDate.value = todayYMD;
}

function selectDay(day: CalendarDay) {
  if (selectedDate.value === day.dateStr) {
    // toggle selection off
    selectedDate.value = null;
  } else {
    selectedDate.value = day.dateStr;
    if (!day.isCurrentMonth) {
      const parsed = parseYMD(day.dateStr);
      if (parsed) {
        currentYear.value = parsed.year;
        currentMonth.value = parsed.month - 1;
      }
    }
  }
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '0 B';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(0)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
}
</script>

<template>
  <div class="space-y-6">
    <!-- Main Interactive Calendar Card -->
    <div class="p-5 sm:p-7 rounded-3xl bg-surface shadow-soft ring-1 ring-black/5 dark:ring-white/10 space-y-5">
      <!-- Calendar Header Navigation -->
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-2xl bg-[#C93D68]/10 dark:bg-[#FF8FAE]/10 text-[#C93D68] dark:text-[#FF8FAE] flex items-center justify-center">
            <CalendarHeart class="w-5 h-5 stroke-2" />
          </div>
          <div>
            <h2 class="text-lg sm:text-xl font-serif font-bold text-app tracking-tight">
              {{ MONTH_NAMES_ID[currentMonth] }} {{ currentYear }}
            </h2>
            <p class="text-xs text-muted">
              {{ currentMonthFolders.length }} momen spesial di bulan ini
            </p>
          </div>
        </div>

        <div class="flex items-center gap-1.5">
          <button
            type="button"
            class="px-2.5 py-1 text-xs rounded-full bg-surface-tint hover:bg-black/5 dark:hover:bg-white/10 text-app transition-colors font-medium cursor-pointer"
            @click="goToToday"
          >
            Hari Ini
          </button>
          <button
            type="button"
            class="w-8 h-8 rounded-full bg-surface-tint hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-app transition-colors cursor-pointer"
            aria-label="Bulan sebelumnya"
            @click="prevMonth"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>
          <button
            type="button"
            class="w-8 h-8 rounded-full bg-surface-tint hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-app transition-colors cursor-pointer"
            aria-label="Bulan berikutnya"
            @click="nextMonth"
          >
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Calendar Days Grid -->
      <div>
        <!-- Weekday Headers -->
        <div class="grid grid-cols-7 gap-1 text-center mb-1">
          <div
            v-for="dayName in DAY_NAMES_SHORT_ID"
            :key="dayName"
            class="py-1 text-[11px] sm:text-xs font-semibold text-muted tracking-wide"
          >
            {{ dayName }}
          </div>
        </div>

        <!-- Month Day Cells -->
        <div class="grid grid-cols-7 gap-1 sm:gap-1.5">
          <button
            v-for="day in calendarDays"
            :key="day.dateStr"
            type="button"
            class="aspect-square sm:aspect-auto sm:min-h-14.5 p-1 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer relative group text-xs focus:outline-none"
            :class="[
              selectedDate === day.dateStr
                ? 'bg-linear-to-tr from-[#FF9BB5] to-[#E0527A] text-white shadow-soft font-bold'
                : day.isToday
                ? 'ring-1.5 ring-[#C93D68] dark:ring-[#FF8FAE] bg-surface-tint text-app font-semibold'
                : day.isCurrentMonth
                ? 'text-app hover:bg-surface-tint'
                : 'text-muted/40 hover:text-muted',
            ]"
            @click="selectDay(day)"
          >
            <!-- Wrapper for Date Number framed by Love/Heart if date has moments -->
            <div class="relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center">
              <!-- Heart shape encircling the date number -->
              <Heart
                v-if="day.hasFolders"
                class="absolute inset-0 w-full h-full pointer-events-none transition-transform duration-300"
                :class="[
                  selectedDate === day.dateStr
                    ? 'stroke-white fill-white/25 stroke-2 scale-105'
                    : day.isCurrentMonth
                    ? 'stroke-[#C93D68] dark:stroke-[#FF8FAE] fill-[#C93D68]/12 dark:fill-[#FF8FAE]/18 stroke-2 group-hover:scale-110 drop-shadow-xs'
                    : 'stroke-[#C93D68]/50 dark:stroke-[#FF8FAE]/50 fill-[#C93D68]/5 dark:fill-[#FF8FAE]/5 stroke-[1.8] group-hover:scale-105'
                ]"
              />

              <!-- Optional Count Badge if multiple folders on the same day -->
              <span
                v-if="day.folderCount > 1"
                class="absolute -top-1 -right-1 px-1 min-w-3.5 h-3.5 rounded-full text-[8.5px] font-bold flex items-center justify-center shadow-xs z-20 pointer-events-none"
                :class="selectedDate === day.dateStr ? 'bg-white text-[#C93D68]' : 'bg-[#C93D68] dark:bg-[#FF8FAE] text-white'"
              >
                {{ day.folderCount }}
              </span>

              <!-- Date Number -->
              <span
                class="relative z-10 text-xs sm:text-sm leading-none transition-colors"
                :class="[
                  selectedDate === day.dateStr
                    ? 'text-white font-bold'
                    : day.hasFolders
                    ? day.isCurrentMonth
                      ? 'text-[#C93D68] dark:text-[#FF8FAE] font-bold'
                      : 'text-[#C93D68]/60 dark:text-[#FF8FAE]/60 font-semibold'
                    : day.isToday
                    ? 'text-app font-bold'
                    : day.isCurrentMonth
                    ? 'text-app font-medium'
                    : 'text-muted/40 font-normal'
                ]"
              >
                {{ day.dayNum }}
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- Active Selection Details / Folders of the Day -->
    <div
      v-if="selectedDate"
      class="p-5 sm:p-7 rounded-3xl bg-surface shadow-soft ring-1 ring-black/5 dark:ring-white/10 space-y-4"
    >
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div class="flex items-center gap-2">
          <CalendarDays class="w-5 h-5 text-[#C93D68] dark:text-[#FF8FAE]" />
          <div>
            <h3 class="text-base font-serif font-bold text-app">
              Kenangan {{ formatEventDate(selectedDate) }}
            </h3>
            <p class="text-xs text-muted">
              {{ selectedDateFolders.length }} folder momen tercatat di tanggal ini
            </p>
          </div>
        </div>
      </div>

      <!-- List of Folders for this Date -->
      <div v-if="selectedDateFolders.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div
          v-for="f in selectedDateFolders"
          :key="f.id"
          class="p-3.5 rounded-2xl bg-surface-tint hover:shadow-soft transition-all cursor-pointer flex items-center gap-3 group"
          @click="emit('selectFolder', f)"
        >
          <!-- Cover Thumbnail -->
          <div class="w-14 h-14 rounded-xl bg-surface overflow-hidden shrink-0 shadow-xs relative">
            <img
              v-if="f.coverUrl"
              :src="f.coverUrl"
              :alt="f.name"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-muted">
              <FolderIcon class="w-6 h-6 text-[#C93D68]/60 dark:text-[#FF8FAE]/60" />
            </div>
          </div>

          <!-- Info -->
          <div class="overflow-hidden flex-1 min-w-0">
            <h4 class="text-sm font-semibold text-app truncate group-hover:text-[#C93D68] dark:group-hover:text-[#FF8FAE] transition-colors">
              {{ f.name }}
            </h4>
            <p class="text-xs text-muted truncate mt-0.5">
              {{ f.itemCount }} item • {{ formatBytes(f.totalBytes) }}
            </p>
          </div>

          <ArrowRight class="w-4 h-4 text-muted group-hover:text-app group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>
      </div>

      <div
        v-else
        class="py-8 text-center text-muted text-xs space-y-2 bg-surface-tint/50 rounded-2xl p-4"
      >
        <p>Belum ada folder kenangan yang diatur di tanggal ini.</p>
      </div>
    </div>

    <!-- Timeline of All Dated Memories -->
    <div class="space-y-6">
      <div class="flex items-center justify-between flex-wrap gap-2.5">
        <div class="flex items-center gap-2">
          <Sparkles class="w-5 h-5 text-[#C93D68] dark:text-[#FF8FAE]" />
          <h3 class="text-base sm:text-lg font-serif font-bold text-app">
            Garis Waktu Kenangan
          </h3>
          <span
            v-if="allDatedFolders.length > 0"
            class="text-[11px] font-semibold text-[#C93D68] dark:text-[#FF8FAE] bg-[#C93D68]/10 dark:bg-[#FF8FAE]/10 px-2 py-0.5 rounded-full"
          >
            {{ allDatedFolders.length }} momen
          </span>
        </div>

        <div class="flex items-center gap-2">
          <!-- Sort Toggle Button -->
          <button
            v-if="allDatedFolders.length > 1"
            type="button"
            class="text-xs text-muted hover:text-app px-2.5 py-1.5 rounded-full bg-surface-tint ring-1 ring-black/5 dark:ring-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
            @click="toggleSortOrder"
            :title="sortOrder === 'asc' ? 'Urutan: Dari Terlama (klik untuk balik)' : 'Urutan: Dari Terbaru (klik untuk balik)'"
          >
            <ArrowUpDown class="w-3.5 h-3.5 text-[#C93D68] dark:text-[#FF8FAE]" />
            <span class="hidden xs:inline">{{ sortOrder === 'asc' ? 'Awal Kisah' : 'Terbaru' }}</span>
          </button>

          <!-- Kelola Folder -->
          <button
            type="button"
            class="text-xs text-muted hover:text-app transition-colors cursor-pointer px-2 py-1"
            @click="emit('goToFolders')"
          >
            Kelola Folder
          </button>
        </div>
      </div>

      <!-- If no dated folders exist yet -->
      <div
        v-if="allDatedFolders.length === 0"
        class="p-8 rounded-3xl bg-surface shadow-soft ring-1 ring-black/5 dark:ring-white/10 text-center space-y-3"
      >
        <div class="w-12 h-12 mx-auto rounded-full bg-[#C93D68]/10 dark:bg-[#FF8FAE]/10 text-[#C93D68] dark:text-[#FF8FAE] flex items-center justify-center">
          <CalendarHeart class="w-6 h-6" />
        </div>
        <h4 class="text-sm font-semibold text-app">
          Belum ada folder yang bertanggal
        </h4>
        <p class="text-xs text-muted max-w-sm mx-auto leading-relaxed">
          Tautkan tanggal momen/kejadian pada folder kamu melalui menu <b>Informasi & Cover</b> atau saat membuat folder baru agar tersusun di kalender ini.
        </p>
        <div class="pt-2">
          <Button
            type="button"
            variant="primary"
            size="md"
            class="cursor-pointer"
            @click="emit('goToFolders')"
          >
            Buka Daftar Folder
          </Button>
        </div>
      </div>

      <!-- Vertical Timeline with connected line and event nodes -->
      <div v-else class="relative space-y-8 pl-1 sm:pl-2">
        <div
          v-for="group in timelineGroups"
          :key="group.key"
          class="relative"
        >
          <!-- Month Header Milestone on Timeline -->
          <div class="relative flex items-center gap-3 mb-5 select-none">
            <!-- Milestone circle badge -->
            <div class="relative z-10 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center shrink-0">
              <CalendarHeart class="w-4.5 h-4.5 sm:w-5 sm:h-5 text-[#C93D68] dark:text-[#FF8FAE] stroke-[2.2]" />
            </div>

            <!-- Milestone Label -->
            <div class="flex items-center gap-2">
              <span class="text-sm sm:text-base font-serif font-bold text-app">
                {{ group.monthName }}
              </span>
            </div>
          </div>

          <!-- Vertical Timeline Items -->
          <div class="relative space-y-3.5 sm:space-y-4">
            <!-- Continuous vertical line connecting all entries in this month -->
            <div
              class="absolute left-4.5 sm:left-5 top-0 bottom-4 w-0.5 -translate-x-1/2 bg-linear-to-b from-[#E0527A]/40 via-[#FF9BB5]/30 to-[#E0527A]/15 dark:from-[#FF8FAE]/50 dark:via-[#FF8FAE]/25 dark:to-transparent pointer-events-none"
            />

            <!-- Entry Item -->
            <div
              v-for="folder in group.folders"
              :key="folder.id"
              class="relative flex items-start gap-3 sm:gap-4 group cursor-pointer"
              @click="emit('selectFolder', folder)"
            >
              <!-- Timeline node dot with ring -->
              <div class="relative z-10 w-9 sm:w-10 flex items-center justify-center shrink-0 pt-4">
                <div class="w-3.5 h-3.5 rounded-full bg-white dark:bg-[#20151B] ring-2 ring-[#E0527A] dark:ring-[#FF8FAE] shadow-xs flex items-center justify-center group-hover:scale-125 group-hover:ring-3 transition-transform">
                  <div class="w-1.5 h-1.5 rounded-full bg-[#E0527A] dark:bg-[#FF8FAE]" />
                </div>
              </div>

              <!-- Memory Card on the Timeline -->
              <div class="flex-1 min-w-0 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-surface shadow-soft ring-1 ring-black/5 dark:ring-white/10 hover:shadow-md hover:ring-[#E0527A]/30 dark:hover:ring-[#FF8FAE]/30 transition-all flex items-center justify-between gap-3">
                <div class="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  <!-- Cover thumbnail -->
                  <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-surface-tint overflow-hidden shrink-0 relative shadow-xs">
                    <img
                      v-if="folder.coverUrl"
                      :src="folder.coverUrl"
                      :alt="folder.name"
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div v-else class="w-full h-full flex items-center justify-center text-muted">
                      <FolderIcon class="w-6 h-6 text-[#C93D68]/60 dark:text-[#FF8FAE]/60" />
                    </div>
                  </div>

                  <!-- Details -->
                  <div class="overflow-hidden flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1 flex-wrap">
                      <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-[#C93D68]/10 dark:bg-[#FF8FAE]/10 text-[#C93D68] dark:text-[#FF8FAE]">
                        {{ formatEventDate(folder.eventDate) }}
                      </span>
                    </div>

                    <h4 class="text-sm sm:text-base font-semibold text-app truncate group-hover:text-[#C93D68] dark:group-hover:text-[#FF8FAE] transition-colors">
                      {{ folder.name }}
                    </h4>
                  </div>
                </div>

                <!-- Right Action / Chevron -->
                <div class="w-8 h-8 rounded-full bg-surface-tint flex items-center justify-center text-muted group-hover:text-[#C93D68] dark:group-hover:text-[#FF8FAE] group-hover:translate-x-1 transition-all shrink-0">
                  <ChevronRight class="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
