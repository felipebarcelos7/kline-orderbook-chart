<template>
  <div class="chart-wrapper" ref="wrapperRef">
    <canvas ref="canvasRef" />
    <div
      v-if="liqZone"
      class="liq-tip liq-tip-zone"
      :style="{ left: (mouseX + 14) + 'px', top: (mouseY + 14) + 'px' }"
    >
      <div class="liq-title">LIQ ZONE</div>
      <div class="liq-row"><span class="k">Price</span><span class="v">{{ fmt(liqZone.price) }}</span></div>
      <div class="liq-row" v-if="liqZone.total"><span class="k">Total Liq</span><span class="v">{{ fmt(liqZone.total) }}</span></div>
      <div class="liq-row" v-if="liqZone.long"><span class="k">Long Liq</span><span class="v" :style="{ color: '#3fb950' }">{{ fmt(liqZone.long) }}{{ liqZonePct(liqZone.long, liqZone.total) }}</span></div>
      <div class="liq-row" v-if="liqZone.short"><span class="k">Short Liq</span><span class="v" :style="{ color: '#f85149' }">{{ fmt(liqZone.short) }}{{ liqZonePct(liqZone.short, liqZone.total) }}</span></div>
    </div>

    <div
      v-if="liqCell"
      :class="['liq-tip', 'liq-tip-cell', liqCellClass]"
      :style="{ left: (mouseX + 14) + 'px', top: (mouseY + 140) + 'px' }"
    >
      <div class="liq-title">
        <span>{{ liqCellTitle }}</span>
        <span v-if="liqCell.active != null" class="liq-badge">{{ liqCell.active ? 'ACTIVE' : 'INACTIVE' }}</span>
      </div>
      <div class="liq-row" v-if="liqCell.price"><span class="k">Price</span><span class="v">{{ fmt(liqCell.price) }}</span></div>
      <div class="liq-row" v-if="liqCell.contracts"><span class="k">Contracts</span><span class="v">{{ fmt(liqCell.contracts) }}</span></div>
      <div class="liq-row" v-if="liqCell.intensity != null"><span class="k">Intensity</span><span class="v">{{ liqIntensityText(liqCell.intensity) }}</span></div>
      <div class="liq-row" v-if="liqCell.duration"><span class="k">Duration</span><span class="v">{{ liqCell.duration }}</span></div>
    </div>

    <div
      v-if="props.chart.tooltip?.value"
      class="liq-tip chart-tip"
      :style="{ left: (props.chart.tooltipX?.value + 14) + 'px', top: (props.chart.tooltipY?.value + 14) + 'px' }"
    >
      <div class="liq-title">KLINE</div>
      <div class="liq-row"><span class="k">ts</span><span class="v">{{ tooltipNorm.tText }}</span></div>
      <div class="liq-row"><span class="k">o</span><span class="v">{{ tooltipNorm.oText }}</span></div>
      <div class="liq-row"><span class="k">h</span><span class="v">{{ tooltipNorm.hText }}</span></div>
      <div class="liq-row"><span class="k">l</span><span class="v">{{ tooltipNorm.lText }}</span></div>
      <div class="liq-row"><span class="k">c</span><span class="v">{{ tooltipNorm.cText }}</span></div>
      <div class="liq-row"><span class="k">v</span><span class="v">{{ tooltipNorm.vText }}</span></div>
      <div class="liq-row" v-if="tooltipNorm.changeText"><span class="k">change</span><span class="v" :style="{ color: tooltipNorm.change >= 0 ? '#3fb950' : '#f85149' }">{{ tooltipNorm.changeText }}</span></div>
      <div class="liq-row" v-if="tooltipNorm.changePctText"><span class="k">changePct</span><span class="v" :style="{ color: tooltipNorm.changePct >= 0 ? '#3fb950' : '#f85149' }">{{ tooltipNorm.changePctText }}</span></div>
      <div class="liq-row" v-if="tooltipNorm.isUpText"><span class="k">isUp</span><span class="v">{{ tooltipNorm.isUpText }}</span></div>
      <div class="liq-row" v-if="tooltipNorm.indexText"><span class="k">index</span><span class="v">{{ tooltipNorm.indexText }}</span></div>
      <div class="liq-row" v-if="tooltipNorm.iText"><span class="k">i</span><span class="v">{{ tooltipNorm.iText }}</span></div>
      <div class="liq-raw" v-if="tooltipNorm.rawText">{{ tooltipNorm.rawText }}</div>
    </div>

    <div v-if="oiCard" class="liq-tip oi-tip" style="right: 12px; bottom: 12px; top: auto; left: auto;">
      <div class="liq-title">OI METRICS</div>
      <div class="liq-row"><span class="k">OI</span><span class="v">{{ fmt(oiCard.oi) }}</span></div>
      <div class="liq-row" v-if="oiCard.change != null">
        <span class="k">OI Change</span>
        <span class="v" :style="{ color: oiCard.change >= 0 ? '#3fb950' : '#f85149' }">
          {{ fmt(oiCard.change) }} ({{ oiCard.changePctText }})
        </span>
      </div>
      <div class="liq-row" v-if="oiCard.relPct != null">
        <span class="k">Relative OI</span>
        <span class="v" :style="{ color: oiCard.relPct >= 0 ? '#3fb950' : '#f85149' }">
          {{ oiCard.relPctText }}
        </span>
      </div>
      <div class="liq-row" v-if="oiCard.flowText"><span class="k">Flow</span><span class="v">{{ oiCard.flowText }}</span></div>
      <div class="liq-row" v-if="oiCard.burstText"><span class="k">Burst</span><span class="v">{{ oiCard.burstText }}</span></div>
    </div>

    <div v-if="props.chart.ltTooltip?.value" class="liq-tip lt-tip" style="left: 12px; bottom: 12px; top: auto;">
      <div class="liq-title">LARGE TRADE</div>
      <div class="liq-row" v-if="props.chart.ltTooltip.value.p != null"><span class="k">Price</span><span class="v">{{ fmt(props.chart.ltTooltip.value.p) }}</span></div>
      <div class="liq-row" v-if="props.chart.ltTooltip.value.q != null"><span class="k">Qty</span><span class="v">{{ fmt(props.chart.ltTooltip.value.q) }}</span></div>
      <div class="liq-row" v-if="props.chart.ltTooltip.value.s != null"><span class="k">Side</span><span class="v">{{ props.chart.ltTooltip.value.s }}</span></div>
    </div>

    <div
      v-if="props.chart.vrvpTooltip?.value"
      class="liq-tip vrvp-tip"
      :style="{ left: (props.chart.vrvpTooltipX?.value + 14) + 'px', top: (props.chart.vrvpTooltipY?.value + 14) + 'px' }"
    >
      <div class="liq-title">VRVP</div>
      <div class="liq-row" v-if="props.chart.vrvpTooltip.value.p != null"><span class="k">Price</span><span class="v">{{ fmt(props.chart.vrvpTooltip.value.p) }}</span></div>
      <div class="liq-row" v-if="props.chart.vrvpTooltip.value.b != null"><span class="k">Bid</span><span class="v">{{ fmt(props.chart.vrvpTooltip.value.b) }}</span></div>
      <div class="liq-row" v-if="props.chart.vrvpTooltip.value.a != null"><span class="k">Ask</span><span class="v">{{ fmt(props.chart.vrvpTooltip.value.a) }}</span></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'

