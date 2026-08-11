# Select Terminal Pine Suite

Independent Pine Script reconstructions for every indicator exposed by the
terminal's Indicators menu. Every file is self-contained and processes state
on confirmed candles.

## Indicators

| # | Terminal module | Pine file | Data parity |
| --- | --- | --- | --- |
| 01 | Volume | `01_Volume_Terminal.pine` | OHLCV native |
| 02 | RSI | `02_RSI_Premium_Terminal.pine` | OHLCV native, documented reconstruction |
| 03 | Open Interest | `03_Open_Interest_Terminal.pine` | TradingView `_OI` feed; labeled proxy fallback |
| 04 | Large Trades | `04_Large_Trades_Terminal.pine` | Candle-notional proxy |
| 05 | Liquidation Heatmap | `05_Liquidation_Heatmap_Terminal.pine` | Leverage/pivot prediction proxy |
| 06 | VRVP | `06_VRVP_Terminal.pine` | OHLCV native, true visible range |
| 07 | TPO | `07_TPO_Market_Profile_Terminal.pine` | OHLCV native |
| 08 | Smart Ranges | `08_Smart_Ranges_Terminal.pine` | OHLCV native |
| 09 | EMA Structure | `09_EMA_Structure_Terminal.pine` | OHLCV native |
| 10 | Stops & Icebergs | `10_Stops_Icebergs_Terminal.pine` | Stops from OHLCV; iceberg refill proxy |
| 11 | Forex Signals | `11_Forex_Signals_Terminal.pine` | OHLCV native structure manager |

## Event Loop Contract

Every script follows the same deterministic lifecycle:

1. Read the current OHLCV candle and any available TradingView auxiliary feed.
2. Update rolling series without lookahead.
3. Confirm pivots only after their configured right-side bars exist.
4. Build event candidates during the candle.
5. Commit signals and counters only when `barstate.isconfirmed` is true.
6. Update active object state: zones, fills, mitigation, breaks, or expiration.
7. Enforce object retention limits before creating more drawings.
8. Rebuild last-bar-only profiles where the output depends on the current range.
9. Refresh dashboards on `barstate.islast`.
10. Emit `alertcondition` events from the same committed signal used by visuals.

No reconstruction uses `lookahead_on`. Pivot drawings are back-positioned to
the source pivot only after confirmation, so their visual location does not
mean the signal was available earlier.

## External-Feed Limits

The browser terminal receives data Pine cannot request:

- individual trades with timestamp, side, price, and USD size;
- order-book heatmap columns and liquidation prints;
- iceberg visible size, hidden size, side, and refill count.

The corresponding Pine scripts are therefore behavioral reconstructions, not
fabricated claims of raw-feed equality. They show `PROXY`, `PREDICTED`, or
`ICE=PROXY` on their dashboards. Open Interest is the exception: it first tries
the TradingView `_OI` symbol and only uses its labeled proxy when enabled and
the feed is unavailable.

## Visual Mapping

- Aqua/green represents bids, demand, buys, bullish structure, or short
  liquidations above price.
- Red represents asks, supply, sells, bearish structure, or long liquidations
  below price.
- Orange represents warnings, traps, single prints, or proxy-only data.
- Purple is used for neutral profile/oscillator structure.
- Yellow identifies POC, climax, high intensity, or important balance levels.

## TradingView Installation

Open one `.pine` file at a time in Pine Editor, add it to the chart, then save
it under the matching terminal module name. Profile-heavy modules should be
used individually on lower-memory TradingView plans because each maintains its
own boxes, lines, labels, and arrays.

## Calibration Order

Use the same symbol, exchange, timeframe, session timezone, and candle type in
both terminals. Calibrate in this order:

1. EMA Structure and Volume.
2. RSI and Open Interest.
3. VRVP and TPO range/session settings.
4. Smart Ranges pivot and mitigation settings.
5. Large Trade, liquidation, stop, and iceberg proxy thresholds.
6. Forex Signals risk and structure presets.

Exact raw-feed parity for modules marked as proxies requires exposing the same
terminal feed to Pine through a supported TradingView data symbol. It cannot be
derived exactly from OHLCV alone.
