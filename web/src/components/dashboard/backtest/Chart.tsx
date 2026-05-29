"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import { FiBarChart2 } from "react-icons/fi";

// ─── Public types ─────────────────────────────────────────────────────────────

export type PreviewBar = {
  time:    number;
  open:    number;
  high:    number;
  low:     number;
  close:   number;
  volume?: number;
};

export type ChartHandle = {
  setData:        (data: any) => void;
  setPreviewData: (bars: PreviewBar[]) => void;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const BG_COLOR        = "#111113";
const GRID_COLOR      = "#27272A";
const TEXT_COLOR      = "#71717A";
const STRATEGY_COLOR  = "#3b82f6";
const BENCHMARK_COLOR = "#f97316";
const CROSSHAIR_COLOR = "#06B6D4";
const UP_COLOR        = "#10B981";
const DOWN_COLOR      = "#EF4444";
const BUY_MARKER      = "#34d399";
const SELL_MARKER     = "#fb7185";
const VOL_UP          = "rgba(38, 166, 154, 0.5)";
const VOL_DOWN        = "rgba(239, 83, 80, 0.5)";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number): string {
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(2) + "M";
  if (Math.abs(v) >= 1_000)     return (v / 1_000).toFixed(2) + "K";
  return v.toFixed(2);
}

