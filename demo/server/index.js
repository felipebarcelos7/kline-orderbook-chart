import { WebSocketServer } from 'ws'
import { BinanceAdapter, fetchKlineHistory as fetchBinanceKlines, fetchOpenInterest as fetchBinanceOi, fetchOiHistory as fetchBinanceOiHistory } from './exchanges/binance.js'
import { BybitAdapter, fetchKlineHistory as fetchBybitKlines, fetchOpenInterest as fetchBybitOi } from './exchanges/bybit.js'

const PORT = 4400

const EXCHANGES = {
  binance: {
    Adapter: BinanceAdapter,
    fetchKlines: fetchBinanceKlines,
    symbols: [
      'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT',
      'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'LINKUSDT', 'DOTUSDT',
      'LTCUSDT', 'TRXUSDT', 'ATOMUSDT', 'NEARUSDT', 'APTUSDT',
      'ARBUSDT', 'OPUSDT', 'SUIUSDT', 'INJUSDT', 'MATICUSDT',
    ],
  },
  bybit: {
    Adapter: BybitAdapter,
    fetchKlines: fetchBybitKlines,
    symbols: [
      'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT',
      'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'LINKUSDT', 'DOTUSDT',
      'LTCUSDT', 'TRXUSDT', 'ATOMUSDT', 'NEARUSDT', 'APTUSDT',
      'ARBUSDT', 'OPUSDT', 'SUIUSDT', 'INJUSDT', 'MATICUSDT',
    ],
  },
}

const MAX_HEATMAP_ROWS = 4000
const HEATMAP_PAD_ROWS = 20

class HeatmapAggregator {
  constructor(tickSize, candleMs) {
    this.tickSize = tickSize
    this.bucketColumns = new Map()
    this.currentBucket = 0
    this.currentMaxColumn = new Map()
    this.aggrTime = candleMs
    this.midPrice = 0
    this.lastDepthGrouped = new Map()
  }

  _round(price) {
    const tick = this.tickSize
    return Math.round(price / tick) * tick
  }

  _computeMid(depth) {
    const bestBid = depth.bids.length > 0 ? depth.bids[0][0] : 0
    const bestAsk = depth.asks.length > 0 ? depth.asks[0][0] : 0
    if (bestBid > 0 && bestAsk > 0) return (bestBid + bestAsk) / 2
    return bestBid || bestAsk || this.midPrice
  }

  updateFromDepth(depth, timeMs) {
    const bucket = Math.floor(timeMs / this.aggrTime) * this.aggrTime

    if (this.currentBucket && bucket > this.currentBucket) {
      this._freezeBucket(this.currentBucket)
    }
    this.currentBucket = bucket

    this.midPrice = this._computeMid(depth)
    if (this.midPrice <= 0) return

    const grouped = new Map()
    for (const [price, qty] of depth.bids) {
      const rp = this._round(price)
      grouped.set(rp, (grouped.get(rp) || 0) + qty)
    }
    for (const [price, qty] of depth.asks) {
      const rp = this._round(price)
      grouped.set(rp, (grouped.get(rp) || 0) + qty)
    }
    this.lastDepthGrouped = grouped

    for (const [price, qty] of grouped) {
      const prev = this.currentMaxColumn.get(price) || 0
      if (qty > prev) this.currentMaxColumn.set(price, qty)
    }
  }

  _freezeBucket(bucketTime) {
    if (this.currentMaxColumn.size === 0) return
    this.bucketColumns.set(bucketTime, new Map(this.currentMaxColumn))
    this.currentMaxColumn.clear()

    const cutoff = Date.now() - 3600_000
    for (const [t] of this.bucketColumns) {
      if (t < cutoff) this.bucketColumns.delete(t)
    }
  }

  getCurrentColumn() {
    return this._buildColumn(this.lastDepthGrouped, Date.now())
  }

  getFrozenColumn(bucketTime) {
    const data = this.bucketColumns.get(bucketTime)
    if (!data) return null
    return this._buildColumn(data, bucketTime)
  }

