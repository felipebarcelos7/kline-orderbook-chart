import { ref, shallowRef } from 'vue'

const TOP_15_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT',
  'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'LINKUSDT', 'DOTUSDT',
  'NEARUSDT', 'SUIUSDT', 'PEPEUSDT', 'RENDERUSDT', 'TURBOUSDT'
]

const symbolMetadata = new Map()

export function getSymbolMeta(symbol) {
  const sym = (symbol || 'BTCUSDT').toUpperCase()
  if (symbolMetadata.has(sym)) return symbolMetadata.get(sym)
  if (sym.startsWith('BTC')) return { tickSize: 0.1, precision: 2 }
  if (sym.startsWith('ETH')) return { tickSize: 0.01, precision: 2 }
  if (sym.includes('PEPE') || sym.includes('SHIB') || sym.includes('BONK')) return { tickSize: 0.000001, precision: 7 }
  if (sym.includes('DOGE') || sym.includes('TURBO')) return { tickSize: 0.00001, precision: 5 }
  if (sym.includes('XRP') || sym.includes('ADA') || sym.includes('SUI')) return { tickSize: 0.0001, precision: 4 }
  return { tickSize: 0.001, precision: 3 }
}

function getWsServerUrl() {
  if (typeof window === 'undefined') return 'ws://localhost:4400'
  const loc = window.location
  const isHttps = loc.protocol === 'https:'
  if (loc.hostname === 'localhost' || loc.hostname === '127.0.0.1') {
    return 'ws://localhost:4400'
  }
  const apiDomain = loc.hostname.includes('select.red') ? 'api.select.red' : loc.hostname
  return `${isHttps ? 'wss' : 'ws'}://${apiDomain}:4400`
}

