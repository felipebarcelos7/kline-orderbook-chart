<template>
  <div 
    v-if="drawing || fib" 
    class="drawing-floating-toolbar"
    :style="toolbarPosition"
  >
    <!-- Tipo do Elemento -->
    <div class="element-badge" :title="elementLabel">
      <span class="badge-icon">✏️</span>
      <span class="badge-text">{{ elementLabel }}</span>
    </div>

    <div class="tb-divider"></div>

    <!-- Cor do Elemento -->
    <div class="color-dropdown-wrapper">
      <button 
        type="button" 
        class="tb-btn color-preview-btn" 
        :title="'Cor: ' + currentColor"
        @click="showColorPicker = !showColorPicker"
      >
        <span class="color-circle" :style="{ backgroundColor: currentColor }"></span>
      </button>

      <!-- Popup de Paleta Rápida -->
      <div v-if="showColorPicker" class="color-palette-popup" @click.stop>
        <div class="palette-grid">
          <button 
            v-for="c in quickPalette" 
            :key="c" 
            type="button"
            class="palette-swatch"
            :class="{ active: currentColor.toLowerCase() === c.toLowerCase() }"
            :style="{ backgroundColor: c }"
            @click="selectColor(c)"
          />
        </div>
        <div class="custom-color-row">
          <span>Personalizada:</span>
          <input 
            type="color" 
            :value="currentColor" 
            @input="selectColor($event.target.value)"
            class="custom-color-input"
          />
        </div>
      </div>
    </div>

    <!-- Espessura da Linha (1px, 2px, 3px, 4px) -->
    <div class="width-selector" title="Espessura da Linha">
      <button 
        v-for="w in [1, 2, 3, 4]" 
        :key="w" 
        type="button"
        class="tb-btn width-btn"
        :class="{ active: currentLineWidth === w }"
        @click="selectLineWidth(w)"
      >
        <span class="line-sample" :style="{ height: w + 'px', backgroundColor: currentColor }"></span>
      </button>
    </div>

    <div class="tb-divider"></div>

    <!-- Estilo da Linha (Sólida, Tracejada, Pontilhada) -->
    <div class="style-selector" title="Estilo do Traço">
      <button 
        type="button"
        class="tb-btn style-btn"
        :class="{ active: !isDashed && !isDotted }"
        title="Linha Sólida"
        @click="selectLineStyle('solid')"
      >
        ──
      </button>
      <button 
        type="button"
        class="tb-btn style-btn"
        :class="{ active: isDashed }"
        title="Linha Tracejada"
        @click="selectLineStyle('dashed')"
      >
        ----
      </button>
      <button 
        type="button"
        class="tb-btn style-btn"
        :class="{ active: isDotted }"
        title="Linha Pontilhada"
        @click="selectLineStyle('dotted')"
      >
        ····
      </button>
    </div>

    <div class="tb-divider"></div>

    <!-- Botão de Configurações Detalhadas (Modal) -->
    <button 
      type="button" 
      class="tb-btn" 
      title="Configurações Completas (Coordenadas, Estilos, etc.)"
      @click="$emit('open-settings')"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    </button>

    <!-- Botão de Excluir -->
    <button 
      type="button" 
      class="tb-btn danger" 
      title="Excluir Elemento"
      @click="$emit('delete')"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      </svg>
    </button>

    <!-- Fechar Seleção -->
    <button 
      type="button" 
      class="tb-btn close-btn" 
      title="Desmarcar"
      @click="$emit('close')"
    >
      ✕
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  drawing: { type: Object, default: null }, // WASM drawing: { id, label, color, lineWidth, dashed, ... }
  fib: { type: Object, default: null },     // Custom Fib: { id, type, config, ... }
})

const emit = defineEmits(['update-style', 'open-settings', 'delete', 'close'])

const showColorPicker = ref(false)

const quickPalette = [
  '#38bdf8', '#3b82f6', '#22c55e', '#ef4444', 
  '#f59e0b', '#a855f7', '#ec4899', '#ffffff', 
  '#9ca3af', '#f97316', '#14b8a6', '#64748b'
]

