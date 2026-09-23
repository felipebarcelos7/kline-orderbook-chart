import { ref, shallowRef } from 'vue'

/**
 * Indicadores Inteligentes (Select Red - LTA-B, SMC, Auto Fibs, AOI e Signals Premium)
 * Baseados nas especificações de:
 * - LtA-B.pine (LTA/B, Linear Regression Channel, AOI, Auto Fibs, SMC Structure)
 * - seleCt-ICt.pine (ICT Validated SMC: Order Blocks, FVGs, BOS, CHoCH, Sweeps)
 * - Signais-Primium.pine (Trend Clouds, HMA slope, Premium Signals)
 */
export function useSmartIndicators() {
  // --- Toggles de Exibição ---
  const ltaTrendOn = ref(true)          // Linhas de Tendência (LTA / LTB)
  const channelOn = ref(true)           // Canal de Regressão Linear (LTA-B)
  const aoiOn = ref(true)               // Áreas de Interesse (Supply & Demand)
  const autoFibOn = ref(true)           // Auto Fibonacci Retracement
  const smcOn = ref(true)               // Smart Money Concepts (OB, FVG, BOS, CHoCH)
  const signalsPremiumOn = ref(true)    // Sinais Premium de Tendência

  // Dados brutos das velas
  const klinesData = shallowRef([])
  let _candleSec = 300

  function updateData(klines, candleSec) {
    if (Array.isArray(klines)) {
      klinesData.value = klines
    }
    if (candleSec) _candleSec = candleSec
  }

  function handleLiveKline(kline) {
    if (!kline) return
    const cur = klinesData.value
    if (!cur || cur.length === 0) {
      klinesData.value = [kline]
      return
    }
    const last = cur[cur.length - 1]
    if (kline.time === last.time) {
      // Atualiza vela atual
      cur[cur.length - 1] = { ...kline }
      klinesData.value = [...cur]
    } else if (kline.time > last.time) {
      // Nova vela fechada
      klinesData.value = [...cur, kline]
    }
  }

  // --- Funções Matemáticas e Detecção de Pivôs ---

  function findPivots(bars, len = 6) {
    const highs = []
    const lows = []
    const n = bars.length
    if (n < len * 2 + 1) return { highs, lows }

    for (let i = len; i < n - len; i++) {
      const cHi = bars[i].high
      const cLo = bars[i].low
      let isHi = true
      let isLo = true

      for (let k = 1; k <= len; k++) {
        if (bars[i - k].high >= cHi || bars[i + k].high >= cHi) isHi = false
        if (bars[i - k].low <= cLo || bars[i + k].low <= cLo) isLo = false
      }

      if (isHi) {
        highs.push({
          idx: i,
          time: bars[i].time / 1000,
          price: cHi,
          close: bars[i].close
        })
      }
      if (isLo) {
        lows.push({
          idx: i,
          time: bars[i].time / 1000,
          price: cLo,
          close: bars[i].close
        })
      }
    }
    return { highs, lows }
  }

  // --- 1. LTA / LTB (Linhas de Tendência) ---
  function computeTrendlines(bars, pivots) {
    const lines = []
    const { highs, lows } = pivots
    if (bars.length < 10) return lines

    const lastBar = bars[bars.length - 1]
    const lastTime = lastBar.time / 1000
    const lastClose = lastBar.close

    // LTA (Linha de Tendência de Alta conectando os fundos mais recentes com inclinação positiva)
    if (lows.length >= 2) {
      const p2 = lows[lows.length - 1]
      const p1 = lows[lows.length - 2]
      if (p2.price > p1.price && p2.idx > p1.idx) {
        const slope = (p2.price - p1.price) / (p2.idx - p1.idx)
        const projIdx = bars.length + 8
        const projPrice = p2.price + slope * (projIdx - p2.idx)
        const projTime = lastTime + (projIdx - bars.length) * _candleSec

        lines.push({
          type: 'LTA',
          label: 'LTA',
          color: '#10b981', // Verde esmeralda
          t1: p1.time,
          p1: p1.price,
          t2: projTime,
          p2: projPrice,
          broken: lastClose < (p2.price + slope * (bars.length - 1 - p2.idx))
        })
      }
    }

    // LTB (Linha de Tendência de Baixa conectando os topos mais recentes com inclinação negativa)
    if (highs.length >= 2) {
      const p2 = highs[highs.length - 1]
      const p1 = highs[highs.length - 2]
      if (p2.price < p1.price && p2.idx > p1.idx) {
        const slope = (p2.price - p1.price) / (p2.idx - p1.idx)
        const projIdx = bars.length + 8
        const projPrice = p2.price + slope * (projIdx - p2.idx)
        const projTime = lastTime + (projIdx - bars.length) * _candleSec

        lines.push({
          type: 'LTB',
          label: 'LTB',
          color: '#f43f5e', // Rosa/Vermelho
          t1: p1.time,
          p1: p1.price,
          t2: projTime,
          p2: projPrice,
          broken: lastClose > (p2.price + slope * (bars.length - 1 - p2.idx))
        })
      }
    }

    return lines
  }

  // --- 2. Canal de Tendência (Linear Regression Channel / LTA-B Auto Channel) ---
  function computeRegressionChannel(bars, period = 60, devMultiplier = 2.0) {
    if (!bars || bars.length < period) return null
    const slice = bars.slice(bars.length - period)
    const n = slice.length

    let sumX = 0
    let sumY = 0
    let sumXY = 0
    let sumX2 = 0

    for (let i = 0; i < n; i++) {
      const x = i
      const y = slice[i].close
      sumX += x
      sumY += y
      sumXY += x * y
      sumX2 += x * x
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    // Desvio Padrão
    let sumDev2 = 0
    for (let i = 0; i < n; i++) {
      const reg = intercept + slope * i
      const diff = slice[i].close - reg
      sumDev2 += diff * diff
    }
    const stdDev = Math.sqrt(sumDev2 / n)
    const band = stdDev * devMultiplier

    const t1 = slice[0].time / 1000
    const t2 = (slice[n - 1].time / 1000) + (_candleSec * 6) // Estende 6 velas para frente

    const midStart = intercept
    const midEnd = intercept + slope * (n - 1 + 6)

    return {
      t1, t2,
      midStart, midEnd,
      upperStart: midStart + band,
      upperEnd: midEnd + band,
      lowerStart: midStart - band,
      lowerEnd: midEnd - band,
      slope,
      stdDev,
      direction: slope > 0 ? 'BULL' : slope < 0 ? 'BEAR' : 'NEUTRAL'
    }
  }

  // --- 3. Áreas de Interesse (AOI - Supply & Demand Zones) ---
  function computeAOI(bars, lookback = 50) {
    if (!bars || bars.length < lookback) return null
    const slice = bars.slice(bars.length - lookback)
    const lastBar = bars[bars.length - 1]
    const lastTime = (lastBar.time / 1000) + (_candleSec * 6)

    let maxHigh = -Infinity
    let minLow = Infinity
    for (let i = 0; i < slice.length; i++) {
      if (slice[i].high > maxHigh) maxHigh = slice[i].high
      if (slice[i].low < minLow) minLow = slice[i].low
    }

    // Altura da zona estimada (approx. 0.5% a 1.2% do preço)
    const zoneHeight = (maxHigh - minLow) * 0.08

    const tStart = slice[0].time / 1000

    return {
      supply: {
        top: maxHigh,
        bottom: maxHigh - zoneHeight,
        t1: tStart,
        t2: lastTime,
        label: 'AOI (Supply)'
      },
      demand: {
        top: minLow + zoneHeight,
        bottom: minLow,
        t1: tStart,
        t2: lastTime,
        label: 'AOI (Demand)'
      }
    }
  }

  // --- 4. Auto Fibonacci Retracement ---
  function computeAutoFibs(bars, pivots) {
    if (!bars || bars.length < 10) return null
    const { highs, lows } = pivots
    if (highs.length === 0 || lows.length === 0) return null

    const lastHigh = highs[highs.length - 1]
    const lastLow = lows[lows.length - 1]

    let isUptrend = lastHigh.idx > lastLow.idx
    let topPrice, bottomPrice, startTime, endTime
    const lastTime = (bars[bars.length - 1].time / 1000) + (_candleSec * 8)

    if (isUptrend) {
      topPrice = lastHigh.price
      bottomPrice = lastLow.price
      startTime = lastLow.time
    } else {
      topPrice = lastHigh.price
      bottomPrice = lastLow.price
      startTime = lastHigh.time
    }
    endTime = lastTime

    const diff = topPrice - bottomPrice
    if (diff <= 0) return null

    // Níveis clássicos e institucionais
    const levels = [
      { ratio: 0.0,   label: '0.0',   price: isUptrend ? topPrice : bottomPrice, color: '#94a3b8' },
      { ratio: 0.236, label: '0.236', price: isUptrend ? (topPrice - diff * 0.236) : (bottomPrice + diff * 0.236), color: '#94a3b8' },
      { ratio: 0.382, label: '0.382', price: isUptrend ? (topPrice - diff * 0.382) : (bottomPrice + diff * 0.382), color: '#22c55e' },
      { ratio: 0.500, label: '0.500 EQ', price: isUptrend ? (topPrice - diff * 0.500) : (bottomPrice + diff * 0.500), color: '#eab308' },
      { ratio: 0.618, label: '0.618 OTE', price: isUptrend ? (topPrice - diff * 0.618) : (bottomPrice + diff * 0.618), color: '#f97316' },
      { ratio: 0.786, label: '0.786', price: isUptrend ? (topPrice - diff * 0.786) : (bottomPrice + diff * 0.786), color: '#ec4899' },
      { ratio: 1.0,   label: '1.0',   price: isUptrend ? bottomPrice : topPrice, color: '#94a3b8' }
    ]

    return {
      t1: startTime,
      t2: endTime,
      isUptrend,
      levels
    }
  }

  // --- 5. Smart Money Concepts (BOS, CHoCH, Order Blocks, FVGs) ---
  function computeSMC(bars, pivots) {
    const obList = []
    const fvgList = []
    const breaks = []
    const n = bars.length
    if (n < 25) return { obList, fvgList, breaks }

    const { highs, lows } = pivots

    // A. BOS / CHoCH Detection rigoroso baseado em LtA-B.pine e seleCt-ICt.pine
    // Combina topos e fundos em ordem cronológica de ocorrência
    const allPivots = []
    for (const h of highs) allPivots.push({ idx: h.idx, price: h.price, time: h.time, isHigh: true })
    for (const l of lows) allPivots.push({ idx: l.idx, price: l.price, time: l.time, isHigh: false })
    allPivots.sort((a, b) => a.idx - b.idx)

    let moving = 0 // +1 = uptrend, -1 = downtrend, 0 = neutral
    let upaxis = null
    let upaxisTime = null
    let upside = 0

    let dnaxis = null
    let dnaxisTime = null
    let downside = 0

    let pIdx = 0

    for (let i = 0; i < n; i++) {
      const b = bars[i]
      const bTime = b.time / 1000

      // Atualiza os eixos de referência com os pivôs confirmados até esta vela
      while (pIdx < allPivots.length && allPivots[pIdx].idx <= i) {
        const p = allPivots[pIdx]
        if (p.isHigh) {
          upaxis = p.price
          upaxisTime = p.time
          upside = 1
        } else {
          dnaxis = p.price
          dnaxisTime = p.time
          downside = 1
        }
        pIdx++
      }

      // Rompimento altista do topo anterior (upaxis)
      if (upaxis !== null && upside === 1 && b.close > upaxis) {
        const isChoch = moving < 0
        const breakType = isChoch ? 'CHoCH' : 'BOS'
        breaks.push({
          type: breakType,
          isBullish: true,
          price: upaxis,
          t1: upaxisTime,
          t2: bTime,
          label: breakType
        })
        upside = 0 // Consome o nível para não disparar em velas subsequentes
        moving = 1 // Tendência agora é altista
      }

      // Rompimento baixista do fundo anterior (dnaxis)
      if (dnaxis !== null && downside === 1 && b.close < dnaxis) {
        const isChoch = moving > 0
        const breakType = isChoch ? 'CHoCH' : 'BOS'
        breaks.push({
          type: breakType,
          isBullish: false,
          price: dnaxis,
          t1: dnaxisTime,
          t2: bTime,
          label: breakType
        })
        downside = 0 // Consome o nível
        moving = -1 // Tendência agora é baixista
      }
    }

    // B. Order Blocks (Última vela contrária antes de forte impulso)
    const lastBarTime = (bars[n - 1].time / 1000) + (_candleSec * 6)
    for (let i = 5; i < n - 2; i++) {
      const b1 = bars[i]
      const b2 = bars[i + 1]
      const b3 = bars[i + 2]

      // Bullish OB: vela de baixa seguida por forte alta
      if (b1.close < b1.open && b2.close > b2.open && b3.close > b3.open && (b3.close - b2.open) > (b1.open - b1.close) * 1.3) {
        let mitigated = false
        for (let k = i + 3; k < n; k++) {
          if (bars[k].low < b1.low) { mitigated = true; break }
        }
        if (!mitigated) {
          obList.push({
            type: 'BULL_OB',
            label: 'OB Bullish',
            top: Math.max(b1.open, b1.close),
            bottom: b1.low,
            t1: b1.time / 1000,
            t2: lastBarTime,
            color: '#14D990'
          })
        }
      }

      // Bearish OB: vela de alta seguida por forte queda
      if (b1.close > b1.open && b2.close < b2.open && b3.close < b3.open && (b2.open - b3.close) > (b1.close - b1.open) * 1.3) {
        let mitigated = false
        for (let k = i + 3; k < n; k++) {
          if (bars[k].high > b1.high) { mitigated = true; break }
        }
        if (!mitigated) {
          obList.push({
            type: 'BEAR_OB',
            label: 'OB Bearish',
            top: b1.high,
            bottom: Math.min(b1.open, b1.close),
            t1: b1.time / 1000,
            t2: lastBarTime,
            color: '#F24968'
          })
        }
      }
    }

    // C. Fair Value Gaps (FVG)
    for (let i = 2; i < n; i++) {
      const b0 = bars[i]
      const b2 = bars[i - 2]

      // Bullish FVG: low da vela atual > high da vela de 2 períodos atrás
      if (b0.low > b2.high) {
        let mitigated = false
        for (let k = i + 1; k < n; k++) {
          if (bars[k].low <= b2.high) { mitigated = true; break }
        }
        if (!mitigated) {
          fvgList.push({
            type: 'BULL_FVG',
            top: b0.low,
            bottom: b2.high,
            mid: (b0.low + b2.high) / 2,
            t1: b2.time / 1000,
            t2: lastBarTime,
            color: '#38bdf8'
          })
        }
      }

      // Bearish FVG: high da vela atual < low da vela de 2 períodos atrás
      if (b0.high < b2.low) {
        let mitigated = false
        for (let k = i + 1; k < n; k++) {
          if (bars[k].high >= b2.low) { mitigated = true; break }
        }
        if (!mitigated) {
          fvgList.push({
            type: 'BEAR_FVG',
            top: b2.low,
            bottom: b0.high,
            mid: (b2.low + b0.high) / 2,
            t1: b2.time / 1000,
            t2: lastBarTime,
            color: '#a855f7'
          })
        }
      }
    }

    const recentOBs = obList.slice(-6)
    const recentFVGs = fvgList.slice(-6)
    const recentBreaks = breaks.slice(-15) // Mantém as 15 quebras mais relevantes

    return { obList: recentOBs, fvgList: recentFVGs, breaks: recentBreaks }
  }

  // --- 6. Sinais Premium (WaveTrend Signals baseado em Signais-Primium.pine) ---
  function computeSignalsPremium(bars) {
    const signals = []
    if (!bars || bars.length < 25) return signals

    const n = bars.length
    const n1 = 10
    const n2 = 21

    // 1. Preço Típico (hlc3)
    const ap = new Float64Array(n)
    for (let i = 0; i < n; i++) {
      ap[i] = (bars[i].high + bars[i].low + bars[i].close) / 3
    }

    // 2. esa = ta.ema(ap, n1)
    const esa = new Float64Array(n)
    const alpha1 = 2 / (n1 + 1)
    esa[0] = ap[0]
    for (let i = 1; i < n; i++) {
      esa[i] = ap[i] * alpha1 + esa[i - 1] * (1 - alpha1)
    }

    // 3. d = ta.ema(abs(ap - esa), n1)
    const d = new Float64Array(n)
    d[0] = Math.abs(ap[0] - esa[0])
    for (let i = 1; i < n; i++) {
      d[i] = Math.abs(ap[i] - esa[i]) * alpha1 + d[i - 1] * (1 - alpha1)
    }

    // 4. ci = (ap - esa) / (0.015 * d)
    const ci = new Float64Array(n)
    for (let i = 0; i < n; i++) {
      ci[i] = d[i] !== 0 ? (ap[i] - esa[i]) / (0.015 * d[i]) : 0
    }

    // 5. tci (wt1) = ta.ema(ci, n2)
    const wt1 = new Float64Array(n)
    const alpha2 = 2 / (n2 + 1)
    wt1[0] = ci[0]
    for (let i = 1; i < n; i++) {
      wt1[i] = ci[i] * alpha2 + wt1[i - 1] * (1 - alpha2)
    }

    // 6. wt2 = ta.sma(wt1, 4)
    const wt2 = new Float64Array(n)
    for (let i = 0; i < n; i++) {
      let sum = 0
      let count = 0
      for (let j = Math.max(0, i - 3); j <= i; j++) {
        sum += wt1[j]
        count++
      }
      wt2[i] = sum / count
    }

    // 7. Detecção de Cruzamentos com Cooldown
    let lastSigBar = -99
    let lastSigType = null

    for (let i = 20; i < n; i++) {
      const prev1 = wt1[i - 1]
      const prev2 = wt2[i - 1]
      const cur1 = wt1[i]
      const cur2 = wt2[i]

      // Crossover de Compra: wt1 cruza acima de wt2 em região de sobrevenda
      const buyCross = (prev1 <= prev2 && cur1 > cur2 && cur1 < -15)
      // Crossunder de Venda: wt1 cruza abaixo de wt2 em região de sobrecompra
      const sellCross = (prev1 >= prev2 && cur1 < cur2 && cur1 > 15)

      const bar = bars[i]
      const t = bar.time / 1000

      if (buyCross && (i - lastSigBar >= 6 || lastSigType !== 'BUY')) {
        signals.push({
          type: 'BUY',
          price: bar.low,
          time: t,
          label: 'BUY',
          color: '#00ffbf'
        })
        lastSigBar = i
        lastSigType = 'BUY'
      } else if (sellCross && (i - lastSigBar >= 6 || lastSigType !== 'SELL')) {
        signals.push({
          type: 'SELL',
          price: bar.high,
          time: t,
          label: 'SELL',
          color: '#ff3d3d'
        })
        lastSigBar = i
        lastSigType = 'SELL'
      }
    }

    // Retorna os sinais mais recentes para o gráfico
    return signals.slice(-25)
  }

  // --- RENDERIZADOR NO CANVAS 2D DO GRÁFICO ---

  function render(ctx, canvas, bridge) {
    if (!ctx || !canvas || !bridge) return
    const bars = klinesData.value
    if (!bars || bars.length < 15) return

    const pivots = findPivots(bars, 6)

    // 1. ÁREAS DE INTERESSE (AOI)
    if (aoiOn.value) {
      const aoi = computeAOI(bars, 50)
      if (aoi) {
        // Supply AOI
        const sTop = bridge.worldToScreen(aoi.supply.t1, aoi.supply.top)
        const sBot = bridge.worldToScreen(aoi.supply.t2, aoi.supply.bottom)
        if (sTop && sBot) {
          const w = Math.max(80, sBot.x - sTop.x)
          const h = Math.max(12, sBot.y - sTop.y)
          ctx.save()
          ctx.fillStyle = 'rgba(244, 63, 94, 0.12)'
          ctx.strokeStyle = 'rgba(244, 63, 94, 0.45)'
          ctx.lineWidth = 1
          ctx.strokeRect(sTop.x, sTop.y, w, h)
          ctx.fillRect(sTop.x, sTop.y, w, h)

          ctx.fillStyle = '#f43f5e'
          ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          ctx.fillText('AOI (Supply)', sTop.x + 8, sTop.y + 12)
          ctx.restore()
        }

        // Demand AOI
        const dTop = bridge.worldToScreen(aoi.demand.t1, aoi.demand.top)
        const dBot = bridge.worldToScreen(aoi.demand.t2, aoi.demand.bottom)
        if (dTop && dBot) {
          const w = Math.max(80, dBot.x - dTop.x)
          const h = Math.max(12, dBot.y - dTop.y)
          ctx.save()
          ctx.fillStyle = 'rgba(16, 185, 129, 0.12)'
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)'
          ctx.lineWidth = 1
          ctx.strokeRect(dTop.x, dTop.y, w, h)
          ctx.fillRect(dTop.x, dTop.y, w, h)

          ctx.fillStyle = '#10b981'
          ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          ctx.fillText('AOI (Demand)', dTop.x + 8, dTop.y + 12)
          ctx.restore()
        }
      }
    }

    // 2. CANAL DE REGRESSÃO LINEAR (LTA-B Auto Channel)
    let regression = null
    if (channelOn.value || signalsPremiumOn.value) {
      regression = computeRegressionChannel(bars, 60, 2.0)
    }

    if (channelOn.value && regression) {
      const ptMid1 = bridge.worldToScreen(regression.t1, regression.midStart)
      const ptMid2 = bridge.worldToScreen(regression.t2, regression.midEnd)
      const ptUp1 = bridge.worldToScreen(regression.t1, regression.upperStart)
      const ptUp2 = bridge.worldToScreen(regression.t2, regression.upperEnd)
      const ptLo1 = bridge.worldToScreen(regression.t1, regression.lowerStart)
      const ptLo2 = bridge.worldToScreen(regression.t2, regression.lowerEnd)

      if (ptMid1 && ptMid2 && ptUp1 && ptUp2 && ptLo1 && ptLo2) {
        ctx.save()

        // Preenchimento translúcido suave
        ctx.fillStyle = regression.slope > 0 ? 'rgba(16, 185, 129, 0.06)' : 'rgba(56, 189, 248, 0.06)'
        ctx.beginPath()
        ctx.moveTo(ptUp1.x, ptUp1.y)
        ctx.lineTo(ptUp2.x, ptUp2.y)
        ctx.lineTo(ptLo2.x, ptLo2.y)
        ctx.lineTo(ptLo1.x, ptLo1.y)
        ctx.closePath()
        ctx.fill()

        // Banda Superior
        ctx.strokeStyle = '#38bdf8'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(ptUp1.x, ptUp1.y)
        ctx.lineTo(ptUp2.x, ptUp2.y)
        ctx.stroke()

        // Banda Inferior
        ctx.beginPath()
        ctx.moveTo(ptLo1.x, ptLo1.y)
        ctx.lineTo(ptLo2.x, ptLo2.y)
        ctx.stroke()

        // Linha Central (Midline pontilhada)
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)'
        ctx.setLineDash([5, 4])
        ctx.beginPath()
        ctx.moveTo(ptMid1.x, ptMid1.y)
        ctx.lineTo(ptMid2.x, ptMid2.y)
        ctx.stroke()
        ctx.setLineDash([])

        // Rótulo do Canal
        ctx.fillStyle = '#38bdf8'
        ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        ctx.fillText(`CANAL LTA-B (${regression.direction})`, ptUp2.x - 110, ptUp2.y - 6)

        ctx.restore()
      }
    }

    // 3. LINHAS DE TENDÊNCIA (LTA / LTB)
    if (ltaTrendOn.value) {
      const trendlines = computeTrendlines(bars, pivots)
      for (const tl of trendlines) {
        const pt1 = bridge.worldToScreen(tl.t1, tl.p1)
        const pt2 = bridge.worldToScreen(tl.t2, tl.p2)
        if (!pt1 || !pt2) continue

        ctx.save()
        ctx.strokeStyle = tl.color
        ctx.lineWidth = 2
        if (tl.broken) ctx.setLineDash([4, 4])
        ctx.beginPath()
        ctx.moveTo(pt1.x, pt1.y)
        ctx.lineTo(pt2.x, pt2.y)
        ctx.stroke()
        ctx.setLineDash([])

        // Badge do Rótulo
        ctx.fillStyle = tl.color
        ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        ctx.fillText(tl.label, pt2.x + 6, pt2.y + 4)
        ctx.restore()
      }
    }

    // 4. AUTO FIBONACCI RETRACEMENT
    if (autoFibOn.value) {
      const fib = computeAutoFibs(bars, pivots)
      if (fib && fib.levels) {
        for (const lvl of fib.levels) {
          const pt1 = bridge.worldToScreen(fib.t1, lvl.price)
          const pt2 = bridge.worldToScreen(fib.t2, lvl.price)
          if (!pt1 || !pt2) continue

          ctx.save()
          ctx.strokeStyle = lvl.color
          ctx.lineWidth = lvl.ratio === 0.5 || lvl.ratio === 0.618 ? 1.5 : 1
          if (lvl.ratio === 0.5) ctx.setLineDash([4, 3])
          ctx.beginPath()
          ctx.moveTo(pt1.x, pt1.y)
          ctx.lineTo(canvas.width, pt1.y) // Estende até a borda direita
          ctx.stroke()
          ctx.setLineDash([])

          // Tag com valor e cotação
          ctx.fillStyle = lvl.color
          ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          const pStr = lvl.price >= 1000 ? lvl.price.toFixed(2) : lvl.price.toFixed(4)
          ctx.fillText(`${lvl.label} (${pStr})`, canvas.width - 120, pt1.y - 4)
          ctx.restore()
        }
      }
    }

    // 5. SMART MONEY CONCEPTS (SMC: OB, FVG, BOS, CHoCH)
    if (smcOn.value) {
      const smc = computeSMC(bars, pivots)

      // A. Order Blocks
      for (const ob of smc.obList) {
        const pt1 = bridge.worldToScreen(ob.t1, ob.top)
        const pt2 = bridge.worldToScreen(ob.t2, ob.bottom)
        if (!pt1 || !pt2) continue

        const w = Math.max(60, pt2.x - pt1.x)
        const h = Math.max(6, pt2.y - pt1.y)

        ctx.save()
        ctx.fillStyle = ob.type === 'BULL_OB' ? 'rgba(16, 185, 129, 0.16)' : 'rgba(244, 63, 94, 0.16)'
        ctx.strokeStyle = ob.type === 'BULL_OB' ? 'rgba(16, 185, 129, 0.6)' : 'rgba(244, 63, 94, 0.6)'
        ctx.lineWidth = 1
        ctx.strokeRect(pt1.x, pt1.y, w, h)
        ctx.fillRect(pt1.x, pt1.y, w, h)

        ctx.fillStyle = ob.color
        ctx.font = 'bold 9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        ctx.fillText(ob.label, pt1.x + 4, pt1.y + 10)
        ctx.restore()
      }

      // B. Fair Value Gaps (FVG)
      for (const fvg of smc.fvgList) {
        const pt1 = bridge.worldToScreen(fvg.t1, fvg.top)
        const pt2 = bridge.worldToScreen(fvg.t2, fvg.bottom)
        const ptMid = bridge.worldToScreen(fvg.t1, fvg.mid)
        if (!pt1 || !pt2) continue

        const w = Math.max(50, pt2.x - pt1.x)
        const h = Math.max(5, pt2.y - pt1.y)

        ctx.save()
        ctx.fillStyle = fvg.type === 'BULL_FVG' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(168, 85, 247, 0.12)'
        ctx.strokeStyle = fvg.type === 'BULL_FVG' ? 'rgba(56, 189, 248, 0.4)' : 'rgba(168, 85, 247, 0.4)'
        ctx.lineWidth = 1
        ctx.strokeRect(pt1.x, pt1.y, w, h)
        ctx.fillRect(pt1.x, pt1.y, w, h)

        // 50% Consequent Encroachment line
        if (ptMid) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
          ctx.setLineDash([3, 3])
          ctx.beginPath()
          ctx.moveTo(pt1.x, ptMid.y)
          ctx.lineTo(pt1.x + w, ptMid.y)
          ctx.stroke()
          ctx.setLineDash([])
        }

        ctx.fillStyle = fvg.color
        ctx.font = '9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        ctx.fillText(fvg.type === 'BULL_FVG' ? 'FVG Bull' : 'FVG Bear', pt1.x + 4, pt1.y + 9)
        ctx.restore()
      }

      // C. BOS / CHoCH Lines
      for (const brk of smc.breaks) {
        const pt1 = bridge.worldToScreen(brk.t1, brk.price)
        const pt2 = bridge.worldToScreen(brk.t2, brk.price)
        if (!pt1 || !pt2) continue

        const col = brk.isBullish ? '#14D990' : '#F24968'
        ctx.save()
        ctx.strokeStyle = col
        ctx.lineWidth = 1.5
        if (brk.type === 'CHoCH') {
          ctx.setLineDash([5, 4])
        } else {
          ctx.setLineDash([])
        }

        // Linha estritamente horizontal no nível rompido
        ctx.beginPath()
        ctx.moveTo(pt1.x, pt1.y)
        ctx.lineTo(pt2.x, pt1.y)
        ctx.stroke()
        ctx.setLineDash([])

        // Badge estilizado com fundo escuro no centro da linha
        const midX = (pt1.x + pt2.x) / 2
        const badgeText = brk.label
        ctx.font = 'bold 9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        const tw = ctx.measureText(badgeText).width
        const pillW = tw + 10
        const pillH = 14
        const pillY = pt1.y - pillH / 2

        ctx.fillStyle = 'rgba(13, 17, 23, 0.9)'
        ctx.strokeStyle = col
        ctx.lineWidth = 1
        ctx.beginPath()
        if (ctx.roundRect) {
          ctx.roundRect(midX - pillW / 2, pillY, pillW, pillH, 3)
        } else {
          ctx.rect(midX - pillW / 2, pillY, pillW, pillH)
        }
        ctx.fill()
        ctx.stroke()

        ctx.fillStyle = col
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(badgeText, midX, pt1.y)
        ctx.restore()
      }
    }

    // 6. SINAIS PREMIUM (WaveTrend - Independente de Regressão)
    if (signalsPremiumOn.value) {
      const sigs = computeSignalsPremium(bars)
      for (const sig of sigs) {
        const pt = bridge.worldToScreen(sig.time, sig.price)
        if (!pt) continue

        ctx.save()
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        if (sig.type === 'BUY') {
          // Triângulo verde neon apontando para cima abaixo da mínima
          const yBase = pt.y + 10
          ctx.fillStyle = '#00ffbf'
          ctx.beginPath()
          ctx.moveTo(pt.x, yBase)
          ctx.lineTo(pt.x - 6, yBase + 9)
          ctx.lineTo(pt.x + 6, yBase + 9)
          ctx.closePath()
          ctx.fill()

          // Badge pill "BUY"
          const badgeY = yBase + 18
          ctx.font = 'bold 9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          const tw = ctx.measureText(sig.label).width
          const pillW = tw + 8
          const pillH = 13
          ctx.fillStyle = 'rgba(13, 17, 23, 0.85)'
          ctx.strokeStyle = '#00ffbf'
          ctx.lineWidth = 1
          ctx.beginPath()
          if (ctx.roundRect) {
            ctx.roundRect(pt.x - pillW / 2, badgeY - pillH / 2, pillW, pillH, 3)
          } else {
            ctx.rect(pt.x - pillW / 2, badgeY - pillH / 2, pillW, pillH)
          }
          ctx.fill()
          ctx.stroke()

          ctx.fillStyle = '#00ffbf'
          ctx.fillText(sig.label, pt.x, badgeY)
        } else {
          // Triângulo vermelho neon apontando para baixo acima da máxima
          const yBase = pt.y - 10
          ctx.fillStyle = '#ff3d3d'
          ctx.beginPath()
          ctx.moveTo(pt.x, yBase)
          ctx.lineTo(pt.x - 6, yBase - 9)
          ctx.lineTo(pt.x + 6, yBase - 9)
          ctx.closePath()
          ctx.fill()

          // Badge pill "SELL"
          const badgeY = yBase - 18
          ctx.font = 'bold 9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          const tw = ctx.measureText(sig.label).width
          const pillW = tw + 8
          const pillH = 13
          ctx.fillStyle = 'rgba(13, 17, 23, 0.85)'
          ctx.strokeStyle = '#ff3d3d'
          ctx.lineWidth = 1
          ctx.beginPath()
          if (ctx.roundRect) {
            ctx.roundRect(pt.x - pillW / 2, badgeY - pillH / 2, pillW, pillH, 3)
          } else {
            ctx.rect(pt.x - pillW / 2, badgeY - pillH / 2, pillW, pillH)
          }
          ctx.fill()
          ctx.stroke()

          ctx.fillStyle = '#ff3d3d'
          ctx.fillText(sig.label, pt.x, badgeY)
        }
        ctx.restore()
      }
    }
  }

  return {
    ltaTrendOn,
    channelOn,
    aoiOn,
    autoFibOn,
    smcOn,
    signalsPremiumOn,
    updateData,
    handleLiveKline,
    render,
  }
}
