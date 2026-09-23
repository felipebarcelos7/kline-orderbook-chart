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

      <div class="control-group symbol-selector-group" ref="symbolSelectorRef">
        <label>Symbol</label>
        <button 
          type="button"
          class="symbol-trigger-btn"
          :class="{ open: symbolDropdownOpen }"
          @click="toggleSymbolDropdown"
          title="Pesquisar e selecionar moeda"
        >
          <span 
            v-if="isFavorite(selectedSymbol)" 
            class="symbol-fav-star active" 
            title="Moeda na sua lista salva"
          >★</span>
          <span class="symbol-name">{{ selectedSymbol || 'Selecionar...' }}</span>
          <span class="symbol-arrow">{{ symbolDropdownOpen ? '▴' : '▾' }}</span>
        </button>

        <!-- Dropdown com Pesquisa e Lista Salva -->
        <div class="symbol-dropdown" v-if="symbolDropdownOpen">
          <!-- Campo de Busca com Input -->
          <div class="symbol-search-box">
            <span class="search-icon">🔍</span>
            <input 
              ref="searchInputRef"
              type="text"
              v-model="searchQuery"
              placeholder="Pesquisar moeda... (ex: BTC, SOL, PEPE)"
              @keydown.enter.prevent="selectFirstResult"
              @keydown.esc.prevent="closeSymbolDropdown"
            />
            <button 
              v-if="searchQuery" 
              type="button"
              class="clear-search-btn" 
              @click="searchQuery = ''"
              title="Limpar busca"
            >✕</button>
          </div>

          <!-- Abas de Navegação -->
          <div class="symbol-tabs">
            <button 
              type="button"
              class="symbol-tab-btn" 
              :class="{ active: symbolTab === 'saved' }"
              @click="symbolTab = 'saved'"
            >
              ⭐ Salvas ({{ savedSymbols.length }})
            </button>
            <button 
              type="button"
              class="symbol-tab-btn" 
              :class="{ active: symbolTab === 'top15' }"
              @click="symbolTab = 'top15'"
            >
              🔥 Top 15
            </button>
            <button 
              type="button"
              class="symbol-tab-btn" 
              :class="{ active: symbolTab === 'all' }"
              @click="symbolTab = 'all'"
            >
              🌐 Todas ({{ currentSymbols.length }})
            </button>
          </div>

          <!-- Barra de Ações da Lista Desejada -->
          <div class="watchlist-actions">
            <button 
              type="button" 
              class="btn-save-watchlist"
              @click="saveWatchlistToStorage"
              :class="{ saved: watchlistJustSaved }"
            >
              <span v-if="watchlistJustSaved">✓ Lista Salva!</span>
              <span v-else>💾 Salvar Lista Desejada</span>
            </button>
            <button 
              v-if="savedSymbols.length === 0" 
              type="button" 
              class="btn-copy-top15" 
              @click="copyTop15ToSaved"
            >
              + Copiar Top 15
            </button>
            <button 
              v-else 
              type="button" 
              class="btn-clear-watchlist" 
              @click="clearSavedList"
              title="Limpar moedas salvas"
            >
              Limpar Lista
            </button>
          </div>

          <!-- Lista de Símbolos -->
          <div class="symbol-list-container">
            <div v-if="displayedSymbols.length === 0" class="symbol-empty-state">
              <span v-if="symbolTab === 'saved' && !searchQuery">
                Nenhuma moeda salva ainda.<br/>
                Clique na estrela ⭐ ao lado de qualquer moeda para salvá-la aqui!
              </span>
              <span v-else>
                Nenhuma moeda encontrada para "{{ searchQuery }}".
              </span>
            </div>

            <div 
              v-for="sym in displayedSymbols" 
              :key="sym"
              class="symbol-row"
              :class="{ selected: sym === selectedSymbol }"
              @click="selectSymbol(sym)"
            >
              <button 
                type="button" 
                class="star-toggle-btn"
                :class="{ active: isFavorite(sym) }"
                @click.stop="toggleFavorite(sym)"
                :title="isFavorite(sym) ? 'Remover da lista salva' : 'Salvar na lista desejada'"
              >
                {{ isFavorite(sym) ? '★' : '☆' }}
              </button>

              <span class="symbol-item-name">{{ sym }}</span>

              <div class="symbol-badges">
                <span v-if="TOP_15_LIST.includes(sym)" class="badge-top15">TOP 15</span>
                <span v-if="sym === selectedSymbol" class="badge-current">ATIVO</span>
              </div>
            </div>
          </div>

          <!-- Rodapé do dropdown -->
          <div class="symbol-dropdown-footer">
            <span>Exibindo {{ displayedSymbols.length }} moedas</span>
            <span class="help-text">Dica: clique na ⭐ para salvar moedas</span>
          </div>
        </div>
      </div>

      <div class="control-group">
        <label>Time</label>
        <select v-model.number="selectedIntervalSec" @change="onIntervalChange">
          <option :value="60">1m</option>
          <option :value="180">3m</option>
          <option :value="300">5m</option>
          <option :value="900">15m</option>
          <option :value="1800">30m</option>
          <option :value="3600">1h</option>
          <option :value="7200">2h</option>
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
            <div class="indicators-divider"></div>
            <div class="indicators-heading">LTA-B & SMC</div>
            <label class="indicators-item">
              <input type="checkbox" :checked="ltaTrendOn" @change="$emit('toggleLtaTrend')" />
              <span style="color: #10b981;">LTA / LTB Trendlines</span>
            </label>
            <label class="indicators-item">
              <input type="checkbox" :checked="channelOn" @change="$emit('toggleChannel')" />
              <span style="color: #38bdf8;">LTA-B Auto Channel</span>
            </label>
            <label class="indicators-item">
              <input type="checkbox" :checked="aoiOn" @change="$emit('toggleAoi')" />
              <span style="color: #f43f5e;">Areas of Interest (AOI)</span>
            </label>
            <label class="indicators-item">
              <input type="checkbox" :checked="autoFibOn" @change="$emit('toggleAutoFib')" />
              <span style="color: #eab308;">Auto Fibonacci (SMC Fibs)</span>
            </label>
            <label class="indicators-item">
              <input type="checkbox" :checked="smcOn" @change="$emit('toggleSmc')" />
              <span style="color: #a855f7;">Smart Money Concepts (SMC)</span>
            </label>
            <label class="indicators-item">
              <input type="checkbox" :checked="signalsPremiumOn" @change="$emit('toggleSignalsPremium')" />
              <span style="color: #10b981;">Signals Premium</span>
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
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'

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
  ltaTrendOn: { type: Boolean, default: true },
  channelOn: { type: Boolean, default: true },
  aoiOn: { type: Boolean, default: true },
  autoFibOn: { type: Boolean, default: true },
  smcOn: { type: Boolean, default: true },
  signalsPremiumOn: { type: Boolean, default: true },
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
  'toggleLtaTrend',
  'toggleChannel',
  'toggleAoi',
  'toggleAutoFib',
  'toggleSmc',
  'toggleSignalsPremium',
  'watchlistChange',
])

