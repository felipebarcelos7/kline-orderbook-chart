<template>
  <div class="app">
    <ControlBar
      :exchanges="market.exchanges.value"
      :connected="market.connected.value"
      :chart-type="chart.chartType.value"
      :exchange-id="market.currentExchange.value"
      :symbol="market.currentSymbol.value"
      :interval-sec="market.currentIntervalSec.value"
      :theme="chart.theme.value"
      :volume-on="chart.volumeEnabled.value"
      :rsi-on="chart.rsiEnabled.value"
      :oi-on="chart.oiEnabled.value"
      :funding-rate-on="chart.fundingRateEnabled.value"
      :cvd-on="chart.cvdEnabled.value"
      :vpin-on="chart.vpinEnabled.value"
      :large-trades-on="chart.largeTradesEnabled.value"
      :liq-heatmap-on="chart.liqHeatmapEnabled.value"
      :vrvp-on="chart.vrvpEnabled.value"
      :tpo-on="chart.tpoEnabled.value"
      :smart-ranges-on="chart.smartRangesEnabled.value"
      :ema-structure-on="chart.emaStructureEnabled.value"
      :stop-iceberg-on="chart.stopIcebergEnabled.value"
      :forex-signals-on="chart.forexSignalsEnabled.value"
      :lta-trend-on="chart.smartIndicators.ltaTrendOn.value"
      :channel-on="chart.smartIndicators.channelOn.value"
      :aoi-on="chart.smartIndicators.aoiOn.value"
      :auto-fib-on="chart.smartIndicators.autoFibOn.value"
      :smc-on="chart.smartIndicators.smcOn.value"
      :signals-premium-on="chart.smartIndicators.signalsPremiumOn.value"
      :stats="market.stats.value"
      @subscribe="onSubscribe"
      @chart-type="onChartType"
      @interval="onInterval"
      @theme="onTheme"
      @watchlist-change="onWatchlistChange"
      @toggle-volume="chart.toggleVolume()"
      @toggle-rsi="chart.toggleRsi()"
      @toggle-oi="chart.toggleOi()"
      @toggle-funding-rate="chart.toggleFundingRate()"
      @toggle-cvd="chart.toggleCvd()"
      @toggle-vpin="chart.toggleVpin()"
      @toggle-large-trades="chart.toggleLargeTrades()"
      @toggle-liq-heatmap="chart.toggleLiqHeatmap()"
      @toggle-vrvp="chart.toggleVrvp()"
      @toggle-tpo="chart.toggleTpo()"
      @toggle-smart-ranges="chart.toggleSmartRanges()"
      @toggle-ema-structure="chart.toggleEmaStructure()"
      @toggle-stop-iceberg="chart.toggleStopIceberg()"
      @toggle-forex-signals="chart.toggleForexSignals()"
      @toggle-lta-trend="chart.smartIndicators.ltaTrendOn.value = !chart.smartIndicators.ltaTrendOn.value; _scheduleSaveUi()"
      @toggle-channel="chart.smartIndicators.channelOn.value = !chart.smartIndicators.channelOn.value; _scheduleSaveUi()"
      @toggle-aoi="chart.smartIndicators.aoiOn.value = !chart.smartIndicators.aoiOn.value; _scheduleSaveUi()"
      @toggle-auto-fib="chart.smartIndicators.autoFibOn.value = !chart.smartIndicators.autoFibOn.value; _scheduleSaveUi()"
      @toggle-smc="chart.smartIndicators.smcOn.value = !chart.smartIndicators.smcOn.value; _scheduleSaveUi()"
      @toggle-signals-premium="chart.smartIndicators.signalsPremiumOn.value = !chart.smartIndicators.signalsPremiumOn.value; _scheduleSaveUi()"
    />

    <HeatmapSlider :bridge="chart.bridge.value" />

    <div class="main">
      <DrawingToolbar
        :active-tool="chart.activeDrawingTool.value"
        @draw="onDraw"
        @cancel="chart.cancelDrawing()"
        @delete-selected="chart.deleteSelected()"
        @clear-all="chart.clearDrawings()"
        @open-fib-settings="chart.customFib.openSettings()"
      />

      <div class="chart-column">
        <div class="chart-area">
          <ChartView :chart="chart" />

          <DrawingFloatingToolbar
            v-if="chart.selectedDrawing.value || chart.customFib.selectedFib.value"
            :drawing="chart.selectedDrawing.value"
            :fib="chart.customFib.selectedFib.value"
            @update-style="chart.updateSelectedDrawingStyle"
            @open-settings="chart.onOpenDrawingSettings"
            @delete="chart.deleteSelected()"
            @close="chart.deselectAll()"
          />

          <div class="watermark">
            <div class="wm-exchange">{{ market.currentExchange.value.toUpperCase() }}</div>
            <div class="wm-symbol">{{ market.currentSymbol.value }}</div>
            <div class="wm-type">{{ chartLabel }}</div>
            <div class="wm-type" v-if="chart.forexSignalsEnabled.value">FX signals: {{ chart.forexSignalsCount.value }}</div>
          </div>

          <div class="panel-toggles">
            <button
              :class="['toggle-btn', { active: showLiveSignals }]"
              @click="showLiveSignals = !showLiveSignals"
              :title="showLiveSignals ? 'Hide live signals' : 'Show live signals'"
            >
              <span class="dot" v-if="signals.liveSignals.value.length"></span>
              ◧ Signals
            </button>
            <button
              :class="['toggle-btn', { active: showSignalHistory }]"
              @click="showSignalHistory = !showSignalHistory"
              :title="showSignalHistory ? 'Hide history' : 'Show history'"
            >
              ⊟ History
            </button>
            <button
              class="toggle-btn"
              @click="toggleFullscreenChart"
              :title="isFullscreenChart ? 'Restore panels' : 'Full-screen chart'"
            >
              {{ isFullscreenChart ? '⊡ Restore' : '⛶ Full' }}
            </button>
          </div>

          <div class="live-badge" v-if="market.stats.value.tps > 0">
            <span class="tps">{{ market.stats.value.tps }} trades/s</span>
          </div>
        </div>

        <SignalHistoryPanel
          v-if="showSignalHistory"
          :history="signals.history.value"
          :stats="signals.stats.value"
          @select="selectedSignal = $event"
        />
      </div>

      <LiveSignalsPanel
        v-if="showLiveSignals"
        :live-signals="signals.liveSignals.value"
        :stats="signals.stats.value"
        @select="selectedSignal = $event"
      />
    </div>

    <SignalDetailModal 
      :signal="selectedSignal" 
      @close="selectedSignal = null" 
      @open-chart="onOpenChartFromSignal"
    />

    <FibonacciSettingsModal
      :visible="chart.customFib.modalVisible.value"
      :config="chart.customFib.modalConfig.value"
      :is-target-preset="chart.customFib.isTargetPreset.value"
      @close="chart.customFib.modalVisible.value = false"
      @save="chart.customFib.onModalSave"
      @apply="chart.customFib.onModalSave"
    />

    <DrawingSettingsModal
      :visible="chart.drawingModalVisible.value"
      :drawing="chart.selectedDrawing.value"
      @close="chart.drawingModalVisible.value = false"
      @save="chart.updateSelectedDrawingStyle"
      @apply="chart.updateSelectedDrawingStyle"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import ChartView from './components/ChartView.vue'
