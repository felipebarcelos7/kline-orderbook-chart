<template>
  <div class="fib-modal-backdrop" v-if="visible" @click.self="onClose">
    <div class="fib-modal">
      <!-- Header do Modal -->
      <div class="fib-modal-header">
        <div class="header-title">
          <span class="header-icon">📐</span>
          <h3>Configurações de Retração de Fibonacci</h3>
        </div>
        <button class="close-btn" @click="onClose" title="Fechar">✕</button>
      </div>

      <!-- Abas de Navegação -->
      <div class="fib-modal-tabs">
        <button 
          type="button" 
          class="tab-btn" 
          :class="{ active: activeTab === 'style' }"
          @click="activeTab = 'style'"
        >Estilo</button>
        <button 
          type="button" 
          class="tab-btn" 
          :class="{ active: activeTab === 'coords' }"
          @click="activeTab = 'coords'"
        >Coordenadas</button>
        <button 
          type="button" 
          class="tab-btn" 
          :class="{ active: activeTab === 'visibility' }"
          @click="activeTab = 'visibility'"
        >Visibilidade</button>
      </div>

      <!-- Conteúdo da Aba: Estilo -->
      <div class="fib-modal-body" v-if="activeTab === 'style'">
        <!-- Seção: Linha de Tendência e Níveis -->
        <div class="form-row">
          <label class="checkbox-label">
            <input type="checkbox" v-model="form.trendlineEnabled" />
            <span>Linha de Tendência</span>
          </label>
          <div class="inline-controls">
            <input type="color" v-model="form.trendlineColor" class="color-picker" />
            <select v-model="form.trendlineStyle" class="styled-select">
              <option value="solid">Sólida (──)</option>
              <option value="dashed">Tracejada (----)</option>
              <option value="dotted">Pontilhada (····)</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <span class="label-text">Estender</span>
          <select v-model="form.extend" class="styled-select flex-1">
            <option value="none">Não estender</option>
            <option value="right">Estender à direita</option>
            <option value="left">Estender à esquerda</option>
            <option value="both">Estender ambos</option>
          </select>
        </div>

        <div class="section-divider"></div>

        <!-- Grade de Níveis (Estilo TradingView: 2 Colunas) -->
        <div class="levels-header">
          <span class="section-title">Níveis de Fibonacci</span>
          <div class="quick-presets">
            <button type="button" class="btn-preset" @click="applyTargetPreset" title="Aplicar configuração Target (-2 a -2.5)">
              🎯 Preset Target (-2 a -2.5)
            </button>
            <button type="button" class="btn-preset" @click="applyClassicPreset" title="Aplicar Fibonacci clássica (0 a 1)">
              📊 Clássico (0 a 1)
            </button>
          </div>
        </div>

        <div class="levels-grid">
          <!-- Coluna 1 -->
          <div class="levels-col">
            <div 
              v-for="(lvl, idx) in col1Levels" 
              :key="'col1-' + idx"
              class="level-item"
            >
              <label class="level-check">
                <input type="checkbox" v-model="lvl.enabled" />
              </label>
              <input 
                type="number" 
                step="any" 
                v-model.number="lvl.value" 
                class="level-input" 
              />
              <input 
                type="color" 
                v-model="lvl.color" 
                class="color-picker" 
              />
            </div>
          </div>

          <!-- Coluna 2 -->
          <div class="levels-col">
            <div 
              v-for="(lvl, idx) in col2Levels" 
              :key="'col2-' + idx"
              class="level-item"
            >
              <label class="level-check">
                <input type="checkbox" v-model="lvl.enabled" />
              </label>
              <input 
                type="number" 
                step="any" 
                v-model.number="lvl.value" 
                class="level-input" 
              />
              <input 
                type="color" 
                v-model="lvl.color" 
                class="color-picker" 
              />
            </div>
          </div>
        </div>

        <div class="section-divider"></div>

        <!-- Opções de Fundo e Alinhamento -->
        <div class="form-row">
          <label class="checkbox-label">
            <input type="checkbox" v-model="form.backgroundEnabled" />
            <span>Fundo (Preenchimento)</span>
          </label>
          <div class="slider-group">
            <input 
              type="range" 
              min="0" 
              max="100" 
              v-model.number="form.backgroundOpacity" 
              class="opacity-slider"
            />
            <span class="slider-val">{{ form.backgroundOpacity }}%</span>
          </div>
        </div>

        <div class="options-grid">
          <label class="checkbox-label">
            <input type="checkbox" v-model="form.reverse" />
            <span>Reverter</span>
          </label>

          <label class="checkbox-label">
            <input type="checkbox" v-model="form.showPrices" />
            <span>Preços</span>
          </label>

          <label class="checkbox-label">
            <input type="checkbox" v-model="form.showLevels" />
            <span>Níveis</span>
          </label>
        </div>

        <div class="form-row mt-2">
          <span class="label-text">Legendas</span>
          <div class="inline-controls">
            <select v-model="form.labelHorizontal" class="styled-select">
              <option value="left">Esquerda</option>
              <option value="center">No meio</option>
              <option value="right">Direita</option>
            </select>
            <select v-model="form.labelVertical" class="styled-select">
              <option value="top">Superior</option>
              <option value="middle">No meio</option>
              <option value="bottom">Inferior</option>
            </select>
          </div>
        </div>

        <div class="section-divider"></div>

        <!-- Seção Especial: Zona Target (-2 a -2.5) com Listra Pontilhada e Texto TARGET -->
        <div class="target-zone-box">
          <div class="target-zone-header">
            <div class="target-title">
              <span class="target-badge">🎯 CONFIGURAÇÃO TARGET</span>
              <span class="target-sub">Faixa entre -2 e -2.5 com listra pontilhada no meio</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="form.targetZoneEnabled" />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div v-if="form.targetZoneEnabled" class="target-zone-body">
            <div class="form-row">
              <label class="checkbox-label">
                <input type="checkbox" v-model="form.targetDottedLine" />
                <span>Listra no meio pontilhada (-2.25)</span>
              </label>
              <input type="color" v-model="form.targetDottedColor" class="color-picker" />
            </div>

            <div class="form-row">
              <span class="label-text">Texto do Target</span>
              <input 
                type="text" 
                v-model="form.targetText" 
                placeholder="Ex: TARGET" 
                class="target-text-input" 
              />
            </div>

            <div class="form-row">
              <span class="label-text">Cor de Fundo da Faixa</span>
              <input type="color" v-model="form.targetZoneBgColor" class="color-picker" />
            </div>
          </div>
        </div>
      </div>

      <!-- Conteúdo da Aba: Coordenadas -->
      <div class="fib-modal-body" v-else-if="activeTab === 'coords'">
        <div class="coords-box">
          <h4>Coordenadas de Referência</h4>
          <p class="coords-desc">Defina os pontos 1 e 2 da retração (Preço e Data/Barra).</p>

          <div class="coords-grid">
            <div class="coord-field">
              <label>Preço 1</label>
              <input type="number" step="any" v-model.number="form.coords.price1" class="coord-input" />
            </div>
            <div class="coord-field">
              <label>Barra 1 / Ponto Inicial</label>
              <input type="number" v-model.number="form.coords.bar1" class="coord-input" />
            </div>
            <div class="coord-field">
              <label>Preço 2</label>
              <input type="number" step="any" v-model.number="form.coords.price2" class="coord-input" />
            </div>
            <div class="coord-field">
              <label>Barra 2 / Ponto Final</label>
              <input type="number" v-model.number="form.coords.bar2" class="coord-input" />
            </div>
          </div>
        </div>
      </div>

      <!-- Conteúdo da Aba: Visibilidade -->
      <div class="fib-modal-body" v-else-if="activeTab === 'visibility'">
        <div class="visibility-box">
          <h4>Visibilidade por Tempo Gráfico</h4>
          <p class="coords-desc">Escolha em quais intervalos a Fibonacci permanecerá visível.</p>

          <div class="visibility-grid">
            <label class="checkbox-label">
              <input type="checkbox" v-model="form.visibility.seconds" />
              <span>Segundos (1s - 59s)</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="form.visibility.minutes" />
              <span>Minutos (1m - 59m)</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="form.visibility.hours" />
              <span>Horas (1h - 24h)</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="form.visibility.days" />
              <span>Dias (1d+)</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="form.visibility.weeks" />
              <span>Semanas</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="form.visibility.months" />
              <span>Meses</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Rodapé do Modal -->
      <div class="fib-modal-footer">
        <button type="button" class="btn-secondary" @click="saveAsDefault" :style="saveSuccess ? 'border-color: #3fb950; color: #3fb950;' : ''">
          <span v-if="saveSuccess">✓ Salvo como Padrão!</span>
          <span v-else>Salvar como Padrão</span>
        </button>
        <div class="footer-actions">
          <button type="button" class="btn-cancel" @click="onClose">
            Cancelar
          </button>
          <button type="button" class="btn-primary" @click="applyAndClose">
            OK
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'