const selectedExchange = ref('')
const selectedSymbol = ref('')
const menuOpen = ref(false)
const selectedIntervalSec = ref(60)
const selectedTheme = ref('dark')

// Seletor Customizado com Pesquisa e Lista Salva
const symbolSelectorRef = ref(null)
const searchInputRef = ref(null)
const symbolDropdownOpen = ref(false)
const searchQuery = ref('')
const symbolTab = ref('top15') // 'saved' | 'top15' | 'all'
const savedSymbols = ref([])
const watchlistJustSaved = ref(false)

const TOP_15_LIST = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT',
  'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'LINKUSDT', 'DOTUSDT',
  'NEARUSDT', 'SUIUSDT', 'PEPEUSDT', 'RENDERUSDT', 'TURBOUSDT'
]

const currentSymbols = computed(() => {
  const ex = props.exchanges.find(e => e.id === selectedExchange.value)
  return ex?.symbols || []
})

const top15Symbols = computed(() => {
  const syms = currentSymbols.value
  return TOP_15_LIST.filter(s => syms.includes(s))
})

const otherSymbols = computed(() => {
  const syms = currentSymbols.value
  return syms.filter(s => !TOP_15_LIST.includes(s))
})

const displayedSymbols = computed(() => {
  let baseList = []
  if (symbolTab.value === 'saved') {
    baseList = savedSymbols.value
  } else if (symbolTab.value === 'top15') {
    baseList = top15Symbols.value
  } else {
    baseList = currentSymbols.value
  }

  const q = searchQuery.value.trim().toUpperCase()
  if (!q) return baseList

  const matchesTab = baseList.filter(s => s.includes(q))
  if (matchesTab.length > 0) return matchesTab

  // Fallback global de busca
  return currentSymbols.value.filter(s => s.includes(q))
})

