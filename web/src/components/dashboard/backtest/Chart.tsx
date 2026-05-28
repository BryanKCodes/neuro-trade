"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
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

export type ChartHandle = {
  setData: (data: any) => void;
};

// Quant Dark palette
const BG_COLOR        = "#111113"; // surface-card
const GRID_COLOR      = "#27272A"; // border-subtle
const TEXT_COLOR      = "#71717A"; // content-muted
const STRATEGY_COLOR  = "#3b82f6"; // accent-blue
const BENCHMARK_COLOR = "#f97316"; // accent-amber
const CROSSHAIR_COLOR = "#06B6D4"; // accent-cyan
const UP_COLOR        = "#10B981"; // accent-green
const DOWN_COLOR      = "#EF4444"; // accent-red
const BUY_MARKER      = "#34d399"; // Emerald 400 — pastel buy arrow
const SELL_MARKER     = "#fb7185"; // Rose 400 — pastel sell arrow

const BASE_SECONDS = Date.UTC(2020, 0, 1) / 1000;

function buildTimeSeries(values: number[]): { time: UTCTimestamp; value: number }[] {
  return values.map((value, i) => ({
    time: (BASE_SECONDS + i * 86400) as UTCTimestamp,
    value,
  }));
}

type OHLCBar = { open: number; high: number; low: number; close: number };

function buildCandleSeries(
  bars: OHLCBar[]
): { time: UTCTimestamp; open: number; high: number; low: number; close: number }[] {
  return bars.map((bar, i) => ({
    time: (BASE_SECONDS + i * 86400) as UTCTimestamp,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
  }));
}

function fmt(v: number): string {
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(2) + "M";
  if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(2) + "K";
  return v.toFixed(2);
}

type TooltipState = {
  visible: boolean;
  strategy: string;
  benchmark: string;
  open: string;
  high: string;
  low: string;
  close: string;
  // null = no candle data; true = bullish (close >= open); false = bearish
  bullish: boolean | null;
  x: number;
  y: number;
};

type Visibility = { price: boolean; strategy: boolean; benchmark: boolean };