const props = defineProps({
  chart: { type: Object, required: true },
})

const canvasRef = ref(null)
const wrapperRef = ref(null)
let resizeObserver = null
let rafId = null
let _onMove = null
let _onLeave = null
let _lastHitAt = 0
const mouseX = ref(0)
const mouseY = ref(0)
const liqCell = ref(null)
const liqZone = ref(null)

function fmt(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return String(v ?? '')
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(2) + 'K'
  if (Math.abs(n) >= 1) return n.toFixed(2)
  return n.toFixed(6)
}

function _pick(obj, keys) {
  if (!obj || typeof obj !== 'object') return undefined
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] != null) return obj[k]
  }
  return undefined
}

function _fmtOrDash(v) {
  if (v == null || v === '') return '—'
  return fmt(v)
}

function _fmtTime(t) {
  const n = Number(t)
  if (!Number.isFinite(n) || n <= 0) return '—'
  const ms = n > 1e12 ? n : n * 1000
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return String(t)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

const tooltipNorm = computed(() => {
  const src = props.chart.tooltip?.value
  const raw = props.chart.tooltipRaw?.value || ''
  const kline = (src && typeof src === 'object' && src.kline && typeof src.kline === 'object') ? src.kline : src

  const t = _pick(kline, ['t', 'time', 'timestamp', 'ts'])
  const o = _pick(kline, ['o', 'open'])
  const h = _pick(kline, ['h', 'high'])
  const l = _pick(kline, ['l', 'low'])
  const c = _pick(kline, ['c', 'close'])
  const v = _pick(kline, ['v', 'vol', 'volume'])

  const rsi = _pick(src, ['rsi']) ?? _pick(kline, ['rsi'])
  const oi = _pick(src, ['oi', 'openInterest']) ?? _pick(kline, ['oi', 'openInterest'])
  const fr = _pick(src, ['fr', 'fundingRate']) ?? _pick(kline, ['fr', 'fundingRate'])
  const cvd = _pick(src, ['cvd']) ?? _pick(kline, ['cvd'])
  const change = _pick(src, ['change'])
  const changePct = _pick(src, ['changePct'])
  const isUp = _pick(src, ['isUp'])
  const idx = _pick(kline, ['index', 'i'])
  const intensity = _pick(src, ['i', 'intensity'])

  const allMissing = [t, o, h, l, c, v, rsi, oi, fr, cvd].every(x => x == null)
  const rawText = allMissing && raw ? raw.slice(0, 220) : ''

  return {
    tText: _fmtTime(t),
    oText: _fmtOrDash(o),
    hText: _fmtOrDash(h),
    lText: _fmtOrDash(l),
    cText: _fmtOrDash(c),
    vText: _fmtOrDash(v),
    rsiText: rsi == null ? '' : _fmtOrDash(rsi),
    oiText: oi == null ? '' : _fmtOrDash(oi),
    frText: fr == null ? '' : _fmtOrDash(fr),
    cvdText: cvd == null ? '' : _fmtOrDash(cvd),
    change: Number(change),
    changePct: Number(changePct),
    changeText: change == null ? '' : (Number(change) >= 0 ? '+' : '') + fmt(change),
    changePctText: changePct == null ? '' : (Number(changePct) >= 0 ? '+' : '') + Number(changePct).toFixed(2) + '%',
    isUpText: isUp == null ? '' : String(isUp),
    indexText: idx == null ? '' : String(idx),
    iText: intensity == null ? '' : fmt(intensity),
    rawText,
  }
})

function _parse(json) {
  if (!json || typeof json !== 'string') return null
  try { return JSON.parse(json) } catch { return null }
}

function _normalizeLiq(obj) {
  if (!obj || typeof obj !== 'object') return null
  const sideRaw = obj.side || obj.t || obj.type || ''
  const s = String(sideRaw).toLowerCase()
  let side = ''
  if (s.includes('long')) side = 'long'
  else if (s.includes('short')) side = 'short'
  else if (s.includes('buy')) side = 'long'
  else if (s.includes('sell')) side = 'short'
  return {
    side,
    active: obj.active ?? (obj.state != null ? (String(obj.state).toLowerCase() === 'active') : null),
    price: obj.price ?? obj.p ?? null,
    contracts: obj.contracts ?? obj.qty ?? obj.q ?? null,
    intensity: obj.intensity ?? obj.i ?? null,
    duration: obj.duration ?? obj.dur ?? null,
    total: obj.total ?? obj.sum ?? null,
    long: obj.long ?? obj.longLiq ?? null,
    short: obj.short ?? obj.shortLiq ?? null,
    time: obj.time ?? obj.ts ?? null,
  }
}

function liqIntensityText(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return String(v ?? '—')
  const pct = n <= 1 ? (n * 100) : n
  return pct.toFixed(1) + '%'
}

function liqZonePct(part, total) {
  const p = Number(part)
  const t = Number(total)
  if (!Number.isFinite(p) || !Number.isFinite(t) || t <= 0) return ''
  const pct = (100 * p / t)
  return ' (' + pct.toFixed(1) + '%)'
}

const liqCellTitle = computed(() => {
  if (!liqCell.value) return ''
  return liqCell.value.side === 'short' ? 'SHORT LIQ' : 'LONG LIQ'
})

const liqCellClass = computed(() => {
  if (!liqCell.value) return ''
  return liqCell.value.side === 'short' ? 'liq-short' : 'liq-long'
})

function _findIdxTs(tsArr, tSec) {
  if (!tsArr || typeof tsArr.length !== 'number' || tsArr.length === 0) return -1
  let lo = 0
  let hi = tsArr.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const v = tsArr[mid]
    if (v === tSec) return mid
    if (v < tSec) lo = mid + 1
    else hi = mid - 1
  }
  return Math.max(0, Math.min(tsArr.length - 1, hi))
}