const props = defineProps({
  visible: Boolean,
  config: { type: Object, default: () => ({}) },
  isTargetPreset: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'save', 'apply'])

const activeTab = ref('style')

// Estrutura padrão de configuração
const defaultTargetLevels = [
  // Coluna 1
  { value: 1, enabled: true, color: '#9ca3af' },
  { value: -1, enabled: true, color: '#374151' },
  { value: -2, enabled: true, color: '#ef4444' },
  { value: -2.5, enabled: true, color: '#f59e0b' },
  { value: -4, enabled: true, color: '#1f2937' },
  // Coluna 2
  { value: 0.236, enabled: false, color: '#4b5563' },
  { value: 0.5, enabled: false, color: '#4b5563' },
  { value: 0.786, enabled: false, color: '#4b5563' },
  { value: 1.618, enabled: false, color: '#4b5563' },
  { value: 3.618, enabled: false, color: '#4b5563' }
]

const defaultClassicLevels = [
  // Coluna 1
  { value: 0, enabled: true, color: '#9ca3af' },
  { value: 0.236, enabled: true, color: '#3b82f6' },
  { value: 0.382, enabled: true, color: '#10b981' },
  { value: 0.5, enabled: true, color: '#f59e0b' },
  { value: 0.618, enabled: true, color: '#ef4444' },
  // Coluna 2
  { value: 0.786, enabled: true, color: '#8b5cf6' },
  { value: 1, enabled: true, color: '#9ca3af' },
  { value: 1.618, enabled: true, color: '#ec4899' },
  { value: 2.618, enabled: false, color: '#4b5563' },
  { value: 3.618, enabled: false, color: '#4b5563' }
]

