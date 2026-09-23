<template>
  <div class="drawing-modal-backdrop" v-if="visible" @click.self="onClose">
    <div class="drawing-modal">
      <!-- Header do Modal -->
      <div class="modal-header">
        <div class="header-title">
          <span class="header-icon">🎨</span>
          <h3>Configurações de {{ toolTitle }}</h3>
        </div>
        <button class="close-btn" @click="onClose" title="Fechar">✕</button>
      </div>

      <!-- Abas de Navegação -->
      <div class="modal-tabs">
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
      <div class="modal-body" v-if="activeTab === 'style'">
        <!-- Cor e Linha -->
        <div class="form-row">
          <span class="label-text">Cor Principal</span>
          <div class="inline-controls">
            <input type="color" v-model="form.color" class="color-picker" />
            <input type="text" v-model="form.color" class="hex-input" />
          </div>
        </div>

        <div class="form-row">
          <span class="label-text">Espessura da Linha</span>
          <div class="btn-group">
            <button 
              v-for="w in [1, 2, 3, 4]" 
              :key="w" 
              type="button" 
              class="group-btn"
              :class="{ active: form.lineWidth === w }"
              @click="form.lineWidth = w"
            >
              {{ w }}px
            </button>
          </div>
        </div>

        <div class="form-row">
          <span class="label-text">Estilo do Traço</span>
          <select v-model="form.lineStyle" class="styled-select">
            <option value="solid">Sólida (──)</option>
            <option value="dashed">Tracejada (----)</option>
            <option value="dotted">Pontilhada (····)</option>
          </select>
        </div>

        <!-- Se for Texto / Anotação -->
        <div v-if="hasText" class="form-row">
          <span class="label-text">Texto</span>
          <input type="text" v-model="form.text" placeholder="Digite seu texto..." class="styled-input" />
        </div>

        <div v-if="hasText" class="form-row">
          <span class="label-text">Tamanho da Fonte</span>
          <select v-model.number="form.fontSize" class="styled-select">
            <option :value="10">10px</option>
            <option :value="12">12px</option>
            <option :value="14">14px</option>
            <option :value="16">16px</option>
            <option :value="20">20px</option>
          </select>
        </div>

        <!-- Opacidade / Fundo -->
        <div class="form-row">
          <span class="label-text">Opacidade</span>
          <div class="slider-group">
            <input type="range" min="10" max="100" v-model.number="form.opacity" class="opacity-slider" />
            <span class="slider-val">{{ form.opacity }}%</span>
          </div>
        </div>
      </div>

      <!-- Conteúdo da Aba: Coordenadas -->
      <div class="modal-body" v-else-if="activeTab === 'coords'">
        <div class="coords-box">
          <h4>Preços e Pontos de Referência</h4>
          <p class="coords-desc">Ajuste os valores exatos de preço e posição deste elemento.</p>
          <div class="coords-grid">
            <div class="coord-field">
              <label>Preço</label>
              <input type="number" step="any" v-model.number="form.price" class="coord-input" />
            </div>
            <div class="coord-field">
              <label>Barra / Ponto</label>
              <input type="number" v-model.number="form.bar" class="coord-input" />
            </div>
          </div>
        </div>
      </div>

      <!-- Conteúdo da Aba: Visibilidade -->
      <div class="modal-body" v-else-if="activeTab === 'visibility'">
        <div class="visibility-box">
          <h4>Visibilidade por Tempo Gráfico</h4>
          <div class="visibility-grid">
            <label class="checkbox-label">
              <input type="checkbox" v-model="form.visibility.seconds" />
              <span>Segundos</span>
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
          </div>
        </div>
      </div>

      <!-- Rodapé do Modal -->
      <div class="modal-footer">
        <button 
          type="button" 
          class="btn-secondary" 
          @click="saveAsDefault" 
          :style="saveSuccess ? 'border-color: #3fb950; color: #3fb950;' : ''"
        >
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
import { ref, reactive, watch, computed } from 'vue'

