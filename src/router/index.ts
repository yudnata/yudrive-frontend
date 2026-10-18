import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'gallery',
      component: () => import('@/features/gallery/views/GalleryView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/features/auth/views/LoginView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
});

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('auth_token');

  if (to.meta.requiresAuth && !token) {
    next({ name: 'login' });
  } else if (to.meta.guestOnly && token) {
    next({ name: 'gallery' });
  } else {
    next();
  }
});

export default router;