const form = reactive({
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
  targetZoneBgColor: '#d97706',
  coords: {
    price1: 0,
    price2: 0,
    bar1: 0,
    bar2: 0
  },
  visibility: {
    seconds: true,
    minutes: true,
    hours: true,
    days: true,
    weeks: true,
    months: true
  }
})

const col1Levels = computed(() => form.levels.slice(0, 5))
const col2Levels = computed(() => form.levels.slice(5, 10))

watch(() => props.config, (newConf) => {
  if (newConf && Object.keys(newConf).length > 0) {
    Object.assign(form, JSON.parse(JSON.stringify(newConf)))
  }
}, { immediate: true, deep: true })

watch(() => props.isTargetPreset, (isTarget) => {
  if (isTarget) {
    applyTargetPreset()
  }
}, { immediate: true })

function applyTargetPreset() {
  form.levels = JSON.parse(JSON.stringify(defaultTargetLevels))
  form.targetZoneEnabled = true
  form.targetDottedLine = true
  form.targetText = 'TARGET'
  form.targetDottedColor = '#f59e0b'
  form.backgroundEnabled = true
  form.backgroundOpacity = 30
  form.extend = 'none'
  form.trendlineStyle = 'dashed'
}

function applyClassicPreset() {
  form.levels = JSON.parse(JSON.stringify(defaultClassicLevels))
  form.targetZoneEnabled = false
  form.backgroundEnabled = true
  form.backgroundOpacity = 20
  form.extend = 'none'
}

const saveSuccess = ref(false)

function saveAsDefault() {
  try {
    const key = form.targetZoneEnabled ? 'select_fib_target_config' : 'select_fib_classic_config'
    const clean = JSON.parse(JSON.stringify(form))
    localStorage.setItem(key, JSON.stringify(clean))
    emit('save', clean)
    emit('apply', clean)
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 2500)
  } catch (e) {
    console.error('Falha ao salvar padrão:', e)
  }
}

function onClose() {
  emit('close')
}

function applyAndClose() {
  emit('save', JSON.parse(JSON.stringify(form)))
  emit('apply', JSON.parse(JSON.stringify(form)))
  emit('close')
}
</script>

<style scoped>
.fib-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.fib-modal {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 12px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modalIn 0.18s ease-out;
}

@keyframes modalIn {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

.fib-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  background: #0d1117;
  border-bottom: 1px solid #21262d;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  font-size: 16px;
}

.header-title h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #e6edf3;
}

.close-btn {
  background: transparent;
  border: none;
  color: #8b949e;
  font-size: 14px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}
.close-btn:hover {
  color: #f85149;
  background: rgba(248, 81, 73, 0.15);
}

.fib-modal-tabs {
  display: flex;
  background: #090d13;
  border-bottom: 1px solid #21262d;
  padding: 0 16px;
  gap: 16px;
}

