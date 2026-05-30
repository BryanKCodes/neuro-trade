"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
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
import type {
  IndicatorCatalogue,
  IndicatorData,
  IndicatorInstance,
  PreviewBar,
  SeriesStyleMeta,
} from "@/types/indicators";
import type { OhlcvData } from "@/components/dashboard/chart/ChartHeader";
import type { TimeSyncManager } from "@/lib/TimeSyncManager";
import ChartLegendItem from "@/components/dashboard/chart/ChartLegendItem";

// ─── Public types ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BacktestPayload = any;

export type MainPaneHandle = {
  setData:        (data: BacktestPayload) => void;
  setPreviewData: (
    bars:          PreviewBar[],
    instances:     IndicatorInstance[],
    catalogue:     IndicatorCatalogue,
    indicatorData: IndicatorData,
    preserveZoom:  boolean,
  ) => void;
  toggleSeries:   (key: "price" | "strategy" | "benchmark") => void;
};

type Props = {
  syncManager:   TimeSyncManager;
  onOhlcvUpdate: (ohlcv: OhlcvData | null) => void;
  // Main-pane indicator legend
  instances:     IndicatorInstance[];
  catalogue:     IndicatorCatalogue;
  indicatorData: IndicatorData;
  onSettings:    (instance: IndicatorInstance) => void;
  onRemove:      (uuid: string) => void;
};

type IndicatorSeries = ISeriesApi<"Line"> | ISeriesApi<"Histogram">;

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

function toLinePoints(
  bars: PreviewBar[],
  data: (number | null)[] | undefined,
): { time: UTCTimestamp; value: number }[] {
  if (!data) return [];
  return bars.flatMap((b, i) => {
    const v = data[i];
    return v !== null && v !== undefined
      ? [{ time: b.time as UTCTimestamp, value: v }]
      : [];
  });
}

// ─── Color resolution ─────────────────────────────────────────────────────────

function resolveColor(inst: IndicatorInstance, style: SeriesStyleMeta): string {
  return inst.colors?.[style.key_suffix] ?? style.color;
}

// ─── V2 main-pane indicator factory ──────────────────────────────────────────

