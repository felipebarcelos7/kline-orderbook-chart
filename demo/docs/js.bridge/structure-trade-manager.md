## Estrutura (Structure) + Trade Manager — visão geral

Este documento descreve a “estrutura” usada para gerar sinais (BUY/SELL) e como o “trade manager” monta a ideia de trade (ET1/ET2/AVG/SL/TPs), além do que precisa estar funcionando para o engine renderizar tudo corretamente no demo.

### Componentes (no repositório)

- **Demo (frontend)**: UI + chart (Vue) que chama o bridge para habilitar indicadores e renderizar overlays.
- **Server (backend demo)**: WebSocket + REST/WS adapters de exchange; entrega histórico e streaming (klines/trades/depth/heatmap).
- **Engine/Bridge (JS bridge)**: camada de integração entre a UI e o chart engine (métodos como `setKlines`, `setTheme`, `enable*`, callbacks de tooltip, etc.).
- **Pine (TradingView)**: versão “isolada” para validar visual/heurística sem depender do engine, mas com limitações de linguagem.

Arquivos de referência:
- Bridge docs: [framework-integration.md](file:///c:/Users/felip/OneDrive/Documentos/btcnew/select_repository/Convers%C3%A3o/bot_bingx_v1/packages/kline-orderbook-chart/demo/docs/js.bridge/framework-integration.md)
- Indicators: [indicators.md](file:///c:/Users/felip/OneDrive/Documentos/btcnew/select_repository/Convers%C3%A3o/bot_bingx_v1/packages/kline-orderbook-chart/demo/docs/js.bridge/indicators.md)
- Aggregation: [chart-aggregation.md](file:///c:/Users/felip/OneDrive/Documentos/btcnew/select_repository/Convers%C3%A3o/bot_bingx_v1/packages/kline-orderbook-chart/demo/docs/js.bridge/chart-aggregation.md)
- Pine: [Select® Forex Signals.pine](file:///c:/Users/felip/OneDrive/Documentos/btcnew/select_repository/Convers%C3%A3o/bot_bingx_v1/packages/kline-orderbook-chart/demo/docs/js.bridge/Select%C2%AE%20Forex%20Signals.pine)

---

## 1) O que é “Structure” aqui

“Structure” (estrutura) é uma forma de ler o mercado por **pivôs (swings)** e “quebras” desses pivôs para inferir:

- **Mudança/continuação de tendência** (ex.: rompimento confirmado de um swing high/low).
- **Gatilhos de sinal** (BUY/SELL) baseados nesses rompimentos.

No Pine atual, existem dois níveis de estrutura:

- **Main**: pivôs com janela maior (`swingLenMain`), mais “macro”.
- **DCA (Minor)**: pivôs com janela menor (`swingLenMinor`), mais “micro”, usado só quando o Main já definiu a tendência.

### Sinais (como estão no Pine hoje)

- **BUYᴹ (Main Buy)**: close confirmado acima do último pivot high “Main”.
- **SELLᴹ (Main Sell)**: close confirmado abaixo do último pivot low “Main”.
- **BUYᴅ (DCA Buy)**: tendência Main = alta e close confirmado acima do último pivot high “Minor”.
- **SELLᴅ (DCA Sell)**: tendência Main = baixa e close confirmado abaixo do último pivot low “Minor”.

Observações importantes:
- Tudo é “close-only” (não repaint) porque usa `barstate.isconfirmed`.
- A classificação Main vs DCA depende do alinhamento com a tendência definida pelo Main.

---

## 2) O que é o “Trade Manager”

Trade Manager = a camada que pega o **sinal** e transforma em um **plano de trade desenhável** no gráfico:

- **ET1 / ET2**: limites da zona de entrada (Entry Zone).
- **AVG**: preço médio da zona (ou preço de referência do plano).
- **SL**: stop.
- **TP1..TP6**: alvos.

No engine (demo), isso é renderizado como:
- **Box** na zona (ET1..ET2).
- **Linhas horizontais** para AVG/SL/TPs.
- Estilos diferentes para Main vs DCA (ex.: dashed vs dotted).

No Pine, a mesma ideia é renderizada via `box.new()` e `line.new()`.

---

## 3) De onde vêm ET/SL/TPs (no Pine atual)

O Pine atual usa:
- `Entry zone (pips)` para montar ET1/ET2 ao redor do preço de referência.
- `Stop (pips)` para SL.
- `TP1..TP6 (R)` (múltiplos de R) onde `R = |AVG - SL|`.
- Uma tentativa simples de “structure alignment” alinhando TP com o último swing (proxy).

Isso é suficiente para “ficar parecido visualmente”, mas pode divergir do engine se o engine:
- usar múltiplos níveis estruturais (não só o último pivot),
- alinhar por níveis intermediários (ex.: mais de um swing, ranges, fib),
- aplicar filtros adicionais (volatilidade, sessão, tendência de HTF, etc.).

---

## 4) O que precisa estar funcionando para o engine renderizar tudo no demo

### 4.1 Dados mínimos

- **Klines** (OHLCV) do símbolo/timeframe selecionado:
  - Histórico inicial (ex.: 500–2000 candles).
  - Streaming em tempo real (candle updates).
- Para overlays adicionais (orderbook/heatmap etc.), também precisa:
  - Trades/Depth, se o overlay usar isso.

Se os klines não chegarem:
- não há pivôs,
- não há estrutura,
- não há sinais.

### 4.2 Consistência de timeframe

O server precisa assinar o intervalo correto (ex.: 5m/15m/1h) e o frontend precisa:
- passar `intervalSec` na subscrição,
- receber o histórico com o mesmo `candleSec`,
- alimentar o chart com essa base.

Se o timeframe “na UI” não casar com o timeframe “da assinatura”, você vê:
- sinais “sumindo”,
- marcações em barras erradas,
- comportamento inconsistente.

### 4.3 “Pip size”

Para Forex/Metais/Cripto o cálculo de “pip” muda.
No Pine isso é resolvido por heurística em `f_pip_size()`.
No engine, a regra equivalente precisa existir (ou uma conversão padronizada) para:
- entry zone em pips,
- stop em pips,
- métricas (ex.: max pips).

### 4.4 Renderização

O engine precisa de:
- capacidade de desenhar boxes/linhas/labels no overlay,
- limpeza/atualização correta quando um trade expira/fecha,
- callbacks de tooltip/hover quando aplicável.

---

## 5) Como validar rapidamente se “estrutura” está funcionando

- Confirme que o gráfico está recebendo candles (preço muda em tempo real).
- Use um timeframe conhecido (ex.: 5m) e compare:
  - se aparecem pivôs com o `swingLen` escolhido,
  - se aparece BUY/SELL após rompimento confirmado.
- Se no demo o engine mostra o contador de sinais, compare com o Pine no mesmo símbolo/timeframe.

---

## 6) Limitações do Pine vs Engine

- Pine é single-thread e tem restrições de escopo (ex.: `barcolor` e mutação de globais em funções).
- Pine não consegue replicar 100% regras internas do engine se o engine tiver:
  - múltiplas fontes de dados (orderflow/heatmap),
  - filtros por sessão/volatilidade,
  - lógica “stateful” complexa (múltiplos trades simultâneos, partial fills etc.).

O Pine serve para:
- validar visual,
- validar heurística de sinal,
- auditar diferenças.

---

## 7) O que eu preciso para ficar 1:1 com o engine

Para ficar idêntico ao engine, precisa de pelo menos um:

- Regras objetivas do engine (definição de BOS/CHOCH/shift, filtros, alinhamento de TP, classificação Main vs DCA), ou
- Um conjunto pequeno de exemplos (prints) com símbolo/timeframe e exatamente onde o engine marcou BUYᴹ/SELLᴹ/BUYᴅ/SELLᴅ e quais níveis de ET/TP/SL ele desenhou.

Com isso dá para ajustar:
- regra de estrutura (pivôs/rompimentos),
- regra de “trade manager” (ET/SL/TPs),
- alinhamento estrutural de TPs para bater nos mesmos níveis do engine.