function loadSavedSymbols() {
  try {
    const stored = localStorage.getItem('select_custom_symbol_list')
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length > 0) {
        savedSymbols.value = parsed
        return
      }
    }
  } catch (e) {
    console.warn('Falha ao carregar lista salva:', e)
  }
  // Valor padrão com as Top 15 moedas
  savedSymbols.value = [...TOP_15_LIST]
}

function isFavorite(sym) {
  if (!sym) return false
  return savedSymbols.value.includes(sym)
}

function toggleFavorite(sym) {
  if (!sym) return
  if (savedSymbols.value.includes(sym)) {
    savedSymbols.value = savedSymbols.value.filter(s => s !== sym)
  } else {
    savedSymbols.value.push(sym)
  }
  persistSavedSymbols()
}

function persistSavedSymbols() {
  try {
    localStorage.setItem('select_custom_symbol_list', JSON.stringify(savedSymbols.value))
    emit('watchlistChange', [...savedSymbols.value])
  } catch (e) {
    console.warn('Falha ao persistir lista salva:', e)
  }
}

function saveWatchlistToStorage() {
  persistSavedSymbols()
  watchlistJustSaved.value = true
  setTimeout(() => {
    watchlistJustSaved.value = false
  }, 2000)
}

function copyTop15ToSaved() {
  savedSymbols.value = [...TOP_15_LIST]
  saveWatchlistToStorage()
}

function clearSavedList() {
  savedSymbols.value = []
  persistSavedSymbols()
}

function toggleSymbolDropdown() {
  symbolDropdownOpen.value = !symbolDropdownOpen.value
  if (symbolDropdownOpen.value) {
    nextTick(() => {
      searchInputRef.value?.focus()
    })
  }
}

function closeSymbolDropdown() {
  symbolDropdownOpen.value = false
  searchQuery.value = ''
}

function selectSymbol(sym) {
  if (!sym) return
  selectedSymbol.value = sym
  closeSymbolDropdown()
  emit('subscribe', selectedExchange.value, selectedSymbol.value, selectedIntervalSec.value)
}

function selectFirstResult() {
  if (displayedSymbols.value.length > 0) {
    selectSymbol(displayedSymbols.value[0])
  }
}

function handleClickOutside(e) {
  if (symbolSelectorRef.value && !symbolSelectorRef.value.contains(e.target)) {
    symbolDropdownOpen.value = false
  }
  const indElem = document.querySelector('.indicators')
  if (indElem && !indElem.contains(e.target)) {
    menuOpen.value = false
  }
}

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
    props.forexSignalsOn ||
    props.ltaTrendOn ||
    props.channelOn ||
    props.aoiOn ||
    props.autoFibOn ||
    props.smcOn ||
    props.signalsPremiumOn
  )
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

onMounted(() => {
  loadSavedSymbols()
  document.addEventListener('pointerdown', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', handleClickOutside)
})
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

/* Custom Symbol Selector */
.symbol-selector-group {
  position: relative;
}

.symbol-trigger-btn {
  background: #0d1117;
  border: 1px solid #30363d;
  color: #e6edf3;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.15s;
}

.symbol-trigger-btn:hover {
  border-color: #58a6ff;
  background: #161b22;
}

.symbol-trigger-btn.open {
  border-color: #58a6ff;
  box-shadow: 0 0 0 2px rgba(88, 166, 255, 0.2);
}

.symbol-fav-star {
  color: #f59e0b;
  font-size: 13px;
  text-shadow: 0 0 6px rgba(245, 158, 11, 0.4);
}

.symbol-name {
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.3px;
}

.symbol-arrow {
  color: #8b949e;
  font-size: 10px;
  margin-left: 2px;
}

/* Symbol Dropdown Modal */
.symbol-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: 350px;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 8px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);
  z-index: 100;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: dropdownFadeIn 0.15s ease-out;
}

