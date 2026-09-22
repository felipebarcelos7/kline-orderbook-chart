<template>
  <div class="control-bar">
    <div class="left">
      <div class="logo">
        <span class="logo-icon">◈</span>
        <span class="logo-text">Select®</span>
      </div>
    </div>

    <div class="center">
      <div class="control-group">
        <label>Exchange</label>
        <select v-model="selectedExchange" @change="onExchangeChange">
          <option v-for="ex in exchanges" :key="ex.id" :value="ex.id">{{ ex.name }}</option>
        </select>
      </div>

      <div class="control-group">
        <label>Symbol</label>
        <select v-model="selectedSymbol" @change="onSymbolChange">
          <option v-for="s in currentSymbols" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>

      <div class="control-group">
        <label>Time</label>
        <select v-model.number="selectedIntervalSec" @change="onIntervalChange">
          <option :value="60">1m</option>
          <option :value="300">5m</option>
          <option :value="900">15m</option>
          <option :value="1800">30m</option>
          <option :value="2700">45m</option>
          <option :value="3600">1h</option>
          <option :value="7200">2h</option>
          <option :value="10800">3h</option>
          <option :value="14400">4h</option>
          <option :value="86400">1d</option>
          <option :value="604800">1w</option>
          <option :value="2592000">1M</option>
        </select>
      </div>

      <div class="control-group">
        <label>Chart</label>
        <div class="btn-group">
          <button
            :class="{ active: chartType === 0 }"
            @click="$emit('chartType', 0)"
          >Candle</button>
          <button
            :class="{ active: chartType === 1 }"
            @click="$emit('chartType', 1)"
          >Footprint</button>
        </div>
      </div>

      <div class="control-group">
        <label>Theme</label>
        <select v-model="selectedTheme" @change="onThemeChange">
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </div>

      <div class="control-group">
        <label>Indicators</label>
        <div class="indicators">
          <button
            class="indicators-btn"
            :class="{ active: hasAnyIndicatorOn }"
            @click="menuOpen = !menuOpen"
          >Manage</button>
          <div class="indicators-menu" v-if="menuOpen">
            <label class="indicators-item">
              <input type="checkbox" :checked="volumeOn" @change="$emit('toggleVolume')" />
              <span>Volume</span>
            </label>
            <label class="indicators-item">
              <input type="checkbox" :checked="rsiOn" @change="$emit('toggleRsi')" />
              <span>RSI Premium</span>
            </label>
            <label class="indicators-item">
              <input type="checkbox" :checked="largeTradesOn" @change="$emit('toggleLargeTrades')" />
              <span>Large Trades</span>
            </label>
            <label class="indicators-item">
              <input type="checkbox" :checked="liqHeatmapOn" @change="$emit('toggleLiqHeatmap')" />
              <span>Liquidation Heatmap</span>
            </label>
            <label class="indicators-item">
              <input type="checkbox" :checked="vrvpOn" @change="$emit('toggleVrvp')" />
              <span>VRVP</span>
            </label>
            <label class="indicators-item">
              <input type="checkbox" :checked="tpoOn" @change="$emit('toggleTpo')" />
              <span>TPO</span>
            </label>
            <label class="indicators-item">
              <input type="checkbox" :checked="smartRangesOn" @change="$emit('toggleSmartRanges')" />
              <span>Smart Ranges</span>
            </label>
            <label class="indicators-item">
              <input type="checkbox" :checked="emaStructureOn" @change="$emit('toggleEmaStructure')" />
              <span>EMA Structure</span>
            </label>
            <label class="indicators-item">
              <input type="checkbox" :checked="stopIcebergOn" @change="$emit('toggleStopIceberg')" />
              <span>Stops & Icebergs</span>
            </label>
            <label class="indicators-item">
              <input type="checkbox" :checked="forexSignalsOn" @change="$emit('toggleForexSignals')" />
              <span>Forex Signals</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <div class="right">
      <div class="stat" v-if="stats.trades > 0">
        <span class="stat-label">Trades</span>
        <span class="stat-value">{{ formatNum(stats.trades) }}</span>
      </div>
      <div class="stat" v-if="stats.depthUpdates > 0">
        <span class="stat-label">Depth</span>
        <span class="stat-value">{{ formatNum(stats.depthUpdates) }}</span>
      </div>
      <div :class="['status', connected ? 'online' : 'offline']">
        {{ connected ? 'LIVE' : 'OFFLINE' }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  exchanges: { type: Array, default: () => [] },
  connected: Boolean,
  chartType: { type: Number, default: 0 },
  exchangeId: { type: String, default: '' },
  symbol: { type: String, default: '' },
  intervalSec: { type: Number, default: 300 },
  theme: { type: String, default: 'dark' },
  volumeOn: { type: Boolean, default: true },
  rsiOn: { type: Boolean, default: true },
  oiOn: { type: Boolean, default: true },
  fundingRateOn: { type: Boolean, default: false },
  cvdOn: { type: Boolean, default: false },
  vpinOn: { type: Boolean, default: false },
  largeTradesOn: { type: Boolean, default: true },
  liqHeatmapOn: { type: Boolean, default: true },
  vrvpOn: { type: Boolean, default: true },
  tpoOn: { type: Boolean, default: true },
  smartRangesOn: { type: Boolean, default: true },
  emaStructureOn: { type: Boolean, default: true },
  stopIcebergOn: { type: Boolean, default: true },
  forexSignalsOn: { type: Boolean, default: true },
  stats: { type: Object, default: () => ({ trades: 0, depthUpdates: 0 }) },
})

