<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Place Your Bet</h2>
        <button @click="$emit('close')" class="btn-close" aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <div class="match-info">
          <div class="teams">
            <span class="team">{{ match.home_team }}</span>
            <span class="vs">VS</span>
            <span class="team">{{ match.away_team }}</span>
          </div>
          <div class="match-time">{{ formattedKickoffTime }}</div>
        </div>

        <div class="bet-form">
          <div class="form-group">
            <label>Select Outcome</label>
            <div class="outcome-buttons">
              <button
                v-for="option in outcomes"
                :key="option.value"
                @click="selectedOutcome = option.value"
                :class="['outcome-btn', { selected: selectedOutcome === option.value }]"
              >
                <div class="outcome-label">{{ option.label }}</div>
                <div class="outcome-odds">{{ option.odds }}</div>
              </button>
            </div>
          </div>

          <div class="form-group">
            <label for="coins-bet">Coins to Bet</label>
            <input
              id="coins-bet"
              v-model.number="coinsBet"
              type="number"
              min="1"
              step="0.5"
              placeholder="Enter amount"
              :disabled="!selectedOutcome || isSubmitting"
            />
          </div>

          <div v-if="selectedOutcome && coinsBet > 0" class="payout-info">
            <div class="payout-row">
              <span>Potential Payout:</span>
              <span class="payout-value">{{ potentialPayout.toFixed(2) }} coins</span>
            </div>
            <div class="payout-row">
              <span>Potential Profit:</span>
              <span class="payout-profit">+{{ potentialProfit.toFixed(2) }} coins</span>
            </div>
          </div>

          <div v-if="errorMessage" class="error-message">
            {{ errorMessage }}
          </div>

          <div v-if="successMessage" class="success-message">
            {{ successMessage }}
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="$emit('close')" class="btn btn-secondary" :disabled="isSubmitting">
          Cancel
        </button>
        <button
          @click="handlePlaceBet"
          class="btn btn-primary"
          :disabled="!canPlaceBet || isSubmitting"
        >
          <span v-if="!isSubmitting">Place Bet</span>
          <span v-else>Placing Bet...</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { apiService } from '../services/api'

const props = defineProps({
  match: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'bet-placed'])

// State
const selectedOutcome = ref(null)
const coinsBet = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// Computed properties
const outcomes = computed(() => [
  {
    label: props.match.home_team,
    value: 'home_win',
    odds: props.match.home_odds?.toFixed(2) || 'N/A'
  },
  {
    label: 'Draw',
    value: 'draw',
    odds: props.match.draw_odds?.toFixed(2) || 'N/A'
  },
  {
    label: props.match.away_team,
    value: 'away_win',
    odds: props.match.away_odds?.toFixed(2) || 'N/A'
  }
])

const selectedOdds = computed(() => {
  if (!selectedOutcome.value) return 0

  const oddsMap = {
    'home_win': props.match.home_odds,
    'draw': props.match.draw_odds,
    'away_win': props.match.away_odds
  }

  return oddsMap[selectedOutcome.value] || 0
})

const potentialPayout = computed(() => {
  if (!coinsBet.value || !selectedOdds.value) return 0
  return coinsBet.value * selectedOdds.value
})

const potentialProfit = computed(() => {
  return potentialPayout.value - coinsBet.value
})

const canPlaceBet = computed(() => {
  return selectedOutcome.value && coinsBet.value > 0 && !errorMessage.value
})

const formattedKickoffTime = computed(() => {
  const date = new Date(props.match.kickoff_time)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
})

// Methods
const handlePlaceBet = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  isSubmitting.value = true

  try {
    // Validate input
    if (coinsBet.value <= 0) {
      errorMessage.value = 'Please enter a valid amount'
      return
    }

    // Place bet via API
    const response = await apiService.bets.placeBet(
      props.match.id,
      selectedOutcome.value,
      coinsBet.value
    )

    // Show success message
    successMessage.value = `Bet placed successfully! Potential payout: ${response.data.potential_payout.toFixed(2)} coins`

    // Wait a moment before closing
    setTimeout(() => {
      emit('bet-placed')
    }, 1500)
  } catch (error) {
    errorMessage.value = error.response?.data?.error || 'Failed to place bet. Please try again.'
    console.error('Place bet error:', error)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background-color: white;
  border-radius: 12px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(50px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #eee;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #333;
}

.btn-close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  color: #666;
  transition: color 0.2s;
}

.btn-close:hover {
  color: #333;
}

.modal-body {
  padding: 1.5rem;
}

.match-info {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  text-align: center;
}

.teams {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.team {
  font-size: 1.1rem;
  font-weight: 700;
}

.vs {
  font-size: 0.85rem;
  opacity: 0.8;
}

.match-time {
  font-size: 0.85rem;
  opacity: 0.9;
}

.bet-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.75rem;
  font-weight: 600;
  color: #333;
}

.outcome-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.outcome-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem 0.5rem;
  border: 2px solid #ddd;
  background-color: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.outcome-btn:hover {
  border-color: #667eea;
  transform: translateY(-2px);
}

.outcome-btn.selected {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
}

.outcome-label {
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  text-align: center;
}

.outcome-odds {
  font-size: 1.1rem;
  font-weight: 700;
}

.payout-info {
  background-color: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  border-left: 4px solid #667eea;
}

.payout-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.payout-row:last-child {
  margin-bottom: 0;
}

.payout-value {
  font-weight: 700;
  font-size: 1.1rem;
  color: #667eea;
}

.payout-profit {
  font-weight: 700;
  font-size: 1.1rem;
  color: #28a745;
}

.error-message {
  background-color: #fee;
  color: #c33;
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.9rem;
  text-align: center;
  border: 1px solid #fcc;
}

.success-message {
  background-color: #e8f5e9;
  color: #2e7d32;
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.9rem;
  text-align: center;
  border: 1px solid #a5d6a7;
}

.modal-footer {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #eee;
}

.modal-footer .btn {
  flex: 1;
  padding: 0.875rem;
  font-size: 1rem;
  font-weight: 600;
}

@media (max-width: 480px) {
  .modal-content {
    margin: 0;
    border-radius: 12px 12px 0 0;
    max-height: 95vh;
  }

  .outcome-buttons {
    grid-template-columns: 1fr;
  }

  .outcome-btn {
    flex-direction: row;
    justify-content: space-between;
    padding: 1rem;
  }

  .teams {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>
