<template>
  <div v-if="signal" class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal">
      <header class="modal-header">
        <div class="header-left">
          <span class="sym-icon">{{ symbolIcon }}</span>
          <strong>{{ signal.symbol }}</strong>
          <span :class="['side-badge', signal.dir === 1 ? 'buy' : 'sell']">{{ signal.side }}</span>
          <span class="tf-badge">{{ signal.tfLabel }}</span>
        </div>
        <div class="header-actions">
          <button class="action-btn whatsapp" @click="shareWhatsApp" :title="copied ? 'Copied!' : 'Copy & open WhatsApp'">
            <span class="wa-icon">⌬</span>
            <span>{{ copied ? 'Copied!' : 'WhatsApp' }}</span>
          </button>
          <button class="action-btn" @click="copyToClipboard" :title="copied ? 'Copied!' : 'Copy formatted signal'">
            ⎘
          </button>
          <button class="close-btn" @click="$emit('close')">×</button>
        </div>
      </header>

      <section class="bot-execute-section" style="padding: 12px 16px; background: rgba(220, 38, 38, 0.12); border-bottom: 1px solid rgba(220, 38, 38, 0.25); display: flex; justify-content: space-between; align-items: center; gap: 8px;">
        <div style="font-size: 12px; color: #fca5a5;">
          <strong>{{ signal.symbol }}:</strong> Operar sinal ou visualizar
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button 
            class="chart-switch-btn"
            @click="$emit('openChart', signal.symbol); $emit('close')"
            style="background: rgba(255,255,255,0.1); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.2); padding: 6px 12px; border-radius: 8px; font-weight: 500; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 4px;"
            title="Abrir este ativo no gráfico"
          >
            <span>📊 Ver Gráfico</span>
          </button>
          <button 
            class="bot-execute-btn"
            :disabled="isExecuting"
            @click="executeOnBot"
            style="background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; border: none; padding: 6px 14px; border-radius: 8px; font-weight: 600; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px;"
          >
            <span>{{ isExecuting ? 'Enviando...' : '⚡ Executar no Bot' }}</span>
          </button>
        </div>
      </section>

      <section :class="['result-banner', isLoss ? 'loss' : isWin ? 'win' : 'pending']">
        <div class="banner-left">
          <div class="banner-title">{{ statusTitle }}</div>
          <div class="banner-sub">{{ statusSubtitle }}</div>
        </div>
        <div class="banner-pips">{{ formattedPips }}</div>
      </section>

      <section class="section">
        <div class="section-title">PRICE LEVELS</div>
        <div class="levels-grid">
          <div class="level entry">
            <div class="lbl">● Entry Zone</div>
            <div class="val">{{ fmt(signal.et1) }}</div>
            <div class="val">{{ fmt(signal.et2) }}</div>
          </div>
          <div class="level exit">
            <div class="lbl">● Exit Price</div>
            <div class="val">{{ signal.exitPrice ? fmt(signal.exitPrice) : '—' }}</div>
          </div>
          <div class="level sl">
            <div class="lbl">● Stop Loss</div>
            <div class="val">{{ fmt(signal.sl) }}</div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-title">TAKE PROFIT TARGETS</div>
        <div class="tp-list">
          <div
            v-for="(price, i) in signal.tps"
            :key="i"
            :class="['tp-row', { hit: signal.hits[i] }]"
          >
            <span class="tp-num">{{ i + 1 }}</span>
            <span class="tp-name">TP{{ i + 1 }}</span>
            <span class="tp-price">${{ fmt(price) }}</span>
          </div>
        </div>
      </section>

      <section class="meta-grid">
        <div class="meta">
          <div class="meta-lbl">OPENED</div>
          <div class="meta-val">{{ fmtDate(signal.openedAt) }}</div>
        </div>
        <div class="meta">
          <div class="meta-lbl">CLOSED</div>
          <div class="meta-val">{{ signal.closedAt ? fmtDate(signal.closedAt) : '—' }}</div>
        </div>
        <div class="meta">
          <div class="meta-lbl">DURATION</div>
          <div class="meta-val">{{ duration }}</div>
        </div>
        <div class="meta">
          <div class="meta-lbl">RESULT</div>
          <div :class="['meta-val', isLoss ? 'neg' : isWin ? 'pos' : '']">
            {{ formattedPips }}
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  signal: { type: Object, default: null },
})

defineEmits(['close', 'openChart'])

const copied = ref(false)
const isExecuting = ref(false)

