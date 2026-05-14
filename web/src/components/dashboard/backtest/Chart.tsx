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
const BG_COLOR        = "#111827"; // surface-card
const GRID_COLOR      = "#1F2D40"; // border-subtle
const TEXT_COLOR      = "#64748B"; // content-muted
const STRATEGY_COLOR  = "#3b82f6"; // accent-blue
const BENCHMARK_COLOR = "#f97316"; // accent-amber
const CROSSHAIR_COLOR = "#06B6D4"; // accent-cyan
const UP_COLOR        = "#10B981"; // accent-green
const DOWN_COLOR      = "#EF4444"; // accent-red

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
  x: number;
  y: number;
};

const Chart = forwardRef<ChartHandle>((_, ref) => {
  const containerRef   = useRef<HTMLDivElement>(null);
  const chartRef       = useRef<IChartApi | null>(null);
  const candleRef      = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const stratRef       = useRef<ISeriesApi<"Line"> | null>(null);
  const benchRef       = useRef<ISeriesApi<"Line"> | null>(null);
  const markersRef     = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const [hasData, setHasData] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    strategy: "",
    benchmark: "",
    open: "",
    high: "",
    low: "",
    close: "",
    x: 0,
    y: 0,
  });

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
      // Left axis: portfolio equity (strategy + benchmark)
      leftPriceScale: {
        visible: true,
        borderColor: GRID_COLOR,
      },
      // Right axis: asset price (candlestick)
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

    // Asset price on the right axis
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

    // Strategy equity on the left axis
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

    // Benchmark equity on the left axis
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
        visible: true,
        strategy:  stratData  ? fmt(stratData.value)  : "—",
        benchmark: benchData  ? fmt(benchData.value)  : "—",
        open:      candleData ? fmt(candleData.open)  : "—",
        high:      candleData ? fmt(candleData.high)  : "—",
        low:       candleData ? fmt(candleData.low)   : "—",
        close:     candleData ? fmt(candleData.close) : "—",
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

      stratRef.current.setData(buildTimeSeries(data.equity_curve.simple));
      benchRef.current.setData(buildTimeSeries(data.benchmark_curve));

      if (Array.isArray(data.price_data) && data.price_data.length > 0) {
        candleRef.current.setData(buildCandleSeries(data.price_data));
      }

      if (Array.isArray(data.trades) && data.trades.length > 0 && markersRef.current) {
        const markers: SeriesMarker<UTCTimestamp>[] = data.trades.map(
          (t: { index: number; type: string; price: number }) => ({
            time: (BASE_SECONDS + t.index * 86400) as UTCTimestamp,
            position: t.type === "buy" ? ("belowBar" as const) : ("aboveBar" as const),
            color: t.type === "buy" ? UP_COLOR : DOWN_COLOR,
            shape: t.type === "buy" ? ("arrowUp" as const) : ("arrowDown" as const),
            text: t.type === "buy" ? "Buy" : "Sell",
          })
        );
        markersRef.current.setMarkers(markers);
      }

      chartRef.current?.timeScale().fitContent();
      setHasData(true);
    },
  }));

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-4 py-2.5">
        <span className="text-sm font-semibold text-slate-100">Performance Overview</span>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: UP_COLOR }} />
            Price
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: STRATEGY_COLOR }} />
            Strategy
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: BENCHMARK_COLOR }} />
            Benchmark
          </span>
        </div>
      </div>

      {/* Chart container — always rendered so LWC can initialise */}
      <div className="relative min-h-0 flex-1">
        <div ref={containerRef} className="h-full w-full" />

        {/* Placeholder overlay before any data arrives */}
        {!hasData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900">
            <div className="mb-3 rounded-full bg-slate-800 p-4">
              <FiBarChart2 className="h-8 w-8 text-slate-500" />
            </div>
            <p className="text-sm font-medium text-slate-500">No performance data</p>
            <p className="mt-1 text-xs text-slate-600">Run a backtest to see the equity curve</p>
          </div>
        )}

        {/* Crosshair tooltip */}
        {tooltip.visible && hasData && (
          <div
            className="pointer-events-none absolute z-20 min-w-[160px] rounded-lg border border-slate-700 bg-slate-900/90 p-2.5 text-xs shadow-xl backdrop-blur-sm"
            style={{
              left: Math.min(tooltip.x + 14, (containerRef.current?.offsetWidth ?? 300) - 175),
              top: Math.max(tooltip.y - 100, 6),
            }}
          >
            {/* OHLC — only shown when price data is loaded */}
            {tooltip.open !== "—" && (
              <div className="mb-2 grid grid-cols-2 gap-x-3 gap-y-0.5 border-b border-slate-700 pb-2">
                <span className="text-slate-500">O</span>
                <span className="tabular-nums text-slate-300">{tooltip.open}</span>
                <span className="text-slate-500">H</span>
                <span className="tabular-nums text-slate-300">{tooltip.high}</span>
                <span className="text-slate-500">L</span>
                <span className="tabular-nums text-slate-300">{tooltip.low}</span>
                <span className="text-slate-500">C</span>
                <span className="tabular-nums text-slate-300">{tooltip.close}</span>
              </div>
            )}

            {/* Equity lines */}
            <div className="mb-1 flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: STRATEGY_COLOR }} />
                Strategy
              </span>
              <span className="font-semibold tabular-nums text-slate-100">{tooltip.strategy}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: BENCHMARK_COLOR }} />
                Benchmark
              </span>
              <span className="font-semibold tabular-nums text-slate-100">{tooltip.benchmark}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

Chart.displayName = "Chart";
export default Chart;