import ControlBar from './components/ControlBar.vue'
import DrawingToolbar from './components/DrawingToolbar.vue'
import DrawingFloatingToolbar from './components/DrawingFloatingToolbar.vue'
import DrawingSettingsModal from './components/DrawingSettingsModal.vue'
import HeatmapSlider from './components/HeatmapSlider.vue'
import LiveSignalsPanel from './components/LiveSignalsPanel.vue'
import SignalHistoryPanel from './components/SignalHistoryPanel.vue'
import SignalDetailModal from './components/SignalDetailModal.vue'
import FibonacciSettingsModal from './components/FibonacciSettingsModal.vue'
import { useMarketData } from './composables/useMarketData.js'
import { useChart } from './composables/useChart.js'
import { useStructureSignals } from './composables/useStructureSignals.js'

const market = useMarketData()
const chart = useChart()
const signals = useStructureSignals()
const selectedSignal = ref(null)

const showLiveSignals = ref(true)
const showSignalHistory = ref(true)
const _prevPanelState = ref(null)

const isFullscreenChart = computed(() => !showLiveSignals.value && !showSignalHistory.value)

function toggleFullscreenChart() {
  if (isFullscreenChart.value) {
    showLiveSignals.value = _prevPanelState.value?.live ?? true
    showSignalHistory.value = _prevPanelState.value?.history ?? true
  } else {
    _prevPanelState.value = { live: showLiveSignals.value, history: showSignalHistory.value }
    showLiveSignals.value = false
    showSignalHistory.value = false
  }
}