const oiCard = computed(() => {
  const tip = props.chart.tooltip?.value
  if (!tip || typeof tip !== 'object') return null
  const kline = (tip.kline && typeof tip.kline === 'object') ? tip.kline : tip
  const tipOi = _pick(tip, ['oi', 'openInterest']) ?? _pick(kline, ['oi', 'openInterest'])
  if (tipOi == null) return null

  const series = props.chart.oiSeries?.value
  const b = props.chart.bridge?.value
  if (!series || !b || typeof b.getKlineTimestamps !== 'function') {
    return { oi: tipOi, change: null, changePctText: '—', relPct: null, relPctText: '—', flowText: '', burstText: '' }
  }

  let tsArr = null
  try { tsArr = b.getKlineTimestamps() } catch {}
  if (!tsArr || !tsArr.length) {
    return { oi: tip.oi, change: null, changePctText: '—', relPct: null, relPctText: '—', flowText: '', burstText: '' }
  }

  const tipT = _pick(kline, ['t', 'time', 'timestamp', 'ts'])
  const idx = _findIdxTs(tsArr, Number(tipT))
  const cur = Number(series[idx])
  const prev = idx > 0 ? Number(series[idx - 1]) : NaN
  const change = Number.isFinite(prev) ? (cur - prev) : null
  const changePct = (Number.isFinite(prev) && prev !== 0) ? (100 * (cur - prev) / prev) : null

  const win = 20
  const from = Math.max(0, idx - win + 1)
  let sum = 0
  let cnt = 0
  let sumAbsDelta = 0
  let cntDelta = 0
  for (let i = from; i <= idx; i++) {
    const v = Number(series[i])
    if (!Number.isFinite(v)) continue
    sum += v
    cnt++
    if (i > from) {
      const pv = Number(series[i - 1])
      if (Number.isFinite(pv)) {
        sumAbsDelta += Math.abs(v - pv)
        cntDelta++
      }
    }
  }
  const sma = cnt > 0 ? (sum / cnt) : NaN
  const relPct = (Number.isFinite(sma) && sma !== 0) ? (100 * (cur - sma) / sma) : null
  const avgAbsDelta = cntDelta > 0 ? (sumAbsDelta / cntDelta) : NaN

  const tc = _pick(kline, ['c', 'close'])
  const to = _pick(kline, ['o', 'open'])
  const isUpCandle = (tc != null && to != null) ? (Number(tc) >= Number(to)) : null
  let flowText = ''
  if (change != null) {
    if (change > 0) flowText = isUpCandle === false ? 'Bear inflow' : 'Bull inflow'
    if (change < 0) flowText = isUpCandle === false ? 'Bear outflow' : 'Bull outflow'
  }

  let burstText = 'None'
  if (change != null) {
    const bigByPct = changePct != null && Math.abs(changePct) >= 1.5
    const bigByAbs = Number.isFinite(avgAbsDelta) && avgAbsDelta > 0 && Math.abs(change) >= 2.5 * avgAbsDelta
    if (bigByPct || bigByAbs) burstText = 'High'
  }

  return {
    oi: cur,
    change,
    changePctText: changePct == null ? '—' : (changePct >= 0 ? '+' : '') + changePct.toFixed(2) + '%',
    relPct,
    relPctText: relPct == null ? '—' : (relPct >= 0 ? '+' : '') + relPct.toFixed(2) + '%',
    flowText,
    burstText,
  }
})

