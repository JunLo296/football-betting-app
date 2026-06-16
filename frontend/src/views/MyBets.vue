<template>
  <div class="my-bets-view">
    <div class="header">
      <div class="header-content">
        <h1>My Bets</h1>
        <div class="user-info">
          <span class="coins">{{ user?.total_coins?.toFixed(1) || '0.0' }} coins</span>
        </div>
      </div>
    </div>

    <div class="filter-tabs">
      <button
        v-for="filter in filters"
        :key="filter.value"
        @click="selectedFilter = filter.value"
        :class="['filter-tab', { active: selectedFilter === filter.value }]"
      >
        {{ filter.label }}
      </button>
    </div>

    <div class="bets-container">
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading your bets...</p>
      </div>

      <div v-else-if="error" class="error-state">
        <p class="error-message">{{ error }}</p>
        <button @click="fetchBets" class="btn btn-primary">Try Again</button>
      </div>

      <div v-else-if="filteredBets.length === 0" class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p>No {{ selectedFilter === 'all' ? '' : selectedFilter }} bets yet.</p>
        <p class="empty-subtitle">
          {{ selectedFilter === 'all' ? 'Place your first bet on a match!' : 'Try a different filter.' }}
        </p>
      </div>

      <div v-else class="bets-list">
        <div class="stats-summary">
          <div class="stat-card">
            <div class="stat-value">{{ statsData.totalBets }}</div>
            <div class="stat-label">Total Bets</div>
          </div>
          <div class="stat-card">
            <div class="stat-value won">{{ statsData.wonBets }}</div>
            <div class="stat-label">Won</div>
          </div>
          <div class="stat-card">
            <div class="stat-value lost">{{ statsData.lostBets }}</div>
            <div class="stat-label">Lost</div>
          </div>
          <div class="stat-card">
            <div class="stat-value pending">{{ statsData.pendingBets }}</div>
            <div class="stat-label">Pending</div>
          </div>
        </div>

        <BetCard
          v-for="bet in filteredBets"
          :key="bet.id"
          :bet="bet"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { apiService } from '../services/api'
import { authService } from '../services/auth'
import BetCard from '../components/BetCard.vue'

// State
const bets = ref([])
const user = ref(null)
const isLoading = ref(false)
const error = ref(null)
const selectedFilter = ref('all')

// Filter options
const filters = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Won', value: 'won' },
  { label: 'Lost', value: 'lost' }
]

// Computed properties
const filteredBets = computed(() => {
  if (selectedFilter.value === 'all') return bets.value
  return bets.value.filter(bet => bet.status === selectedFilter.value)
})

const statsData = computed(() => {
  return {
    totalBets: bets.value.length,
    wonBets: bets.value.filter(bet => bet.status === 'won').length,
    lostBets: bets.value.filter(bet => bet.status === 'lost').length,
    pendingBets: bets.value.filter(bet => bet.status === 'pending').length
  }
})

// Methods
const fetchBets = async () => {
  isLoading.value = true
  error.value = null

  try {
    const response = await apiService.bets.getMyBets()
    bets.value = response.data.bets || []
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to load your bets. Please try again.'
    console.error('Failed to fetch bets:', err)
  } finally {
    isLoading.value = false
  }
}

const fetchUserData = async () => {
  try {
    user.value = authService.getUser()
    // Refresh user data from API to get latest coins
    const freshUser = await authService.getCurrentUser()
    user.value = freshUser
  } catch (err) {
    console.error('Failed to fetch user data:', err)
  }
}

// Lifecycle
onMounted(() => {
  fetchBets()
  fetchUserData()
})
</script>

<style scoped>
.my-bets-view {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding-bottom: 70px; /* Space for tab navigation */
}

.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h1 {
  font-size: 1.5rem;
  margin: 0;
}

.user-info {
  display: flex;
  align-items: center;
}

.coins {
  background-color: rgba(255, 255, 255, 0.2);
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.9rem;
}

.filter-tabs {
  display: flex;
  gap: 0.5rem;
  padding: 1rem;
  background-color: white;
  border-bottom: 1px solid #eee;
  overflow-x: auto;
}

.filter-tab {
  padding: 0.5rem 1rem;
  border: 2px solid #ddd;
  background-color: white;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.filter-tab:hover {
  border-color: #667eea;
  color: #667eea;
}

.filter-tab.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
}

.bets-container {
  flex: 1;
  padding: 1rem;
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
  color: #666;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-state .error-message {
  color: #c33;
  margin-bottom: 1rem;
}

.empty-state svg {
  stroke: #ccc;
  margin-bottom: 1rem;
}

.empty-state p {
  font-size: 1rem;
  margin-bottom: 0.5rem;
}

.empty-subtitle {
  font-size: 0.9rem;
  color: #999;
}

.bets-list {
  display: flex;
  flex-direction: column;
}

.stats-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background-color: white;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 0.25rem;
}

.stat-value.won {
  color: #28a745;
}

.stat-value.lost {
  color: #dc3545;
}

.stat-value.pending {
  color: #ffc107;
}

.stat-label {
  font-size: 0.75rem;
  color: #666;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.5px;
}

@media (max-width: 768px) {
  .stats-summary {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .header h1 {
    font-size: 1.25rem;
  }

  .stat-value {
    font-size: 1.5rem;
  }
}
</style>