const chartLabel = computed(() => {
  return chart.chartType.value === 0
    ? 'Candlestick + Heatmap'
    : 'Footprint + Heatmap'
})

const _restoreKeyRef = ref(null)

function _chartKey(exchange, symbol, candleSec) {
  if (!exchange || !symbol || !candleSec) return ''
  return `${exchange}:${symbol}:${candleSec}`
}

function _openDb() {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open('select_chart_local', 1)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv', { keyPath: 'k' })
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    } catch (e) {
      reject(e)
    }
  })
}

let _dbPromise = null
function _db() {
  if (!_dbPromise) _dbPromise = _openDb().catch(() => null)
  return _dbPromise
}

async function kvGet(k) {
  try {
    const local = localStorage.getItem(`select_kv:${k}`)
    if (local) return JSON.parse(local)
  } catch {}
  const db = await _db()
  if (!db) return null
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('kv', 'readonly')
      const store = tx.objectStore('kv')
      const req = store.get(k)
      req.onsuccess = () => resolve(req.result?.v ?? null)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

async function kvSet(k, v) {
  try {
    const clean = JSON.parse(JSON.stringify(v))
    localStorage.setItem(`select_kv:${k}`, JSON.stringify(clean))
    const db = await _db()
    if (db) {
      const tx = db.transaction('kv', 'readwrite')
      tx.objectStore('kv').put({ k, v: clean })
    }
  } catch (e) {
    console.warn('[kvSet] failed:', e)
  }
}

function _uiSnapshot() {
  return {
    v: 1,
    market: {
      exchange: market.currentExchange.value || '',
      symbol: market.currentSymbol.value || '',
      intervalSec: market.currentIntervalSec.value || 300,
    },
    chart: {
      chartType: chart.chartType.value,
      theme: chart.theme.value,
      volume: chart.volumeEnabled.value,
      rsi: chart.rsiEnabled.value,
      oi: chart.oiEnabled.value,
      fundingRate: chart.fundingRateEnabled.value,
      cvd: chart.cvdEnabled.value,
      vpin: chart.vpinEnabled.value,
      largeTrades: chart.largeTradesEnabled.value,
      liqHeatmap: chart.liqHeatmapEnabled.value,
      vrvp: chart.vrvpEnabled.value,
      tpo: chart.tpoEnabled.value,
      smartRanges: chart.smartRangesEnabled.value,
      emaStructure: chart.emaStructureEnabled.value,
      stopIceberg: chart.stopIcebergEnabled.value,
      forexSignals: chart.forexSignalsEnabled.value,
      ltaTrend: chart.smartIndicators.ltaTrendOn.value,
      channel: chart.smartIndicators.channelOn.value,
      aoi: chart.smartIndicators.aoiOn.value,
      autoFib: chart.smartIndicators.autoFibOn.value,
      smc: chart.smartIndicators.smcOn.value,
      signalsPremium: chart.smartIndicators.signalsPremiumOn.value,
    },
  }
}

let _saveUiTimer = null
function _scheduleSaveUi() {
  if (_saveUiTimer) clearTimeout(_saveUiTimer)
  _saveUiTimer = setTimeout(() => {
    _saveUiTimer = null
    kvSet('ui', _uiSnapshot())
  }, 200)
}

function _applyUiState(s) {
  if (!s) return
  if (s.chart) {
    if (typeof s.chart.chartType === 'number') chart.chartType.value = s.chart.chartType
    if (typeof s.chart.theme === 'string') chart.setTheme(s.chart.theme)
    if (typeof s.chart.volume === 'boolean') chart.volumeEnabled.value = s.chart.volume
    if (typeof s.chart.rsi === 'boolean') chart.rsiEnabled.value = s.chart.rsi
    if (typeof s.chart.oi === 'boolean') chart.oiEnabled.value = s.chart.oi
    if (typeof s.chart.fundingRate === 'boolean') chart.fundingRateEnabled.value = s.chart.fundingRate
    if (typeof s.chart.cvd === 'boolean') chart.cvdEnabled.value = s.chart.cvd
    if (typeof s.chart.vpin === 'boolean') chart.vpinEnabled.value = s.chart.vpin
    if (typeof s.chart.largeTrades === 'boolean') chart.largeTradesEnabled.value = s.chart.largeTrades
    if (typeof s.chart.liqHeatmap === 'boolean') chart.liqHeatmapEnabled.value = s.chart.liqHeatmap
    if (typeof s.chart.vrvp === 'boolean') chart.vrvpEnabled.value = s.chart.vrvp
    if (typeof s.chart.tpo === 'boolean') chart.tpoEnabled.value = s.chart.tpo
    if (typeof s.chart.smartRanges === 'boolean') chart.smartRangesEnabled.value = s.chart.smartRanges
    if (typeof s.chart.emaStructure === 'boolean') chart.emaStructureEnabled.value = s.chart.emaStructure
    if (typeof s.chart.stopIceberg === 'boolean') chart.stopIcebergEnabled.value = s.chart.stopIceberg
    if (typeof s.chart.forexSignals === 'boolean') chart.forexSignalsEnabled.value = s.chart.forexSignals
    if (typeof s.chart.ltaTrend === 'boolean') chart.smartIndicators.ltaTrendOn.value = s.chart.ltaTrend
    if (typeof s.chart.channel === 'boolean') chart.smartIndicators.channelOn.value = s.chart.channel
    if (typeof s.chart.aoi === 'boolean') chart.smartIndicators.aoiOn.value = s.chart.aoi
    if (typeof s.chart.autoFib === 'boolean') chart.smartIndicators.autoFibOn.value = s.chart.autoFib
    if (typeof s.chart.smc === 'boolean') chart.smartIndicators.smcOn.value = s.chart.smc
    if (typeof s.chart.signalsPremium === 'boolean') chart.smartIndicators.signalsPremiumOn.value = s.chart.signalsPremium
  }
  if (s.market && !market.currentExchange.value && !market.currentSymbol.value) {
    _restoreKeyRef.value = _chartKey(s.market.exchange, s.market.symbol, s.market.intervalSec || 300)
  }
}

function saveAllDrawings(key) {
  if (!key) return
  try {
    const json = chart.exportDrawings()
    if (json && json !== '[]') {
      localStorage.setItem(`select_drawings:${key}`, json)
      kvSet(`drawings:${key}`, json)
    } else {
      localStorage.removeItem(`select_drawings:${key}`)
      kvSet(`drawings:${key}`, '')
    }
  } catch (e) {
    console.warn('[saveAllDrawings] failed:', e)
  }
  chart.customFib.saveFibs(key)
}

function loadAllDrawings(key) {
  if (!key) return
  try {
    let json = localStorage.getItem(`select_drawings:${key}`)
    if (!json) {
      const kv = localStorage.getItem(`select_kv:drawings:${key}`)
      if (kv) {
        try { json = JSON.parse(kv) } catch { json = kv }
      }
    }
    if (json && json !== '[]') {
      chart.importDrawings(json)
    }
  } catch (e) {
    console.warn('[loadAllDrawings] failed:', e)
  }
  chart.customFib.loadFibs(key)
}

market.onHistory(async (msg) => {
  chart.setHistory(msg)
  // Atualiza os sinais da moeda sem apagar as outras moedas escaneadas
  signals.setHistory(msg.symbol, msg.candleSec, msg.klines, msg.tickSize)

  const ex = msg.exchange || market.currentExchange.value || 'binance'
  const sym = msg.symbol || market.currentSymbol.value
  const sec = msg.candleSec || market.currentIntervalSec.value
  const key = _chartKey(ex, sym, sec)
  if (!key) return

  loadAllDrawings(key)
  chart.customFib.setChartKey(ex, sym, sec)
})
market.onKline((kline) => {
  chart.handleKline(kline)
  signals.handleKline(market.currentSymbol.value, market.currentIntervalSec.value, kline)
})
market.onTrade((trade) => chart.handleTrade(trade))
market.onHeatmap((col) => chart.handleHeatmapColumn(col))
market.onHeatmapFrozen((col) => chart.handleHeatmapFrozen(col))
market.onOi((oi) => chart.handleOi(oi))
market.onLicense((key) => chart.setLicenseKey(key))

chart.onDrawingsChanged(() => {
  const ex = market.currentExchange.value || 'binance'
  const sym = market.currentSymbol.value || 'BTCUSDT'
  const sec = market.currentIntervalSec.value || 300
  const key = _chartKey(ex, sym, sec)
  if (!key) return
  saveAllDrawings(key)
})

watch(chart.customFib.fibList, () => {
  const ex = market.currentExchange.value || 'binance'
  const sym = market.currentSymbol.value || 'BTCUSDT'
  const sec = market.currentIntervalSec.value || 300
  const key = _chartKey(ex, sym, sec)
  if (!key) return
  chart.customFib.saveFibs(key)
}, { deep: true })

let _multiScanTimer = null
const SCAN_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT',
  'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'LINKUSDT', 'DOTUSDT',
  'NEARUSDT', 'SUIUSDT', 'PEPEUSDT', 'RENDERUSDT', 'TURBOUSDT'
]

