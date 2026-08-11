# RSI Premium Rebuild

This package contains an independent reconstruction of the public behavior and
visual language documented for TapeDelta RSI Premium. It does not include or
claim access to TapeDelta's proprietary implementation.

## Deliverables

- `TD RSI Premium Rebuild.pine`: Pine v6 panel plus main-chart overlay.
- Native chart preset in `src/composables/useChart.js`: enables the RSI engine
  already compiled into `chart_engine_bg.wasm` with signals, divergence, traps,
  EMA, WMA, and a 30% pane ratio.

## Shared behavioral contract

| Feature | Pine | Compiled WASM preset |
| --- | --- | --- |
| RSI 14 | Yes | Yes |
| RSI smoothing 3 | Yes | Yes |
| EMA line | EMA 9, optional | Native EMA, enabled |
| WMA line | WMA 45 | Native WMA, enabled |
| Pullback zones | 40-43 / 57-60 | Native implementation |
| Extreme zones | 80/90 and 20/10 | Native implementation |
| Pullback signals | PB / PS | Native signals |
| Trap signals | TB / TS | Native traps |
| Hidden divergence | Pivot-based dots and lines | Native divergence |
| MTF confirmation | Two configurable timeframes | Not exposed by the current bindings |
| Price cloud | Four ATR trail layers | Existing price-side native indicators |
| Closed-bar alerts | Static and JSON `alert()` | Host event loop |

The Pine implementation exposes all reconstructed thresholds because they are
needed for calibration. The compiled WASM only exposes the controls present in
`chart_engine.d.ts`; its internal thresholds cannot be changed or inspected
without the Rust source.

## Closed-bar event loop

1. Update OHLCV and compute smoothed RSI, EMA 9, and WMA 45.
2. Read both higher-timeframe RSI/WMA pairs with lookahead disabled.
3. Update the 40-43 and 57-60 setup windows.
4. Confirm price and RSI pivots after `pivotRight` closed bars.
5. Update hidden-divergence bias and trap anchors.
6. Build PB, PS, TB, and TS candidates.
7. Score local trend, two MTF biases, hidden divergence, and candle strength.
8. Resolve simultaneous candidates by score and enforce signal spacing.
9. Emit one closed-bar event, update the price cloud, and color the candle.
10. Update the MTF table and fire one JSON alert per confirmed signal.

No signal uses `lookahead_on`. Pivot markers are placed on the original pivot
bar only after the right-side confirmation bars exist.

## Signal definitions

- `PB`: RSI touched 40-43, recovered above 43, and closed above its RSI EMA.
- `PS`: RSI touched 57-60, rejected below 57, and closed below its RSI EMA.
- `TB`: a confirmed RSI high at or above 57 failed, then crossed below WMA 45.
  This means bulls were trapped and produces a short candidate.
- `TS`: a confirmed RSI low at or below 43 failed, then crossed above WMA 45.
  This means bears were trapped and produces a long candidate.
- Bull hidden divergence: price makes a higher low while RSI makes a lower low.
- Bear hidden divergence: price makes a lower high while RSI makes a higher high.
- `BUY ADV` / `SELL ADV`: the winning signal also agrees with both configured
  higher-timeframe RSI/WMA biases.

## Visual contract

- Purple RSI, orange WMA, optional blue EMA, and a restrained gray 50 midline.
- Green bands at 40-43 and 80-90; red bands at 57-60 and 10-20.
- A recent level touch creates a brighter active band with line-break edges.
- Cyan and red dots plus dotted lines identify hidden divergence bias.
- Dashed orange/cyan trap shelves connect the pivot to its confirmation.
- Four translucent ATR trail layers create the stepped green/red price cloud.
- Price tags and candle colors use the same final event and trend state as the
  RSI panel, so the two panes cannot disagree on signal direction.

## Parity calibration

Exact numerical equivalence needs a golden dataset because the public
documentation does not disclose the original formulas. Use at least 2,000
closed candles for each symbol/timeframe pair and record:

- candle timestamp and OHLCV;
- RSI, EMA, and WMA values;
- signal kind, direction, score, and confirmation timestamp;
- pivot timestamp used by each trap or divergence;
- screenshot at a fixed viewport and candle range.

Compare events by closed-candle timestamp. A visual match is accepted when the
same zones, signal type, and direction occur on the same bar and the oscillator
lines differ by at most 0.05 RSI points. Until matching internal WASM values can
be exported, the native binary and open Pine implementation should be treated
as behaviorally aligned presets, not bit-identical engines.

## Recommended defaults

- RSI 14, smoothing 3, EMA 9, WMA 45.
- Pullback zones 40-43 and 57-60.
- Extremes 80/90 and 20/10.
- Pivot 3 left / 3 right, setup window 18 bars.
- Minimum score 55 and minimum spacing 8 bars.
- MTF confirmation 15m and 1h.
- ATR cloud 14 with 1.8 multiplier.
