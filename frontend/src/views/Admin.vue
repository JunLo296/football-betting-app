<template>
  <div class="admin-view">
    <div class="header">
      <h1>Admin Panel</h1>
    </div>

    <div class="admin-container">
      <div class="section-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          @click="activeTab = tab.value"
          :class="['tab-btn', { active: activeTab === tab.value }]"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Add Match Section -->
      <div v-if="activeTab === 'matches'" class="section">
        <h2>Add New Match</h2>
        <form @submit.prevent="handleAddMatch" class="admin-form">
          <div class="form-row">
            <div class="form-group">
              <label for="home-team">Home Team</label>
              <input id="home-team" v-model="matchForm.home_team" required />
            </div>
            <div class="form-group">
              <label for="away-team">Away Team</label>
              <input id="away-team" v-model="matchForm.away_team" required />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="kickoff-time">Kickoff Time</label>
              <input id="kickoff-time" v-model="matchForm.kickoff_time" type="datetime-local" required />
            </div>
            <div class="form-group">
              <label for="match-date">Match Date</label>
              <input id="match-date" v-model="matchForm.match_date" type="date" required />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="stage">Stage</label>
              <input id="stage" v-model="matchForm.stage" placeholder="e.g., Group Stage" required />
            </div>
            <div class="form-group">
              <label for="group-name">Group Name (optional)</label>
              <input id="group-name" v-model="matchForm.group_name" placeholder="e.g., A" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="home-odds">Home Odds</label>
              <input id="home-odds" v-model.number="matchForm.home_odds" type="number" step="0.01" required />
            </div>
            <div class="form-group">
              <label for="draw-odds">Draw Odds</label>
              <input id="draw-odds" v-model.number="matchForm.draw_odds" type="number" step="0.01" required />
            </div>
            <div class="form-group">
              <label for="away-odds">Away Odds</label>
              <input id="away-odds" v-model.number="matchForm.away_odds" type="number" step="0.01" required />
            </div>
          </div>

          <div v-if="matchError" class="error-message">{{ matchError }}</div>
          <div v-if="matchSuccess" class="success-message">{{ matchSuccess }}</div>

          <button type="submit" class="btn btn-primary" :disabled="isMatchLoading">
            <span v-if="!isMatchLoading">Add Match</span>
            <span v-else>Adding...</span>
          </button>
        </form>
      </div>

      <!-- Update Odds Section -->
      <div v-if="activeTab === 'odds'" class="section">
        <h2>Update Match Odds</h2>
        <div v-if="matches.length === 0" class="empty-state">
          <p>No matches available.</p>
        </div>
        <div v-else class="matches-list">
          <div v-for="match in matches" :key="match.id" class="match-item">
            <div class="match-details">
              <div class="teams">{{ match.home_team }} vs {{ match.away_team }}</div>
              <div class="match-info">{{ formatDate(match.kickoff_time) }} - {{ match.stage }}</div>
            </div>
            <div class="odds-inputs">
              <input v-model.number="match.home_odds" type="number" step="0.01" class="odds-input" />
              <input v-model.number="match.draw_odds" type="number" step="0.01" class="odds-input" />
              <input v-model.number="match.away_odds" type="number" step="0.01" class="odds-input" />
              <button @click="updateOdds(match)" class="btn btn-secondary btn-sm">Update</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Confirm Results Section -->
      <div v-if="activeTab === 'results'" class="section">
        <h2>Confirm Match Results</h2>
        <div v-if="matches.length === 0" class="empty-state">
          <p>No matches available.</p>
        </div>
        <div v-else class="matches-list">
          <div v-for="match in matches" :key="match.id" class="match-item">
            <div class="match-details">
              <div class="teams">{{ match.home_team }} vs {{ match.away_team }}</div>
              <div class="match-info">{{ formatDate(match.kickoff_time) }} - Status: {{ match.status }}</div>
            </div>
            <div v-if="match.status !== 'confirmed'" class="result-inputs">
              <input v-model.number="match.home_score_input" type="number" min="0" placeholder="Home" class="score-input" />
              <input v-model.number="match.away_score_input" type="number" min="0" placeholder="Away" class="score-input" />
              <select v-model="match.result_input" class="result-select">
                <option value="">Select Result</option>
                <option value="home_win">Home Win</option>
                <option value="draw">Draw</option>
                <option value="away_win">Away Win</option>
              </select>
              <button @click="confirmResult(match)" class="btn btn-primary btn-sm">Confirm</button>
            </div>
            <div v-else class="confirmed-result">
              <span>{{ match.home_score }} - {{ match.away_score }}</span>
              <span class="result-badge">{{ match.result }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Grant Coins Section -->
      <div v-if="activeTab === 'coins'" class="section">
        <h2>Grant Coins to Users</h2>
        <div v-if="users.length === 0" class="empty-state">
          <p>No users available.</p>
        </div>
        <div v-else class="users-list">
          <div v-for="userItem in users" :key="userItem.id" class="user-item">
            <div class="user-details">
              <div class="username">{{ userItem.username }}</div>
              <div class="user-coins">Current: {{ userItem.total_coins?.toFixed(1) }} coins</div>
            </div>
            <div class="grant-inputs">
              <input v-model.number="userItem.grant_amount" type="number" step="0.5" placeholder="Amount" class="amount-input" />
              <input v-model="userItem.grant_reason" type="text" placeholder="Reason (optional)" class="reason-input" />
              <button @click="grantCoins(userItem)" class="btn btn-primary btn-sm">Grant</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Users List Section -->
      <div v-if="activeTab === 'users'" class="section">
        <h2>All Users</h2>
        <div v-if="users.length === 0" class="empty-state">
          <p>No users available.</p>
        </div>
        <div v-else class="users-table">
          <div class="table-header">
            <div>Username</div>
            <div>Email</div>
            <div>Coins</div>
            <div>Admin</div>
            <div>Registered</div>
          </div>
          <div v-for="userItem in users" :key="userItem.id" class="table-row">
            <div>{{ userItem.username }}</div>
            <div>{{ userItem.email || 'N/A' }}</div>
            <div>{{ userItem.total_coins?.toFixed(1) }}</div>
            <div>{{ userItem.is_admin ? 'Yes' : 'No' }}</div>
            <div>{{ formatDate(userItem.created_at) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { apiService } from '../services/api'

// State
const activeTab = ref('matches')
const matches = ref([])
const users = ref([])
const isMatchLoading = ref(false)
const matchError = ref('')
const matchSuccess = ref('')

// Tabs
const tabs = [
  { label: 'Add Match', value: 'matches' },
  { label: 'Update Odds', value: 'odds' },
  { label: 'Confirm Results', value: 'results' },
  { label: 'Grant Coins', value: 'coins' },
  { label: 'Users', value: 'users' }
]

// Match form
const matchForm = ref({
  home_team: '',
  away_team: '',
  kickoff_time: '',
  match_date: '',
  stage: '',
  group_name: '',
  home_odds: null,
  draw_odds: null,
  away_odds: null
})

// Methods
const fetchMatches = async () => {
  try {
    const response = await apiService.matches.getAll()
    matches.value = response.data.matches.map(match => ({
      ...match,
      home_score_input: match.home_score,
      away_score_input: match.away_score,
      result_input: match.result
    }))
  } catch (error) {
    console.error('Failed to fetch matches:', error)
  }
}

const fetchUsers = async () => {
  try {
    const response = await apiService.admin.getUsers()
    users.value = response.data.users.map(user => ({
      ...user,
      grant_amount: null,
      grant_reason: ''
    }))
  } catch (error) {
    console.error('Failed to fetch users:', error)
  }
}

const handleAddMatch = async () => {
  matchError.value = ''
  matchSuccess.value = ''
  isMatchLoading.value = true

  try {
    await apiService.admin.createMatch(matchForm.value)
    matchSuccess.value = 'Match added successfully!'

    // Reset form
    matchForm.value = {
      home_team: '',
      away_team: '',
      kickoff_time: '',
      match_date: '',
      stage: '',
      group_name: '',
      home_odds: null,
      draw_odds: null,
      away_odds: null
    }

    // Refresh matches list
    await fetchMatches()

    setTimeout(() => {
      matchSuccess.value = ''
    }, 3000)
  } catch (error) {
    matchError.value = error.response?.data?.error || 'Failed to add match'
  } finally {
    isMatchLoading.value = false
  }
}

const updateOdds = async (match) => {
  try {
    await apiService.admin.updateOdds(match.id, {
      home_odds: match.home_odds,
      draw_odds: match.draw_odds,
      away_odds: match.away_odds
    })
    alert('Odds updated successfully!')
  } catch (error) {
    alert(error.response?.data?.error || 'Failed to update odds')
  }
}

const confirmResult = async (match) => {
  if (!match.result_input || match.home_score_input == null || match.away_score_input == null) {
    alert('Please fill in all result fields')
    return
  }

  try {
    await apiService.admin.confirmResult(match.id, {
      home_score: match.home_score_input,
      away_score: match.away_score_input,
      result: match.result_input
    })
    alert('Result confirmed and payouts processed!')
    await fetchMatches()
  } catch (error) {
    alert(error.response?.data?.error || 'Failed to confirm result')
  }
}

const grantCoins = async (userItem) => {
  if (!userItem.grant_amount || userItem.grant_amount <= 0) {
    alert('Please enter a valid amount')
    return
  }

  try {
    await apiService.admin.grantCoins(userItem.id, userItem.grant_amount, userItem.grant_reason)
    alert(`Granted ${userItem.grant_amount} coins to ${userItem.username}!`)
    userItem.grant_amount = null
    userItem.grant_reason = ''
    await fetchUsers()
  } catch (error) {
    alert(error.response?.data?.error || 'Failed to grant coins')
  }
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

// Lifecycle
onMounted(() => {
  fetchMatches()
  fetchUsers()
})
</script>

<style scoped>
.admin-view {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding-bottom: 70px;
}

.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header h1 {
  font-size: 1.5rem;
  margin: 0;
}

.admin-container {
  flex: 1;
  padding: 1rem;
}

.section-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

.tab-btn {
  padding: 0.75rem 1.25rem;
  border: 2px solid #ddd;
  background-color: white;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.tab-btn:hover {
  border-color: #667eea;
  color: #667eea;
}

.tab-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
}

.section {
  background-color: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.section h2 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: #333;
}

.admin-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.matches-list,
.users-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.match-item,
.user-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  gap: 1rem;
}

.match-details,
.user-details {
  flex: 1;
}

.teams,
.username {
  font-weight: 700;
  color: #333;
  margin-bottom: 0.25rem;
}

.match-info,
.user-coins {
  font-size: 0.85rem;
  color: #666;
}

.odds-inputs,
.result-inputs,
.grant-inputs {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.odds-input,
.score-input,
.amount-input {
  width: 80px;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.result-select,
.reason-input {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.reason-input {
  width: 150px;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
}

.confirmed-result {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-weight: 600;
  color: #28a745;
}

.result-badge {
  background-color: #28a745;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

.users-table {
  display: flex;
  flex-direction: column;
}

.table-header,
.table-row {
  display: grid;
  grid-template-columns: 1fr 1.5fr 0.8fr 0.6fr 1fr;
  gap: 1rem;
  padding: 0.75rem;
  border-bottom: 1px solid #eee;
}

.table-header {
  background-color: #f8f9fa;
  font-weight: 700;
  border-radius: 8px 8px 0 0;
}

.table-row:hover {
  background-color: #f8f9fa;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.error-message,
.success-message {
  padding: 0.75rem;
  border-radius: 6px;
  text-align: center;
}

.error-message {
  background-color: #fee;
  color: #c33;
  border: 1px solid #fcc;
}

.success-message {
  background-color: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #a5d6a7;
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .match-item,
  .user-item {
    flex-direction: column;
    align-items: stretch;
  }

  .odds-inputs,
  .result-inputs,
  .grant-inputs {
    flex-wrap: wrap;
  }

  .users-table {
    overflow-x: auto;
  }

  .table-header,
  .table-row {
    grid-template-columns: 1fr 1fr 0.8fr 0.6fr 1fr;
    font-size: 0.85rem;
  }
}
</style>