const userWatchlist = ref([])
try {
  const stored = localStorage.getItem('select_custom_symbol_list')
  if (stored) {
    const parsed = JSON.parse(stored)
    if (Array.isArray(parsed) && parsed.length > 0) userWatchlist.value = parsed
  }
} catch (e) {}

function onWatchlistChange(list) {
  if (Array.isArray(list)) {
    userWatchlist.value = list
    triggerMultiScan()
  }
}

function triggerMultiScan() {
  const currentSym = (market.currentSymbol.value || 'BTCUSDT').toUpperCase()
  const baseList = userWatchlist.value.length > 0 ? userWatchlist.value : SCAN_SYMBOLS
  const others = baseList.filter(s => s !== currentSym)
  signals.scanMultiSymbols(others, market.currentIntervalSec.value || 900)
}

function onOpenChartFromSignal(symbol) {
  if (symbol && symbol !== market.currentSymbol.value) {
    market.subscribe(market.currentExchange.value, symbol, market.currentIntervalSec.value)
  }
}

function onSubscribe(exchange, symbol, intervalSec) {
  const oldKey = _chartKey(market.currentExchange.value, market.currentSymbol.value, market.currentIntervalSec.value)
  if (oldKey) {
    saveAllDrawings(oldKey)
  }
  chart.clearDrawings()
  chart.customFib.setChartKey(exchange, symbol, intervalSec)
  market.subscribe(exchange, symbol, intervalSec)
  setTimeout(triggerMultiScan, 500)
}