const props = defineProps({
  visible: Boolean,
  drawing: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['close', 'save', 'apply'])

const activeTab = ref('style')
const saveSuccess = ref(false)

const form = reactive({
  color: '#38bdf8',
  lineWidth: 2,
  lineStyle: 'solid',
  fontSize: 12,
  text: '',
  opacity: 100,
  price: 0,
  bar: 0,
  visibility: {
    seconds: true,
    minutes: true,
    hours: true,
    days: true
  }
})

const toolTitle = computed(() => {
  return props.drawing?.label || 'Elemento'
})

const hasText = computed(() => {
  const tool = props.drawing?.toolId || ''
  return tool.includes('text') || tool.includes('note') || tool.includes('label')
})

watch(() => props.drawing, (d) => {
  if (d && Object.keys(d).length > 0) {
    form.color = d.color || '#38bdf8'
    form.lineWidth = Number(d.lineWidth) || 2
    form.lineStyle = d.dashed ? 'dashed' : 'solid'
    form.fontSize = Number(d.fontSize) || 12
    form.text = d.text || ''
    form.price = Number(d.price) || 0
  }
}, { immediate: true, deep: true })

function saveAsDefault() {
  try {
    const tool = props.drawing?.toolId || 'trendline'
    localStorage.setItem(`select_style_${tool}`, JSON.stringify(form))
    emit('save', JSON.parse(JSON.stringify(form)))
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
.drawing-modal-backdrop {
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

.drawing-modal {
  width: 100%;
  max-width: 440px;
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modalScale 0.15s ease-out;
}

@keyframes modalScale {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: #0d1117;
  border-bottom: 1px solid #21262d;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-title h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #f0f6fc;
}

.close-btn {
  background: transparent;
  border: none;
  color: #8b949e;
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
}

.close-btn:hover {
  color: #f85149;
}

.modal-tabs {
  display: flex;
  background: #0d1117;
  border-bottom: 1px solid #21262d;
  padding: 0 14px;
}

.tab-btn {
  background: transparent;
  border: none;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 500;
  color: #8b949e;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
}

.tab-btn:hover {
  color: #e6edf3;
}

.tab-btn.active {
  color: #58a6ff;
  border-bottom-color: #58a6ff;
}

.modal-body {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: 400px;
  overflow-y: auto;
}

.form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.label-text {
  font-size: 13px;
  color: #c9d1d9;
}

.inline-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-picker {
  width: 32px;
  height: 28px;
  border: 1px solid #30363d;
  border-radius: 6px;
  background: #0d1117;
  cursor: pointer;
}

.hex-input {
  width: 75px;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  color: #f0f6fc;
  font-size: 12px;
  padding: 4px 6px;
  font-family: monospace;
}

.btn-group {
  display: flex;
  border: 1px solid #30363d;
  border-radius: 6px;
  overflow: hidden;
}

.group-btn {
  background: #0d1117;
  border: none;
  border-right: 1px solid #30363d;
  color: #8b949e;
  padding: 5px 10px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.12s;
}

.group-btn:last-child {
  border-right: none;
}

.group-btn:hover {
  background: #21262d;
  color: #f0f6fc;
}

.group-btn.active {
  background: #1f6feb;
  color: #ffffff;
}

.styled-select, .styled-input {
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  color: #f0f6fc;
  font-size: 12px;
  padding: 6px 10px;
  min-width: 140px;
}

.slider-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.opacity-slider {
  width: 100px;
  cursor: pointer;
}

.slider-val {
  font-size: 12px;
  color: #8b949e;
  font-variant-numeric: tabular-nums;
  width: 32px;
}

.coords-box, .visibility-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.coords-box h4, .visibility-box h4 {
  margin: 0;
  font-size: 13px;
  color: #f0f6fc;
}

.coords-desc {
  margin: 0;
  font-size: 11px;
  color: #8b949e;
}

.coords-grid, .visibility-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-top: 6px;
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
  border-radius: 6px;
  color: #f0f6fc;
  font-size: 12px;
  padding: 6px 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #c9d1d9;
  cursor: pointer;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  background: #0d1117;
  border-top: 1px solid #21262d;
}

.btn-secondary {
  background: #21262d;
  border: 1px solid #30363d;
  color: #c9d1d9;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-secondary:hover {
  background: #30363d;
}

.footer-actions {
  display: flex;
  gap: 8px;
}

.btn-cancel {
  background: transparent;
  border: 1px solid #30363d;
  color: #c9d1d9;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
}

.btn-primary {
  background: #1f6feb;
  border: 1px solid #388bfd;
  color: #ffffff;
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary:hover {
  background: #388bfd;
}
</style>
