<script setup lang="ts">
// 14 carefully tuned floating heart particles
// Pure CSS GPU-composited translate3d for zero-lag 60/120fps performance
const hearts = [
  { left: '6%', size: 16, duration: '20s', delay: '-3s', drift: '14px', rotate: '12deg', opacity: 0.16 },
  { left: '15%', size: 24, duration: '26s', delay: '-14s', drift: '-20px', rotate: '-18deg', opacity: 0.12 },
  { left: '23%', size: 14, duration: '18s', delay: '-7s', drift: '18px', rotate: '15deg', opacity: 0.18 },
  { left: '32%', size: 20, duration: '24s', delay: '-19s', drift: '-12px', rotate: '-10deg', opacity: 0.14 },
  { left: '42%', size: 18, duration: '22s', delay: '-5s', drift: '16px', rotate: '20deg', opacity: 0.15 },
  { left: '50%', size: 28, duration: '28s', delay: '-12s', drift: '-22px', rotate: '-15deg', opacity: 0.11 },
  { left: '58%', size: 14, duration: '19s', delay: '-16s', drift: '15px', rotate: '8deg', opacity: 0.17 },
  { left: '67%', size: 22, duration: '25s', delay: '-4s', drift: '-18px', rotate: '-22deg', opacity: 0.13 },
  { left: '76%', size: 16, duration: '21s', delay: '-11s', drift: '20px', rotate: '14deg', opacity: 0.16 },
  { left: '84%', size: 26, duration: '27s', delay: '-18s', drift: '-15px', rotate: '-12deg', opacity: 0.12 },
  { left: '92%', size: 15, duration: '17s', delay: '-9s', drift: '12px', rotate: '16deg', opacity: 0.18 },
  { left: '11%', size: 20, duration: '23s', delay: '-21s', drift: '-16px', rotate: '-8deg', opacity: 0.14 },
  { left: '46%', size: 16, duration: '22s', delay: '-2s', drift: '10px', rotate: '18deg', opacity: 0.15 },
  { left: '88%', size: 18, duration: '24s', delay: '-15s', drift: '-14px', rotate: '-16deg', opacity: 0.13 },
];
</script>

<template>
  <div
    class="pointer-events-none fixed inset-0 overflow-hidden z-0 select-none"
    aria-hidden="true"
    style="contain: strict;"
  >
    <div
      v-for="(h, i) in hearts"
      :key="i"
      class="heart-particle absolute text-[#E0527A] dark:text-[#FF8FAE]"
      :style="{
        left: h.left,
        bottom: '-30px',
        width: `${h.size}px`,
        height: `${h.size}px`,
        opacity: h.opacity,
        animationDuration: h.duration,
        animationDelay: h.delay,
        '--drift': h.drift,
        '--rot': h.rotate,
      }"
    >
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        class="w-full h-full"
      >
        <path
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        />
      </svg>
    </div>
  </div>
</template>

<style scoped>
.heart-particle {
  will-change: transform;
  transform: translate3d(0, 0, 0);
  animation-name: floatHeart;
  animation-iteration-count: infinite;
  animation-timing-function: linear;
}

@keyframes floatHeart {
  0% {
    transform: translate3d(0, 0, 0) rotate(0deg) scale(0.85);
  }
  50% {
    transform: translate3d(var(--drift), -55vh, 0) rotate(calc(var(--rot) / 2)) scale(1);
  }
  100% {
    transform: translate3d(0, -115vh, 0) rotate(var(--rot)) scale(0.9);
  }
}

@media (prefers-reduced-motion: reduce) {
  .heart-particle {
    animation: none !important;
    display: none;
  }
}
</style>
