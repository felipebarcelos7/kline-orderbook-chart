import { ref } from 'vue'
import { createChartBridge, prefetchWasm } from '@mrd/chart-engine'

prefetchWasm()

export function useChart() {
  const bridge = ref(null)
  const chartType = ref(0)
  const activeDrawingTool = ref(null)
  const theme = ref('dark')
  const volumeEnabled = ref(true)
  const rsiEnabled = ref(true)
  const oiEnabled = ref(false)
  const fundingRateEnabled = ref(false)
  const cvdEnabled = ref(false)
  const vpinEnabled = ref(false)
  const largeTradesEnabled = ref(true)
  const liqHeatmapEnabled = ref(true)
  const vrvpEnabled = ref(true)
  const tpoEnabled = ref(true)
  const smartRangesEnabled = ref(true)
  const emaStructureEnabled = ref(true)
  const stopIcebergEnabled = ref(true)
  const forexSignalsEnabled = ref(true)
  const forexSignalsCount = ref(0)
  const tooltip = ref(null)
  const tooltipRaw = ref('')
  const tooltipX = ref(0)
  const tooltipY = ref(0)
  const oiSeries = ref(null)
  const ltTooltip = ref(null)
  const vrvpTooltip = ref(null)
  const vrvpTooltipX = ref(0)
  const vrvpTooltipY = ref(0)

  let _onDrawingsChanged = null

  function _call(b, method, ...args) {
    try {
      const fn = b?.[method]
      if (typeof fn === 'function') fn(...args)
    } catch {}
  }

  function _get(b, method, fallback) {
    try {
      const fn = b?.[method]
      if (typeof fn === 'function') return fn()
    } catch {}
    return fallback
  }

  function configureRsiPremium(b = bridge.value) {
    if (!b) return
    _call(b, 'enableRsi')
    _call(b, 'setRsiPeriod', 14)
    _call(b, 'setRsiSmoothing', 3)
    _call(b, 'setRsiShowSignals', true)
    _call(b, 'setRsiShowDivergence', true)
    _call(b, 'setRsiShowTraps', true)
    _call(b, 'setRsiShowEma', true)
    _call(b, 'setRsiShowWma', true)
    _call(b, 'setRsiRatio', 0.30)
  }

  function _refreshForexCountSoon() {
    const b = bridge.value
    if (!b) return
    setTimeout(() => {
      if (!bridge.value) return
      forexSignalsCount.value = _get(bridge.value, 'getForexSignalsCount', 0)
    }, 250)
  }

  function setLicenseKey(key) {
    if (!key) return
    try { localStorage.setItem('select_license_key', key) } catch {}
    const b = bridge.value
    if (!b) return
    _call(b, 'setLicenseKey', key)
    _call(b, 'set_license_key', key)
  }

  function setTheme(name) {
    const v = name === 'light' ? 'light' : 'dark'
    theme.value = v
    _call(bridge.value, 'setTheme', v)
  }

  let _tickSize = 10
  let _klineCount = 0
  let _lastKlineTime = 0
  let _candleSec = 300
  let _oiValues = null

  let _tradeBuf = []
  let _tradeFlushId = null
  let _heatmapInited = false
  let _heatmapColsBuf = []
  let _heatmapFlushId = null

  const DRAWING_STYLES = {
    trendline:  { r: 88, g: 166, b: 255, lineWidth: 2, dashed: false, fontSize: 12 },
    hline:      { r: 240, g: 136, b: 62, lineWidth: 2, dashed: true, fontSize: 12 },
    arrow:      { r: 88, g: 166, b: 255, lineWidth: 2, dashed: false, fontSize: 12 },
    fib:        { r: 210, g: 153, b: 34, lineWidth: 1, dashed: false, fontSize: 12 },
    fibext:     { r: 210, g: 153, b: 34, lineWidth: 1, dashed: false, fontSize: 12 },
    measure:    { r: 139, g: 148, b: 158, lineWidth: 1, dashed: false, fontSize: 12 },
    circle:     { r: 136, g: 87, b: 229, lineWidth: 2, dashed: false, fontSize: 12 },
    channel:    { r: 88, g: 166, b: 255, lineWidth: 1, dashed: false, fontSize: 12 },
    long:       { r: 63, g: 185, b: 80, lineWidth: 2, dashed: false, fontSize: 12 },
    short:      { r: 248, g: 81, b: 73, lineWidth: 2, dashed: false, fontSize: 12 },
    vwap:       { r: 187, g: 128, b: 255, lineWidth: 2, dashed: false, fontSize: 12 },
    brush:      { r: 88, g: 166, b: 255, lineWidth: 2, dashed: false, fontSize: 12 },
    path:       { r: 88, g: 166, b: 255, lineWidth: 2, dashed: false, fontSize: 12 },
    textnote:   { r: 230, g: 237, b: 243, lineWidth: 2, dashed: false, fontSize: 14 },
    pricelabel: { r: 230, g: 237, b: 243, lineWidth: 2, dashed: false, fontSize: 13 },
  }

  async function init(canvas) {
    let key = import.meta.env?.VITE_CHART_LICENSE_KEY || null
    if (!key) {
      try { key = localStorage.getItem('select_license_key') } catch {}
    }
    const b = await createChartBridge(canvas, key ? { key } : {})

    b.setCandleInterval(_candleSec)
    b.setPrecision(2)
    b.setChartType(chartType.value)
    _call(b, 'setTheme', theme.value)

    b.enableVolume()
    if (rsiEnabled.value) configureRsiPremium(b)
    else b.disableRsi()
    oiEnabled.value ? b.enableOi() : b.disableOi()

    fundingRateEnabled.value ? _call(b, 'enableFundingRate') : _call(b, 'disableFundingRate')
    cvdEnabled.value ? _call(b, 'enableCvd') : _call(b, 'disableCvd')
    vpinEnabled.value ? _call(b, 'enableVpin') : _call(b, 'disableVpin')
    largeTradesEnabled.value ? _call(b, 'enableLargeTrades') : _call(b, 'disableLargeTrades')
    liqHeatmapEnabled.value ? _call(b, 'enableLiqHeatmap') : _call(b, 'disableLiqHeatmap')
    vrvpEnabled.value ? _call(b, 'enableVrvp') : _call(b, 'disableVrvp')
    tpoEnabled.value ? _call(b, 'enableTpo') : _call(b, 'disableTpo')
    smartRangesEnabled.value ? _call(b, 'enableSmartRanges') : _call(b, 'disableSmartRanges')
    emaStructureEnabled.value ? _call(b, 'enableEmaStructure') : _call(b, 'disableEmaStructure')
    stopIcebergEnabled.value ? _call(b, 'enableStopIceberg') : _call(b, 'disableStopIceberg')
    forexSignalsEnabled.value ? _call(b, 'enableForexSignals') : _call(b, 'disableForexSignals')
    if (forexSignalsEnabled.value) {
      _call(b, 'setForexSignalsSetup', false)
      _call(b, 'setForexSignalsMode', 0)
      _call(b, 'setForexSignalsShowStats', true)
    }

    _call(b, 'onTooltip', (json, sx, sy) => {
      if (!json) {
        tooltip.value = null
        tooltipRaw.value = ''
        return
      }
      tooltipRaw.value = json
      tooltipX.value = sx || 0
      tooltipY.value = sy || 0
      try {
        const parsed = JSON.parse(json)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Object.keys(parsed).length === 0) {
          tooltip.value = null
          return
        }
        tooltip.value = parsed
      } catch {
        tooltip.value = null
      }
    })

    _call(b, 'onLtHover', (json) => {
      if (!json) {
        ltTooltip.value = null
        return
      }
      try { ltTooltip.value = JSON.parse(json) } catch { ltTooltip.value = null }
    })

    _call(b, 'onVrvpHover', (sx, sy) => {
      vrvpTooltipX.value = sx || 0
      vrvpTooltipY.value = sy || 0
      try {
        const json = b.vrvpHitTest?.(sx, sy)
        if (!json) { vrvpTooltip.value = null; return }
        vrvpTooltip.value = JSON.parse(json)
      } catch {
        vrvpTooltip.value = null
      }
    })

    b.onDrawingComplete(() => { activeDrawingTool.value = null; _onDrawingsChanged?.() })
    b.onDrawingCancel(() => { activeDrawingTool.value = null; _onDrawingsChanged?.() })

    b.start()
    bridge.value = b
    return b
  }

  function setHistory(msg) {
    const b = bridge.value
    if (!b) return

    const klines = msg.klines
    if (msg.candleSec && typeof msg.candleSec === 'number') {
      _candleSec = msg.candleSec
      _call(b, 'setCandleInterval', _candleSec)
    }
    _tickSize = msg.tickSize || 10
    _klineCount = klines.length

    b.setKlines(
      new Float64Array(klines.map(k => k.time / 1000)),
      new Float64Array(klines.map(k => k.open)),
      new Float64Array(klines.map(k => k.high)),
      new Float64Array(klines.map(k => k.low)),
      new Float64Array(klines.map(k => k.close)),
      new Float64Array(klines.map(k => k.volume)),
    )

    if (forexSignalsEnabled.value) {
      _call(b, 'enableForexSignals')
      // The engine's "setup" flag enables the structure-based engine on the
      // intraday timeframes it is tuned for (5m / 15m / 30m). It works the
      // same on any symbol — there is no BTC-only restriction.
      const setupTf = _candleSec === 300 || _candleSec === 900 || _candleSec === 1800
      _call(b, 'setForexSignalsSetup', setupTf)
      _call(b, 'setForexSignalsMode', 0)
      _call(b, 'setForexSignalsShowStats', true)
      forexSignalsCount.value = _get(b, 'getForexSignalsCount', 0)
      if (forexSignalsCount.value === 0) {
        _call(b, 'setForexSignalsMode', 1)
        _refreshForexCountSoon()
      } else {
        _refreshForexCountSoon()
      }
    }


    if (klines.length > 0) {
      _lastKlineTime = klines[klines.length - 1].time / 1000
    }

    b.setFootprintTickSize(_tickSize)
    b.footprintEnsureLen(_klineCount)
    _buildSyntheticFootprint(b, klines)

    _heatmapInited = false
    _heatmapColsBuf = []

    _oiValues = new Float64Array(_klineCount)
    if (msg.oiHistory?.length > 0 && klines.length > 0) {
      const hist = msg.oiHistory
      let idx = 0
      for (let i = 0; i < klines.length; i++) {
        while (idx < hist.length - 1 && hist[idx + 1].time <= klines[i].time) idx++
        _oiValues[i] = hist[idx].oi
      }
      b.setOiData(_oiValues)
    }
    oiSeries.value = _oiValues
  }

  function _buildSyntheticFootprint(b, klines) {
    for (let i = 0; i < klines.length; i++) {
      const k = klines[i]
      const range = k.high - k.low
      if (range <= 0) continue

      const steps = Math.max(1, Math.round(range / _tickSize))
      const prices = [], bids = [], asks = []

      for (let s = 0; s <= steps; s++) {
        const price = k.low + s * _tickSize
        const dist = Math.abs(price - (k.open + k.close) / 2) / range
        const weight = Math.exp(-dist * dist * 4)
        const vol = k.volume * weight / (steps + 1)
        const buyRatio = (k.close - k.low) / range
        prices.push(price)
        bids.push(vol * (1 - buyRatio))
        asks.push(vol * buyRatio)
      }

      b.footprintSetBar(i, _tickSize, new Float64Array(prices), new Float64Array(bids), new Float64Array(asks))
    }
  }

  // --- Real-time handlers ---

  function handleKline(kline) {
    const b = bridge.value
    if (!b) return

    const snapped = Math.floor(kline.time / 1000)

    if (kline.closed || snapped > _lastKlineTime) {
      b.appendKline(snapped, kline.open, kline.high, kline.low, kline.close, kline.volume)
      _klineCount++
      _lastKlineTime = snapped
      b.footprintEnsureLen(_klineCount)

      if (_oiValues && _oiValues.length < _klineCount) {
        const prev = _oiValues
        _oiValues = new Float64Array(_klineCount)
        _oiValues.set(prev)
        _oiValues[_klineCount - 1] = prev[prev.length - 1]
      }
      if (forexSignalsEnabled.value) _refreshForexCountSoon()
    } else {
      b.updateLastKline(snapped, kline.open, kline.high, kline.low, kline.close, kline.volume)
    }
  }

  function handleTrade(trade) {
    const b = bridge.value
    if (!b || _klineCount === 0) return
    _tradeBuf.push(_klineCount - 1, trade.price, trade.qty, trade.isSell ? 1 : 0)
    if (_tradeFlushId === null) _tradeFlushId = requestAnimationFrame(_flushTrades)
  }

  function _flushTrades() {
    _tradeFlushId = null
    const b = bridge.value
    if (!b || _tradeBuf.length === 0) return
    b.footprintAddTradeBatch(new Float64Array(_tradeBuf))
    _tradeBuf.length = 0
  }

  function handleHeatmapColumn(col) { _enqueueHeatmap(col, false) }
  function handleHeatmapFrozen(col) { _enqueueHeatmap(col, true) }

  function _enqueueHeatmap(col, frozen) {
    _heatmapColsBuf.push({ col, frozen })
    if (_heatmapFlushId === null) _heatmapFlushId = requestAnimationFrame(_flushHeatmap)
  }

  function _flushHeatmap() {
    _heatmapFlushId = null
    const b = bridge.value
    if (!b || _heatmapColsBuf.length === 0) return

    for (const { col, frozen } of _heatmapColsBuf) {
      const ts = Math.floor(col.timestamp / 1000 / _candleSec) * _candleSec
      const values = new Float64Array(col.values)

      if (!_heatmapInited) {
        b.setHeatmap(values, col.rows, 1, ts, _candleSec, col.yStart, col.yStep)
        _heatmapInited = true
        continue
      }

      if (frozen) b.appendHeatmapColumn(values, ts, col.yStart, col.yStep)
      else b.updateHeatmapColumnAt(values, ts, col.yStart, col.yStep)
    }
    _heatmapColsBuf.length = 0
  }

  function handleOi(oi) {
    const b = bridge.value
    if (!b || _klineCount === 0) return

    if (!_oiValues || _oiValues.length !== _klineCount) {
      const prev = _oiValues
      _oiValues = new Float64Array(_klineCount)
      if (prev) _oiValues.set(prev.subarray(0, Math.min(prev.length, _klineCount)))
    }

    _oiValues[_klineCount - 1] = oi
    b.setOiData(_oiValues)
    oiSeries.value = _oiValues
  }

  // --- User actions ---

  function setChartTypeValue(ct) {
    chartType.value = ct
    bridge.value?.setChartType(ct)
  }

  function startDrawing(tool, style) {
    const b = bridge.value
    if (!b) return
    activeDrawingTool.value = tool
    b.startDrawing(tool, style || DRAWING_STYLES[tool] || DRAWING_STYLES.trendline)
  }

  function cancelDrawing() {
    activeDrawingTool.value = null
    bridge.value?.cancelDrawing()
  }

  function deleteSelected() { bridge.value?.deleteSelectedDrawing(); _onDrawingsChanged?.() }
  function clearDrawings() { bridge.value?.clearDrawings(); _onDrawingsChanged?.() }

  function onDrawingsChanged(fn) { _onDrawingsChanged = fn }

  function exportDrawings() {
    try { return bridge.value?.exportDrawingsJson?.() || '' } catch { return '' }
  }

  function importDrawings(json) {
    if (!json) return
    try { bridge.value?.importDrawingsJson?.(json); _onDrawingsChanged?.() } catch {}
  }

  function toggleVolume() {
    const b = bridge.value
    if (!b) return
    volumeEnabled.value = !volumeEnabled.value
    volumeEnabled.value ? b.enableVolume() : b.disableVolume()
  }

  function toggleRsi() {
    const b = bridge.value
    if (!b) return
    rsiEnabled.value = !rsiEnabled.value
    rsiEnabled.value ? configureRsiPremium(b) : b.disableRsi()
  }

  function toggleOi() {
    const b = bridge.value
    if (!b) return
    oiEnabled.value = !oiEnabled.value
    oiEnabled.value ? b.enableOi() : b.disableOi()
  }

  function toggleFundingRate() {
    const b = bridge.value
    if (!b) return
    fundingRateEnabled.value = !fundingRateEnabled.value
    fundingRateEnabled.value ? _call(b, 'enableFundingRate') : _call(b, 'disableFundingRate')
  }

  function toggleCvd() {
    const b = bridge.value
    if (!b) return
    cvdEnabled.value = !cvdEnabled.value
    cvdEnabled.value ? _call(b, 'enableCvd') : _call(b, 'disableCvd')
  }

  function toggleVpin() {
    const b = bridge.value
    if (!b) return
    vpinEnabled.value = !vpinEnabled.value
    vpinEnabled.value ? _call(b, 'enableVpin') : _call(b, 'disableVpin')
  }

  function toggleLargeTrades() {
    const b = bridge.value
    if (!b) return
    largeTradesEnabled.value = !largeTradesEnabled.value
    largeTradesEnabled.value ? _call(b, 'enableLargeTrades') : _call(b, 'disableLargeTrades')
  }

  function toggleLiqHeatmap() {
    const b = bridge.value
    if (!b) return
    liqHeatmapEnabled.value = !liqHeatmapEnabled.value
    liqHeatmapEnabled.value ? _call(b, 'enableLiqHeatmap') : _call(b, 'disableLiqHeatmap')
  }

  function toggleVrvp() {
    const b = bridge.value
    if (!b) return
    vrvpEnabled.value = !vrvpEnabled.value
    vrvpEnabled.value ? _call(b, 'enableVrvp') : _call(b, 'disableVrvp')
  }

  function toggleTpo() {
    const b = bridge.value
    if (!b) return
    tpoEnabled.value = !tpoEnabled.value
    tpoEnabled.value ? _call(b, 'enableTpo') : _call(b, 'disableTpo')
  }

  function toggleSmartRanges() {
    const b = bridge.value
    if (!b) return
    smartRangesEnabled.value = !smartRangesEnabled.value
    smartRangesEnabled.value ? _call(b, 'enableSmartRanges') : _call(b, 'disableSmartRanges')
  }

  function toggleEmaStructure() {
    const b = bridge.value
    if (!b) return
    emaStructureEnabled.value = !emaStructureEnabled.value
    emaStructureEnabled.value ? _call(b, 'enableEmaStructure') : _call(b, 'disableEmaStructure')
  }

  function toggleStopIceberg() {
    const b = bridge.value
    if (!b) return
    stopIcebergEnabled.value = !stopIcebergEnabled.value
    stopIcebergEnabled.value ? _call(b, 'enableStopIceberg') : _call(b, 'disableStopIceberg')
  }

  function toggleForexSignals() {
    const b = bridge.value
    if (!b) return
    forexSignalsEnabled.value = !forexSignalsEnabled.value
    forexSignalsEnabled.value ? _call(b, 'enableForexSignals') : _call(b, 'disableForexSignals')
  }

  function pause() { _call(bridge.value, 'pause') }
  function resume() { _call(bridge.value, 'resume') }

  function destroy() {
    if (_tradeFlushId !== null) cancelAnimationFrame(_tradeFlushId)
    if (_heatmapFlushId !== null) cancelAnimationFrame(_heatmapFlushId)
    _tradeBuf.length = 0
    _heatmapColsBuf.length = 0
    _oiValues = null
    bridge.value?.destroy()
    bridge.value = null
  }

  return {
    bridge, chartType, activeDrawingTool,
    theme,
    volumeEnabled, rsiEnabled, oiEnabled,
    fundingRateEnabled, cvdEnabled, vpinEnabled, largeTradesEnabled, liqHeatmapEnabled,
    vrvpEnabled, tpoEnabled, smartRangesEnabled, emaStructureEnabled, stopIcebergEnabled, forexSignalsEnabled,
    forexSignalsCount,
    tooltip, tooltipRaw, tooltipX, tooltipY, oiSeries, ltTooltip, vrvpTooltip, vrvpTooltipX, vrvpTooltipY,
    init, setHistory,
    handleKline, handleTrade, handleHeatmapColumn, handleHeatmapFrozen, handleOi,
    setChartTypeValue, startDrawing, cancelDrawing, deleteSelected, clearDrawings,
    toggleVolume, toggleRsi, toggleOi,
    toggleFundingRate, toggleCvd, toggleVpin, toggleLargeTrades, toggleLiqHeatmap,
    toggleVrvp, toggleTpo, toggleSmartRanges, toggleEmaStructure, toggleStopIceberg, toggleForexSignals,
    setLicenseKey, configureRsiPremium,
    setTheme, pause, resume,
    onDrawingsChanged, exportDrawings, importDrawings,
    destroy,
  }
}