const emit = defineEmits([
  'subscribe',
  'chartType',
  'interval',
  'theme',
  'toggleVolume',
  'toggleRsi',
  'toggleOi',
  'toggleFundingRate',
  'toggleCvd',
  'toggleVpin',
  'toggleLargeTrades',
  'toggleLiqHeatmap',
  'toggleVrvp',
  'toggleTpo',
  'toggleSmartRanges',
  'toggleEmaStructure',
  'toggleStopIceberg',
  'toggleForexSignals',
])

const selectedExchange = ref('')
const selectedSymbol = ref('')
const menuOpen = ref(false)
const selectedIntervalSec = ref(60)
const selectedTheme = ref('dark')

const hasAnyIndicatorOn = computed(() => {
  return (
    props.volumeOn ||
    props.rsiOn ||
    props.oiOn ||
    props.largeTradesOn ||
    props.liqHeatmapOn ||
    props.vrvpOn ||
    props.tpoOn ||
    props.smartRangesOn ||
    props.emaStructureOn ||
    props.stopIcebergOn ||
    props.forexSignalsOn
  )
})

const currentSymbols = computed(() => {
  const ex = props.exchanges.find(e => e.id === selectedExchange.value)
  return ex?.symbols || []
})

watch(() => props.exchanges, (exs) => {
  if (exs.length > 0 && !selectedExchange.value) {
    const ex = (props.exchangeId && exs.some(e => e.id === props.exchangeId))
      ? props.exchangeId
      : exs[0].id
    selectedExchange.value = ex

    const syms = exs.find(e => e.id === ex)?.symbols || []
    const sym = (props.symbol && syms.includes(props.symbol))
      ? props.symbol
      : (syms[0] || '')
    selectedSymbol.value = sym

    selectedIntervalSec.value = props.intervalSec || 60
    if (selectedSymbol.value) emit('subscribe', selectedExchange.value, selectedSymbol.value, selectedIntervalSec.value)
  }
}, { immediate: true })

watch(() => props.intervalSec, (v) => {
  if (typeof v === 'number') selectedIntervalSec.value = v
}, { immediate: true })

watch(() => props.theme, (v) => {
  selectedTheme.value = v === 'light' ? 'light' : 'dark'
}, { immediate: true })

watch(() => props.exchangeId, (v) => {
  if (!v) return
  if (v !== selectedExchange.value) {
    selectedExchange.value = v
    const syms = currentSymbols.value
    if (syms.length > 0 && !syms.includes(selectedSymbol.value)) selectedSymbol.value = syms[0]
  }
})

watch(() => props.symbol, (v) => {
  if (!v) return
  if (v !== selectedSymbol.value) selectedSymbol.value = v
})

function onExchangeChange() {
  const syms = currentSymbols.value
  selectedSymbol.value = syms[0] || ''
  if (selectedSymbol.value) {
    emit('subscribe', selectedExchange.value, selectedSymbol.value, selectedIntervalSec.value)
  }
}

function onSymbolChange() {
  emit('subscribe', selectedExchange.value, selectedSymbol.value, selectedIntervalSec.value)
}

function onIntervalChange() {
  emit('interval', selectedIntervalSec.value)
  emit('subscribe', selectedExchange.value, selectedSymbol.value, selectedIntervalSec.value)
}

function onThemeChange() {
  emit('theme', selectedTheme.value)
}

function formatNum(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toString()
}
</script>

<style scoped>
.control-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 52px;
  background: #161b22;
  border-bottom: 1px solid #21262d;
  gap: 16px;
}

.left, .center, .right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
}
.logo-icon {
  font-size: 20px;
  color: #58a6ff;
}
.logo-text {
  font-weight: 700;
  font-size: 14px;
  color: #e6edf3;
  letter-spacing: 0.5px;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.control-group label {
  font-size: 11px;
  color: #8b949e;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.control-group select {
  background: #0d1117;
  border: 1px solid #30363d;
  color: #e6edf3;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
}
.control-group select:focus {
  outline: none;
  border-color: #58a6ff;
}

.btn-group {
  display: flex;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #30363d;
}
.btn-group button {
  background: #0d1117;
  color: #8b949e;
  border: none;
  padding: 4px 12px;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-group button + button {
  border-left: 1px solid #30363d;
}
.btn-group button.active {
  background: #1f6feb;
  color: #fff;
}
.btn-group button:hover:not(.active) {
  background: #21262d;
  color: #e6edf3;
}

.indicators {
  position: relative;
}

.indicators-btn {
  background: #0d1117;
  color: #8b949e;
  border: 1px solid #30363d;
  padding: 4px 12px;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
  border-radius: 6px;
}

.indicators-btn.active {
  background: #1f6feb;
  border-color: #1f6feb;
  color: #fff;
}

.indicators-btn:hover {
  background: #21262d;
  color: #e6edf3;
}

.indicators-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 20;
  width: 210px;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.35);
}

.indicators-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #e6edf3;
  cursor: pointer;
  user-select: none;
}

.indicators-item input {
  accent-color: #1f6feb;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
}
.stat-label {
  font-size: 9px;
  color: #484f58;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.stat-value {
  font-size: 13px;
  color: #8b949e;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.status {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
}
.status.online {
  background: rgba(35, 134, 54, 0.2);
  color: #3fb950;
  animation: pulse 2s infinite;
}
.status.offline {
  background: rgba(218, 54, 51, 0.2);
  color: #f85149;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
</style>
