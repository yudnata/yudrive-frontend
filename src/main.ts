import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { useTheme } from './composables/useTheme';
import './assets/main.css';

// Apply saved theme preference immediately
useTheme();

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.mount('#app');
