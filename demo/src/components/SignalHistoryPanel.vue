<template>
  <section class="history">
    <header class="hist-header">
      <div class="title">
        <span class="icon">📊</span>
        <span>SIGNAL HISTORY</span>
      </div>

      <div class="hist-stats">
        <div :class="['hs', stats.pipsNet >= 0 ? 'pos' : 'neg']">
          <span class="v">{{ stats.pipsNet >= 0 ? '+' : '' }}{{ stats.pipsNet }}</span>
          <span class="l">PIPS</span>
        </div>
        <div :class="['hs', stats.winRate >= 50 ? 'pos' : 'neg']">
          <span class="v">{{ stats.winRate }}%</span>
          <span class="l">WIN</span>
        </div>
        <div class="hs">
          <span class="v">{{ stats.total }}</span>
          <span class="l">TRADES</span>
        </div>
      </div>

      <div class="hist-filters">
        <button
          v-for="f in filters"
          :key="f.value"
          :class="{ active: filter === f.value }"
          @click="filter = f.value"
        >{{ f.label }}</button>
      </div>
    </header>

    <table class="hist-table">
      <thead>
        <tr>
          <th>SYMBOL</th>
          <th>TF</th>
          <th>ENTRY</th>
          <th>EXIT</th>
          <th>REASON</th>
          <th class="num">PIPS</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="filteredHistory.length === 0">
          <td colspan="6" class="empty">No closed trades yet</td>
        </tr>
        <tr
          v-for="t in filteredHistory"
          :key="t.id"
          @click="$emit('select', t)"
          class="row"
        >
          <td class="symbol">{{ t.symbol }}</td>
          <td>{{ t.tfLabel }}</td>
          <td>${{ fmtShort(t.et2) }}–${{ fmtShort(t.et1) }}</td>
          <td>${{ fmtShort(t.exitPrice) }}</td>
          <td>
            <span :class="['reason-badge', reasonClass(t)]">{{ reasonLabel(t) }}</span>
          </td>
          <td :class="['num', 'pips', (t.finalPips || 0) >= 0 ? 'pos' : 'neg']">
            {{ (t.finalPips || 0) >= 0 ? '+' : '' }}{{ Math.round(t.finalPips || 0) }} pips
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  history: { type: Array, default: () => [] },
  stats: { type: Object, default: () => ({ pipsNet: 0, winRate: 0, total: 0 }) },
})

defineEmits(['select'])

const filters = [
  { label: '1D', value: 86400000 },
  { label: '1W', value: 7 * 86400000 },
  { label: '1M', value: 30 * 86400000 },
  { label: '1Y', value: 365 * 86400000 },
  { label: 'ALL', value: 0 },
]

const filter = ref(0)

const filteredHistory = computed(() => {
  if (!filter.value) return props.history
  const cutoff = Date.now() - filter.value
  return props.history.filter(t => (t.closedAt || 0) >= cutoff)
})

function fmtShort(v) {
  if (v === null || v === undefined) return '—'
  if (Math.abs(v) >= 1000) return v.toFixed(2)
  if (Math.abs(v) >= 10) return v.toFixed(3)
  return v.toFixed(5)
}

function reasonLabel(t) {
  if (t.closeReason === 'STOP_LOSS_HIT') return 'Stop Loss Hit'
  const m = (t.closeReason || '').match(/TP(\d)/)
  if (m) return `Target-TP${m[1]} Reached`
  return 'Expired'
}
function reasonClass(t) {
  if (t.closeReason === 'STOP_LOSS_HIT') return 'loss'
  if (/TP\d/.test(t.closeReason || '')) return 'win'
  return 'expired'
}
</script>

<style scoped>
.history {
  background: #0d1421;
  border-top: 1px solid rgba(75, 85, 99, 0.3);
  font-family: 'Inter', sans-serif;
  color: #e5e7eb;
  display: flex;
  flex-direction: column;
  max-height: 280px;
  overflow: hidden;
}

.hist-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(75, 85, 99, 0.3);
  background: #131b2e;
}

.title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: #8b949e;
}
.title .icon { font-size: 12px; }

.hist-stats {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  justify-content: center;
}
.hs {
  display: flex;
  align-items: baseline;
  gap: 5px;
}
.hs .v {
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 700;
  font-size: 14px;
}
.hs.pos .v { color: #10b981; }
.hs.neg .v { color: #ef4444; }
.hs .l {
  font-size: 9px;
  color: #6b7280;
  letter-spacing: 1px;
}

.hist-filters {
  display: flex;
  gap: 4px;
}
.hist-filters button {
  background: transparent;
  border: 1px solid rgba(75, 85, 99, 0.3);
  color: #8b949e;
  font-size: 10px;
  padding: 3px 9px;
  border-radius: 4px;
  cursor: pointer;
  font-family: inherit;
}
.hist-filters button.active {
  background: #f59e0b;
  border-color: #f59e0b;
  color: #0d1421;
  font-weight: 700;
}

.hist-table {
  width: 100%;
  border-collapse: collapse;
  flex: 1;
  display: block;
  overflow-y: auto;
}
.hist-table thead, .hist-table tbody, .hist-table tr {
  display: table;
  width: 100%;
  table-layout: fixed;
}
.hist-table th {
  background: #0d1421;
  font-size: 9px;
  letter-spacing: 1px;
  font-weight: 600;
  color: #6b7280;
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid rgba(75, 85, 99, 0.3);
  position: sticky;
  top: 0;
  z-index: 1;
}
.hist-table th.num, .hist-table td.num { text-align: right; }

.hist-table td {
  padding: 8px 12px;
  border-bottom: 1px solid rgba(75, 85, 99, 0.18);
  font-size: 12px;
  font-family: 'IBM Plex Mono', monospace;
}

.row { cursor: pointer; }
.row:hover td { background: rgba(75, 85, 99, 0.1); }

.symbol { font-weight: 600; color: #e5e7eb; }

.reason-badge {
  font-family: 'Inter', sans-serif;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 4px;
}
.reason-badge.loss { background: rgba(239, 68, 68, 0.18); color: #ef4444; }
.reason-badge.win  { background: rgba(16, 185, 129, 0.18); color: #10b981; }
.reason-badge.expired { background: rgba(107, 114, 128, 0.18); color: #8b949e; }

.pips.pos { color: #10b981; }
.pips.neg { color: #ef4444; }

.empty {
  text-align: center;
  color: #6b7280;
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  padding: 30px !important;
}
</style>
