import { ref } from 'vue';

export type ThemePreference = 'system' | 'light' | 'dark';

const THEME_STORAGE_KEY = 'theme_preference';

const currentTheme = ref<ThemePreference>(
  (localStorage.getItem(THEME_STORAGE_KEY) as ThemePreference) || 'system'
);

function applyTheme(pref: ThemePreference) {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');

  if (pref === 'dark') {
    root.classList.add('dark');
  } else if (pref === 'light') {
    root.classList.add('light');
  } else {
    // 'system': rely on CSS media query, remove explicit classes
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      root.classList.add('dark');
    }
  }
}

// Listen to system theme changes if set to 'system'
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    if (currentTheme.value === 'system') {
      applyTheme('system');
    }
  });
  // Initial application
  applyTheme(currentTheme.value);
}

export function useTheme() {
  function setTheme(pref: ThemePreference) {
    currentTheme.value = pref;
    localStorage.setItem(THEME_STORAGE_KEY, pref);
    applyTheme(pref);
  }

  return {
    theme: currentTheme,
    setTheme,
  };
}
