import { createRouter, createWebHistory } from 'vue-router'
import { authService } from '../services/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/Login.vue')
    },
    {
      path: '/matches',
      name: 'matches',
      component: () => import('../views/Matches.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/my-bets',
      name: 'my-bets',
      component: () => import('../views/MyBets.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/ranking',
      name: 'ranking',
      component: () => import('../views/Ranking.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('../views/Admin.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/',
      redirect: '/matches'
    }
  ]
})

// Navigation guard for authentication and admin access
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const isAuthenticated = authService.isAuthenticated()
  const isAdmin = authService.isAdmin()

  // Redirect to login if authentication is required but user is not authenticated
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
    return
  }

  // Redirect to matches if user is already logged in and tries to access login page
  if (to.path === '/login' && isAuthenticated) {
    next('/matches')
    return
  }

  // Redirect to matches if admin access is required but user is not admin
  if (to.meta.requiresAdmin && !isAdmin) {
    next('/matches')
    return
  }

  next()
})

export default router