function _hitTestAt(clientX, clientY) {
  const canvas = canvasRef.value
  const wrapper = wrapperRef.value
  const b = props.chart.bridge.value
  if (!canvas || !wrapper || !b) return
  if (props.chart.liqHeatmapEnabled?.value === false) return

  const now = performance.now()
  if (now - _lastHitAt < 50) return
  _lastHitAt = now

  const rect = canvas.getBoundingClientRect()
  const sx = clientX - rect.left
  const sy = clientY - rect.top
  mouseX.value = sx
  mouseY.value = sy

  let cellJson = ''
  let zoneJson = ''
  try { cellJson = b.liqHeatmapHitTest?.(sx, sy) || '' } catch {}
  try { zoneJson = b.liqZoneHitTest?.(sx, sy) || '' } catch {}

  liqCell.value = _normalizeLiq(_parse(cellJson))
  liqZone.value = _normalizeLiq(_parse(zoneJson))
}

onMounted(async () => {
  const canvas = canvasRef.value
  const wrapper = wrapperRef.value
  if (!canvas || !wrapper) return

  canvas.style.width = '100%'
  canvas.style.height = '100%'

  await props.chart.init(canvas)

  resizeObserver = new ResizeObserver(() => {
    props.chart.bridge.value?.resize()
  })
  resizeObserver.observe(wrapper)

  _onMove = (e) => {
    if (rafId) cancelAnimationFrame(rafId)
    rafId = requestAnimationFrame(() => {
      rafId = null
      _hitTestAt(e.clientX, e.clientY)
    })
  }
  _onLeave = () => {
    liqCell.value = null
    liqZone.value = null
  }

  wrapper.addEventListener('mousemove', _onMove)
  wrapper.addEventListener('mouseleave', _onLeave)
})