@keyframes dropdownFadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.symbol-search-box {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #161b22;
  border-bottom: 1px solid #21262d;
  gap: 8px;
}

.search-icon {
  font-size: 13px;
  opacity: 0.7;
}

.symbol-search-box input {
  background: transparent;
  border: none;
  outline: none;
  color: #e6edf3;
  font-size: 13px;
  width: 100%;
  font-family: inherit;
}

.symbol-search-box input::placeholder {
  color: #6e7681;
}

.clear-search-btn {
  background: transparent;
  border: none;
  color: #8b949e;
  cursor: pointer;
  padding: 2px 6px;
  font-size: 12px;
  border-radius: 4px;
}
.clear-search-btn:hover {
  color: #f85149;
  background: rgba(248, 81, 73, 0.15);
}

.symbol-tabs {
  display: flex;
  background: #090d13;
  border-bottom: 1px solid #21262d;
  padding: 4px;
  gap: 4px;
}

.symbol-tab-btn {
  flex: 1;
  background: transparent;
  border: none;
  color: #8b949e;
  padding: 6px 4px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
}

.symbol-tab-btn:hover {
  color: #e6edf3;
  background: #161b22;
}

.symbol-tab-btn.active {
  background: #21262d;
  color: #58a6ff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.watchlist-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: #161b22;
  border-bottom: 1px solid #21262d;
  gap: 8px;
}

.btn-save-watchlist {
  background: #238636;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
}

.btn-save-watchlist:hover {
  background: #2ea043;
}

.btn-save-watchlist.saved {
  background: #1f6feb;
}

.btn-copy-top15,
.btn-clear-watchlist {
  background: transparent;
  border: 1px solid #30363d;
  color: #8b949e;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-copy-top15:hover,
.btn-clear-watchlist:hover {
  color: #e6edf3;
  border-color: #8b949e;
  background: #21262d;
}

.symbol-list-container {
  max-height: 280px;
  overflow-y: auto;
  padding: 4px 0;
}

.symbol-list-container::-webkit-scrollbar {
  width: 6px;
}
.symbol-list-container::-webkit-scrollbar-thumb {
  background: #30363d;
  border-radius: 3px;
}

.symbol-row {
  display: flex;
  align-items: center;
  padding: 7px 12px;
  gap: 10px;
  cursor: pointer;
  transition: background 0.12s;
}

.symbol-row:hover {
  background: #161b22;
}

.symbol-row.selected {
  background: rgba(31, 111, 235, 0.15);
  border-left: 3px solid #1f6feb;
}

.star-toggle-btn {
  background: transparent;
  border: none;
  color: #484f58;
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  transition: all 0.15s;
}

.star-toggle-btn:hover {
  color: #f59e0b;
  transform: scale(1.2);
}

.star-toggle-btn.active {
  color: #f59e0b;
  text-shadow: 0 0 6px rgba(245, 158, 11, 0.4);
}

.symbol-item-name {
  font-size: 13px;
  font-weight: 600;
  color: #e6edf3;
  flex: 1;
  font-family: monospace, sans-serif;
  letter-spacing: 0.3px;
}

.symbol-badges {
  display: flex;
  align-items: center;
  gap: 6px;
}

.badge-top15 {
  background: rgba(227, 179, 65, 0.15);
  color: #e3b341;
  font-size: 9px;
  font-weight: 700;
  padding: 2px 5px;
  border-radius: 3px;
  border: 1px solid rgba(227, 179, 65, 0.3);
}

.badge-current {
  background: rgba(31, 111, 235, 0.2);
  color: #58a6ff;
  font-size: 9px;
  font-weight: 700;
  padding: 2px 5px;
  border-radius: 3px;
  border: 1px solid rgba(88, 166, 255, 0.3);
}

.symbol-empty-state {
  padding: 24px 16px;
  text-align: center;
  color: #8b949e;
  font-size: 12px;
  line-height: 1.5;
}

.symbol-dropdown-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background: #090d13;
  border-top: 1px solid #21262d;
  font-size: 10px;
  color: #6e7681;
}

.help-text {
  color: #8b949e;
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

.indicators-divider {
  height: 1px;
  background: #30363d;
  margin: 4px 0;
}

.indicators-heading {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #8b949e;
  padding: 2px 0;
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
