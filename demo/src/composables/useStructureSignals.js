import { ref, shallowRef } from 'vue'

// JS port of the Pine "Select Forex Signals (Structure Trade Manager)".
// Detects pivots on closed bars, derives Main / DCA+ signals, builds the trade
// plan (ET1/ET2/AVG/SL/TP1-TP6) and tracks the lifecycle to feed the
// Live Signals panel + Signal History table.

const TF_LABEL = {
  60: '1m', 180: '3m', 300: '5m', 900: '15m', 1800: '30m',
  3600: '1h', 7200: '2h', 14400: '4h',
  86400: '1d', 604800: '1w', 2592000: '1M',
}

// Preset calibrados por timeframe para trabalhar com qualquer par USDT
const TF_MULT = {
  60:     { swingMain: 5, swingMinor: 3, entryPct: 0.0008, stopPct: 0.0018, minTpGapPct: 0.00008, maxAlignGapPct: 0.0018 },
  180:    { swingMain: 5, swingMinor: 3, entryPct: 0.0012, stopPct: 0.0024, minTpGapPct: 0.00010, maxAlignGapPct: 0.0024 },
  300:    { swingMain: 6, swingMinor: 4, entryPct: 0.0015, stopPct: 0.0030, minTpGapPct: 0.00012, maxAlignGapPct: 0.0030 },
  900:    { swingMain: 7, swingMinor: 5, entryPct: 0.0023, stopPct: 0.0045, minTpGapPct: 0.00018, maxAlignGapPct: 0.0045 },
  1800:   { swingMain: 8, swingMinor: 5, entryPct: 0.0030, stopPct: 0.0060, minTpGapPct: 0.00025, maxAlignGapPct: 0.0060 },
  3600:   { swingMain: 8, swingMinor: 5, entryPct: 0.0050, stopPct: 0.0100, minTpGapPct: 0.00045, maxAlignGapPct: 0.0100 },
  7200:   { swingMain: 9, swingMinor: 6, entryPct: 0.0070, stopPct: 0.0140, minTpGapPct: 0.00065, maxAlignGapPct: 0.0140 },
  14400:  { swingMain: 10, swingMinor: 6, entryPct: 0.0100, stopPct: 0.0200, minTpGapPct: 0.00100, maxAlignGapPct: 0.0200 },
  86400:  { swingMain: 12, swingMinor: 7, entryPct: 0.0200, stopPct: 0.0400, minTpGapPct: 0.00200, maxAlignGapPct: 0.0400 },
  604800: { swingMain: 14, swingMinor: 8, entryPct: 0.0500, stopPct: 0.0900, minTpGapPct: 0.00500, maxAlignGapPct: 0.0900 },
  2592000:{ swingMain: 15, swingMinor: 8, entryPct: 0.0800, stopPct: 0.1500, minTpGapPct: 0.00800, maxAlignGapPct: 0.1500 },
}

function getTfConfig(tfSec) {
  if (TF_MULT[tfSec]) return TF_MULT[tfSec]
  if (tfSec <= 180) return TF_MULT[60]
  if (tfSec <= 450) return TF_MULT[300]
  if (tfSec <= 1200) return TF_MULT[900]
  if (tfSec <= 2700) return TF_MULT[1800]
  if (tfSec <= 5400) return TF_MULT[3600]
  if (tfSec <= 10800) return TF_MULT[7200]
  if (tfSec <= 43200) return TF_MULT[14400]
  if (tfSec <= 259200) return TF_MULT[86400]
  return TF_MULT[604800]
}

// R-multiples: TP1 0.8R, TP2 1.0R, TP3 1.3R, TP4 1.6R, TP5 2.0R, TP6 2.5R
const TP_R = [0.8, 1.0, 1.3, 1.6, 2.0, 2.5]

function pivotHigh(bars, len, idx) {
  if (idx - len < 0 || idx + len >= bars.length) return null
  const center = bars[idx].high
  for (let k = 1; k <= len; k++) {
    if (bars[idx - k].high >= center) return null
    if (bars[idx + k].high >= center) return null
  }
  return center
}

function pivotLow(bars, len, idx) {
  if (idx - len < 0 || idx + len >= bars.length) return null
  const center = bars[idx].low
  for (let k = 1; k <= len; k++) {
    if (bars[idx - k].low <= center) return null
    if (bars[idx + k].low <= center) return null
  }
  return center
}

function alignToPivot(tp, pivots, maxGap) {
  let aligned = tp
  let bestDist = maxGap
  for (const p of pivots) {
    if (p == null) continue
    const d = Math.abs(p - tp)
    if (d < bestDist) {
      aligned = p
      bestDist = d
    }
  }
  return aligned
}

