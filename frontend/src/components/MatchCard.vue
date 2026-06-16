<template>
  <div class="match-card" @click="$emit('click', match)" :class="statusClass">
    <div class="match-header">
      <span class="match-stage">{{ match.stage }}</span>
      <span class="match-status" :class="`status-${match.status}`">
        {{ statusLabel }}
      </span>
    </div>

    <div class="match-content">
      <div class="team home-team">
        <div class="team-name">{{ match.home_team }}</div>
        <div v-if="match.home_score !== null" class="team-score">
          {{ match.home_score }}
        </div>
      </div>

      <div class="match-vs">
        <span v-if="match.home_score === null">VS</span>
        <span v-else class="score-separator">-</span>
      </div>

      <div class="team away-team">
        <div class="team-name">{{ match.away_team }}</div>
        <div v-if="match.away_score !== null" class="team-score">
          {{ match.away_score }}
        </div>
      </div>
    </div>

    <div class="match-time">
      <span class="kickoff-time">{{ formattedKickoffTime }}</span>
      <span v-if="match.group_name" class="group-name">Group {{ match.group_name }}</span>
    </div>

    <div v-if="showOdds && hasOdds" class="match-odds">
      <div class="odds-item">
        <span class="odds-label">Home</span>
        <span class="odds-value">{{ match.home_odds?.toFixed(2) }}</span>
      </div>
      <div class="odds-item">
        <span class="odds-label">Draw</span>
        <span class="odds-value">{{ match.draw_odds?.toFixed(2) }}</span>
      </div>
      <div class="odds-item">
        <span class="odds-label">Away</span>
        <span class="odds-value">{{ match.away_odds?.toFixed(2) }}</span>
      </div>
    </div>

    <div v-if="showResult && match.result" class="match-result">
      <span class="result-label">Result:</span>
      <span class="result-value">{{ resultLabel }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  match: {
    type: Object,
    required: true
  },
  showOdds: {
    type: Boolean,
    default: true
  },
  showResult: {
    type: Boolean,
    default: true
  }
})

defineEmits(['click'])

// Computed properties
const hasOdds = computed(() => {
  return props.match.home_odds && props.match.draw_odds && props.match.away_odds
})

const statusClass = computed(() => {
  return {
    'status-upcoming': props.match.status === 'upcoming',
    'status-live': props.match.status === 'live',
    'status-confirmed': props.match.status === 'confirmed',
    'status-locked': isLocked.value
  }
})

const isLocked = computed(() => {
  if (props.match.status !== 'upcoming') return true
  const kickoffTime = new Date(props.match.kickoff_time)
  return Date.now() >= kickoffTime.getTime()
})

const statusLabel = computed(() => {
  if (props.match.status === 'live') return 'LIVE'
  if (props.match.status === 'confirmed') return 'FINISHED'
  if (isLocked.value) return 'LOCKED'
  return 'UPCOMING'
})

const formattedKickoffTime = computed(() => {
  const date = new Date(props.match.kickoff_time)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })

  if (isToday) {
    return `Today, ${timeStr}`
  }

  const dateStr = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })

  return `${dateStr}, ${timeStr}`
})

const resultLabel = computed(() => {
  if (!props.match.result) return ''

  const resultMap = {
    'home_win': `${props.match.home_team} wins`,
    'away_win': `${props.match.away_team} wins`,
    'draw': 'Draw'
  }

  return resultMap[props.match.result] || props.match.result
})
</script>

<style scoped>
.match-card {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 1rem;
  margin-bottom: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.match-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  border-color: #667eea;
}

.match-card.status-locked:not(.status-confirmed):not(.status-live) {
  opacity: 0.7;
  cursor: not-allowed;
}

.match-card.status-live {
  border-color: #28a745;
  background: linear-gradient(135deg, #fff 0%, #e8f5e9 100%);
}

.match-card.status-confirmed {
  border-color: #6c757d;
}

.match-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.match-stage {
  font-size: 0.85rem;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
}

.match-status {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.match-status.status-upcoming {
  background-color: #e3f2fd;
  color: #1976d2;
}

.match-status.status-live {
  background-color: #28a745;
  color: white;
  animation: pulse 2s infinite;
}

.match-status.status-confirmed {
  background-color: #6c757d;
  color: white;
}

.match-status.status-locked {
  background-color: #ffc107;
  color: #333;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.match-content {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1rem;
}

.team {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.team-name {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.25rem;
}

.team-score {
  font-size: 1.5rem;
  font-weight: 700;
  color: #667eea;
}

.match-vs {
  font-size: 0.85rem;
  font-weight: 600;
  color: #999;
}

.score-separator {
  font-size: 1.25rem;
  color: #333;
}

.match-time {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-top: 1px solid #eee;
  margin-bottom: 0.75rem;
  font-size: 0.85rem;
  color: #666;
}

.kickoff-time {
  font-weight: 500;
}

.group-name {
  font-weight: 600;
  color: #667eea;
}

.match-odds {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.odds-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #f8f9fa;
  padding: 0.5rem;
  border-radius: 6px;
  transition: background-color 0.2s;
}

.odds-item:hover {
  background-color: #e9ecef;
}

.odds-label {
  font-size: 0.75rem;
  color: #666;
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  font-weight: 600;
}

.odds-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: #667eea;
}

.match-result {
  text-align: center;
  padding: 0.5rem;
  background-color: #f8f9fa;
  border-radius: 6px;
  margin-top: 0.75rem;
}

.result-label {
  font-size: 0.85rem;
  color: #666;
  margin-right: 0.5rem;
}

.result-value {
  font-size: 0.9rem;
  font-weight: 700;
  color: #28a745;
}

@media (max-width: 480px) {
  .team-name {
    font-size: 0.9rem;
  }

  .team-score {
    font-size: 1.25rem;
  }

  .match-time {
    flex-direction: column;
    gap: 0.25rem;
  }
}
</style>
