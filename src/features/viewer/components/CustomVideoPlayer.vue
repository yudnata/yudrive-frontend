<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Download,
  AlertCircle,
  RotateCw,
} from 'lucide-vue-next';

interface Props {
  src: string;
  poster?: string;
  filename?: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'expired'): void;
}>();

const videoRef = ref<HTMLVideoElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);

const isPlaying = ref(false);
const isMuted = ref(false);
const isFullscreen = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const bufferedPercent = ref(0);
const showControls = ref(true);
const isSeeking = ref(false);
const playbackError = ref<string | null>(null);
const isUnsupportedFormat = ref(false);
const hasAutoRetried = ref(false);

let hideControlsTimeout: number | null = null;

function resetControlsTimer() {
  showControls.value = true;
  if (hideControlsTimeout) clearTimeout(hideControlsTimeout);
  if (isPlaying.value) {
    hideControlsTimeout = window.setTimeout(() => {
      showControls.value = false;
    }, 2800);
  }
}

function togglePlay() {
  if (!videoRef.value) return;
  if (videoRef.value.paused) {
    videoRef.value.play().catch(() => {});
  } else {
    videoRef.value.pause();
  }
}

function toggleMute() {
  if (!videoRef.value) return;
  videoRef.value.muted = !videoRef.value.muted;
  isMuted.value = videoRef.value.muted;
}

function toggleFullscreen() {
  if (!containerRef.value) return;
  if (!document.fullscreenElement) {
    containerRef.value.requestFullscreen?.().catch(() => {});
    isFullscreen.value = true;
  } else {
    document.exitFullscreen?.().catch(() => {});
    isFullscreen.value = false;
  }
}

function handleTimeUpdate() {
  if (!videoRef.value || isSeeking.value) return;
  currentTime.value = videoRef.value.currentTime;

  // Calculate buffer range progress
  if (videoRef.value.buffered.length > 0 && duration.value > 0) {
    const end = videoRef.value.buffered.end(videoRef.value.buffered.length - 1);
    bufferedPercent.value = Math.min(100, Math.round((end / duration.value) * 100));
  }
}

function handleLoadedMetadata() {
  if (!videoRef.value) return;
  duration.value = videoRef.value.duration || 0;
  playbackError.value = null;
  isUnsupportedFormat.value = false;
}

