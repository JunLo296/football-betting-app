<template>
  <nav class="tab-navigation">
    <router-link
      v-for="tab in visibleTabs"
      :key="tab.path"
      :to="tab.path"
      class="nav-item"
      :class="{ active: isActive(tab.path) }"
    >
      <div class="icon" v-html="tab.icon"></div>
      <span class="label">{{ tab.label }}</span>
    </router-link>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { authService } from '../services/auth'

const route = useRoute()

// All navigation tabs
const tabs = [
  {
    path: '/matches',
    label: 'Matches',
    requiresAuth: true,
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>'
  },
  {
    path: '/my-bets',
    label: 'My Bets',
    requiresAuth: true,
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>'
  },
  {
    path: '/ranking',
    label: 'Ranking',
    requiresAuth: true,
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>'
  },
  {
    path: '/admin',
    label: 'Admin',
    requiresAuth: true,
    requiresAdmin: true,
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>'
  }
]

// Computed property to filter tabs based on user permissions
const visibleTabs = computed(() => {
  return tabs.filter(tab => {
    if (tab.requiresAdmin) {
      return authService.isAdmin()
    }
    return true
  })
})

// Check if current route matches tab
const isActive = (path) => {
  return route.path === path
}
</script>

<style scoped>
.tab-navigation {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: white;
  border-top: 1px solid #ddd;
  display: flex;
  justify-content: space-around;
  padding: 0.5rem 0;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

/* Center navigation on desktop */
@media (min-width: 768px) {
  .tab-navigation {
    max-width: 768px;
    margin: 0 auto;
    left: 50%;
    transform: translateX(-50%);
  }
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 0.5rem;
  text-decoration: none;
  color: #666;
  transition: all 0.2s;
  cursor: pointer;
  min-width: 60px;
}

.nav-item:hover {
  color: #667eea;
  background-color: rgba(102, 126, 234, 0.05);
}

.nav-item.active {
  color: #667eea;
}

.nav-item.active .icon {
  transform: scale(1.1);
}

.icon {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.25rem;
  transition: transform 0.2s;
}

.icon :deep(svg) {
  stroke: currentColor;
}

.label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* Ripple effect on tap */
.nav-item:active {
  background-color: rgba(102, 126, 234, 0.1);
}

/* Hide navigation on login page */
body.login-page .tab-navigation {
  display: none;
}
</style>
