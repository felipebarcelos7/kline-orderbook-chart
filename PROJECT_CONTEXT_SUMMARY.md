# Select® Chart Engine Demo - Project Context Summary

## Data: 2026-05-28

---

## 1. Resumo das Principais Tarefas Concluídas

| Tarefa | Descrição | Arquivos Afetados |
|--------|-----------|-------------------|
| **Rebranding MRD → Select®** | Alterei o nome do produto em todos os arquivos do demo (UI, docs, configs) | `index.html`, `README.md`, `docs/usage-guide.md`, `package.json` (demo/server) |
| **Remoção/Controle de Demo/Planos** | Adicionei suporte para chave de licença via `env`/`localStorage` (não removi a verificação no engine, só no demo) | `src/composables/useChart.js` |
| **Habilitação de Todos os Indicadores** | Adicionei botões para todos os indicadores no menu "Manage Indicators" (incluindo Fibonacci Extension) | `src/components/ControlBar.vue`, `src/composables/useChart.js` |
| **Suporte a Múltiplos Timeframes** | Implementei suporte a intervalos além de 1m/5m (1m, 5m, 15m, 30m, 45m, 1h, 2h, 3h, 4h, 1d, 1w, 1M) + agregação no servidor | `src/components/ControlBar.vue`, `src/composables/useChart.js`, `src/composables/useMarketData.js`, `server/index.js`, `server/exchanges/binance.js`, `server/exchanges/bybit.js` |
| **Persistência Local (IndexedDB + LocalStorage)** | Salva configurações, desenhos e preferências do usuário localmente; restaura no reload | `src/App.vue`, `src/components/HeatmapSlider.vue` |
| **Fixação de Congelamento do Demo** | Adicionei heartbeat (ping/pong) + watchdog de reconexão no WebSocket; throttling no hit-test de liq | `src/composables/useMarketData.js`, `server/index.js` |
| **Implementação de Tooltips & Cards** | Tooltip do crosshair (OHLCV + indicadores), card OI Metrics, card de liquidação (LONG/SHORT + ACTIVE) | `src/components/ChartView.vue`, `src/composables/useChart.js` |
| **Correções no Pine Script (Forex Signals)** | Corrigi vários erros de compilação do Pine: `barcolor` em escopo local, mutação de globais em função, `var` em parâmetro, etc. | `docs/js.bridge/Select® Forex Signals.pine` |
| **Habilitação de Fibonacci Extension** | Adicionei o tool `fibext` na barra de desenhos | `src/components/DrawingToolbar.vue` |

---

## 2. Arquivos Principais Modificados

### Demo (Frontend - Vue 3)
- `src/composables/useChart.js`: Integração com o engine, licença, indicadores, tooltips, onPostRender, etc.
- `src/composables/useMarketData.js`: Conexão WS, heartbeat, intervalos, etc.
- `src/App.vue`: Persistência, estado global, eventos de visibilidade.
- `src/components/ControlBar.vue`: UI de exchange/símbolo/intervalo/indicadores/tema.
- `src/components/ChartView.vue`: Overlays (tooltip, LIQ, OI Metrics), hit-test.
- `src/components/DrawingToolbar.vue`: Ferramentas de desenho (incluindo Fib Extension).
- `src/components/HeatmapSlider.vue`: Persistência do slider de heatmap.

### Demo (Backend - Node.js)
- `server/index.js`: Agregação de intervalos, heartbeat WS, símbolos expandidos.
- `server/exchanges/binance.js`: Suporte a intervalo configurável no WS.
- `server/exchanges/bybit.js`: Mesmo suporte a intervalo configurável.

### Outros
- `docs/js.bridge/Select® Forex Signals.pine`: Pine Script do Forex Signals (ajustado para compilar no TradingView).
- `docs/js.bridge/structure-trade-manager.md`: Documentação da estrutura de sinais.

---

## 3. Erros Corrigidos