function onChartType(ct) {
  chart.setChartTypeValue(ct)
}

function onInterval(intervalSec) {
  const oldKey = _chartKey(market.currentExchange.value, market.currentSymbol.value, market.currentIntervalSec.value)
  if (oldKey) {
    saveAllDrawings(oldKey)
  }
  chart.clearDrawings()
  chart.customFib.setChartKey(market.currentExchange.value, market.currentSymbol.value, intervalSec)
  market.subscribe(market.currentExchange.value, market.currentSymbol.value, intervalSec)
  setTimeout(triggerMultiScan, 500)
}

function onTheme(name) {
  chart.setTheme(name)
}

function onDraw(tool) {
  if (chart.activeDrawingTool.value === tool) chart.cancelDrawing()
  else chart.startDrawing(tool)
}

function onKeydown(e) {
  if (e.key === 'Escape' && chart.activeDrawingTool.value) chart.cancelDrawing()
  if ((e.key === 'Delete' || e.key === 'Backspace') && !chart.activeDrawingTool.value) chart.deleteSelected()
}

onMounted(() => {
  market.connect()
  window.addEventListener('keydown', onKeydown)
  triggerMultiScan()
  _multiScanTimer = setInterval(triggerMultiScan, 45000)
})

onBeforeUnmount(() => {
  if (_multiScanTimer) clearInterval(_multiScanTimer)
  chart.destroy()
  window.removeEventListener('keydown', onKeydown)
})

