<template>
  <div class="leaderboard-table">
    <div class="table-header">
      <div class="header-cell rank">Rank</div>
      <div class="header-cell username">Player</div>
      <div class="header-cell coins">Coins</div>
    </div>

    <div class="table-body">
      <div
        v-for="entry in leaderboard"
        :key="entry.id"
        :class="['table-row', { 'current-user': entry.id === currentUserId, 'top-three': entry.rank <= 3 }]"
      >
        <div class="cell rank">
          <div class="rank-badge" :class="`rank-${entry.rank}`">
            <span v-if="entry.rank === 1" class="trophy">🥇</span>
            <span v-else-if="entry.rank === 2" class="trophy">🥈</span>
            <span v-else-if="entry.rank === 3" class="trophy">🥉</span>
            <span v-else>{{ entry.rank }}</span>
          </div>
        </div>

        <div class="cell username">
          <span class="username-text">{{ entry.username }}</span>
          <span v-if="entry.is_admin" class="admin-badge">ADMIN</span>
          <span v-if="entry.id === currentUserId" class="you-badge">YOU</span>
        </div>

        <div class="cell coins">
          <span class="coins-value">{{ entry.total_coins?.toFixed(1) || '0.0' }}</span>
          <span class="coins-label">coins</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  leaderboard: {
    type: Array,
    required: true
  },
  currentUserId: {
    type: Number,
    default: null
  }
})
</script>

<style scoped>
.leaderboard-table {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 80px 1fr 120px;
  gap: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 700;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.header-cell {
  display: flex;
  align-items: center;
}

.header-cell.rank {
  justify-content: center;
}

.header-cell.coins {
  justify-content: flex-end;
}

.table-body {
  max-height: 600px;
  overflow-y: auto;
}

.table-row {
  display: grid;
  grid-template-columns: 80px 1fr 120px;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid #eee;
  transition: all 0.2s;
}

.table-row:hover {
  background-color: #f8f9fa;
}

.table-row.top-three {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.05) 0%, rgba(255, 215, 0, 0.1) 100%);
}

.table-row.current-user {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  border-left: 4px solid #667eea;
  font-weight: 600;
}

.cell {
  display: flex;
  align-items: center;
}

.cell.rank {
  justify-content: center;
}

.cell.username {
  gap: 0.5rem;
  flex-wrap: wrap;
}

.cell.coins {
  justify-content: flex-end;
  gap: 0.25rem;
}

.rank-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-weight: 700;
  font-size: 1rem;
  background-color: #f8f9fa;
  color: #333;
}

.rank-badge.rank-1,
.rank-badge.rank-2,
.rank-badge.rank-3 {
  font-size: 1.5rem;
}

.trophy {
  display: flex;
  align-items: center;
  justify-content: center;
}

.username-text {
  font-size: 1rem;
  color: #333;
}

.admin-badge,
.you-badge {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.admin-badge {
  background-color: #ffc107;
  color: #333;
}

.you-badge {
  background-color: #667eea;
  color: white;
}

.coins-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: #667eea;
}

.coins-label {
  font-size: 0.85rem;
  color: #666;
}

/* Scrollbar styling */
.table-body::-webkit-scrollbar {
  width: 8px;
}

.table-body::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.table-body::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

.table-body::-webkit-scrollbar-thumb:hover {
  background: #555;
}

@media (max-width: 480px) {
  .table-header,
  .table-row {
    grid-template-columns: 60px 1fr 100px;
    gap: 0.5rem;
    padding: 0.75rem;
  }

  .rank-badge {
    width: 36px;
    height: 36px;
    font-size: 0.9rem;
  }

  .rank-badge.rank-1,
  .rank-badge.rank-2,
  .rank-badge.rank-3 {
    font-size: 1.25rem;
  }

  .username-text {
    font-size: 0.9rem;
  }

  .coins-value {
    font-size: 1rem;
  }

  .coins-label {
    font-size: 0.75rem;
  }
}
</style>