function addMainIndicator(
  chart:     IChartApi,
  instance:  IndicatorInstance,
  typeDef:   IndicatorCatalogue[string],
  bars:      PreviewBar[],
  data:      IndicatorData,
): IndicatorSeries[] {
  const { uuid } = instance;
  const base = {
    priceScaleId:           "right",
    priceLineVisible:       false,
    lastValueVisible:       false,
    crosshairMarkerVisible: false,
  } as const;

  switch (typeDef.render_type) {
    case "line": {
      const st    = typeDef.series_styles[0];
      const color = resolveColor(instance, st);
      const s     = chart.addSeries(LineSeries, {
        ...base,
        color,
        lineWidth: st.line_width as 1 | 2 | 3 | 4,
        lineStyle: st.line_style === "dashed" ? LineStyle.Dashed : LineStyle.Solid,
      });
      s.setData(toLinePoints(bars, data[uuid]));
      return [s];
    }
    case "band": {
      return typeDef.series_styles.map((st) => {
        const color = resolveColor(instance, st);
        const s     = chart.addSeries(LineSeries, {
          ...base,
          color,
          lineWidth: st.line_width as 1 | 2 | 3 | 4,
          lineStyle: st.line_style === "dashed" ? LineStyle.Dashed : LineStyle.Solid,
        });
        s.setData(toLinePoints(bars, data[uuid + st.key_suffix]));
        return s;
      });
    }
    default:
      return [];
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

function lastValue(
  data: (number | null)[] | undefined,
): string | null {
  if (!data) return null;
  for (let i = data.length - 1; i >= 0; i--) {
    const v = data[i];
    if (v !== null && v !== undefined) {
      return Math.abs(v) >= 1000 ? v.toFixed(0) : v.toFixed(2);
    }
  }
  return null;
}

const MainPane = forwardRef<MainPaneHandle, Props>(
  ({ syncManager, onOhlcvUpdate, instances, catalogue, indicatorData, onSettings, onRemove }, ref) => {
    const containerRef    = useRef<HTMLDivElement>(null);
    const chartRef        = useRef<IChartApi | null>(null);
    const candleRef       = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const volumeRef       = useRef<ISeriesApi<"Histogram"> | null>(null);
    const stratRef        = useRef<ISeriesApi<"Line"> | null>(null);
    const benchRef        = useRef<ISeriesApi<"Line"> | null>(null);
    const markersRef      = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
    const activeSeriesRef  = useRef<Map<string, IndicatorSeries[]>>(new Map());
    // Maps each lw-charts series → its response key (uuid or uuid+suffix).
    // Read inside the crosshair handler (set up once) to get live legend values.
    const seriesKeyMapRef  = useRef<Map<IndicatorSeries, string>>(new Map());
    const hasPreviewRef    = useRef(false);
    const lastOhlcvRef    = useRef<OhlcvData | null>(null);
    const allCandlesRef   = useRef<PreviewBar[]>([]);
    const ratioRef        = useRef<number | null>(null);

    // Visibility refs — driven imperatively via toggleSeries; no re-render needed.
    const priceVisRef  = useRef(true);
    const stratVisRef  = useRef(true);
    const benchVisRef  = useRef(true);

    const [hasData,       setHasData]       = useState(false);
    // Live indicator values keyed by response-key; empty when crosshair is off-chart.
    const [legendValues,  setLegendValues]  = useState<Record<string, string>>({});

    // ── Chart init ─────────────────────────────────────────────────────────────
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
        leftPriceScale: { visible: false },
        rightPriceScale: {
          visible: true, borderColor: GRID_COLOR, autoScale: true,
          scaleMargins: { top: 0.1, bottom: 0.1 }, minimumWidth: 70,
        },
        timeScale: {
          borderColor: GRID_COLOR, timeVisible: false, rightOffset: 4,
          fixLeftEdge: true, fixRightEdge: true,
        },
        handleScale: true, handleScroll: true,
      });

      const candleSeries = chart.addSeries(CandlestickSeries, {
        priceScaleId:    "right",
        upColor:         UP_COLOR,   downColor:        DOWN_COLOR,
        borderUpColor:   UP_COLOR,   borderDownColor:  DOWN_COLOR,
        wickUpColor:     UP_COLOR,   wickDownColor:    DOWN_COLOR,
        priceLineVisible: false,     lastValueVisible: true,
      });

      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceScaleId: "volume", lastValueVisible: false, priceLineVisible: false,
      });
      volumeSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.85, bottom: 0 }, visible: false,
      });

      // Ratio-lock autoscale provider: keeps left (equity) axis proportional to right (price).
      const equityScaleProvider = () => {
        if (!ratioRef.current || allCandlesRef.current.length === 0) return null;
        const logicalRange = chart.timeScale().getVisibleLogicalRange();
        if (!logicalRange) return null;
        const from = Math.max(0, Math.floor(logicalRange.from));
        const to   = Math.min(allCandlesRef.current.length - 1, Math.ceil(logicalRange.to));
        if (from > to) return null;
        let minP = Infinity, maxP = -Infinity;
        for (const b of allCandlesRef.current.slice(from, to + 1)) {
          if (b.low  < minP) minP = b.low;
          if (b.high > maxP) maxP = b.high;
        }
        if (!isFinite(minP)) return null;
        return { priceRange: { minValue: minP * ratioRef.current, maxValue: maxP * ratioRef.current } };
      };

      const strategySeries = chart.addSeries(LineSeries, {
        priceScaleId: "left", color: STRATEGY_COLOR, lineWidth: 2,
        priceLineVisible: false, lastValueVisible: true,
        crosshairMarkerVisible: true, crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: STRATEGY_COLOR,
        crosshairMarkerBackgroundColor: STRATEGY_COLOR,
        autoscaleInfoProvider: equityScaleProvider,
      });

      const benchmarkSeries = chart.addSeries(LineSeries, {
        priceScaleId: "left", color: BENCHMARK_COLOR, lineWidth: 2,
        lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: true,
        crosshairMarkerVisible: true, crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: BENCHMARK_COLOR,
        crosshairMarkerBackgroundColor: BENCHMARK_COLOR,
        autoscaleInfoProvider: equityScaleProvider,
      });

      chartRef.current   = chart;
      candleRef.current  = candleSeries;
      volumeRef.current  = volumeSeries;
      stratRef.current   = strategySeries;
      benchRef.current   = benchmarkSeries;
      markersRef.current = createSeriesMarkers(candleSeries);

      // ── TimeSyncManager registration ─────────────────────────────────────────
      const unregisterSync = syncManager.register(chart, candleSeries);

      // ── Crosshair → OhlcvData + live legend values ───────────────────────────
      chart.subscribeCrosshairMove((param) => {
        if (!param.point || !param.time) {
          onOhlcvUpdate(lastOhlcvRef.current);
          setLegendValues({});
          return;
        }
        type CP = { open: number; high: number; low: number; close: number };
        const c = param.seriesData.get(candleSeries) as CP                   | undefined;
        const s = param.seriesData.get(strategySeries)  as { value: number } | undefined;
        const b = param.seriesData.get(benchmarkSeries) as { value: number } | undefined;
        const v = param.seriesData.get(volumeSeries)    as { value: number } | undefined;
        if (!c) { onOhlcvUpdate(lastOhlcvRef.current); setLegendValues({}); return; }

        const ohlcv: OhlcvData = {
          open:      fmt(c.open),
          high:      fmt(c.high),
          low:       fmt(c.low),
          close:     fmt(c.close),
          volume:    v ? fmtVol(v.value) : "—",
          bullish:   c.close >= c.open,
          strategy:  s ? fmt(s.value) : null,
          benchmark: b ? fmt(b.value) : null,
        };
        onOhlcvUpdate(ohlcv);

        // Update live indicator legend values from the crosshair position.
        const live: Record<string, string> = {};
        seriesKeyMapRef.current.forEach((responseKey, series) => {
          const pt = param.seriesData.get(series) as { value: number } | undefined;
          if (pt?.value !== undefined) {
            live[responseKey] = Math.abs(pt.value) >= 1000
              ? pt.value.toFixed(0)
              : pt.value.toFixed(2);
          }
        });
        setLegendValues(live);
      });

      // ── Resize observer ───────────────────────────────────────────────────────
      const ro = new ResizeObserver((entries) => {
        const { width, height } = entries[0].contentRect;
        if (width > 0 && height > 0) chart.applyOptions({ width, height });
      });
      ro.observe(container);

      return () => {
        unregisterSync();
        ro.disconnect();
        chart.remove();
      };
    // syncManager and onOhlcvUpdate are stable across renders — include for correctness.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Indicator helpers ───────────────────────────────────────────────────────

    const clearMainIndicators = () => {
      activeSeriesRef.current.forEach((list) =>
        list.forEach((s) => chartRef.current?.removeSeries(s))
      );
      activeSeriesRef.current.clear();
      seriesKeyMapRef.current.clear();
    };

    const applyMainIndicators = (
      instances:     IndicatorInstance[],
      catalogue:     IndicatorCatalogue,
      bars:          PreviewBar[],
      indicatorData: IndicatorData,
    ) => {
      clearMainIndicators();
      for (const inst of instances) {
        const typeDef = catalogue[inst.type_id];
        if (!typeDef || typeDef.pane !== "main" || !chartRef.current) continue;
        const added = addMainIndicator(chartRef.current, inst, typeDef, bars, indicatorData);
        if (added.length > 0) {
          activeSeriesRef.current.set(inst.uuid, added);
          // Map each series to its response key for the crosshair handler.
          typeDef.series_styles.forEach((st, i) => {
            const s = added[i];
            if (s) seriesKeyMapRef.current.set(s, inst.uuid + st.key_suffix);
          });
        }
      }
    };

    // ── Imperative handle ───────────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({

      setData: (data: BacktestPayload) => {
        if (!stratRef.current || !benchRef.current || !candleRef.current || !volumeRef.current) return;

        markersRef.current?.setMarkers([]);
        const candles: PreviewBar[] = data.price_data ?? [];

        const initialEquity = (data.equity_curve?.simple ?? [])[0] ?? 0;
        const initialPrice  = candles[0]?.close ?? 1;
        if (initialEquity > 0 && initialPrice > 0) {
          ratioRef.current = initialEquity / initialPrice;
        }
        const timestamps = candles.map((b) => b.time as UTCTimestamp);

        if (!hasPreviewRef.current) {
          candleRef.current.setData(
            candles.map((b) => ({
              time: b.time as UTCTimestamp,
              open: b.open, high: b.high, low: b.low, close: b.close,
            }))
          );
          volumeRef.current.setData(
            candles.map((b) => ({
              time: b.time as UTCTimestamp, value: b.volume ?? 0,
              color: b.close >= b.open ? VOL_UP : VOL_DOWN,
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

        if (timestamps.length >= 2) {
          const avgBar = Math.round(
            (timestamps[timestamps.length - 1] - timestamps[0]) / (timestamps.length - 1)
          );
          const pad = avgBar * 3;
          chartRef.current?.timeScale().setVisibleRange({
            from: (timestamps[0]                     - pad) as UTCTimestamp,
            to:   (timestamps[timestamps.length - 1] + pad) as UTCTimestamp,
          });
        }

        // Update header fallback with final equity values.
        const eq    = data.equity_curve?.simple ?? [];
        const bench = data.benchmark_curve      ?? [];
        if (lastOhlcvRef.current) {
          lastOhlcvRef.current = {
            ...lastOhlcvRef.current,
            strategy:  eq.length    > 0 ? fmt(eq[eq.length - 1])       : null,
            benchmark: bench.length > 0 ? fmt(bench[bench.length - 1]) : null,
          };
          onOhlcvUpdate(lastOhlcvRef.current);
        }
      },

      setPreviewData: (
        bars,
        instances,
        catalogue,
        indicatorData,
        preserveZoom,
      ) => {
        if (!candleRef.current || !stratRef.current || !benchRef.current || !volumeRef.current) return;

        // Save zoom window before any data changes (needed for preserveZoom=true).
        const savedRange = preserveZoom ? chartRef.current?.timeScale().getVisibleRange() : null;

        allCandlesRef.current = bars;
        ratioRef.current      = null;
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
            time: b.time as UTCTimestamp, value: b.volume ?? 0,
            color: b.close >= b.open ? VOL_UP : VOL_DOWN,
          }))
        );

        applyMainIndicators(instances, catalogue, bars, indicatorData);

        // Restore or reset zoom.
        if (savedRange) {
          chartRef.current?.timeScale().setVisibleRange(savedRange);
        } else {
          chartRef.current?.timeScale().fitContent();
        }

        if (bars.length > 0) {
          const last = bars[bars.length - 1];
          const ohlcv: OhlcvData = {
            open:      fmt(last.open),
            high:      fmt(last.high),
            low:       fmt(last.low),
            close:     fmt(last.close),
            volume:    fmtVol(last.volume ?? 0),
            bullish:   last.close >= last.open,
            strategy:  null,
            benchmark: null,
          };
          lastOhlcvRef.current = ohlcv;
          onOhlcvUpdate(ohlcv);
        }

        hasPreviewRef.current = true;
        setHasData(true);
      },

      toggleSeries: (key) => {
        if (key === "price") {
          priceVisRef.current = !priceVisRef.current;
          const v = priceVisRef.current;
          candleRef.current?.applyOptions({ visible: v });
          volumeRef.current?.applyOptions({ visible: v });
        } else if (key === "strategy") {
          stratVisRef.current = !stratVisRef.current;
          const v = stratVisRef.current;
          stratRef.current?.applyOptions({
            color:                          v ? STRATEGY_COLOR  : "transparent",
            lastValueVisible:               v,
            crosshairMarkerVisible:         v,
            crosshairMarkerBorderColor:     v ? STRATEGY_COLOR  : "transparent",
            crosshairMarkerBackgroundColor: v ? STRATEGY_COLOR  : "transparent",
          });
        } else {
          benchVisRef.current = !benchVisRef.current;
          const v = benchVisRef.current;
          benchRef.current?.applyOptions({
            color:                          v ? BENCHMARK_COLOR : "transparent",
            lastValueVisible:               v,
            crosshairMarkerVisible:         v,
            crosshairMarkerBorderColor:     v ? BENCHMARK_COLOR : "transparent",
            crosshairMarkerBackgroundColor: v ? BENCHMARK_COLOR : "transparent",
          });
        }
      },
    }));

    // ── Render ──────────────────────────────────────────────────────────────────
    return (
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div ref={containerRef} className="h-full w-full" />

        {!hasData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950">
            <div className="mb-3 rounded-full bg-zinc-800 p-4">
              <FiBarChart2 className="h-8 w-8 text-zinc-500" />
            </div>
            <p className="text-sm font-medium text-zinc-500">No performance data</p>
            <p className="mt-1 text-xs text-zinc-600">Run a backtest to see the equity curve</p>
          </div>
        )}

        {/* Indicator legend items — top-left corner */}
        {instances.length > 0 && (
          <div className="pointer-events-none absolute left-4 top-4 z-10 flex flex-col gap-1">
            {instances.map((inst) => {
              const typeDef = catalogue[inst.type_id];
              if (!typeDef) return null;
              const primaryKey = inst.uuid + (typeDef.series_styles[0]?.key_suffix ?? "");
              // Live crosshair value when hovering; falls back to last bar value.
              const value = legendValues[primaryKey] ?? lastValue(indicatorData[primaryKey]);
              return (
                <div key={inst.uuid} className="pointer-events-auto">
                  <ChartLegendItem
                    instance={inst}
                    typeDef={typeDef}
                    currentValue={value}
                    onSettings={() => onSettings(inst)}
                    onRemove={() => onRemove(inst.uuid)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
);

MainPane.displayName = "MainPane";
export default MainPane;