async function executeOnBot() {
  if (!props.signal) return
  isExecuting.value = true
  try {
    const res = await fetch('/api/broker/execute-signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: props.signal.symbol,
        direction: props.signal.dir === 1 ? 'LONG' : 'SHORT',
        entryPrice: props.signal.et1 || props.signal.avg,
        tp1: props.signal.tps?.[0],
        tp2: props.signal.tps?.[1],
        stopLoss: props.signal.sl,
        leverage: 10,
      }),
    })
    const data = await res.json()
    if (res.ok && data.success) {
      alert(`⚡ Ordem enviada ao bot KuCoin com sucesso! Verifique na aba Trading Bot.`)
    } else {
      alert(data.error || 'Falha ao enviar ordem ao robô.')
    }
  } catch (e) {
    alert('Erro de conexão ao enviar ordem ao robô.')
  } finally {
    isExecuting.value = false
  }
}

function buildWhatsAppMessage() {
  const s = props.signal
  if (!s) return ''
  const sideEmoji = s.dir === 1 ? '🟢' : '🔴'
  const lines = [
    `*${s.symbol}* ${sideEmoji} *${s.side}* | ${s.tfLabel}`,
    '',
    '*Entry Zone*',
    `ET1: $${fmt(s.et1)}`,
    `ET2: $${fmt(s.et2)}`,
    `AVG: $${fmt(s.avg)}`,
    '',
    `*Stop Loss:* $${fmt(s.sl)}`,
    '',
    '*Take Profit Targets*',
    ...s.tps.map((tp, i) => `TP${i + 1}: $${fmt(tp)}${s.hits[i] ? ' ✅' : ''}`),
  ]
  if (s.exitPrice) {
    lines.push('', `*Exit:* $${fmt(s.exitPrice)}`)
  }
  if (s.closeReason) {
    const reason = s.closeReason === 'STOP_LOSS_HIT'
      ? '🛑 Stop Loss Hit'
      : (s.closeReason.match(/TP(\d)/) ? `🎯 Target-TP${s.closeReason.match(/TP(\d)/)[1]} Reached` : '⏳ Expired')
    lines.push(`*Result:* ${reason}`)
    const pips = Math.round(s.finalPips ?? s.maxPips ?? 0)
    lines.push(`*Pips:* ${pips >= 0 ? '+' : ''}${pips}`)
  }
  lines.push('', `_Generated by Select®_`)
  return lines.join('\n')
}

async function copyToClipboard() {
  const msg = buildWhatsAppMessage()
  try {
    await navigator.clipboard.writeText(msg)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1800)
  } catch {
    // Fallback for older browsers / non-secure contexts
    const ta = document.createElement('textarea')
    ta.value = msg
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1800)
  }
}

async function shareWhatsApp() {
  await copyToClipboard()
  const msg = buildWhatsAppMessage()
  const url = `https://wa.me/?text=${encodeURIComponent(msg)}`
  window.open(url, '_blank', 'noopener')
}

const symbolIcon = computed(() => (props.signal?.symbol || '?').slice(0, 3))

const isLoss = computed(() => props.signal?.closeReason === 'STOP_LOSS_HIT')
const isWin = computed(() => /^TARGET_TP\d/.test(props.signal?.closeReason || ''))

const statusTitle = computed(() => {
  if (!props.signal) return ''
  if (isLoss.value) return 'STOP LOSS HIT'
  if (isWin.value) {
    const m = props.signal.closeReason.match(/TP(\d)/)
    return `TARGET-TP${m ? m[1] : ''} REACHED`
  }
  if (props.signal.expired) return 'EXPIRED'
  return 'ACTIVE'
})

const statusSubtitle = computed(() => {
  if (isLoss.value) return 'Stop Loss Hit'
  if (isWin.value) return 'Take profit reached'
  if (props.signal?.expired) return 'Replaced by opposing signal'
  return 'Trade in progress'
})

const formattedPips = computed(() => {
  const s = props.signal
  if (!s) return ''
  const pips = s.finalPips ?? (s.active ? s.maxPips : 0)
  const sign = pips >= 0 ? '+' : ''
  return `${sign}${Math.round(pips)} pips`
})

const duration = computed(() => {
  const s = props.signal
  if (!s) return ''
  const end = s.closedAt || Date.now()
  const ms = end - s.openedAt
  if (ms < 0) return '—'
  const min = Math.floor(ms / 60000)
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
})

function fmt(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  if (Math.abs(v) >= 1000) return v.toFixed(2)
  if (Math.abs(v) >= 10) return v.toFixed(3)
  return v.toFixed(5)
}