const elementLabel = computed(() => {
  if (props.fib) {
    return props.fib.type === 'fib_target' ? 'Fibonacci Target (-2 a -2.5)' : 'Fibonacci'
  }
  if (props.drawing) {
    return props.drawing.label || 'Desenho'
  }
  return 'Elemento'
})

const currentColor = computed(() => {
  if (props.fib) {
    return props.fib.config?.trendlineColor || props.fib.config?.levels?.[0]?.color || '#f59e0b'
  }
  if (props.drawing) {
    return props.drawing.color || '#3b82f6'
  }
  return '#3b82f6'
})

const currentLineWidth = computed(() => {
  if (props.fib) return 2
  if (props.drawing) return Number(props.drawing.lineWidth) || 2
  return 2
})

const isDashed = computed(() => {
  if (props.fib) return props.fib.config?.trendlineStyle === 'dashed'
  if (props.drawing) return props.drawing.dashed === true
  return false
})

const isDotted = computed(() => {
  if (props.fib) return props.fib.config?.trendlineStyle === 'dotted'
  return false
})

const toolbarPosition = computed(() => {
  // Posição centralizada no topo da viewport do gráfico para visual limpo
  return {
    top: '18px',
    left: '50%',
    transform: 'translateX(-50%)'
  }
})

function selectColor(color) {
  emit('update-style', { color })
  showColorPicker.value = false
}

function selectLineWidth(lineWidth) {
  emit('update-style', { lineWidth })
}

function selectLineStyle(style) {
  const dashed = style === 'dashed'
  emit('update-style', { dashed, style })
}
</script>

<style scoped>
.drawing-floating-toolbar {
  position: absolute;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(18, 22, 34, 0.94);
  border: 1px solid rgba(56, 189, 248, 0.35);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.6), 0 0 16px rgba(56, 189, 248, 0.15);
  border-radius: 999px;
  padding: 4px 10px;
  backdrop-filter: blur(8px);
  user-select: none;
  animation: fadeInDown 0.15s ease-out;
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translate(-50%, -6px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

.element-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: #e2e8f0;
}

.badge-icon {
  font-size: 12px;
}

.badge-text {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tb-divider {
  width: 1px;
  height: 18px;
  background: rgba(255, 255, 255, 0.15);
}

.tb-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid transparent;
  color: #94a3b8;
  padding: 4px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.12s;
  min-width: 26px;
  height: 26px;
}

.tb-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f8fafc;
}

.tb-btn.active {
  background: rgba(56, 189, 248, 0.2);
  border-color: #38bdf8;
  color: #38bdf8;
}

.tb-btn.danger:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.color-dropdown-wrapper {
  position: relative;
}

.color-circle {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
}

.color-palette-popup {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 10px;
  padding: 10px;
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.6);
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 160px;
}

.palette-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.palette-swatch {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1.5px solid transparent;
  cursor: pointer;
  transition: transform 0.1s;
}

.palette-swatch:hover {
  transform: scale(1.15);
}

.palette-swatch.active {
  border-color: #ffffff;
  box-shadow: 0 0 6px rgba(255, 255, 255, 0.6);
}

.custom-color-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: #94a3b8;
  border-top: 1px solid #1e293b;
  padding-top: 6px;
}

.custom-color-input {
  width: 28px;
  height: 22px;
  border: none;
  background: transparent;
  cursor: pointer;
}

.width-selector,
.style-selector {
  display: flex;
  align-items: center;
  gap: 2px;
}

.width-btn {
  width: 22px;
  height: 24px;
}

.line-sample {
  width: 14px;
  border-radius: 1px;
}

.style-btn {
  font-size: 11px;
  font-weight: 700;
  padding: 0 4px;
}

.close-btn {
  font-size: 12px;
  color: #64748b;
}

.close-btn:hover {
  color: #f1f5f9;
}
</style>