| Erro | Solução |
|------|---------|
| Vue warnings (prop `bridge` esperava objeto, recebeu boolean) | Corrigi `const bridge = ref(null)` em vez de `ref(true)` no `useChart.js` |
| Forex Signals não aparecia | Garanti enable/config após `setKlines`, adicionei timeframe, auditoria de contagem |
| Demo congela após um tempo | Heartbeat ping/pong + watchdog de reconexão; throttle hit-test; pause/resume na mudança de aba |
| Pine: `Cannot use 'barcolor' in local scope` | Movi `barcolor` para escopo global com expressão condicional |
| Pine: `Cannot modify global variable 'mainExp' in function` | Refatorei `f_finalize` para retornar deltas e aplicar no global scope |
| Pine: `Mismatched input 'var' expecting ')'` | Removi `var` dos parâmetros de função; usei return tuples |
| Pine: `Syntax error at input ':='` | Troquei `:=` por `=` nas atribuições de tupla |
| Pine: `Value with NA type cannot be assigned` | Separei declarações de `line` em uma por linha |
| Pine: `Shadowing variable` | Usei struct `VisualState` para gerenciar estado sem temporárias |
| Tooltip do crosshair aparecia com campos em branco | Ajustei parser para payload aninhado (`tooltip.kline`) com fallback + RAW debug |
| Tooltip LIQ não mostrava LONG/SHORT | Adicionei detecção de lado, cores e badge ACTIVE/INACTIVE |
| Fibonacci Extension não aparecia na toolbar | Adicionei o tool `fibext` na lista da `DrawingToolbar.vue` |

---

## 4. Estado Atual (Importante!)

### O que **funciona** no demo:
- Todos os indicadores (incluindo Fibonacci Extension) aparecem na UI
- Timeframes múltiplos
- Persistência de configurações/desenhos
- Tooltips (crosshair, LIQ, OI Metrics)
- Heartbeat WS (não congela mais)
- Rebranding para Select®
- Forex Signals no canvas (via WASM)

### O que **não está versionado aqui**:
- **Código-fonte Rust do engine** (`src/indicators/forex_signals.rs`, `lib.rs`, `mod.rs`, `Cargo.toml` da crate) — **não existe neste repositório**.
  - O que existe é o **WASM compilado**:
    - `packages/js-bridge/wasm/chart_engine_bg.wasm`
    - `packages/js-bridge/wasm/chart_engine.js` (bindings)
    - `packages/js-bridge/wasm/chart_engine.d.ts` (tipos)
- O que a "outra IA" provavelmente alterou (e que pode mudar o comportamento dos sinais no demo) é o **port JS do Pine**: `demo/src/composables/useStructureSignals.js`.

### O que precisa para fazer o plano da outra IA (add getters no Rust e recompilar WASM):
1. Você precisa acessar o **repositório/crate original do engine em Rust** (onde existe `src/indicators/forex_signals.rs`, `lib.rs`, `Cargo.toml`, etc.)
2. Você precisa ter `cargo` e `wasm-pack` instalados
3. Você precisa saber o comando de build do WASM (ex.: `wasm-pack build --target web --release`)

---

## 5. Como Voltar ao "Nosso" Forex Signals (WASM Original)

Se você quiser remover o uso do `useStructureSignals.js` (port do Pine) e voltar a usar só o Forex Signals do WASM (o que o canvas desenha):

1. Abra `demo/src/App.vue`
2. Remova a importação e o uso de `useStructureSignals`
3. Em `useChart.js`, remova a integração com o `useStructureSignals.js` (se houver)
4. Reconstrua o demo

---

## 6. Arquivos de Referência

- `docs/js.bridge/drawings.md`: Documentação das ferramentas de desenho
- `docs/js.bridge/tooltip.md`: Documentação de eventos, tooltips e hit-test
- `docs/js.bridge/structure-trade-manager.md`: Documentação da estrutura de sinais
- `docs/js.bridge/Select® Forex Signals.pine`: Pine Script ajustado
