<template>
  <aside class="live-signals-panel">
    <header class="top-stats">
      <div class="month">
        <span class="cal">📅</span>
        <span>{{ monthLabel }}</span>
      </div>
      <div class="stat">
        <div class="value">{{ liveSignals.length }}</div>
        <div class="label">ACTIVE</div>
      </div>
      <div class="stat">
        <div :class="['value', stats.winRate >= 50 ? 'pos' : 'neg']">{{ stats.winRate }}%</div>
        <div class="label">WIN RATE</div>
      </div>
      <div class="stat">
        <div :class="['value', stats.pipsNet >= 0 ? 'pos' : 'neg']">
          {{ stats.pipsNet >= 0 ? '+' : '' }}{{ stats.pipsNet }}
        </div>
        <div class="label">PIPS</div>
      </div>
      <div class="stat">
        <div class="value">{{ stats.total }}</div>
        <div class="label">TOTAL</div>
      </div>
    </header>

    <section class="panel-block">
      <div class="block-header">
        <div class="block-title">
          <span class="dot"></span>
          LIVE SIGNALS
          <span class="count-pill">{{ liveSignals.length }}</span>
        </div>
        <button class="icon-btn" :class="{ active: expanded }" @click="expanded = !expanded" title="Expand">⤢</button>
      </div>

      <div class="symbol-filters" v-if="availableSymbols.length > 1">
        <button 
          class="sym-chip" 
          :class="{ active: selectedSymFilter === 'ALL' }" 
          @click="selectedSymFilter = 'ALL'"
        >ALL ({{ liveSignals.length }})</button>
        <button 
          v-for="sym in availableSymbols" 
          :key="sym"
          class="sym-chip"
          :class="{ active: selectedSymFilter === sym }"
          @click="selectedSymFilter = sym"
        >{{ sym.replace('USDT', '') }}</button>
      </div>

      <div class="signals-list" :class="{ expanded }">
        <div v-if="filteredLiveSignals.length === 0" class="empty">
          No active signals — waiting for next structural shift
        </div>

        <div
          v-for="s in filteredLiveSignals"
          :key="s.id"
          class="signal-card"
          @click="$emit('select', s)"
        >
          <div class="card-row top">
            <span class="kind">{{ s.kind === 'main' ? 'M' : 'D' }}</span>
            <span class="tf">{{ s.tfLabel }}</span>
            <span class="symbol">{{ s.symbol }}</span>
            <span :class="['side', s.dir === 1 ? 'buy' : 'sell']">{{ s.side }}</span>
          </div>
          <div class="card-row mid">
            <span class="price">${{ fmt(s.livePrice ?? s.avg) }}</span>
            <span :class="['pct', livePct(s) >= 0 ? 'pos' : 'neg']">
              {{ livePct(s) >= 0 ? '+' : '' }}{{ livePct(s).toFixed(2) }}%
            </span>
          </div>
          <div class="card-row meta">
            <span>● Entry {{ fmtShort(s.et2) }} - {{ fmtShort(s.et1) }}</span>
            <span class="sep">●</span>
            <span class="sl">SL ${{ fmtShort(s.sl) }}</span>
          </div>

          <div class="progress-row">
            <div class="progress-track">
              <div
                class="progress-fill"
                :class="{ neg: liveProgress(s) < 0 }"
                :style="{ width: Math.min(Math.abs(liveProgress(s)), 100) + '%' }"
              ></div>
              <div
                v-for="(tp, i) in s.tps"
                :key="`m${i}`"
                class="progress-mark"
                :class="{ hit: s.hits[i] }"
                :style="{ left: tpProgressPos(s, i) + '%' }"
                :title="`TP${i+1}`"
              ></div>
            </div>
          </div>

          <div class="tp-strip">
            <span
              v-for="(tp, i) in s.tps"
              :key="i"
              :class="['tp-chip', { hit: s.hits[i] }]"
              :title="`TP${i+1} @ ${fmtShort(tp)}`"
            >TP{{ i + 1 }}</span>
          </div>
          <div :class="['card-status', statusClass(s)]">
            <span>{{ statusLabel(s) }}</span>
            <span class="pips">{{ pipsLabel(s) }}</span>
          </div>
        </div>
      </div>
    </section>
  </aside>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  liveSignals: { type: Array, default: () => [] },
  stats: { type: Object, default: () => ({ total: 0, wins: 0, losses: 0, pipsNet: 0, winRate: 0 }) },
})