// Range-request seek handler
function handleSeek(e: MouseEvent | TouchEvent) {
  if (!videoRef.value || duration.value <= 0) return;
  const target = (e.currentTarget || e.target) as HTMLElement;
  const rect = target.getBoundingClientRect();
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
  const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
  const newPercent = clickX / rect.width;
  const newTime = newPercent * duration.value;

  videoRef.value.currentTime = newTime;
  currentTime.value = newTime;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Video error handler with 403 auto-retry and format notification
function handleVideoError() {
  if (!videoRef.value) return;
  const error = videoRef.value.error;

  // Auto-retry once on potential URL expiration (HTTP 403)
  if (!hasAutoRetried.value) {
    hasAutoRetried.value = true;
    emit('expired');
    return;
  }

  if (error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
    isUnsupportedFormat.value = true;
    playbackError.value =
      'Format video (HEVC/MOV) tidak didukung pemutar peramban ini. Anda tetap dapat mengunduh dan memutarnya di aplikasi galeri bawaan perangkat.';
  } else {
    playbackError.value = 'Tidak dapat memutar video. Silakan periksa koneksi atau unduh file asli.';
  }
}

function triggerDownload() {
  if (!props.src) return;
  const link = document.createElement('a');
  link.href = props.src;
  link.download = props.filename || 'video-kenangan.mp4';
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Reset state on src change
watch(
  () => props.src,
  () => {
    hasAutoRetried.value = false;
    playbackError.value = null;
    isUnsupportedFormat.value = false;
    currentTime.value = 0;
    bufferedPercent.value = 0;
  }
);

onMounted(() => {
  document.addEventListener('fullscreenchange', () => {
    isFullscreen.value = !!document.fullscreenElement;
  });
});

onUnmounted(() => {
  if (hideControlsTimeout) clearTimeout(hideControlsTimeout);
});
</script>

<template>
  <div
    ref="containerRef"
    class="relative w-full h-full max-h-[85vh] flex items-center justify-center bg-black/40 rounded-[20px] overflow-hidden select-none group"
    @mousemove="resetControlsTimer"
    @touchstart="resetControlsTimer"
  >
    <!-- Video Element -->
    <video
      ref="videoRef"
      :src="src"
      :poster="poster"
      preload="metadata"
      playsinline
      class="max-w-full max-h-full object-contain cursor-pointer"
      @play="isPlaying = true; resetControlsTimer()"
      @pause="isPlaying = false; showControls = true"
      @timeupdate="handleTimeUpdate"
      @loadedmetadata="handleLoadedMetadata"
      @error="handleVideoError"
      @click="togglePlay"
    />

    <!-- Unsupported / Playback Error Banner -->
    <div
      v-if="playbackError"
      class="absolute inset-0 bg-[#1E1419]/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white z-20"
    >
      <div class="w-14 h-14 rounded-full bg-[#D64545]/20 text-[#FF8FAE] flex items-center justify-center mb-4">
        <AlertCircle class="w-8 h-8" />
      </div>
      <h4 class="text-lg font-serif font-semibold mb-2 text-white">
        Tidak Dapat Memutar Video
      </h4>
      <p class="text-xs sm:text-sm text-white/80 max-w-md mb-6 leading-relaxed">
        {{ playbackError }}
      </p>
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="btn-primary px-5 py-2.5 text-xs font-semibold flex items-center gap-2 shadow-soft"
          @click="triggerDownload"
        >
          <Download class="w-4 h-4" />
          Unduh File Video Asli
        </button>
        <button
          type="button"
          class="px-4 py-2.5 text-xs font-semibold rounded-xl border border-white/20 text-white/90 hover:bg-white/10 flex items-center gap-1.5"
          @click="$emit('expired')"
        >
          <RotateCw class="w-3.5 h-3.5" />
          Coba Lagi
        </button>
      </div>
    </div>

    <!-- Center Play/Pause Indicator (when paused) -->
    <button
      v-if="!isPlaying && !playbackError"
      type="button"
      class="absolute inset-auto w-16 h-16 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-xs text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-10"
      aria-label="Putar video"
      @click="togglePlay"
    >
      <Play class="w-8 h-8 fill-current translate-x-0.5" />
    </button>

    <!-- Custom Controls Bar -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div
        v-if="showControls && !playbackError"
        class="absolute bottom-0 inset-x-0 p-4 bg-linear-to-t from-black/80 via-black/40 to-transparent flex flex-col gap-2 z-10"
      >
        <!-- Pink Seek Bar with Buffer and Scrub -->
        <div
          class="relative w-full h-4 flex items-center cursor-pointer group/seek"
          @click="handleSeek"
        >
          <!-- Seek Track Background -->
          <div class="w-full h-1.5 rounded-full bg-white/20 overflow-hidden relative">
            <!-- Buffer Progress -->
            <div
              class="absolute inset-y-0 left-0 bg-white/30 rounded-full transition-all"
              :style="{ width: `${bufferedPercent}%` }"
            />
            <!-- Playback Progress in Pink Theme -->
            <div
              class="absolute inset-y-0 left-0 bg-linear-to-r from-[#FF9BB5] to-[#E0527A] rounded-full"
              :style="{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }"
            />
          </div>

          <!-- Draggable Scrub Thumb -->
          <div
            class="absolute w-3.5 h-3.5 rounded-full bg-white shadow-md border border-[#E0527A] -ml-1.5 pointer-events-none transition-transform group-hover/seek:scale-125"
            :style="{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }"
          />
        </div>

        <!-- Controls Row -->
        <div class="flex items-center justify-between text-white text-xs">
          <div class="flex items-center gap-3">
            <button
              type="button"
              class="p-1.5 hover:text-[#FF8FAE] transition-colors min-h-9 min-w-9 flex items-center justify-center"
              :aria-label="isPlaying ? 'Jeda' : 'Putar'"
              @click="togglePlay"
            >
              <Pause v-if="isPlaying" class="w-4 h-4 fill-current" />
              <Play v-else class="w-4 h-4 fill-current" />
            </button>

            <button
              type="button"
              class="p-1.5 hover:text-[#FF8FAE] transition-colors min-h-9 min-w-9 flex items-center justify-center"
              :aria-label="isMuted ? 'Nyalakan suara' : 'Bisukan'"
              @click="toggleMute"
            >
              <VolumeX v-if="isMuted" class="w-4 h-4" />
              <Volume2 v-else class="w-4 h-4" />
            </button>

            <!-- Time Display -->
            <span class="text-white/80 font-mono tracking-tight text-[11px]">
              {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
            </span>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              class="p-1.5 hover:text-[#FF8FAE] transition-colors min-h-9 min-w-9 flex items-center justify-center"
              aria-label="Layar penuh"
              @click="toggleFullscreen"
            >
              <Minimize v-if="isFullscreen" class="w-4 h-4" />
              <Maximize v-else class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