.tab-btn {
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: #8b949e;
  padding: 10px 4px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.tab-btn:hover {
  color: #e6edf3;
}

.tab-btn.active {
  color: #58a6ff;
  border-bottom-color: #58a6ff;
}

.fib-modal-body {
  padding: 16px 18px;
  max-height: 520px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.fib-modal-body::-webkit-scrollbar {
  width: 6px;
}
.fib-modal-body::-webkit-scrollbar-thumb {
  background: #30363d;
  border-radius: 3px;
}

.form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.inline-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #e6edf3;
  cursor: pointer;
  user-select: none;
}

.checkbox-label input {
  accent-color: #1f6feb;
  cursor: pointer;
}

.label-text {
  font-size: 13px;
  color: #e6edf3;
}

.styled-select {
  background: #0d1117;
  border: 1px solid #30363d;
  color: #e6edf3;
  padding: 5px 8px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
}
.styled-select:focus {
  outline: none;
  border-color: #58a6ff;
}

.color-picker {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid #30363d;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
}

.section-divider {
  height: 1px;
  background: #21262d;
  margin: 4px 0;
}

.levels-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #8b949e;
}

.quick-presets {
  display: flex;
  gap: 6px;
}

.btn-preset {
  background: #21262d;
  border: 1px solid #30363d;
  color: #e6edf3;
  font-size: 10px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.12s;
}
.btn-preset:hover {
  background: #30363d;
  border-color: #58a6ff;
}

.levels-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  background: #0d1117;
  padding: 12px;
  border: 1px solid #21262d;
  border-radius: 8px;
}

.levels-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.level-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.level-check input {
  accent-color: #1f6feb;
  cursor: pointer;
}

.level-input {
  background: #161b22;
  border: 1px solid #30363d;
  color: #e6edf3;
  padding: 4px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
  width: 70px;
}
.level-input:focus {
  outline: none;
  border-color: #58a6ff;
}

.slider-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.opacity-slider {
  accent-color: #1f6feb;
  cursor: pointer;
  width: 100px;
}

.slider-val {
  font-size: 12px;
  font-family: monospace;
  color: #8b949e;
  width: 32px;
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 4px;
}

/* Target Zone Box */
.target-zone-box {
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.target-zone-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.target-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.target-badge {
  font-size: 11px;
  font-weight: 800;
  color: #f59e0b;
  letter-spacing: 0.5px;
}

.target-sub {
  font-size: 11px;
  color: #8b949e;
}

.target-zone-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 6px;
  border-top: 1px dashed rgba(245, 158, 11, 0.2);
}

.target-text-input {
  background: #0d1117;
  border: 1px solid #30363d;
  color: #f59e0b;
  font-weight: 700;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  width: 120px;
}
.target-text-input:focus {
  outline: none;
  border-color: #f59e0b;
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 34px;
  height: 18px;
}
.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: #30363d;
  border-radius: 18px;
  transition: 0.2s;
}
.toggle-slider:before {
  position: absolute;
  content: "";
  height: 12px;
  width: 12px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: 0.2s;
}
input:checked + .toggle-slider {
  background-color: #f59e0b;
}
input:checked + .toggle-slider:before {
  transform: translateX(16px);
}

/* Coordenadas & Visibilidade */
.coords-box, .visibility-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.coords-box h4, .visibility-box h4 {
  margin: 0;
  font-size: 13px;
  color: #e6edf3;
}
.coords-desc {
  margin: 0 0 8px 0;
  font-size: 12px;
  color: #8b949e;
}
.coords-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.coord-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.coord-field label {
  font-size: 11px;
  color: #8b949e;
}
.coord-input {
  background: #0d1117;
  border: 1px solid #30363d;
  color: #e6edf3;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-family: monospace;
}

.visibility-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

/* Footer */
.fib-modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  background: #0d1117;
  border-top: 1px solid #21262d;
}

.footer-actions {
  display: flex;
  gap: 8px;
}

.btn-secondary {
  background: transparent;
  border: 1px solid #30363d;
  color: #8b949e;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-secondary:hover {
  color: #e6edf3;
  border-color: #8b949e;
  background: #21262d;
}

.btn-cancel {
  background: transparent;
  border: 1px solid #30363d;
  color: #e6edf3;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.btn-cancel:hover {
  background: #21262d;
}

.btn-primary {
  background: #1f6feb;
  border: none;
  color: white;
  padding: 6px 18px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-primary:hover {
  background: #388bfd;
}
</style>