  _buildColumn(priceMap, timestamp) {
    if (priceMap.size === 0 || this.midPrice <= 0) return null

    const tick = this.tickSize

    let pMin = Infinity
    let pMax = -Infinity
    for (const [price, qty] of priceMap) {
      if (qty > 0) {
        if (price < pMin) pMin = price
        if (price > pMax) pMax = price
      }
    }
    if (pMin > pMax) return null

    const yStart = this._round(pMin) - HEATMAP_PAD_ROWS * tick
    const yEnd = this._round(pMax) + HEATMAP_PAD_ROWS * tick
    let rows = Math.round((yEnd - yStart) / tick) + 1
    if (rows > MAX_HEATMAP_ROWS) rows = MAX_HEATMAP_ROWS
    if (rows < 10) return null

    const values = new Array(rows).fill(0)
    for (const [price, qty] of priceMap) {
      const idx = Math.round((price - yStart) / tick)
      if (idx >= 0 && idx < rows) values[idx] = qty
    }

    return { values, yStart, yStep: tick, rows, timestamp }
  }
}

function getTickSize(symbol) {
  const s = symbol.toUpperCase()
  if (s.startsWith('BTC')) return 0.5
  if (s.startsWith('ETH')) return 0.05
  if (s.startsWith('SOL')) return 0.005
  if (s.startsWith('BNB')) return 0.01
  if (s.startsWith('XRP')) return 0.0005
  return 0.001
}

const wss = new WebSocketServer({ port: PORT })
const subscriptions = new Map()

function broadcast(subKey, type, data) {
  const subs = subscriptions.get(subKey)
  if (!subs || subs.size === 0) return
  const msg = JSON.stringify({ type, ...data })
  for (const ws of subs) {
    if (ws.readyState === 1) ws.send(msg)
  }
}

const activeFeeds = new Map()

const SUPPORTED_INTERVALS_SEC = [
  60,        // 1m
  300,       // 5m
  900,       // 15m
  1800,      // 30m
  2700,      // 45m (aggregated)
  3600,      // 1h
  7200,      // 2h
  10800,     // 3h (may be native or aggregated)
  14400,     // 4h
  86400,     // 1d
  604800,    // 1w
  2592000,   // 1M (approx; exchange-native)
]

function _normIntervalSec(v) {
  const n = Number(v)
  if (SUPPORTED_INTERVALS_SEC.includes(n)) return n
  return 300
}

function _binanceInterval(sec) {
  switch (sec) {
    case 60: return '1m'
    case 300: return '5m'
    case 900: return '15m'
    case 1800: return '30m'
    case 3600: return '1h'
    case 7200: return '2h'
    case 14400: return '4h'
    case 86400: return '1d'
    case 604800: return '1w'
    case 2592000: return '1M'
    default: return null
  }
}

function _bybitInterval(sec) {
  switch (sec) {
    case 60: return '1'
    case 300: return '5'
    case 900: return '15'
    case 1800: return '30'
    case 3600: return '60'
    case 7200: return '120'
    case 10800: return '180'
    case 14400: return '240'
    case 86400: return 'D'
    case 604800: return 'W'
    case 2592000: return 'M'
    default: return null
  }
}

function _intervalStr(exchange, sec) {
  return exchange === 'bybit' ? _bybitInterval(sec) : _binanceInterval(sec)
}

function _baseIntervalSec(exchange, targetSec) {
  if (_intervalStr(exchange, targetSec)) return targetSec

  const candidates = [...SUPPORTED_INTERVALS_SEC].sort((a, b) => b - a)
  for (const base of candidates) {
    if (base >= targetSec) continue
    if (targetSec % base !== 0) continue
    if (_intervalStr(exchange, base)) return base
  }
  return 60
}