function fmtVol(v: number): string {
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(2) + "B";
  if (v >= 1_000_000)     return (v / 1_000_000).toFixed(2) + "M";
  if (v >= 1_000)         return (v / 1_000).toFixed(1) + "K";
  return String(v);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type LegendData = {
  open:      string;
  high:      string;
  low:       string;
  close:     string;
  volume:    string;
  bullish:   boolean | null;
  // null = outside backtest window or no backtest run yet
  strategy:  string | null;
  benchmark: string | null;
};

// Volume is intentionally excluded — its visibility is always tied to Price.
type Visibility = {
  price:     boolean;
  strategy:  boolean;
  benchmark: boolean;
};

// ─── Component ────────────────────────────────────────────────────────────────

const Chart = forwardRef<ChartHandle>((_, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);
  const candleRef    = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef    = useRef<ISeriesApi<"Histogram"> | null>(null);
  const stratRef     = useRef<ISeriesApi<"Line"> | null>(null);
  const benchRef     = useRef<ISeriesApi<"Line"> | null>(null);
  const markersRef   = useRef<ISeriesMarkersPluginApi<Time> | null>(null);

  const hasPreviewRef  = useRef(false);
  const lastLegendRef  = useRef<LegendData | null>(null);
  // Full candle history for the autoscaleInfoProvider ratio-lock calculation.
  const allCandlesRef  = useRef<PreviewBar[]>([]);
  // initial_equity / initial_price — set when a backtest result loads.
  const ratioRef       = useRef<number | null>(null);

  const [hasData,    setHasData]    = useState(false);
  const [legend,     setLegend]     = useState<LegendData | null>(null);
  const [visibility, setVisibility] = useState<Visibility>({
    price: true, strategy: true, benchmark: true,
  });

  // ── Visibility toggles ──────────────────────────────────────────────────────
  const handleToggle = (key: keyof Visibility) => {
    const next = !visibility[key];
    setVisibility((prev) => ({ ...prev, [key]: next }));

    if (key === "price") {
      // Volume is always coupled to price — they toggle as one unit.
      candleRef.current?.applyOptions({ visible: next });
      volumeRef.current?.applyOptions({ visible: next });
    } else if (key === "strategy") {
      stratRef.current?.applyOptions({
        color:                          next ? STRATEGY_COLOR  : "transparent",
        lastValueVisible:               next,
        crosshairMarkerVisible:         next,
        crosshairMarkerBorderColor:     next ? STRATEGY_COLOR  : "transparent",
        crosshairMarkerBackgroundColor: next ? STRATEGY_COLOR  : "transparent",
      });
    } else if (key === "benchmark") {
      benchRef.current?.applyOptions({
        color:                          next ? BENCHMARK_COLOR : "transparent",
        lastValueVisible:               next,
        crosshairMarkerVisible:         next,
        crosshairMarkerBorderColor:     next ? BENCHMARK_COLOR : "transparent",
        crosshairMarkerBackgroundColor: next ? BENCHMARK_COLOR : "transparent",
      });
    }
  };

  // ── Chart initialisation ────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      width:  container.offsetWidth,
      height: container.offsetHeight,
      layout: {
        background: { type: ColorType.Solid, color: BG_COLOR },
        textColor:  TEXT_COLOR,
        fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
        fontSize:   11,
      },
      grid: {
        vertLines: { color: GRID_COLOR, style: LineStyle.Solid },
        horzLines: { color: GRID_COLOR, style: LineStyle.Solid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: CROSSHAIR_COLOR, width: 1, style: LineStyle.Dashed,
          labelBackgroundColor: CROSSHAIR_COLOR,
        },
        horzLine: {
          color: CROSSHAIR_COLOR, width: 1, style: LineStyle.Dashed,
          labelBackgroundColor: CROSSHAIR_COLOR,
        },
      },
      // Fix 4: autoScale ensures the equity axis rescales as the user pans/zooms.
      // scaleMargins gives the equity lines 80% of the pane height (10% breathing
      // room top and bottom), preventing them from hugging the axis extremes.
      leftPriceScale: {
        visible:      true,
        borderColor:  GRID_COLOR,
        autoScale:    true,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      // scaleMargins must MATCH the leftPriceScale margins exactly.
      // With identical margins on both axes the padding is applied proportionally,
      // so left_range / right_range = ratio everywhere after margins are applied.
      rightPriceScale: {
        visible:      true,
        borderColor:  GRID_COLOR,
        autoScale:    true,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: GRID_COLOR,
        timeVisible: false,
        rightOffset: 4,
      },
      handleScale:  true,
      handleScroll: true,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      priceScaleId:     "right",
      upColor:          UP_COLOR,
      downColor:        DOWN_COLOR,
      borderUpColor:    UP_COLOR,
      borderDownColor:  DOWN_COLOR,
      wickUpColor:      UP_COLOR,
      wickDownColor:    DOWN_COLOR,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    // Volume histogram — bottom 15% of the pane, no axis label, coupled to price.
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceScaleId:     "volume",
      lastValueVisible: false,
      priceLineVisible: false,
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
      visible:      false,
    });

    // autoscaleInfoProvider is called every render frame by lightweight-charts to
    // determine the left axis range. We compute it from the visible price candles
    // multiplied by the ratio (initial_equity / initial_price), forcing the left
    // axis to mirror the right axis at all times — even when panning outside the
    // backtest window where the equity series has no data.
    const equityScaleProvider = () => {
      if (!ratioRef.current || allCandlesRef.current.length === 0) return null;
      const logicalRange = chart.timeScale().getVisibleLogicalRange();
      if (!logicalRange) return null;

      const from = Math.max(0, Math.floor(logicalRange.from));
      const to   = Math.min(allCandlesRef.current.length - 1, Math.ceil(logicalRange.to));
      if (from > to) return null;

      let minP = Infinity, maxP = -Infinity;
      const slice = allCandlesRef.current.slice(from, to + 1);
      for (const b of slice) {
        if (b.low  < minP) minP = b.low;
        if (b.high > maxP) maxP = b.high;
      }
      if (!isFinite(minP)) return null;

      // Return the raw proportional range — scaleMargins on the left axis
      // then adds the same 10% padding as the right axis, keeping them in sync.
      return {
        priceRange: {
          minValue: minP * ratioRef.current,
          maxValue: maxP * ratioRef.current,
        },
      };
    };

    const strategySeries = chart.addSeries(LineSeries, {
      priceScaleId:                   "left",
      color:                          STRATEGY_COLOR,
      lineWidth:                      2,
      priceLineVisible:               false,
      lastValueVisible:               true,
      crosshairMarkerVisible:         true,
      crosshairMarkerRadius:          4,
      crosshairMarkerBorderColor:     STRATEGY_COLOR,
      crosshairMarkerBackgroundColor: STRATEGY_COLOR,
      autoscaleInfoProvider:          equityScaleProvider,
    });

    const benchmarkSeries = chart.addSeries(LineSeries, {
      priceScaleId:                   "left",
      color:                          BENCHMARK_COLOR,
      lineWidth:                      2,
      lineStyle:                      LineStyle.Dashed,
      priceLineVisible:               false,
      lastValueVisible:               true,
      crosshairMarkerVisible:         true,
      crosshairMarkerRadius:          4,
      crosshairMarkerBorderColor:     BENCHMARK_COLOR,
      crosshairMarkerBackgroundColor: BENCHMARK_COLOR,
      autoscaleInfoProvider:          equityScaleProvider,
    });

    chartRef.current   = chart;
    candleRef.current  = candleSeries;
    volumeRef.current  = volumeSeries;
    stratRef.current   = strategySeries;
    benchRef.current   = benchmarkSeries;
    markersRef.current = createSeriesMarkers(candleSeries);

    // ── Crosshair subscription ──────────────────────────────────────────────
    chart.subscribeCrosshairMove((param) => {
      if (!param.point || !param.time) {
        setLegend(lastLegendRef.current);
        return;
      }

      type CandlePoint = { open: number; high: number; low: number; close: number };
      const candleData = param.seriesData.get(candleSeries)    as CandlePoint       | undefined;
      const stratData  = param.seriesData.get(strategySeries)  as { value: number } | undefined;
      const benchData  = param.seriesData.get(benchmarkSeries) as { value: number } | undefined;
      const volData    = param.seriesData.get(volumeSeries)    as { value: number } | undefined;

      if (!candleData) {
        setLegend(lastLegendRef.current);
        return;
      }

      setLegend({
        open:      fmt(candleData.open),
        high:      fmt(candleData.high),
        low:       fmt(candleData.low),
        close:     fmt(candleData.close),
        volume:    volData ? fmtVol(volData.value) : "—",
        bullish:   candleData.close >= candleData.open,
        strategy:  stratData ? fmt(stratData.value)  : null,
        benchmark: benchData ? fmt(benchData.value)  : null,
      });
    });

    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) chart.applyOptions({ width, height });
    });
    ro.observe(container);

    return () => { ro.disconnect(); chart.remove(); };
  }, []);

  // ── Imperative handle ───────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({

    // Full backtest result — overlay strategy/benchmark/markers; keep existing candles.
    setData: (data: any) => {
      if (!stratRef.current || !benchRef.current || !candleRef.current || !volumeRef.current) return;

      markersRef.current?.setMarkers([]);

      const candles: PreviewBar[] = data.price_data ?? [];

      // Compute ratio for the autoscaleInfoProvider.
      // initial_equity = first element of the equity curve = starting cash.
      // initial_price  = close of the first backtest bar.
      const initialEquity = (data.equity_curve?.simple ?? [])[0] ?? 0;
      const initialPrice  = candles[0]?.close ?? 1;
      if (initialEquity > 0 && initialPrice > 0) {
        ratioRef.current = initialEquity / initialPrice;
      }
      const timestamps = candles.map((b) => b.time as UTCTimestamp);

      // Only load candles/volume when no preview has been loaded yet.
      if (!hasPreviewRef.current) {
        candleRef.current.setData(
          candles.map((b) => ({
            time: b.time as UTCTimestamp,
            open: b.open, high: b.high, low: b.low, close: b.close,
          }))
        );
        volumeRef.current.setData(
          candles.map((b) => ({
            time:  b.time as UTCTimestamp,
            value: b.volume ?? 0,
            color: (b.close >= b.open) ? VOL_UP : VOL_DOWN,
          }))
        );
        setHasData(true);
      }

      stratRef.current.setData(
        (data.equity_curve?.simple ?? []).map((v: number, i: number) => ({
          time: timestamps[i], value: v,
        }))
      );
      benchRef.current.setData(
        (data.benchmark_curve ?? []).map((v: number, i: number) => ({
          time: timestamps[i], value: v,
        }))
      );

      if (Array.isArray(data.trades) && data.trades.length > 0 && markersRef.current) {
        const markers: SeriesMarker<UTCTimestamp>[] = data.trades.map(
          (t: { index: number; type: string }) => ({
            time:     timestamps[t.index] ?? timestamps[timestamps.length - 1],
            position: t.type === "buy" ? ("belowBar" as const) : ("aboveBar" as const),
            color:    t.type === "buy" ? BUY_MARKER : SELL_MARKER,
            shape:    t.type === "buy" ? ("arrowUp" as const) : ("arrowDown" as const),
            size:     2,
            text:     t.type === "buy" ? "B" : "S",
          })
        );
        markersRef.current.setMarkers(markers);
      }

      // Fix 3: Zoom to the backtest window with 3-bar padding on each side.
      // Padding is timeframe-agnostic: 3 × average bar duration in seconds.
      if (timestamps.length >= 2) {
        const avgBarDuration = Math.round(
          (timestamps[timestamps.length - 1] - timestamps[0]) / (timestamps.length - 1)
        );
        const pad = avgBarDuration * 3;
        chartRef.current?.timeScale().setVisibleRange({
          from: (timestamps[0]                      - pad) as UTCTimestamp,
          to:   (timestamps[timestamps.length - 1]  + pad) as UTCTimestamp,
        });
      }

      // Update legend fallback with final strategy/benchmark values.
      const eq    = data.equity_curve?.simple ?? [];
      const bench = data.benchmark_curve      ?? [];
      if (lastLegendRef.current) {
        lastLegendRef.current = {
          ...lastLegendRef.current,
          strategy:  eq.length    > 0 ? fmt(eq[eq.length - 1])       : null,
          benchmark: bench.length > 0 ? fmt(bench[bench.length - 1]) : null,
        };
        setLegend(lastLegendRef.current);
      }
    },

    // Live preview — full-history candles + volume; clears any strategy overlay.
    setPreviewData: (bars: PreviewBar[]) => {
      if (!candleRef.current || !stratRef.current || !benchRef.current || !volumeRef.current) return;

      // Store the full candle history so the autoscaleInfoProvider can look up
      // the visible price range even when the equity series has no data there.
      allCandlesRef.current = bars;
      // Reset ratio until a new backtest is run against this ticker/timeframe.
      ratioRef.current = null;

      markersRef.current?.setMarkers([]);
      stratRef.current.setData([]);
      benchRef.current.setData([]);

      candleRef.current.setData(
        bars.map((b) => ({
          time: b.time as UTCTimestamp,
          open: b.open, high: b.high, low: b.low, close: b.close,
        }))
      );
      volumeRef.current.setData(
        bars.map((b) => ({
          time:  b.time as UTCTimestamp,
          value: b.volume ?? 0,
          color: (b.close >= b.open) ? VOL_UP : VOL_DOWN,
        }))
      );

      if (bars.length > 0) {
        const last = bars[bars.length - 1];
        const leg: LegendData = {
          open:      fmt(last.open),
          high:      fmt(last.high),
          low:       fmt(last.low),
          close:     fmt(last.close),
          volume:    fmtVol(last.volume ?? 0),
          bullish:   last.close >= last.open,
          strategy:  null,
          benchmark: null,
        };
        lastLegendRef.current = leg;
        setLegend(leg);
      }

      hasPreviewRef.current = true;
      chartRef.current?.timeScale().fitContent();
      setHasData(true);
    },
  }));

  // ── Derived display ─────────────────────────────────────────────────────────
  const numClass = legend?.bullish === false ? "text-rose-400" : "text-emerald-400";

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
      {/* ── Header: Price + Strategy + Benchmark toggles ──────────────────── */}
      <div className="flex shrink-0 items-center justify-end gap-4 border-b border-zinc-800 px-4 py-2">
        {(["price", "strategy", "benchmark"] as const).map((key) => {
          const color =
            key === "price"    ? UP_COLOR :
            key === "strategy" ? STRATEGY_COLOR :
                                 BENCHMARK_COLOR;
          const label = key.charAt(0).toUpperCase() + key.slice(1);
          return (
            <button
              key={key}
              onClick={() => handleToggle(key)}
              className={`flex cursor-pointer items-center gap-1.5 text-xs text-zinc-400 transition-opacity duration-150 ${
                visibility[key] ? "opacity-100" : "opacity-30"
              }`}
            >
              <span
                className={`inline-block h-2.5 w-2.5 ${key === "price" ? "rounded-sm" : "rounded-full"}`}
                style={{ background: color }}
              />
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Chart canvas + overlays ───────────────────────────────────────── */}
      <div className="relative min-h-0 flex-1">
        <div ref={containerRef} className="h-full w-full" />

        {/* Empty state */}
        {!hasData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950">
            <div className="mb-3 rounded-full bg-zinc-800 p-4">
              <FiBarChart2 className="h-8 w-8 text-zinc-500" />
            </div>
            <p className="text-sm font-medium text-zinc-500">No performance data</p>
            <p className="mt-1 text-xs text-zinc-600">Run a backtest to see the equity curve</p>
          </div>
        )}

        {/* ── Fixed legend — offset right of the left axis (Fix 1) ─────── */}
        {hasData && legend && (
          <div className="pointer-events-none absolute left-20 top-2.5 z-10 flex flex-col gap-1 font-mono">
            {/* OHLCV row */}
            <div className="flex items-center gap-2.5 text-[10px]">
              <span className="text-zinc-500">
                O&nbsp;<span className={`tabular-nums ${numClass}`}>{legend.open}</span>
              </span>
              <span className="text-zinc-500">
                H&nbsp;<span className={`tabular-nums ${numClass}`}>{legend.high}</span>
              </span>
              <span className="text-zinc-500">
                L&nbsp;<span className={`tabular-nums ${numClass}`}>{legend.low}</span>
              </span>
              <span className="text-zinc-500">
                C&nbsp;<span className={`tabular-nums ${numClass}`}>{legend.close}</span>
              </span>
              {/* Vol shares visibility with price (Fix 2) */}
              {visibility.price && (
                <span className="text-zinc-500">
                  Vol&nbsp;<span className="tabular-nums text-zinc-400">{legend.volume}</span>
                </span>
              )}
            </div>

            {/* Strategy / Benchmark — only when overlay is active */}
            {(legend.strategy !== null || legend.benchmark !== null) && (
              <div className="flex flex-col gap-0.5 text-[10px]">
                {legend.strategy !== null && visibility.strategy && (
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: STRATEGY_COLOR }} />
                    <span className="text-zinc-500">Strategy</span>
                    <span className="tabular-nums text-zinc-200">{legend.strategy}</span>
                  </div>
                )}
                {legend.benchmark !== null && visibility.benchmark && (
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: BENCHMARK_COLOR }} />
                    <span className="text-zinc-500">Benchmark</span>
                    <span className="tabular-nums text-zinc-200">{legend.benchmark}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

Chart.displayName = "Chart";
export default Chart;