function monotonic(dir, prev, tp, minGap) {
  return dir === 1 ? Math.max(tp, prev + minGap) : Math.min(tp, prev - minGap)
}

function newTrade(dir, cfg, refPrice, time, kind, symbol, tfSec, pivots) {
  const zone = refPrice * cfg.entryPct
  const avg = refPrice
  const et1 = dir === 1 ? avg - zone : avg + zone
  const et2 = dir === 1 ? avg - zone * 0.5 : avg + zone * 0.5
  const sl = dir === 1 ? avg - refPrice * cfg.stopPct : avg + refPrice * cfg.stopPct
  const r = Math.abs(avg - sl)
  const minGap = refPrice * cfg.minTpGapPct
  const maxAlignGap = refPrice * cfg.maxAlignGapPct

  const sidePivots = dir === 1
    ? [pivots.lastSwingH, pivots.lastSwingH2, pivots.lastMinH]
    : [pivots.lastSwingL, pivots.lastSwingL2, pivots.lastMinL]

  let tps = TP_R.map(m => dir === 1 ? avg + r * m : avg - r * m)
  tps = tps.map(t => alignToPivot(t, sidePivots, maxAlignGap))
  for (let i = 1; i < tps.length; i++) {
    tps[i] = monotonic(dir, tps[i - 1], tps[i], minGap)
  }

  return {
    id: `${symbol}-${tfSec}-${kind}-${time}`,
    symbol,
    tfSec,
    tfLabel: TF_LABEL[tfSec] || `${tfSec}s`,
    kind,             // 'main' | 'dca'
    dir,              // 1 buy, -1 sell
    side: dir === 1 ? 'BUY' : 'SELL',
    openedAt: time * 1000,
    closedAt: null,
    et1, et2, avg, sl,
    tps,
    hits: [false, false, false, false, false, false],
    hitSL: false,
    triggered: false,
    expired: false,
    active: true,
    maxPips: 0,
    exitPrice: null,
    closeReason: null,   // 'TP{n}' | 'SL' | 'EXPIRED'
    finalPips: null,
  }
}

function pipSize(tickSize) {
  const t = tickSize || 0.01
  if (t >= 1) return 1
  if (t >= 0.1) return 0.1
  if (t >= 0.01) return 0.01
  if (t >= 0.001) return 0.001
  return t
}

function classifyClose(t) {
  if (t.hitSL) return 'STOP_LOSS_HIT'
  for (let i = t.hits.length - 1; i >= 0; i--) {
    if (t.hits[i]) return `TARGET_TP${i + 1}_REACHED`
  }
  if (t.expired) return 'EXPIRED'
  return null
}