defineEmits(['select'])

const expanded = ref(false)
const selectedSymFilter = ref('ALL')

const availableSymbols = computed(() => {
  const set = new Set(props.liveSignals.map(s => s.symbol))
  return Array.from(set)
})

const filteredLiveSignals = computed(() => {
  if (selectedSymFilter.value === 'ALL') return props.liveSignals
  return props.liveSignals.filter(s => s.symbol === selectedSymFilter.value)
})

const monthLabel = computed(() => {
  const d = new Date()
  return d.toLocaleString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()
})

function fmt(v) {
  if (v === null || v === undefined) return '—'
  if (Math.abs(v) >= 1000) return v.toFixed(2)
  if (Math.abs(v) >= 10) return v.toFixed(3)
  return v.toFixed(5)
}
function fmtShort(v) {
  if (v === null || v === undefined) return '—'
  if (Math.abs(v) >= 1000) return v.toFixed(0)
  if (Math.abs(v) >= 10) return v.toFixed(2)
  return v.toFixed(4)
}

function livePct(s) {
  // Live PnL % using the current price (close of in-progress bar).
  const px = s.livePrice ?? s.avg
  if (!s.avg) return 0
  const move = s.dir === 1 ? px - s.avg : s.avg - px
  return (move / s.avg) * 100
}

function liveProgress(s) {
  // % of the path AVG → TP6 covered by current price.
  const px = s.livePrice ?? s.avg
  const target = s.tps[s.tps.length - 1]
  const span = Math.abs(target - s.avg)
  if (span === 0) return 0
  const move = s.dir === 1 ? px - s.avg : s.avg - px
  return (move / span) * 100
}

function tpProgressPos(s, i) {
  // Position of each TP marker on the AVG → TP6 axis.
  const tp = s.tps[i]
  const target = s.tps[s.tps.length - 1]
  const span = Math.abs(target - s.avg)
  if (span === 0) return 0
  const offset = Math.abs(tp - s.avg)
  return (offset / span) * 100
}

function statusLabel(s) {
  const lastHit = s.hits.lastIndexOf(true)
  if (lastHit >= 0) return `TARGET-TP${lastHit + 1} REACHED`
  if (s.triggered) return 'IN TRADE'
  return 'WAITING ENTRY'
}
function statusClass(s) {
  const lastHit = s.hits.lastIndexOf(true)
  if (lastHit >= 0) return 'tp'
  if (s.triggered) return 'live'
  return 'wait'
}
function pipsLabel(s) {
  const v = Math.round(s.maxPips || 0)
  const sign = v >= 0 ? '+' : ''
  return `${sign}${v} pips`
}
</script>

<style scoped>
.live-signals-panel {
  width: 360px;
  flex-shrink: 0;
  background: #0d1421;
  border-left: 1px solid rgba(75, 85, 99, 0.3);
  display: flex;
  flex-direction: column;
  font-family: 'Inter', sans-serif;
  color: #e5e7eb;
  overflow: hidden;
}

.top-stats {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(75, 85, 99, 0.3);
  background: #131b2e;
}
.month {
  display: flex;
  align-items: center;
  gap: 5px;
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
}
.stat { text-align: center; flex: 1; }
.stat .value {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 16px;
  font-weight: 700;
  color: #e5e7eb;
}
.stat .value.pos { color: #10b981; }
.stat .value.neg { color: #ef4444; }
.stat .label {
  font-size: 9px;
  letter-spacing: 1px;
  color: #6b7280;
  margin-top: 2px;
}

.panel-block {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(75, 85, 99, 0.3);
}

.symbol-filters {
  display: flex;
  gap: 6px;
  padding: 8px 14px;
  overflow-x: auto;
  border-bottom: 1px solid rgba(75, 85, 99, 0.2);
  background: rgba(15, 23, 42, 0.6);
}
.symbol-filters::-webkit-scrollbar {
  height: 3px;
}
.symbol-filters::-webkit-scrollbar-thumb {
  background: #374151;
  border-radius: 2px;
}
.sym-chip {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  font-size: 10px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}
.sym-chip:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #f1f5f9;
}
.sym-chip.active {
  background: rgba(16, 185, 129, 0.2);
  border-color: #10b981;
  color: #34d399;
}

.block-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #10b981;
  letter-spacing: 0.5px;
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10b981;
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 6px #10b981; }
  50%      { opacity: 0.4; box-shadow: 0 0 0 transparent; }
}
.count-pill {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
  padding: 1px 7px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}