function _aggregateHistory(klines, targetSec) {
  if (!Array.isArray(klines) || klines.length === 0) return []
  const out = []
  let cur = null

  for (const k of klines) {
    const t = Number(k.time)
    if (!Number.isFinite(t)) continue
    const bucketStart = Math.floor(t / 1000 / targetSec) * targetSec * 1000

    if (!cur || bucketStart !== cur.time) {
      if (cur) out.push(cur)
      cur = {
        time: bucketStart,
        open: Number(k.open),
        high: Number(k.high),
        low: Number(k.low),
        close: Number(k.close),
        volume: Number(k.volume) || 0,
        closed: true,
      }
      continue
    }

    cur.high = Math.max(cur.high, Number(k.high))
    cur.low = Math.min(cur.low, Number(k.low))
    cur.close = Number(k.close)
    cur.volume += Number(k.volume) || 0
  }

  if (cur) out.push(cur)
  return out
}

class KlineAggregator {
  constructor(targetSec, baseSec, emit) {
    this.targetSec = targetSec
    this.baseSec = baseSec
    this.emit = emit
    this.cur = null
    this.baseVol = new Map()
  }

  onBaseKline(k) {
    const t = Number(k.time)
    if (!Number.isFinite(t)) return

    const bucketStart = Math.floor(t / 1000 / this.targetSec) * this.targetSec * 1000
    const bucketEnd = bucketStart + this.targetSec * 1000
    const baseEnd = t + this.baseSec * 1000

    if (!this.cur || bucketStart !== this.cur.time) {
      if (this.cur) this.emit({ ...this.cur, closed: true })
      this.cur = {
        time: bucketStart,
        open: Number(k.open),
        high: Number(k.high),
        low: Number(k.low),
        close: Number(k.close),
        volume: 0,
        closed: false,
      }
      this.baseVol.clear()
    }

    const prevVol = this.baseVol.get(t) || 0
    const volNow = Number(k.volume) || 0
    const delta = Math.max(0, volNow - prevVol)
    this.cur.volume += delta
    this.baseVol.set(t, volNow)

    this.cur.high = Math.max(this.cur.high, Number(k.high))
    this.cur.low = Math.min(this.cur.low, Number(k.low))
    this.cur.close = Number(k.close)

    const isClosed = !!k.closed && baseEnd === bucketEnd
    this.emit({ ...this.cur, closed: isClosed })

    if (isClosed) {
      this.cur = null
      this.baseVol.clear()
    }
  }
}

function getOrCreateFeed(exchange, symbol, intervalSec) {
  const candleSec = _normIntervalSec(intervalSec)
  const baseSec = _baseIntervalSec(exchange, candleSec)
  const key = `${exchange}:${symbol}:${candleSec}`
  if (activeFeeds.has(key)) {
    const feed = activeFeeds.get(key)
    feed.refCount++
    return feed
  }

  const exConf = EXCHANGES[exchange]
  if (!exConf) return null

  const tick = getTickSize(symbol)
  const heatmap = new HeatmapAggregator(tick, candleSec * 1000)
  let depthThrottle = 0
  let lastFrozenBucket = 0
  const wsInterval = _intervalStr(exchange, baseSec) || _intervalStr(exchange, 60)
  const klineAgg = baseSec !== candleSec
    ? new KlineAggregator(candleSec, baseSec, (kline) => broadcast(key, 'kline', { kline }))
    : null

  const adapter = new exConf.Adapter(
    symbol,
    (kline) => {
      if (klineAgg) klineAgg.onBaseKline(kline)
      else broadcast(key, 'kline', { kline })
    },
    (trade) => broadcast(key, 'trade', { trade }),
    (depth) => {
      const now = Date.now()
      const prevBucket = heatmap.currentBucket
      heatmap.updateFromDepth(depth, now)

      if (prevBucket && heatmap.currentBucket > prevBucket && prevBucket !== lastFrozenBucket) {
        lastFrozenBucket = prevBucket
        const frozen = heatmap.getFrozenColumn(prevBucket)
        if (frozen) {
          broadcast(key, 'heatmap_frozen', { column: frozen })
        }
      }

      if (now - depthThrottle < 150) return
      depthThrottle = now
      const col = heatmap.getCurrentColumn()
      if (col) broadcast(key, 'heatmap', { column: col })
    },
    wsInterval,
  )

  const fetchOi = exchange === 'binance' ? fetchBinanceOi : fetchBybitOi

  let oiTimer = null
  if (fetchOi) {
    const pollOi = async () => {
      try {
        const data = await fetchOi(symbol)
        if (data) broadcast(key, 'oi', { oi: data.oi, time: data.time })
      } catch {}
    }
    pollOi()
    oiTimer = setInterval(pollOi, 5000)
  }

  const feed = { adapter, heatmap, refCount: 1, key, oiTimer }
  activeFeeds.set(key, feed)
  adapter.start()
  return feed
}