export function useStructureSignals() {
  const liveSignals = shallowRef([])      // currently active trades (Main + DCA)
  const history = shallowRef([])           // closed trades (most recent first)
  const isScanning = ref(false)
  const stats = ref({
    total: 0, wins: 0, losses: 0, expired: 0,
    pipsNet: 0, winRate: 0,
  })

  // Per-stream state keyed by `${symbol}:${tfSec}`
  const streams = new Map()

  function _key(symbol, tfSec) { return `${symbol}:${tfSec}` }

  function _newStream(symbol, tfSec, tickSize) {
    const cfg = getTfConfig(tfSec)
    return {
      symbol,
      tfSec,
      tickSize,
      pip: pipSize(tickSize),
      cfg,
      bars: [],            // { time, open, high, low, close, volume } sorted ascending
      lastBarTime: 0,
      lastSwingH: null,
      lastSwingH2: null,
      lastSwingL: null,
      lastSwingL2: null,
      lastMinH: null,
      lastMinL: null,
      trend: 0,
      mainTrade: null,
      dcaTrade: null,
    }
  }

  function _publish() {
    const allLive = []
    for (const s of streams.values()) {
      const livePrice = s.bars.length > 0 ? s.bars[s.bars.length - 1].close : null
      if (s.mainTrade?.active) {
        s.mainTrade.livePrice = livePrice
        allLive.push(s.mainTrade)
      }
      if (s.dcaTrade?.active) {
        s.dcaTrade.livePrice = livePrice
        allLive.push(s.dcaTrade)
      }
    }
    allLive.sort((a, b) => b.openedAt - a.openedAt)
    liveSignals.value = allLive
  }

  function _closeTrade(stream, trade, reason) {
    if (!trade) return
    trade.active = false
    trade.closedAt = Date.now()

    const natural = classifyClose(trade)
    trade.closeReason = natural || reason || 'EXPIRED'
    trade.expired = trade.closeReason === 'EXPIRED'

    if (trade.hitSL) {
      trade.exitPrice = trade.sl
      trade.finalPips = (trade.dir === 1 ? trade.sl - trade.avg : trade.avg - trade.sl) / stream.pip
    } else {
      const lastHit = trade.hits.lastIndexOf(true)
      if (lastHit >= 0) {
        const tp = trade.tps[lastHit]
        trade.exitPrice = tp
        trade.finalPips = (trade.dir === 1 ? tp - trade.avg : trade.avg - tp) / stream.pip
      } else {
        const lastBarClose = stream.bars.length > 0 ? stream.bars[stream.bars.length - 1].close : trade.avg
        trade.exitPrice = lastBarClose
        trade.finalPips = 0
      }
    }

    history.value = [trade, ...history.value].slice(0, 500)
    _recalcStats()
  }

  function _recalcStats() {
    let wins = 0, losses = 0, expired = 0, pipsNet = 0
    for (const t of history.value) {
      if (t.hitSL) losses++
      else if (t.hits.some(Boolean)) wins++
      else expired++
      pipsNet += t.finalPips || 0
    }
    const total = history.value.length
    const decided = wins + losses
    stats.value = {
      total,
      wins,
      losses,
      expired,
      pipsNet: Math.round(pipsNet),
      winRate: decided > 0 ? Math.round((wins * 100) / decided) : 0,
    }
  }

  function _updateTrade(stream, trade, bar) {
    if (!trade || !trade.active) return
    if (!trade.triggered) {
      const zmin = Math.min(trade.et1, trade.et2)
      const zmax = Math.max(trade.et1, trade.et2)
      if (bar.low <= zmax && bar.high >= zmin) trade.triggered = true
    }
    if (!trade.triggered) return

    if (trade.dir === 1 && bar.low <= trade.sl) trade.hitSL = true
    if (trade.dir === -1 && bar.high >= trade.sl) trade.hitSL = true

    for (let i = 0; i < 6; i++) {
      if (trade.hits[i]) continue
      if (trade.dir === 1 && bar.high >= trade.tps[i]) trade.hits[i] = true
      if (trade.dir === -1 && bar.low <= trade.tps[i]) trade.hits[i] = true
    }

    if (trade.hits[0]) {
      const profPrice = trade.dir === 1 ? bar.high - trade.avg : trade.avg - bar.low
      const pips = profPrice / stream.pip
      if (pips > trade.maxPips) trade.maxPips = pips
    }

    if (trade.hitSL) _closeTrade(stream, trade, 'STOP_LOSS_HIT')
    else if (trade.hits[5]) _closeTrade(stream, trade, 'TARGET_TP6_REACHED')
  }

  function _processClosedBar(stream, idx) {
    const bar = stream.bars[idx]
    const cfg = stream.cfg
    const swingMain = cfg.swingMain
    const swingMinor = cfg.swingMinor

    const pivotIdx = idx - swingMain
    if (pivotIdx >= 0) {
      const ph = pivotHigh(stream.bars, swingMain, pivotIdx)
      const pl = pivotLow(stream.bars, swingMain, pivotIdx)
      if (ph !== null) {
        stream.lastSwingH2 = stream.lastSwingH
        stream.lastSwingH = ph
      }
      if (pl !== null) {
        stream.lastSwingL2 = stream.lastSwingL
        stream.lastSwingL = pl
      }
    }
    const minorIdx = idx - swingMinor
    if (minorIdx >= 0) {
      const ph = pivotHigh(stream.bars, swingMinor, minorIdx)
      const pl = pivotLow(stream.bars, swingMinor, minorIdx)
      if (ph !== null) stream.lastMinH = ph
      if (pl !== null) stream.lastMinL = pl
    }

    const close = bar.close
    const bullBreak = stream.lastSwingH !== null && close > stream.lastSwingH
    const bearBreak = stream.lastSwingL !== null && close < stream.lastSwingL
    const bullShift = bullBreak && stream.trend !== 1
    const bearShift = bearBreak && stream.trend !== -1
    if (bullShift) stream.trend = 1
    else if (bearShift) stream.trend = -1
    const dcaBuy = stream.trend === 1 && !bullShift && !bearShift && stream.lastMinH !== null && close > stream.lastMinH
    const dcaSell = stream.trend === -1 && !bullShift && !bearShift && stream.lastMinL !== null && close < stream.lastMinL

    const pivots = {
      lastSwingH: stream.lastSwingH, lastSwingH2: stream.lastSwingH2,
      lastSwingL: stream.lastSwingL, lastSwingL2: stream.lastSwingL2,
      lastMinH:   stream.lastMinH,   lastMinL:    stream.lastMinL,
    }
    if (bullShift || bearShift) {
      if (stream.mainTrade?.active) _closeTrade(stream, stream.mainTrade, 'EXPIRED')
      stream.mainTrade = newTrade(
        bullShift ? 1 : -1, cfg, close, bar.time,
        'main', stream.symbol, stream.tfSec, pivots,
      )
      if (stream.dcaTrade?.active) _closeTrade(stream, stream.dcaTrade, 'EXPIRED')
    } else if (dcaBuy || dcaSell) {
      if (stream.dcaTrade?.active) _closeTrade(stream, stream.dcaTrade, 'EXPIRED')
      stream.dcaTrade = newTrade(
        dcaBuy ? 1 : -1, cfg, close, bar.time,
        'dca', stream.symbol, stream.tfSec, pivots,
      )
      if (dcaBuy) stream.lastMinH = null
      if (dcaSell) stream.lastMinL = null
    }

    _updateTrade(stream, stream.mainTrade, bar)
    _updateTrade(stream, stream.dcaTrade, bar)
  }

  function setHistory(symbol, tfSec, klines, tickSize) {
    if (!symbol || !tfSec || !Array.isArray(klines) || klines.length === 0) return

    const key = _key(symbol, tfSec)
    const stream = _newStream(symbol, tfSec, tickSize)
    streams.set(key, stream)

    stream.bars = klines.map(k => ({
      time: Math.floor(k.time / 1000),
      open: +k.open, high: +k.high, low: +k.low, close: +k.close,
      volume: +k.volume,
    }))
    stream.lastBarTime = stream.bars.length > 0 ? stream.bars[stream.bars.length - 1].time : 0

    for (let i = 0; i < stream.bars.length; i++) {
      _processClosedBar(stream, i)
    }
    _publish()
  }

  function handleKline(symbol, tfSec, kline) {
    const key = _key(symbol, tfSec)
    const stream = streams.get(key)
    if (!stream) return

    const t = Math.floor(kline.time / 1000)
    const bar = {
      time: t,
      open: +kline.open, high: +kline.high, low: +kline.low, close: +kline.close,
      volume: +kline.volume,
    }

    if (t > stream.lastBarTime) {
      stream.bars.push(bar)
      stream.lastBarTime = t
    } else {
      const last = stream.bars[stream.bars.length - 1]
      if (last) {
        last.open = bar.open; last.high = bar.high
        last.low = bar.low; last.close = bar.close
        last.volume = bar.volume
      } else {
        stream.bars.push(bar)
      }
    }

    if (kline.closed) {
      _processClosedBar(stream, stream.bars.length - 1)
    } else {
      const live = stream.bars[stream.bars.length - 1]
      _updateTrade(stream, stream.mainTrade, live)
      _updateTrade(stream, stream.dcaTrade, live)
    }
    _publish()
  }

  const DEFAULT_SCAN_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT']

  async function scanMultiSymbols(symbols = DEFAULT_SCAN_SYMBOLS, tfSec = 900) {
    if (isScanning.value) return
    isScanning.value = true
    const tfMap = {
      60: '1m', 180: '3m', 300: '5m', 900: '15m', 1800: '30m',
      3600: '1h', 7200: '2h', 14400: '4h', 86400: '1d', 604800: '1w', 2592000: '1M'
    }
    const interval = tfMap[tfSec] || (tfSec >= 86400 ? '1d' : (tfSec >= 3600 ? '1h' : '15m'))

    const tasks = symbols.map(async (sym) => {
      try {
        const res = await fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${sym}&interval=${interval}&limit=120`)
        if (!res.ok) return
        const raw = await res.json()
        const klines = raw.map(k => ({
          time: k[0],
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5]),
          closed: true
        }))
        const tickSize = sym.startsWith('BTC') ? 0.5 : (sym.startsWith('ETH') ? 0.05 : 0.001)
        setHistory(sym, tfSec, klines, tickSize)
      } catch (e) {
        console.warn(`Scanner error for ${sym}:`, e.message)
      }
    })

    try {
      await Promise.all(tasks)
    } finally {
      isScanning.value = false
    }
  }

  function reset(symbol, tfSec) {
    if (symbol && tfSec) streams.delete(_key(symbol, tfSec))
    else streams.clear()
    _publish()
  }

  function clearHistory() {
    history.value = []
    _recalcStats()
  }

  return {
    liveSignals,
    history,
    stats,
    isScanning,
    setHistory,
    handleKline,
    scanMultiSymbols,
    reset,
    clearHistory,
  }
}
