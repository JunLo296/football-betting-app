<template>
  <div class="bet-card" :class="statusClass">
    <div class="bet-header">
      <span class="bet-status" :class="`status-${bet.status}`">
        {{ statusLabel }}
      </span>
      <span class="bet-date">{{ formattedDate }}</span>
    </div>

    <div class="bet-match">
      <div class="match-teams">
        <span class="team">{{ bet.match.home_team }}</span>
        <span class="vs">vs</span>
        <span class="team">{{ bet.match.away_team }}</span>
      </div>
      <div class="match-time">{{ formattedKickoffTime }}</div>
    </div>

    <div class="bet-details">
      <div class="detail-row">
        <span class="detail-label">Your Prediction:</span>
        <span class="detail-value prediction">{{ outcomeLabel }}</span>
      </div>

      <div class="detail-row">
        <span class="detail-label">Coins Bet:</span>
        <span class="detail-value">{{ bet.coins_bet?.toFixed(1) }}</span>
      </div>

      <div class="detail-row">
        <span class="detail-label">Odds:</span>
        <span class="detail-value">{{ bet.odds_at_bet_time?.toFixed(2) }}</span>
      </div>

      <div class="detail-row highlight">
        <span class="detail-label">
          {{ bet.status === 'pending' ? 'Potential Payout:' : 'Payout:' }}
        </span>
        <span class="detail-value payout" :class="payoutClass">
          {{ payoutAmount.toFixed(1) }} coins
        </span>
      </div>
    </div>

    <div v-if="bet.is_winner !== null" class="bet-result">
      <div v-if="bet.is_winner" class="result-won">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>You Won! +{{ profit.toFixed(1) }} coins</span>
      </div>
      <div v-else class="result-lost">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Lost -{{ bet.coins_bet?.toFixed(1) }} coins</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  bet: {
    type: Object,
    required: true
  }
})

// Computed properties
const statusClass = computed(() => {
  return {
    'status-pending': props.bet.status === 'pending',
    'status-won': props.bet.status === 'won',
    'status-lost': props.bet.status === 'lost'
  }
})

const statusLabel = computed(() => {
  const labels = {
    'pending': 'PENDING',
    'won': 'WON',
    'lost': 'LOST'
  }
  return labels[props.bet.status] || props.bet.status?.toUpperCase()
})

const outcomeLabel = computed(() => {
  const labels = {
    'home_win': props.bet.match.home_team,
    'away_win': props.bet.match.away_team,
    'draw': 'Draw'
  }
  return labels[props.bet.outcome] || props.bet.outcome
})

const payoutAmount = computed(() => {
  if (props.bet.status === 'won') {
    return props.bet.payout || props.bet.potential_payout || 0
  }
  return props.bet.potential_payout || 0
})

const profit = computed(() => {
  return payoutAmount.value - props.bet.coins_bet
})

const payoutClass = computed(() => {
  return {
    'payout-pending': props.bet.status === 'pending',
    'payout-won': props.bet.status === 'won',
    'payout-lost': props.bet.status === 'lost'
  }
})

const formattedDate = computed(() => {
  if (!props.bet.placed_at) return ''
  const date = new Date(props.bet.placed_at)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
})

const formattedKickoffTime = computed(() => {
  if (!props.bet.match.kickoff_time) return ''
  const date = new Date(props.bet.match.kickoff_time)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
})
</script>

<style scoped>
.bet-card {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 1rem;
  margin-bottom: 1rem;
  border-left: 4px solid transparent;
  transition: all 0.2s;
}

.bet-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.bet-card.status-pending {
  border-left-color: #ffc107;
}

.bet-card.status-won {
  border-left-color: #28a745;
  background: linear-gradient(135deg, #fff 0%, #e8f5e9 100%);
}

.bet-card.status-lost {
  border-left-color: #dc3545;
  background: linear-gradient(135deg, #fff 0%, #fce4e4 100%);
}

.bet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.bet-status {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.bet-status.status-pending {
  background-color: #fff3cd;
  color: #856404;
}

.bet-status.status-won {
  background-color: #28a745;
  color: white;
}

.bet-status.status-lost {
  background-color: #dc3545;
  color: white;
}

.bet-date {
  font-size: 0.85rem;
  color: #666;
}

.bet-match {
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #eee;
}

.match-teams {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.team {
  font-size: 1rem;
  font-weight: 700;
  color: #333;
}

.vs {
  font-size: 0.8rem;
  color: #999;
  font-weight: 600;
}

.match-time {
  text-align: center;
  font-size: 0.85rem;
  color: #666;
}

.bet-details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-row.highlight {
  padding: 0.75rem;
  background-color: #f8f9fa;
  border-radius: 6px;
  margin-top: 0.25rem;
}

.detail-label {
  font-size: 0.9rem;
  color: #666;
}

.detail-value {
  font-size: 0.95rem;
  font-weight: 600;
  color: #333;
}

.detail-value.prediction {
  color: #667eea;
  font-weight: 700;
}

.detail-value.payout {
  font-size: 1.1rem;
  font-weight: 700;
}

.payout-pending {
  color: #ffc107;
}

.payout-won {
  color: #28a745;
}

.payout-lost {
  color: #dc3545;
}

.bet-result {
  padding: 0.75rem;
  border-radius: 6px;
  font-weight: 600;
}

.result-won,
.result-lost {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.result-won {
  color: #28a745;
  background-color: #d4edda;
}

.result-lost {
  color: #dc3545;
  background-color: #f8d7da;
}

@media (max-width: 480px) {
  .match-teams {
    flex-direction: column;
    gap: 0.25rem;
  }

  .vs {
    display: none;
  }
}
</style>