function releaseFeed(key) {
  const feed = activeFeeds.get(key)
  if (!feed) return
  feed.refCount--
  if (feed.refCount <= 0) {
    feed.adapter.destroy()
    if (feed.oiTimer) clearInterval(feed.oiTimer)
    activeFeeds.delete(key)
    console.log(`[Server] Feed destroyed: ${key}`)
  }
}

wss.on('connection', (ws) => {
  let currentSubKey = null
  let currentFeed = null

  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw)

      if (msg.action === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', t: Date.now() }))
      }

      if (msg.action === 'subscribe') {
        const { exchange, symbol } = msg
        const candleSec = _normIntervalSec(msg.intervalSec)
        const key = `${exchange}:${symbol}:${candleSec}`
        const baseSec = _baseIntervalSec(exchange, candleSec)

        if (currentSubKey) {
          const subs = subscriptions.get(currentSubKey)
          if (subs) subs.delete(ws)
          releaseFeed(currentSubKey)
        }

        currentSubKey = key
        currentFeed = getOrCreateFeed(exchange, symbol, candleSec)

        if (!subscriptions.has(key)) subscriptions.set(key, new Set())
        subscriptions.get(key).add(ws)

        const exConf = EXCHANGES[exchange]
        try {
          const restInterval = _intervalStr(exchange, baseSec) || _intervalStr(exchange, 60)
          const [klines, oiHist] = await Promise.all([
            exConf.fetchKlines(symbol, restInterval),
            exchange === 'binance' ? fetchBinanceOiHistory(symbol, '5m', 500) : Promise.resolve([]),
          ])
          const outKlines = (baseSec !== candleSec)
            ? _aggregateHistory(klines, candleSec)
            : klines
          ws.send(JSON.stringify({
            type: 'history',
            klines: outKlines,
            oiHistory: oiHist,
            tickSize: getTickSize(symbol),
            exchange,
            symbol,
            candleSec,
          }))
        } catch (e) {
          console.error(`[Server] Kline fetch error: ${e.message}`)
        }

        console.log(`[Server] ${exchange}:${symbol} subscribed (clients: ${subscriptions.get(key).size})`)
      }

      if (msg.action === 'exchanges') {
        ws.send(JSON.stringify({
          type: 'exchanges',
          data: Object.entries(EXCHANGES).map(([id, conf]) => ({
            id,
            name: id.charAt(0).toUpperCase() + id.slice(1),
            symbols: conf.symbols,
          })),
        }))
      }
    } catch (e) {
      console.error('[Server] Message parse error:', e.message)
    }
  })

  ws.on('close', () => {
    if (currentSubKey) {
      const subs = subscriptions.get(currentSubKey)
      if (subs) subs.delete(ws)
      releaseFeed(currentSubKey)
    }
  })
})

console.log(`\n  Select® Chart Demo Server running on ws://localhost:${PORT}`)
console.log(`  Exchanges: ${Object.keys(EXCHANGES).join(', ')}`)
console.log(`  Symbols per exchange: ${EXCHANGES.binance.symbols.join(', ')}\n`)
