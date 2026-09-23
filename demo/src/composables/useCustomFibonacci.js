import { ref } from 'vue'

export function useCustomFibonacci() {
  const fibList = ref([])
  const activeFibTool = ref(null) // 'fib' | 'fib_target' | null
  const selectedFib = ref(null)
  const hoverHandle = ref(null) // null | 'p1' | 'p2' | 'body'
  const isDragging = ref(false)
  const dragStart = ref(null)

  // Step 0: idle, Step 1: p1 placed, waiting for p2
  const drawingStep = ref(0)
  const tempP1 = ref(null)
  const currentMouse = ref(null)

  // Modal de Configurações
  const modalVisible = ref(false)
  const modalConfig = ref({})
  const isTargetPreset = ref(false)
  const editingFibId = ref(null)

  let _onCompleteCb = null
  let _storageKey = ''

  const defaultTargetLevels = [
    { value: 1, enabled: true, color: '#9ca3af' },
    { value: -1, enabled: true, color: '#4b5563' },
    { value: -2, enabled: true, color: '#ef4444' },
    { value: -2.5, enabled: true, color: '#f59e0b' },
    { value: -4, enabled: true, color: '#1f2937' },
    { value: 0.236, enabled: false, color: '#4b5563' },
    { value: 0.5, enabled: false, color: '#4b5563' },
    { value: 0.786, enabled: false, color: '#4b5563' },
    { value: 1.618, enabled: false, color: '#4b5563' },
    { value: 3.618, enabled: false, color: '#4b5563' }
  ]

  const defaultClassicLevels = [
    { value: 0, enabled: true, color: '#9ca3af' },
    { value: 0.236, enabled: true, color: '#3b82f6' },
    { value: 0.382, enabled: true, color: '#10b981' },
    { value: 0.5, enabled: true, color: '#f59e0b' },
    { value: 0.618, enabled: true, color: '#ef4444' },
    { value: 0.786, enabled: true, color: '#8b5cf6' },
    { value: 1, enabled: true, color: '#9ca3af' },
    { value: 1.618, enabled: true, color: '#ec4899' },
    { value: 2.618, enabled: false, color: '#4b5563' },
    { value: 3.618, enabled: false, color: '#4b5563' }
  ]

  function getTargetConfigTemplate() {
    try {
      const saved = localStorage.getItem('select_fib_target_config')
      if (saved) return JSON.parse(saved)
    } catch {}
    return {
      trendlineEnabled: true,
      trendlineColor: '#9ca3af',
      trendlineStyle: 'dashed',
      extend: 'none',
      levels: JSON.parse(JSON.stringify(defaultTargetLevels)),
      backgroundEnabled: true,
      backgroundOpacity: 25,
      reverse: false,
      showPrices: false,
      showLevels: true,
      labelHorizontal: 'left',
      labelVertical: 'middle',
      targetZoneEnabled: true,
      targetDottedLine: true,
      targetDottedColor: '#f59e0b',
      targetText: 'TARGET',
      targetZoneBgColor: '#d97706'
    }
  }

  function getClassicConfigTemplate() {
    try {
      const saved = localStorage.getItem('select_fib_classic_config')
      if (saved) return JSON.parse(saved)
    } catch {}
    return {
      trendlineEnabled: true,
      trendlineColor: '#9ca3af',
      trendlineStyle: 'dashed',
      extend: 'none',
      levels: JSON.parse(JSON.stringify(defaultClassicLevels)),
      backgroundEnabled: true,
      backgroundOpacity: 20,
      reverse: false,
      showPrices: true,
      showLevels: true,
      labelHorizontal: 'left',
      labelVertical: 'middle',
      targetZoneEnabled: false,
      targetDottedLine: false,
      targetDottedColor: '#f59e0b',
      targetText: 'TARGET',
      targetZoneBgColor: '#d97706'
    }
  }

  // --- Persistência Robusta ---
  function setChartKey(exchange, symbol, candleSec) {
    if (!exchange || !symbol || !candleSec) return
    const newKey = `${exchange}:${symbol}:${candleSec}`
    if (_storageKey !== newKey) {
      // Salva os fibs atuais antes de trocar
      if (_storageKey && fibList.value.length > 0) {
        saveFibs(_storageKey)
      }
      _storageKey = newKey
      loadFibs(newKey)
    }
  }

  function saveFibs(key = _storageKey) {
    if (!key) return
    try {
      const clean = JSON.parse(JSON.stringify(fibList.value))
      localStorage.setItem(`select_custom_fibs:${key}`, JSON.stringify(clean))
    } catch (e) {
      console.warn('[useCustomFibonacci] saveFibs failed:', e)
    }
  }

  function loadFibs(key = _storageKey) {
    if (!key) return []
    try {
      const raw = localStorage.getItem(`select_custom_fibs:${key}`)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          fibList.value = parsed
          return parsed
        }
      }
    } catch (e) {
      console.warn('[useCustomFibonacci] loadFibs failed:', e)
    }
    fibList.value = []
    return []
  }

  function onDrawingComplete(cb) {
    _onCompleteCb = cb
  }

  function startFibDrawing(tool) {
    activeFibTool.value = tool
    drawingStep.value = 0
    tempP1.value = null
    selectedFib.value = null
  }

  function cancelFibDrawing() {
    activeFibTool.value = null
    drawingStep.value = 0
    tempP1.value = null
    isDragging.value = false
    hoverHandle.value = null
  }

  function openSettings(fib = null, forcePreset = null) {
    if (fib) {
      editingFibId.value = fib.id
      modalConfig.value = JSON.parse(JSON.stringify(fib.config))
      isTargetPreset.value = fib.type === 'fib_target'
    } else if (selectedFib.value) {
      editingFibId.value = selectedFib.value.id
      modalConfig.value = JSON.parse(JSON.stringify(selectedFib.value.config))
      isTargetPreset.value = selectedFib.value.type === 'fib_target'
    } else {
      editingFibId.value = null
      if (forcePreset === 'target' || activeFibTool.value === 'fib_target') {
        modalConfig.value = getTargetConfigTemplate()
        isTargetPreset.value = true
      } else {
        modalConfig.value = getClassicConfigTemplate()
        isTargetPreset.value = false
      }
    }
    modalVisible.value = true
  }

  function onModalSave(newConfig) {
    const cleanConfig = JSON.parse(JSON.stringify(newConfig))

    // Salva como padrão geral no localStorage
    try {
      if (cleanConfig.targetZoneEnabled) {
        localStorage.setItem('select_fib_target_config', JSON.stringify(cleanConfig))
      } else {
        localStorage.setItem('select_fib_classic_config', JSON.stringify(cleanConfig))
      }
    } catch {}

    // Se estiver editando uma fib específica ou houver uma selecionada
    if (editingFibId.value) {
      const f = fibList.value.find(item => item.id === editingFibId.value)
      if (f) {
        f.config = cleanConfig
      }
    } else if (selectedFib.value) {
      selectedFib.value.config = cleanConfig
    }

    saveFibs()
    modalVisible.value = false
  }

  function deleteSelectedFib() {
    if (selectedFib.value) {
      fibList.value = fibList.value.filter(f => f.id !== selectedFib.value.id)
      selectedFib.value = null
      saveFibs()
      return true
    }
    return false
  }

  function clearAllFibs() {
    fibList.value = []
    selectedFib.value = null
    cancelFibDrawing()
    saveFibs()
  }

  function getLevelPrice(p1, p2, ratio, reverse) {
    const price1 = p1.wy
    const price2 = p2.wy
    const diff = price2 - price1
    return reverse ? (price2 - diff * ratio) : (price1 + diff * ratio)
  }

  function fmtPrice(p) {
    if (p == null || !Number.isFinite(p)) return ''
    if (Math.abs(p) >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    if (Math.abs(p) >= 1) return p.toFixed(4)
    return p.toFixed(6)
  }

  // --- Render Loop ---
  function render(canvas, bridge) {
    if (!canvas || !bridge) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Renderiza todas as fibs salvas
    for (const fib of fibList.value) {
      drawSingleFib(ctx, canvas, bridge, fib, fib.id === selectedFib.value?.id)
    }

    // Renderiza preview em tempo real ao desenhar
    if (activeFibTool.value && drawingStep.value === 1 && tempP1.value && currentMouse.value) {
      const previewConfig = activeFibTool.value === 'fib_target' 
        ? getTargetConfigTemplate() 
        : getClassicConfigTemplate()
      
      const previewFib = {
        id: 'preview',
        type: activeFibTool.value,
        p1: tempP1.value,
        p2: currentMouse.value,
        config: previewConfig
      }
      drawSingleFib(ctx, canvas, bridge, previewFib, false, true)
    }
  }

  function drawSingleFib(ctx, canvas, bridge, fib, isSelected = false, isPreview = false) {
    const { p1, p2, config } = fib
    if (!p1 || !p2 || !config) return

    const pt1 = bridge.worldToScreen(p1.wx, p1.wy)
    const pt2 = bridge.worldToScreen(p2.wx, p2.wy)
    if (!pt1 || !pt2) return

    // Extensão horizontal
    let leftX, rightX
    const minX = Math.min(pt1.x, pt2.x)
    const maxX = Math.max(pt1.x, pt2.x)

    if (config.extend === 'both') {
      leftX = 0
      rightX = canvas.width
    } else if (config.extend === 'left') {
      leftX = 0
      rightX = Math.max(maxX, minX + 50)
    } else if (config.extend === 'right') {
      leftX = minX
      rightX = canvas.width
    } else {
      leftX = minX
      rightX = Math.max(maxX, minX + 50)
    }

    // --- 1. Preenchimento de Fundo entre Níveis Habilitados ---
    if (config.backgroundEnabled) {
      const enabledLevels = (config.levels || [])
        .filter(l => l.enabled)
        .map(l => ({
          ...l,
          price: getLevelPrice(p1, p2, l.value, config.reverse)
        }))
        .sort((a, b) => a.price - b.price)

      ctx.save()
      const baseAlpha = (config.backgroundOpacity != null ? config.backgroundOpacity : 20) / 100
      ctx.globalAlpha = Math.min(0.8, Math.max(0.05, baseAlpha))

      for (let i = 0; i < enabledLevels.length - 1; i++) {
        const lA = enabledLevels[i]
        const lB = enabledLevels[i + 1]
        const sA = bridge.worldToScreen(p1.wx, lA.price)
        const sB = bridge.worldToScreen(p1.wx, lB.price)
        if (sA && sB) {
          const yTop = Math.min(sA.y, sB.y)
          const yBottom = Math.max(sA.y, sB.y)
          ctx.fillStyle = lA.color || '#3b82f6'
          ctx.fillRect(leftX, yTop, rightX - leftX, yBottom - yTop)
        }
      }
      ctx.restore()
    }

    // --- 2. ZONA TARGET: Faixa entre -2 e -2.5 com fundo e listra pontilhada ---
    if (config.targetZoneEnabled) {
      const pNeg2 = getLevelPrice(p1, p2, -2, config.reverse)
      const pNeg25 = getLevelPrice(p1, p2, -2.5, config.reverse)
      const sNeg2 = bridge.worldToScreen(p1.wx, pNeg2)
      const sNeg25 = bridge.worldToScreen(p1.wx, pNeg25)

      if (sNeg2 && sNeg25) {
        const yTop = Math.min(sNeg2.y, sNeg25.y)
        const yBottom = Math.max(sNeg2.y, sNeg25.y)
        const h = Math.max(1, yBottom - yTop)

        // Fundo destacado da zona target
        ctx.save()
        ctx.fillStyle = config.targetZoneBgColor || '#d97706'
        ctx.globalAlpha = Math.min(0.5, Math.max(0.18, ((config.backgroundOpacity || 25) / 100) * 1.6))
        ctx.fillRect(leftX, yTop, rightX - leftX, h)
        ctx.restore()

        // Listra no meio pontilhada (-2.25)
        if (config.targetDottedLine) {
          const pMid = getLevelPrice(p1, p2, -2.25, config.reverse)
          const sMid = bridge.worldToScreen(p1.wx, pMid)
          if (sMid) {
            ctx.save()
            ctx.setLineDash([5, 4])
            ctx.strokeStyle = config.targetDottedColor || '#f59e0b'
            ctx.lineWidth = 1.8
            ctx.beginPath()
            ctx.moveTo(leftX, sMid.y)
            ctx.lineTo(rightX, sMid.y)
            ctx.stroke()
            ctx.restore()

            // Texto "TARGET" no centro da listra pontilhada
            const targetText = config.targetText || 'TARGET'
            ctx.save()
            ctx.font = 'bold 11px Inter, sans-serif'
            const textMetrics = ctx.measureText(targetText)
            const textW = textMetrics.width
            const badgeW = textW + 16
            const badgeH = 18
            const midX = (leftX + rightX) / 2
            const badgeX = midX - badgeW / 2
            const badgeY = sMid.y - badgeH / 2

            // Pill de fundo do badge
            ctx.fillStyle = 'rgba(15, 23, 42, 0.94)'
            ctx.strokeStyle = config.targetDottedColor || '#f59e0b'
            ctx.lineWidth = 1.2
            ctx.beginPath()
            if (ctx.roundRect) {
              ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4)
            } else {
              ctx.rect(badgeX, badgeY, badgeW, badgeH)
            }
            ctx.fill()
            ctx.stroke()

            // Texto do Badge
            ctx.fillStyle = config.targetDottedColor || '#f59e0b'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(targetText, midX, sMid.y)
            ctx.restore()
          }
        }
      }
    }

    // --- 3. Linha de Tendência (p1 -> p2) ---
    if (config.trendlineEnabled && pt1 && pt2) {
      ctx.save()
      ctx.strokeStyle = config.trendlineColor || '#9ca3af'
      ctx.lineWidth = 1.5
      if (config.trendlineStyle === 'dashed') ctx.setLineDash([5, 5])
      else if (config.trendlineStyle === 'dotted') ctx.setLineDash([2, 2])
      else ctx.setLineDash([])
      ctx.beginPath()
      ctx.moveTo(pt1.x, pt1.y)
      ctx.lineTo(pt2.x, pt2.y)
      ctx.stroke()
      ctx.restore()
    }

    // --- 4. Linhas de Nível e Textos/Preços ---
    for (const lvl of (config.levels || [])) {
      if (!lvl.enabled) continue
      const price = getLevelPrice(p1, p2, lvl.value, config.reverse)
      const sPt = bridge.worldToScreen(p1.wx, price)
      if (!sPt) continue

      ctx.save()
      ctx.strokeStyle = lvl.color || '#9ca3af'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(leftX, sPt.y)
      ctx.lineTo(rightX, sPt.y)
      ctx.stroke()

      // Legenda de Nível / Preço
      let labelParts = []
      if (config.showLevels) labelParts.push(String(lvl.value))
      if (config.showPrices) labelParts.push(fmtPrice(price))

      if (labelParts.length > 0) {
        const text = labelParts.join(' - ')
        ctx.font = '10px Inter, sans-serif'
        ctx.fillStyle = lvl.color || '#9ca3af'

        let lx = leftX + 8
        if (config.labelHorizontal === 'center') lx = (leftX + rightX) / 2
        else if (config.labelHorizontal === 'right') lx = rightX - 8

        ctx.textAlign = config.labelHorizontal === 'right' ? 'right' : (config.labelHorizontal === 'center' ? 'center' : 'left')
        ctx.textBaseline = config.labelVertical === 'top' ? 'bottom' : (config.labelVertical === 'bottom' ? 'top' : 'middle')

        const ly = sPt.y + (config.labelVertical === 'top' ? -4 : (config.labelVertical === 'bottom' ? 12 : -3))
        ctx.fillText(text, lx, ly)
      }
      ctx.restore()
    }

    // --- 5. Indicadores de Seleção (Handles nos pontos 1 e 2) ---
    if (isSelected && !isPreview && pt1 && pt2) {
      ctx.save()
      // Handle P1
      ctx.fillStyle = '#1f6feb'
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(pt1.x, pt1.y, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Handle P2
      ctx.beginPath()
      ctx.arc(pt2.x, pt2.y, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.restore()
    }
  }

  // --- Hit Testing ---
  function hitTest(clientX, clientY, canvas, bridge) {
    if (!canvas || !bridge) return null
    const rect = canvas.getBoundingClientRect()
    const sx = clientX - rect.left
    const sy = clientY - rect.top

    for (let i = fibList.value.length - 1; i >= 0; i--) {
      const fib = fibList.value[i]
      const pt1 = bridge.worldToScreen(fib.p1.wx, fib.p1.wy)
      const pt2 = bridge.worldToScreen(fib.p2.wx, fib.p2.wy)
      if (!pt1 || !pt2) continue

      // Test handle 1
      if (Math.hypot(sx - pt1.x, sy - pt1.y) <= 8) {
        return { fib, handle: 'p1' }
      }
      // Test handle 2
      if (Math.hypot(sx - pt2.x, sy - pt2.y) <= 8) {
        return { fib, handle: 'p2' }
      }

      // Test any level line or trendline
      const minX = Math.min(pt1.x, pt2.x) - 10
      const maxX = Math.max(pt1.x, pt2.x) + 10
      const rightX = fib.config.extend.includes('right') ? canvas.width : maxX
      const leftX = fib.config.extend.includes('left') ? 0 : minX

      if (sx >= leftX && sx <= rightX) {
        for (const lvl of (fib.config.levels || [])) {
          if (!lvl.enabled) continue
          const price = getLevelPrice(fib.p1, fib.p2, lvl.value, fib.config.reverse)
          const sPt = bridge.worldToScreen(fib.p1.wx, price)
          if (sPt && Math.abs(sy - sPt.y) <= 6) {
            return { fib, handle: 'body' }
          }
        }
        // Test target middle dotted line
        if (fib.config.targetZoneEnabled) {
          const pMid = getLevelPrice(fib.p1, fib.p2, -2.25, fib.config.reverse)
          const sMid = bridge.worldToScreen(fib.p1.wx, pMid)
          if (sMid && Math.abs(sy - sMid.y) <= 8) {
            return { fib, handle: 'body' }
          }
        }
      }
    }
    return null
  }

  // --- Mouse / Pointer Event Handlers ---
  function onMouseDown(e, canvas, bridge) {
    if (!canvas || !bridge) return false

    const rect = canvas.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const world = bridge.screenToWorld(sx, sy)

    // Se estiver no modo de desenho de Fibonacci (fib ou fib_target)
    if (activeFibTool.value) {
      if (drawingStep.value === 0) {
        tempP1.value = { wx: world.x, wy: world.y }
        drawingStep.value = 1
        return true
      } else if (drawingStep.value === 1) {
        const configTemplate = activeFibTool.value === 'fib_target'
          ? getTargetConfigTemplate()
          : getClassicConfigTemplate()

        const newFib = {
          id: 'fib_' + Date.now(),
          type: activeFibTool.value,
          p1: tempP1.value,
          p2: { wx: world.x, wy: world.y },
          config: JSON.parse(JSON.stringify(configTemplate))
        }

        fibList.value.push(newFib)
        selectedFib.value = newFib
        cancelFibDrawing()
        saveFibs()
        _onCompleteCb?.()
        return true
      }
    }

    // Se não estiver desenhando, verifica seleção de Fibonacci existente
    const hit = hitTest(e.clientX, e.clientY, canvas, bridge)
    if (hit) {
      selectedFib.value = hit.fib
      hoverHandle.value = hit.handle
      isDragging.value = true
      dragStart.value = {
        sx, sy,
        wx: world.x,
        wy: world.y,
        p1: { ...hit.fib.p1 },
        p2: { ...hit.fib.p2 }
      }
      return true
    } else {
      // Deseleciona
      if (selectedFib.value) {
        selectedFib.value = null
        return true
      }
    }
    return false
  }

  function onMouseMove(e, canvas, bridge) {
    if (!canvas || !bridge) return
    const rect = canvas.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const world = bridge.screenToWorld(sx, sy)

    if (activeFibTool.value && drawingStep.value === 1) {
      currentMouse.value = { wx: world.x, wy: world.y, sx, sy }
      return
    }

    if (isDragging.value && selectedFib.value && dragStart.value) {
      const handle = hoverHandle.value
      const f = selectedFib.value

      if (handle === 'p1') {
        f.p1 = { wx: world.x, wy: world.y }
      } else if (handle === 'p2') {
        f.p2 = { wx: world.x, wy: world.y }
      } else if (handle === 'body') {
        const dx = world.x - dragStart.value.wx
        const dy = world.y - dragStart.value.wy
        f.p1 = { wx: dragStart.value.p1.wx + dx, wy: dragStart.value.p1.wy + dy }
        f.p2 = { wx: dragStart.value.p2.wx + dx, wy: dragStart.value.p2.wy + dy }
      }
      return
    }

    // Hover test para cursor
    const hit = hitTest(e.clientX, e.clientY, canvas, bridge)
    if (hit) {
      canvas.style.cursor = (hit.handle === 'p1' || hit.handle === 'p2') ? 'move' : 'pointer'
    } else if (!activeFibTool.value) {
      canvas.style.cursor = 'default'
    }
  }

  function onMouseUp() {
    if (isDragging.value) {
      isDragging.value = false
      dragStart.value = null
      saveFibs()
    }
  }

  function onDblClick(e, canvas, bridge) {
    const hit = hitTest(e.clientX, e.clientY, canvas, bridge)
    if (hit) {
      openSettings(hit.fib)
      return true
    }
    return false
  }

  return {
    fibList,
    activeFibTool,
    selectedFib,
    modalVisible,
    modalConfig,
    isTargetPreset,
    startFibDrawing,
    cancelFibDrawing,
    openSettings,
    onModalSave,
    deleteSelectedFib,
    clearAllFibs,
    render,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onDblClick,
    onDrawingComplete,
    setChartKey,
    saveFibs,
    loadFibs,
    getTargetConfigTemplate,
    getClassicConfigTemplate
  }
}