const Chart = forwardRef<ChartHandle>((_, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);
  const candleRef    = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const stratRef     = useRef<ISeriesApi<"Line"> | null>(null);
  const benchRef     = useRef<ISeriesApi<"Line"> | null>(null);
  const markersRef   = useRef<ISeriesMarkersPluginApi<Time> | null>(null);

  const [hasData, setHasData] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>({ price: true, strategy: true, benchmark: true });
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    strategy: "",
    benchmark: "",
    open: "",
    high: "",
    low: "",
    close: "",
    bullish: null,
    x: 0,
    y: 0,
  });

  // Uses transparent color instead of visible:false so the left Y-axis scale
  // never rescales when a line is toggled off.
  const handleToggle = (key: keyof Visibility) => {
    const next = !visibility[key];
    setVisibility((prev) => ({ ...prev, [key]: next }));

    if (key === "price") {
      // Candlestick is on the right scale — visible:false is safe here.
      candleRef.current?.applyOptions({ visible: next });
    } else if (key === "strategy") {
      stratRef.current?.applyOptions({
        color:                        next ? STRATEGY_COLOR  : "transparent",
        lastValueVisible:             next,
        crosshairMarkerVisible:       next,
        crosshairMarkerBorderColor:   next ? STRATEGY_COLOR  : "transparent",
        crosshairMarkerBackgroundColor: next ? STRATEGY_COLOR : "transparent",
      });
    } else if (key === "benchmark") {
      benchRef.current?.applyOptions({
        color:                        next ? BENCHMARK_COLOR : "transparent",
        lastValueVisible:             next,
        crosshairMarkerVisible:       next,
        crosshairMarkerBorderColor:   next ? BENCHMARK_COLOR : "transparent",
        crosshairMarkerBackgroundColor: next ? BENCHMARK_COLOR : "transparent",
      });
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      width: container.offsetWidth,
      height: container.offsetHeight,
      layout: {
        background: { type: ColorType.Solid, color: BG_COLOR },
        textColor: TEXT_COLOR,
        fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: GRID_COLOR, style: LineStyle.Solid },
        horzLines: { color: GRID_COLOR, style: LineStyle.Solid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: CROSSHAIR_COLOR,
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: CROSSHAIR_COLOR,
        },
        horzLine: {
          color: CROSSHAIR_COLOR,
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: CROSSHAIR_COLOR,
        },
      },
      leftPriceScale: {
        visible: true,
        borderColor: GRID_COLOR,
      },
      rightPriceScale: {
        visible: true,
        borderColor: GRID_COLOR,
      },
      timeScale: {
        borderColor: GRID_COLOR,
        timeVisible: false,
        rightOffset: 4,
      },
      handleScale: true,
      handleScroll: true,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      priceScaleId: "right",
      upColor: UP_COLOR,
      downColor: DOWN_COLOR,
      borderUpColor: UP_COLOR,
      borderDownColor: DOWN_COLOR,
      wickUpColor: UP_COLOR,
      wickDownColor: DOWN_COLOR,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    const strategySeries = chart.addSeries(LineSeries, {
      priceScaleId: "left",
      color: STRATEGY_COLOR,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: STRATEGY_COLOR,
      crosshairMarkerBackgroundColor: STRATEGY_COLOR,
    });

    const benchmarkSeries = chart.addSeries(LineSeries, {
      priceScaleId: "left",
      color: BENCHMARK_COLOR,
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: BENCHMARK_COLOR,
      crosshairMarkerBackgroundColor: BENCHMARK_COLOR,
    });

    chartRef.current   = chart;
    candleRef.current  = candleSeries;
    stratRef.current   = strategySeries;
    benchRef.current   = benchmarkSeries;
    markersRef.current = createSeriesMarkers(candleSeries);

    chart.subscribeCrosshairMove((param) => {
      if (!param.point || !param.time) {
        setTooltip((t) => ({ ...t, visible: false }));
        return;
      }
      const stratData  = param.seriesData.get(strategySeries)  as { value: number } | undefined;
      const benchData  = param.seriesData.get(benchmarkSeries) as { value: number } | undefined;
      const candleData = param.seriesData.get(candleSeries)    as OHLCBar | undefined;

      if (!stratData && !benchData && !candleData) {
        setTooltip((t) => ({ ...t, visible: false }));
        return;
      }
      setTooltip({
        visible:   true,
        strategy:  stratData  ? fmt(stratData.value)  : "—",
        benchmark: benchData  ? fmt(benchData.value)  : "—",
        open:      candleData ? fmt(candleData.open)  : "—",
        high:      candleData ? fmt(candleData.high)  : "—",
        low:       candleData ? fmt(candleData.low)   : "—",
        close:     candleData ? fmt(candleData.close) : "—",
        bullish:   candleData ? candleData.close >= candleData.open : null,
        x: param.point.x,
        y: param.point.y,
      });
    });

    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) chart.applyOptions({ width, height });
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, []);

  useImperativeHandle(ref, () => ({
    setData: (data: any) => {
      if (!stratRef.current || !benchRef.current || !candleRef.current) return;

      // Wipe markers from any previous backtest before loading new data.
      markersRef.current?.setMarkers([]);

      stratRef.current.setData(buildTimeSeries(data.equity_curve.simple));
      benchRef.current.setData(buildTimeSeries(data.benchmark_curve));

      if (Array.isArray(data.price_data) && data.price_data.length > 0) {
        candleRef.current.setData(buildCandleSeries(data.price_data));
      }

      if (Array.isArray(data.trades) && data.trades.length > 0 && markersRef.current) {
        const markers: SeriesMarker<UTCTimestamp>[] = data.trades.map(
          (t: { index: number; type: string; price: number }) => ({
            time:     (BASE_SECONDS + t.index * 86400) as UTCTimestamp,
            position: t.type === "buy" ? ("belowBar" as const) : ("aboveBar" as const),
            color:    t.type === "buy" ? BUY_MARKER : SELL_MARKER,
            shape:    t.type === "buy" ? ("arrowUp" as const) : ("arrowDown" as const),
            size:     2,
            text:     t.type === "buy" ? "B" : "S",
          })
        );
        markersRef.current.setMarkers(markers);
      }

      chartRef.current?.timeScale().fitContent();
      setHasData(true);
    },
  }));

  const hasOhlc       = tooltip.visible && tooltip.bullish !== null;
  const ohlcNumClass  = tooltip.bullish ? "text-emerald-400" : "text-rose-400";
  const showTooltip   = tooltip.visible && hasData && (visibility.strategy || visibility.benchmark);

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-4 border-b border-zinc-800 px-4 py-2.5">
        {/* Title */}
        <span className="shrink-0 text-sm font-semibold text-zinc-100">Performance Overview</span>

        {/* OHLC bar — appears in-header on crosshair hover, colorized by candle direction */}
        {hasData && hasOhlc && (
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="text-zinc-500">
              O <span className={`tabular-nums ${ohlcNumClass}`}>{tooltip.open}</span>
            </span>
            <span className="text-zinc-500">
              H <span className={`tabular-nums ${ohlcNumClass}`}>{tooltip.high}</span>
            </span>
            <span className="text-zinc-500">
              L <span className={`tabular-nums ${ohlcNumClass}`}>{tooltip.low}</span>
            </span>
            <span className="text-zinc-500">
              C <span className={`tabular-nums ${ohlcNumClass}`}>{tooltip.close}</span>
            </span>
          </div>
        )}

        {/* Spacer — pushes legend to the right */}
        <div className="flex-1" />

        {/* Clickable legend chips */}
        <div className="flex items-center gap-4 text-xs text-zinc-400">
          <button
            onClick={() => handleToggle("price")}
            className={`flex cursor-pointer items-center gap-1.5 transition-opacity duration-150 ${visibility.price ? "opacity-100" : "opacity-30"}`}
          >
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: UP_COLOR }} />
            Price
          </button>
          <button
            onClick={() => handleToggle("strategy")}
            className={`flex cursor-pointer items-center gap-1.5 transition-opacity duration-150 ${visibility.strategy ? "opacity-100" : "opacity-30"}`}
          >
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: STRATEGY_COLOR }} />
            Strategy
          </button>
          <button
            onClick={() => handleToggle("benchmark")}
            className={`flex cursor-pointer items-center gap-1.5 transition-opacity duration-150 ${visibility.benchmark ? "opacity-100" : "opacity-30"}`}
          >
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: BENCHMARK_COLOR }} />
            Benchmark
          </button>
        </div>
      </div>

      {/* Chart canvas area */}
      <div className="relative min-h-0 flex-1">
        <div ref={containerRef} className="h-full w-full" />

        {/* Placeholder overlay before any data arrives */}
        {!hasData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950">
            <div className="mb-3 rounded-full bg-zinc-800 p-4">
              <FiBarChart2 className="h-8 w-8 text-zinc-500" />
            </div>
            <p className="text-sm font-medium text-zinc-500">No performance data</p>
            <p className="mt-1 text-xs text-zinc-600">Run a backtest to see the equity curve</p>
          </div>
        )}

        {/* Floating crosshair tooltip — only renders when at least one line is visible */}
        {showTooltip && (
          <div
            className="pointer-events-none absolute z-20 min-w-[140px] rounded-lg border border-zinc-700 bg-zinc-950/90 p-2.5 text-xs shadow-xl backdrop-blur-sm"
            style={{
              left: Math.min(tooltip.x + 15, (containerRef.current?.offsetWidth  ?? 300) - 155),
              top:  Math.min(tooltip.y + 15, (containerRef.current?.offsetHeight ?? 200) -  70),
            }}
          >
            <div className="flex flex-col gap-1">
              {visibility.strategy && (
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-zinc-400">
                    <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: STRATEGY_COLOR }} />
                    Strategy
                  </span>
                  <span className="font-semibold tabular-nums text-zinc-100">{tooltip.strategy}</span>
                </div>
              )}
              {visibility.benchmark && (
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-zinc-400">
                    <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: BENCHMARK_COLOR }} />
                    Benchmark
                  </span>
                  <span className="font-semibold tabular-nums text-zinc-100">{tooltip.benchmark}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

Chart.displayName = "Chart";
export default Chart;