export function useMarketData() {
  const connected = ref(false)
  const allAvailableSymbols = shallowRef([...TOP_15_SYMBOLS])
  const exchanges = shallowRef([
    { id: 'binance', name: 'Binance', symbols: [...TOP_15_SYMBOLS] },
    { id: 'bybit', name: 'Bybit', symbols: [...TOP_15_SYMBOLS] }
  ])
  const currentExchange = ref('binance')
  const currentSymbol = ref('BTCUSDT')
  const currentIntervalSec = ref(300)
  const stats = ref({ trades: 0, depthUpdates: 0, tps: 0 })

  async function loadBinanceSymbols() {
    try {
      let raw = null
      try {
        const res = await fetch('https://fapi.binance.com/fapi/v1/exchangeInfo')
        if (res.ok) raw = await res.json()
      } catch {}
      if (!raw || !Array.isArray(raw.symbols)) {
        try {
          const res = await fetch('https://api.binance.com/api/v3/exchangeInfo')
          if (res.ok) raw = await res.json()
        } catch {}
      }

      if (raw && Array.isArray(raw.symbols)) {
        const activeUsdt = []
        for (const s of raw.symbols) {
          if (s.status === 'TRADING' && s.symbol.endsWith('USDT') && !s.symbol.includes('_')) {
            activeUsdt.push(s.symbol)
            let tickSize = 0.001
            let precision = s.pricePrecision || 2
            const priceFilter = s.filters?.find(f => f.filterType === 'PRICE_FILTER')
            if (priceFilter && priceFilter.tickSize) {
              tickSize = parseFloat(priceFilter.tickSize)
              const parts = priceFilter.tickSize.split('.')
              if (parts[1]) {
                const clean = parts[1].replace(/0+$/, '')
                precision = clean.length || parts[1].length
              }
            }
            symbolMetadata.set(s.symbol, { tickSize, precision })
          }
        }

        const others = activeUsdt.filter(sym => !TOP_15_SYMBOLS.includes(sym)).sort()
        const merged = [...TOP_15_SYMBOLS, ...others]
        allAvailableSymbols.value = merged
        exchanges.value = [
          { id: 'binance', name: 'Binance', symbols: merged },
          { id: 'bybit', name: 'Bybit', symbols: merged }
        ]
        console.log(`✅ Loaded ${merged.length} Binance USDT pairs pre-liberated`)
      }
    } catch (e) {
      console.warn('⚠️ Binance symbols fetch warning:', e.message)
    }
  }

  loadBinanceSymbols()

  let ws = null
  let binanceDirectWs = null
  let _onHistory = null
  let _onKline = null
  let _onTrade = null
  let _onHeatmap = null
  let _onHeatmapFrozen = null
  let _onOi = null
  let _onLicense = null
  let _lastMsgAt = 0
  let _lastPongAt = 0
  let _pingTimer = null
  let _watchdogTimer = null
  let _tradeCount = 0
  let _depthCount = 0
  let _tpsWindow = []

  function _cleanupWsTimers() {
    if (_pingTimer) clearInterval(_pingTimer)
    if (_watchdogTimer) clearInterval(_watchdogTimer)
    _pingTimer = null
    _watchdogTimer = null
  }

  function connect() {
    _cleanupWsTimers()
    const url = getWsServerUrl()
    console.log('🔌 Connecting to Heatmap WS:', url)
    try {
      ws = new WebSocket(url)
    } catch (e) {
      console.warn('⚠️ Primary WS failed, connecting directly to Binance WS...')
      connectBinanceDirect(currentSymbol.value || 'BTCUSDT', currentIntervalSec.value)
      return
    }
    _lastMsgAt = Date.now()
    _lastPongAt = Date.now()

    ws.onopen = () => {
      connected.value = true
      ws.send(JSON.stringify({ action: 'exchanges' }))
      ws.send(JSON.stringify({ action: 'license' }))

      if (binanceDirectWs) {
        try { binanceDirectWs.close() } catch {}
        binanceDirectWs = null
      }
      if (currentExchange.value && currentSymbol.value) {
        ws.send(JSON.stringify({
          action: 'subscribe',
          exchange: currentExchange.value,
          symbol: currentSymbol.value,
          intervalSec: currentIntervalSec.value,
        }))
      }

      _pingTimer = setInterval(() => {
        if (!ws || ws.readyState !== 1) return
        try { ws.send(JSON.stringify({ action: 'ping', t: Date.now() })) } catch {}
      }, 5000)

      _watchdogTimer = setInterval(() => {
        if (!ws) return
        const now = Date.now()
        const stale = now - Math.max(_lastMsgAt, _lastPongAt)
        if (ws.readyState === 1 && stale > 15000) {
          try { ws.close() } catch {}
        }
      }, 5000)
    }

    ws.onmessage = (e) => {
      _lastMsgAt = Date.now()
      const msg = JSON.parse(e.data)

      switch (msg.type) {
        case 'exchanges':
          if (allAvailableSymbols.value.length > 0) {
            exchanges.value = [
              { id: 'binance', name: 'Binance', symbols: allAvailableSymbols.value },
              { id: 'bybit', name: 'Bybit', symbols: allAvailableSymbols.value }
            ]
          } else {
            exchanges.value = msg.data
          }
          break
        case 'pong':
          _lastPongAt = Date.now()
          break
        case 'license': {
          const key = msg.key || msg.licenseKey || msg.data?.key || null
          if (key) _onLicense?.(key, msg)
          break
        }
        case 'history':
          _onHistory?.(msg)
          break
        case 'kline':
          _onKline?.(msg.kline)
          break
        case 'trade': {
          _tradeCount++
          const now = Date.now()
          _tpsWindow.push(now)
          while (_tpsWindow.length > 0 && _tpsWindow[0] < now - 1000) _tpsWindow.shift()
          stats.value = { trades: _tradeCount, depthUpdates: _depthCount, tps: _tpsWindow.length }
          _onTrade?.(msg.trade)
          break
        }
        case 'heatmap':
          _depthCount++
          stats.value = { ...stats.value, depthUpdates: _depthCount }
          _onHeatmap?.(msg.column)
          break
        case 'heatmap_frozen':
          _onHeatmapFrozen?.(msg.column)
          break
        case 'oi':
          _onOi?.(msg.oi, msg.time)
          break
      }
    }

    ws.onclose = () => {
      connected.value = false
      _cleanupWsTimers()
      console.warn('⚠️ Heatmap WS disconnected. Triggering Binance Direct Fallback...')
      connectBinanceDirect(currentSymbol.value || 'BTCUSDT', currentIntervalSec.value)
      setTimeout(connect, 10000)
    }
  }

  async function connectBinanceDirect(symbol = 'BTCUSDT', intervalSec = 300) {
    if (binanceDirectWs) {
      try { binanceDirectWs.close() } catch (e) {}
      binanceDirectWs = null
    }
    const sym = (symbol || 'BTCUSDT').toUpperCase()
    const tfMap = {
      60: '1m',
      180: '3m',
      300: '5m',
      900: '15m',
      1800: '30m',
      3600: '1h',
      7200: '2h',
      14400: '4h',
      21600: '6h',
      28800: '8h',
      43200: '12h',
      86400: '1d',
      259200: '3d',
      604800: '1w',
      2592000: '1M'
    }
    const interval = tfMap[intervalSec] || (intervalSec >= 86400 ? '1d' : (intervalSec >= 3600 ? '1h' : '5m'))

    const FAPI_SYMBOL_MAP = {
      'PEPEUSDT': '1000PEPEUSDT',
      'SHIBUSDT': '1000SHIBUSDT',
      'BONKUSDT': '1000BONKUSDT',
      'FLOKIUSDT': '1000FLOKIUSDT',
      'LUNCUSDT': '1000LUNCUSDT',
      'SATSUSDT': '1000SATSUSDT',
      'RATSUSDT': '1000RATSUSDT',
      'CHEEMSUSDT': '1000CHEEMSUSDT',
      'WHYUSDT': '1000WHYUSDT',
      'CATUSDT': '1000CATUSDT',
      'MOGUSDT': '1000MOGUSDT',
      'XECUSDT': '1000XECUSDT',
    }

    let fetchSym = FAPI_SYMBOL_MAP[sym] || sym
    let isSpot = false

    try {
      let res = await fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${fetchSym}&interval=${interval}&limit=1000`)
      if (!res.ok && !fetchSym.startsWith('1000')) {
        const try1000 = `1000${sym}`
        const res1000 = await fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${try1000}&interval=${interval}&limit=1000`)
        if (res1000.ok) {
          res = res1000
          fetchSym = try1000
        }
      }
      if (!res.ok) {
        const spotRes = await fetch(`https://api.binance.com/api/v3/klines?symbol=${sym}&interval=${interval}&limit=1000`)
        if (spotRes.ok) {
          res = spotRes
          isSpot = true
          fetchSym = sym
        }
      }

      if (res.ok) {
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
        const meta = getSymbolMeta(sym)
        _onHistory?.({
          type: 'history',
          klines,
          oiHistory: [],
          tickSize: meta.tickSize,
          precision: meta.precision,
          exchange: 'binance',
          symbol: sym,
          candleSec: intervalSec
        })
        connected.value = true
      }
    } catch (e) {
      console.error('Failed to fetch Binance direct klines:', e.message)
    }

    try {
      const streamSym = fetchSym.toLowerCase()
      const wsUrl = isSpot
        ? `wss://stream.binance.com:9443/stream?streams=${streamSym}@kline_${interval}/${streamSym}@trade`
        : `wss://fstream.binance.com/stream?streams=${streamSym}@kline_${interval}/${streamSym}@aggTrade`
      binanceDirectWs = new WebSocket(wsUrl)
      binanceDirectWs.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          if (!msg.data) return
          const d = msg.data
          if (d.e === 'kline') {
            const k = d.k
            _onKline?.({
              time: k.t,
              open: parseFloat(k.o),
              high: parseFloat(k.h),
              low: parseFloat(k.l),
              close: parseFloat(k.c),
              volume: parseFloat(k.v),
              closed: k.x
            })
          } else if (d.e === 'aggTrade' || d.e === 'trade') {
            _tradeCount++
            _onTrade?.({
              price: parseFloat(d.p),
              qty: parseFloat(d.q),
              side: d.m ? 'sell' : 'buy',
              time: d.T
            })
          }
        } catch (err) {}
      }
    } catch (err) {
      console.error('Failed to open Binance direct WS:', err.message)
    }
  }

  function subscribe(exchange, symbol, intervalSec = currentIntervalSec.value) {
    currentExchange.value = exchange
    currentSymbol.value = symbol
    currentIntervalSec.value = intervalSec
    _tradeCount = 0
    _depthCount = 0
    _tpsWindow = []
    stats.value = { trades: 0, depthUpdates: 0, tps: 0 }

    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ action: 'subscribe', exchange, symbol, intervalSec }))
    } else {
      connectBinanceDirect(symbol, intervalSec)
    }
  }

  function onHistory(fn) { _onHistory = fn }
  function onKline(fn) { _onKline = fn }
  function onTrade(fn) { _onTrade = fn }
  function onHeatmap(fn) { _onHeatmap = fn }
  function onHeatmapFrozen(fn) { _onHeatmapFrozen = fn }
  function onOi(fn) { _onOi = fn }
  function onLicense(fn) { _onLicense = fn }

  return {
    connected,
    exchanges,
    currentExchange,
    currentSymbol,
    currentIntervalSec,
    stats,
    connect,
    subscribe,
    onHistory,
    onKline,
    onTrade,
    onHeatmap,
    onHeatmapFrozen,
    onOi,
    onLicense,
  }
}
