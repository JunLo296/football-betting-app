<template>
  <div class="ranking-view">
    <div class="header">
      <div class="header-content">
        <h1>Leaderboard</h1>
        <div class="user-info">
          <span class="coins">{{ user?.total_coins?.toFixed(1) || '0.0' }} coins</span>
        </div>
      </div>
    </div>

    <div class="ranking-container">
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading leaderboard...</p>
      </div>

      <div v-else-if="error" class="error-state">
        <p class="error-message">{{ error }}</p>
        <button @click="fetchLeaderboard" class="btn btn-primary">Try Again</button>
      </div>

      <div v-else-if="leaderboard.length === 0" class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <p>No players yet.</p>
      </div>

      <div v-else>
        <div v-if="currentUserRank" class="your-rank-card">
          <div class="rank-info">
            <span class="rank-label">Your Rank</span>
            <span class="rank-value">#{{ currentUserRank.rank }}</span>
          </div>
          <div class="coins-info">
            <span class="coins-label">Your Coins</span>
            <span class="coins-value">{{ currentUserRank.total_coins?.toFixed(1) }}</span>
          </div>
        </div>

        <LeaderboardTable
          :leaderboard="leaderboard"
          :current-user-id="user?.id"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { apiService } from '../services/api'
import { authService } from '../services/auth'
import LeaderboardTable from '../components/LeaderboardTable.vue'

// State
const leaderboard = ref([])
const user = ref(null)
const isLoading = ref(false)
const error = ref(null)

// Computed properties
const currentUserRank = computed(() => {
  if (!user.value || !leaderboard.value.length) return null
  return leaderboard.value.find(entry => entry.id === user.value.id)
})

// Methods
const fetchLeaderboard = async () => {
  isLoading.value = true
  error.value = null

  try {
    const response = await apiService.leaderboard.get()
    leaderboard.value = response.data.leaderboard || []
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to load leaderboard. Please try again.'
    console.error('Failed to fetch leaderboard:', err)
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
  fetchLeaderboard()
  fetchUserData()
})
</script>

<style scoped>
.ranking-view {
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

.ranking-container {
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
}

.your-rank-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.rank-info,
.coins-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.rank-label,
.coins-label {
  font-size: 0.85rem;
  opacity: 0.9;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.rank-value,
.coins-value {
  font-size: 2rem;
  font-weight: 700;
}

@media (max-width: 480px) {
  .header h1 {
    font-size: 1.25rem;
  }

  .your-rank-card {
    padding: 1rem;
  }

  .rank-value,
  .coins-value {
    font-size: 1.5rem;
  }
}
</style>
