<template>
  <div class="matches-view">
    <div class="header">
      <div class="header-content">
        <h1>Matches</h1>
        <div class="user-info">
          <span class="username">{{ user?.username }}</span>
          <span class="coins">{{ user?.total_coins?.toFixed(1) || '0.0' }} coins</span>
          <button @click="handleLogout" class="btn-logout" title="Logout">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
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

    <div class="matches-container">
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading matches...</p>
      </div>

      <div v-else-if="error" class="error-state">
        <p class="error-message">{{ error }}</p>
        <button @click="fetchMatches" class="btn btn-primary">Try Again</button>
      </div>

      <div v-else-if="filteredMatches.length === 0" class="empty-state">
        <p>No {{ selectedFilter }} matches found.</p>
      </div>

      <div v-else class="matches-list">
        <MatchCard
          v-for="match in filteredMatches"
          :key="match.id"
          :match="match"
          @click="handleMatchClick(match)"
        />
      </div>
    </div>

    <!-- Betting Modal -->
    <BettingModal
      v-if="showBettingModal"
      :match="selectedMatch"
      @close="closeBettingModal"
      @bet-placed="onBetPlaced"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { apiService } from '../services/api'
import { authService } from '../services/auth'
import MatchCard from '../components/MatchCard.vue'
import BettingModal from '../components/BettingModal.vue'

const router = useRouter()

// State
const matches = ref([])
const user = ref(null)
const isLoading = ref(false)
const error = ref(null)
const selectedFilter = ref('upcoming')
const showBettingModal = ref(false)
const selectedMatch = ref(null)

// Filter options
const filters = [
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Live', value: 'live' },
  { label: 'Finished', value: 'confirmed' }
]

// Computed properties
const filteredMatches = computed(() => {
  if (selectedFilter.value === 'all') return matches.value
  return matches.value.filter(match => match.status === selectedFilter.value)
})

// Methods
const fetchMatches = async () => {
  isLoading.value = true
  error.value = null

  try {
    const response = await apiService.matches.getAll()
    matches.value = response.data.matches || []
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to load matches. Please try again.'
    console.error('Failed to fetch matches:', err)
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

const handleMatchClick = (match) => {
  // Check if match is locked
  const kickoffTime = new Date(match.kickoff_time)
  const isLocked = Date.now() >= kickoffTime.getTime()

  if (match.status !== 'upcoming' || isLocked) {
    // Don't open betting modal for locked or finished matches
    return
  }

  selectedMatch.value = match
  showBettingModal.value = true
}

const closeBettingModal = () => {
  showBettingModal.value = false
  selectedMatch.value = null
}

const onBetPlaced = async () => {
  // Refresh user data to update coin balance
  await fetchUserData()
  closeBettingModal()
}

const handleLogout = async () => {
  await authService.logout()
  router.push('/login')
}

// Lifecycle
onMounted(() => {
  fetchMatches()
  fetchUserData()
})
</script>

<style scoped>
.matches-view {
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
  gap: 0.75rem;
  font-size: 0.9rem;
}

.username {
  font-weight: 600;
}

.coins {
  background-color: rgba(255, 255, 255, 0.2);
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-weight: 700;
}

.btn-logout {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  transition: opacity 0.2s;
}

.btn-logout:hover {
  opacity: 0.8;
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

.matches-container {
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

.empty-state p {
  color: #666;
  font-size: 1rem;
}

.matches-list {
  display: flex;
  flex-direction: column;
}

@media (max-width: 480px) {
  .header h1 {
    font-size: 1.25rem;
  }

  .user-info {
    font-size: 0.8rem;
    gap: 0.5rem;
  }

  .coins {
    padding: 0.2rem 0.5rem;
  }
}
</style>