onBeforeUnmount(() => {
  const wrapper = wrapperRef.value
  if (wrapper && _onMove) wrapper.removeEventListener('mousemove', _onMove)
  if (wrapper && _onLeave) wrapper.removeEventListener('mouseleave', _onLeave)
  resizeObserver?.disconnect()
  if (rafId) cancelAnimationFrame(rafId)
})
</script>

<style scoped>
.chart-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  background: #0d1117;
  border-radius: 8px;
  overflow: hidden;
}
canvas {
  display: block;
}

.liq-tip {
  position: absolute;
  pointer-events: none;
  z-index: 6;
  min-width: 210px;
  max-width: 260px;
  background: rgba(10, 12, 18, 0.92);
  border: 1px solid rgba(48, 54, 61, 0.9);
  border-radius: 8px;
  padding: 10px 12px;
  box-shadow: 0 14px 26px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(6px);
}

.liq-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.6px;
  color: #f85149;
  margin-bottom: 8px;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.liq-tip-zone .liq-title {
  color: #58a6ff;
}

.chart-tip .liq-title {
  color: #a371f7;
}

.lt-tip .liq-title {
  color: #f0883e;
}

.vrvp-tip .liq-title {
  color: #3fb950;
}

.oi-tip .liq-title {
  color: #8b949e;
}

.liq-long .liq-title {
  color: #3fb950;
}

.liq-short .liq-title {
  color: #f85149;
}

.liq-short .liq-badge {
  background: rgba(248, 81, 73, 0.15);
  color: #f85149;
}

.liq-long .liq-badge {
  background: rgba(63, 185, 80, 0.15);
  color: #3fb950;
}

.liq-tip-cell {
  min-width: 240px;
}

.liq-badge {
  font-size: 10px;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(88, 166, 255, 0.15);
  color: #58a6ff;
}

.liq-raw {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(48, 54, 61, 0.65);
  font-size: 11px;
  line-height: 1.35;
  color: rgba(139, 148, 158, 0.9);
  word-break: break-word;
}

.liq-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
  line-height: 1.45;
}

.liq-row .k {
  color: rgba(139, 148, 158, 0.9);
}

.liq-row .v {
  color: rgba(230, 237, 243, 0.95);
  font-variant-numeric: tabular-nums;
}
</style>