onMounted(async () => {
  const saved = await kvGet('ui')
  _applyUiState(saved)
})



watch(
  () => [
    market.currentExchange.value,
    market.currentSymbol.value,
    market.currentIntervalSec.value,
    chart.chartType.value,
    chart.theme.value,
    chart.volumeEnabled.value,
    chart.rsiEnabled.value,
    chart.oiEnabled.value,
    chart.fundingRateEnabled.value,
    chart.cvdEnabled.value,
    chart.vpinEnabled.value,
    chart.largeTradesEnabled.value,
    chart.liqHeatmapEnabled.value,
    chart.vrvpEnabled.value,
    chart.tpoEnabled.value,
    chart.smartRangesEnabled.value,
    chart.emaStructureEnabled.value,
    chart.stopIcebergEnabled.value,
    chart.forexSignalsEnabled.value,
    chart.smartIndicators.ltaTrendOn.value,
    chart.smartIndicators.channelOn.value,
    chart.smartIndicators.aoiOn.value,
    chart.smartIndicators.autoFibOn.value,
    chart.smartIndicators.smcOn.value,
    chart.smartIndicators.signalsPremiumOn.value,
  ],
  () => _scheduleSaveUi(),
)

watch(
  () => market.exchanges.value,
  (exs) => {
    if (!_restoreKeyRef.value) return
    const [ex, sym, secStr] = _restoreKeyRef.value.split(':')
    const intervalSec = Number(secStr) || 300
    const okEx = exs?.some(e => e.id === ex)
    const okSym = okEx ? (exs.find(e => e.id === ex)?.symbols || []).includes(sym) : false
    if (okEx && okSym) {
      _restoreKeyRef.value = null
      market.subscribe(ex, sym, intervalSec)
    }
  },
  { immediate: true },
)
</script>

<style>
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --bg-primary: #0d1117;
  --bg-secondary: #161b22;
  --border: #21262d;
  --text-primary: #e6edf3;
  --text-secondary: #8b949e;
  --accent: #58a6ff;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  overflow: hidden;
  height: 100vh;
  width: 100vw;
}

#app {
  height: 100vh;
  width: 100vw;
}
</style>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.chart-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.chart-area {
  flex: 1;
  position: relative;
  overflow: hidden;
  margin: 4px 4px 4px 0;
  border-radius: 8px;
  min-height: 0;
}

.watermark {
  position: absolute;
  top: 12px;
  left: 12px;
  pointer-events: none;
  opacity: 0.12;
  z-index: 1;
}
.wm-exchange {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--accent);
}
.wm-symbol {
  font-size: 26px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.1;
}
.wm-type {
  font-size: 10px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.panel-toggles {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 6px;
  z-index: 2;
}
.toggle-btn {
  background: rgba(13, 20, 33, 0.85);
  border: 1px solid rgba(75, 85, 99, 0.4);
  color: #8b949e;
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  font-weight: 600;
  padding: 5px 10px;
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  letter-spacing: 0.3px;
  transition: all 0.15s;
  backdrop-filter: blur(4px);
}
.toggle-btn:hover {
  border-color: rgba(139, 92, 246, 0.5);
  color: #e5e7eb;
}
.toggle-btn.active {
  background: rgba(139, 92, 246, 0.18);
  border-color: rgba(139, 92, 246, 0.55);
  color: #c4b5fd;
}
.toggle-btn .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 5px #10b981; }
  50% { opacity: 0.4; }
}

.live-badge {
  position: absolute;
  top: 50px;
  right: 12px;
  pointer-events: none;
  z-index: 1;
}
.tps {
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #3fb950;
  background: rgba(35, 134, 54, 0.15);
  padding: 2px 8px;
  border-radius: 4px;
}
</style>