function fmtDate(ts) {
  const d = new Date(ts)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd} ${hh}:${mi}`
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.modal {
  width: 520px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 64px);
  overflow-y: auto;
  background: #131b2e;
  border: 1px solid rgba(75, 85, 99, 0.4);
  border-radius: 12px;
  font-family: 'Inter', sans-serif;
  color: #e5e7eb;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(75, 85, 99, 0.3);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.sym-icon {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #1a2238;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: #8b5cf6;
}

.side-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
}
.side-badge.buy  { background: rgba(16, 185, 129, 0.2); color: #10b981; }
.side-badge.sell { background: rgba(239, 68, 68, 0.2); color: #ef4444; }

.tf-badge {
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
  font-size: 10px;
  font-weight: 700;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.action-btn {
  background: rgba(75, 85, 99, 0.18);
  border: 1px solid rgba(75, 85, 99, 0.3);
  color: #8b949e;
  height: 28px;
  padding: 0 10px;
  border-radius: 6px;
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: all 0.15s;
}
.action-btn:hover {
  border-color: rgba(139, 92, 246, 0.5);
  color: #e5e7eb;
}
.action-btn.whatsapp {
  background: rgba(37, 211, 102, 0.12);
  border-color: rgba(37, 211, 102, 0.4);
  color: #25d366;
}
.action-btn.whatsapp:hover {
  background: rgba(37, 211, 102, 0.22);
  border-color: rgba(37, 211, 102, 0.7);
}
.action-btn.whatsapp .wa-icon {
  font-size: 13px;
}

.close-btn {
  background: rgba(75, 85, 99, 0.2);
  border: none;
  color: #8b949e;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  font-size: 18px;
  cursor: pointer;
}

.result-banner {
  margin: 12px 18px;
  padding: 14px 16px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.result-banner.loss { background: rgba(239, 68, 68, 0.12); }
.result-banner.win  { background: rgba(16, 185, 129, 0.12); }
.result-banner.pending { background: rgba(245, 158, 11, 0.12); }

.banner-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: #ef4444;
}
.result-banner.win .banner-title  { color: #10b981; }
.result-banner.pending .banner-title { color: #f59e0b; }

.banner-sub {
  font-size: 11px;
  color: #8b949e;
  margin-top: 3px;
}

.banner-pips {
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 700;
  font-size: 22px;
  color: #ef4444;
}
.result-banner.win .banner-pips  { color: #10b981; }
.result-banner.pending .banner-pips { color: #f59e0b; }

.section {
  padding: 0 18px 14px;
}
.section-title {
  font-size: 10px;
  letter-spacing: 1px;
  color: #6b7280;
  margin-bottom: 8px;
}

.levels-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
}
.level {
  background: #0d1421;
  border-radius: 8px;
  padding: 10px 12px;
  border: 1px solid rgba(75, 85, 99, 0.25);
}
.level .lbl {
  font-size: 10px;
  color: #8b949e;
  margin-bottom: 4px;
}
.level.entry .lbl { color: #58a6ff; }
.level.sl    .lbl { color: #ef4444; }
.level.exit  .lbl { color: #8b949e; }

.level .val {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 13px;
  font-weight: 600;
}
.level.entry .val { color: #58a6ff; }
.level.sl .val    { color: #ef4444; }

.tp-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.tp-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 12px;
  background: #0d1421;
  border-radius: 8px;
  border: 1px solid rgba(75, 85, 99, 0.25);
}
.tp-row.hit {
  border-color: rgba(16, 185, 129, 0.45);
  background: rgba(16, 185, 129, 0.06);
}
.tp-num {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(75, 85, 99, 0.4);
  color: #e5e7eb;
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.tp-row.hit .tp-num {
  background: #10b981;
  color: #0d1421;
}
.tp-name {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
}
.tp-price {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 13px;
  color: #e5e7eb;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 0 18px 18px;
}
.meta {
  background: #0d1421;
  border-radius: 8px;
  padding: 10px 12px;
  text-align: center;
  border: 1px solid rgba(75, 85, 99, 0.25);
}
.meta-lbl {
  font-size: 9px;
  color: #6b7280;
  letter-spacing: 1px;
  margin-bottom: 4px;
}
.meta-val {
  font-size: 12px;
  font-weight: 600;
  color: #e5e7eb;
  font-family: 'IBM Plex Mono', monospace;
}
.meta-val.pos { color: #10b981; }
.meta-val.neg { color: #ef4444; }
</style>