.icon-btn {
  background: rgba(75, 85, 99, 0.2);
  border: 1px solid rgba(75, 85, 99, 0.3);
  color: #8b949e;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}
.icon-btn.active { background: rgba(139, 92, 246, 0.2); color: #8b5cf6; }

.signals-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty {
  color: #6b7280;
  font-size: 12px;
  padding: 16px;
  text-align: center;
  border: 1px dashed rgba(75, 85, 99, 0.4);
  border-radius: 8px;
}

.signal-card {
  background: #131b2e;
  border: 1px solid rgba(16, 185, 129, 0.25);
  border-radius: 10px;
  padding: 10px 12px;
  cursor: pointer;
  transition: border-color 0.15s;
}
.signal-card:hover {
  border-color: rgba(16, 185, 129, 0.6);
}

.card-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.card-row.top { font-size: 11px; margin-bottom: 6px; }
.card-row.mid { margin-bottom: 4px; }
.card-row.meta {
  font-size: 10px;
  color: #6b7280;
  margin-bottom: 8px;
}
.sep { opacity: 0.4; }

.kind {
  background: rgba(139, 92, 246, 0.2);
  color: #8b5cf6;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
}
.tf {
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
}
.symbol {
  font-weight: 600;
  flex: 1;
}
.side {
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
}
.side.buy  { background: rgba(16, 185, 129, 0.2); color: #10b981; }
.side.sell { background: rgba(239, 68, 68, 0.2); color: #ef4444; }

.price {
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 700;
  font-size: 14px;
}
.pct {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px;
  margin-left: auto;
}
.pct.pos { color: #10b981; }
.pct.neg { color: #ef4444; }

.sl { color: #ef4444; }

.progress-row {
  margin-bottom: 8px;
}
.progress-track {
  position: relative;
  height: 6px;
  background: rgba(75, 85, 99, 0.25);
  border-radius: 3px;
  overflow: visible;
}
.progress-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(90deg, rgba(16, 185, 129, 0.4), #10b981);
  border-radius: 3px;
  transition: width 0.25s ease;
}
.progress-fill.neg {
  background: linear-gradient(90deg, rgba(239, 68, 68, 0.4), #ef4444);
}
.progress-mark {
  position: absolute;
  top: -2px;
  width: 2px;
  height: 10px;
  background: rgba(229, 231, 235, 0.45);
  border-radius: 1px;
  transform: translateX(-1px);
}
.progress-mark.hit {
  background: #10b981;
  box-shadow: 0 0 4px #10b981;
}

.tp-strip {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 3px;
  margin-bottom: 8px;
}
.tp-chip {
  font-size: 9px;
  font-weight: 700;
  text-align: center;
  padding: 2px 0;
  border-radius: 3px;
  background: rgba(75, 85, 99, 0.25);
  color: #6b7280;
  letter-spacing: 0.3px;
}
.tp-chip.hit {
  background: rgba(16, 185, 129, 0.25);
  color: #10b981;
}

.card-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
}
.card-status.tp   { background: rgba(16, 185, 129, 0.18); color: #10b981; }
.card-status.live { background: rgba(245, 158, 11, 0.18); color: #f59e0b; }
.card-status.wait { background: rgba(107, 114, 128, 0.18); color: #8b949e; }

.card-status .pips {
  font-family: 'IBM Plex Mono', monospace;
}
</style>
