"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  createChart,
  LineSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { FiBarChart2 } from "react-icons/fi";

export type ChartHandle = {
  setData: (data: any) => void;
};

// Quant Dark palette
const BG_COLOR = "#111827";        // surface-card
const GRID_COLOR = "#1F2D40";      // border-subtle
const TEXT_COLOR = "#64748B";      // content-muted
const STRATEGY_COLOR = "#3b82f6";  // accent-blue
const BENCHMARK_COLOR = "#f97316"; // accent-amber
const CROSSHAIR_COLOR = "#06B6D4"; // accent-cyan

const BASE_SECONDS = Date.UTC(2020, 0, 1) / 1000;

function buildTimeSeries(values: number[]): { time: UTCTimestamp; value: number }[] {
  return values.map((value, i) => ({
    time: (BASE_SECONDS + i * 86400) as UTCTimestamp,
    value,
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
  x: number;
  y: number;
};

const Chart = forwardRef<ChartHandle>((_, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const stratRef = useRef<ISeriesApi<"Line"> | null>(null);
  const benchRef = useRef<ISeriesApi<"Line"> | null>(null);
  const [hasData, setHasData] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    strategy: "",
    benchmark: "",
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
      rightPriceScale: {
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

    const strategySeries = chart.addSeries(LineSeries, {
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

    chartRef.current = chart;
    stratRef.current = strategySeries;
    benchRef.current = benchmarkSeries;

    // Custom tooltip via crosshair subscription
    chart.subscribeCrosshairMove((param) => {
      if (!param.point || !param.time) {
        setTooltip((t) => ({ ...t, visible: false }));
        return;
      }
      const stratData = param.seriesData.get(strategySeries) as { value: number } | undefined;
      const benchData = param.seriesData.get(benchmarkSeries) as { value: number } | undefined;
      if (!stratData && !benchData) {
        setTooltip((t) => ({ ...t, visible: false }));
        return;
      }
      setTooltip({
        visible: true,
        strategy: stratData ? fmt(stratData.value) : "—",
        benchmark: benchData ? fmt(benchData.value) : "—",
        x: param.point.x,
        y: param.point.y,
      });
    });

    // ResizeObserver — keeps chart perfectly filling its container
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        chart.applyOptions({ width, height });
      }
    });
    ro.observe(container);

    // Cleanup: prevents memory leaks and duplicate charts on hot-reload
    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, []);

  useImperativeHandle(ref, () => ({
    setData: (data: any) => {
      if (!stratRef.current || !benchRef.current) return;
      stratRef.current.setData(buildTimeSeries(data.equity_curve.simple));
      benchRef.current.setData(buildTimeSeries(data.benchmark_curve));
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
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: STRATEGY_COLOR }}
            />
            Strategy
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: BENCHMARK_COLOR }}
            />
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
            className="pointer-events-none absolute z-20 min-w-[140px] rounded-lg border border-slate-700 bg-slate-900/90 p-2.5 text-xs shadow-xl backdrop-blur-sm"
            style={{
              left: Math.min(tooltip.x + 14, (containerRef.current?.offsetWidth ?? 300) - 155),
              top: Math.max(tooltip.y - 64, 6),
            }}
          >
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ background: STRATEGY_COLOR }}
                />
                Strategy
              </span>
              <span className="font-semibold tabular-nums text-slate-100">{tooltip.strategy}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ background: BENCHMARK_COLOR }}
                />
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
