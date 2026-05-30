"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  HistogramSeries,
  LineSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import type {
  IndicatorData,
  IndicatorInstance,
  IndicatorTypeMeta,
  PreviewBar,
  SeriesStyleMeta,
} from "@/types/indicators";
import type { TimeSyncManager } from "@/lib/TimeSyncManager";
import ChartLegendItem from "@/components/dashboard/chart/ChartLegendItem";

// ─── Constants ────────────────────────────────────────────────────────────────

const BG_COLOR        = "#111113";
const GRID_COLOR      = "#27272A";
const TEXT_COLOR      = "#71717A";
const CROSSHAIR_COLOR = "#06B6D4";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function lastValue(
  indicatorData: IndicatorData,
  primaryKey: string,
): string | null {
  const arr = indicatorData[primaryKey];
  if (!arr) return null;
  for (let i = arr.length - 1; i >= 0; i--) {
    const v = arr[i];
    if (v !== null && v !== undefined) {
      return Math.abs(v) >= 1000 ? v.toFixed(0) : v.toFixed(2);
    }
  }
  return null;
}

type IndicatorSeries = ISeriesApi<"Line"> | ISeriesApi<"Histogram">;

function resolveColor(inst: IndicatorInstance, style: SeriesStyleMeta): string {
  return inst.colors?.[style.key_suffix] ?? style.color;
}

function buildSubSeries(
  chart:   IChartApi,
  inst:    IndicatorInstance,
  typeDef: IndicatorTypeMeta,
  bars:    PreviewBar[],
  data:    IndicatorData,
): IndicatorSeries[] {
  const { uuid } = inst;

  // Use autoscaleInfoProvider (the correct lw-charts v5 API) to enforce a fixed
  // Y range for indicators like RSI/ADX. This survives series teardown+rebuild
  // because the range is attached to each series, not to the price scale itself.
  // Using applyOptions({ autoScale: false, minimum, maximum }) does NOT work —
  // minimum/maximum are not valid PriceScaleOptions in lw-charts v5.
  const yRange =
    typeDef.y_min !== null && typeDef.y_max !== null
      ? {
          autoscaleInfoProvider: () => ({
            priceRange: {
              minValue: typeDef.y_min as number,
              maxValue: typeDef.y_max as number,
            },
          }),
        }
      : {};

  const base = {
    priceLineVisible:       false,
    lastValueVisible:       false,
    crosshairMarkerVisible: false,
  } as const;

  switch (typeDef.render_type) {
    case "line": {
      const st    = typeDef.series_styles[0];
      const color = resolveColor(inst, st);
      const s     = chart.addSeries(LineSeries, {
        ...base,
        ...yRange,
        color,
        lineWidth: st.line_width as 1 | 2 | 3 | 4,
      });
      s.setData(toLinePoints(bars, data[uuid]));
      for (const level of typeDef.ref_lines) {
        s.createPriceLine({
          price:            level,
          color:            color + "80",
          lineWidth:        1,
          lineStyle:        LineStyle.Dashed,
          axisLabelVisible: false,
          title:            String(level),
        });
      }
      return [s];
    }

    case "histogram": {
      const st    = typeDef.series_styles[0];
      const color = resolveColor(inst, st);
      const s     = chart.addSeries(HistogramSeries, { ...base, ...yRange, color });
      s.setData(toLinePoints(bars, data[uuid]));
      return [s];
    }

    case "multi_line": {
      return typeDef.series_styles.map((st) => {
        const color = resolveColor(inst, st);
        const s     = chart.addSeries(LineSeries, {
          ...base,
          ...yRange,
          color,
          lineWidth: st.line_width as 1 | 2 | 3 | 4,
        });
        s.setData(toLinePoints(bars, data[uuid + st.key_suffix]));
        return s;
      });
    }

    case "macd_composite": {
      return typeDef.series_styles.map((st) => {
        const key   = uuid + st.key_suffix;
        const color = resolveColor(inst, st);
        if (st.series_type === "histogram") {
          const s = chart.addSeries(HistogramSeries, { ...base, ...yRange, color });
          s.setData(toLinePoints(bars, data[key]));
          return s;
        }
        const s = chart.addSeries(LineSeries, {
          ...base,
          ...yRange,
          color,
          lineWidth: st.line_width as 1 | 2 | 3 | 4,
        });
        s.setData(toLinePoints(bars, data[key]));
        return s;
      });
    }

    default:
      return [];
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  instance:      IndicatorInstance;
  typeDef:       IndicatorTypeMeta;
  bars:          PreviewBar[];
  indicatorData: IndicatorData;
  syncManager:   TimeSyncManager;
  onSettings:    (instance: IndicatorInstance) => void;
  onRemove:      (uuid: string) => void;
};

const SubPane = ({
  instance,
  typeDef,
  bars,
  indicatorData,
  syncManager,
  onSettings,
  onRemove,
}: Props) => {
  const containerRef  = useRef<HTMLDivElement>(null);
  const chartRef      = useRef<IChartApi | null>(null);
  const seriesRef     = useRef<IndicatorSeries[]>([]);
  const unregisterRef = useRef<(() => void) | null>(null);

  // Sync latest props into refs so the crosshair handler (set up once in the
  // init effect) always reads the current instance/typeDef without stale closure.
  const instanceRef = useRef(instance);
  instanceRef.current = instance;
  const typeDefRef  = useRef(typeDef);
  typeDefRef.current = typeDef;

  // Live indicator values keyed by response-key; empty when crosshair is off.
  const [legendValues, setLegendValues] = useState<Record<string, string>>({});

  // ── Chart init — runs once on mount ──────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      width:  container.offsetWidth || 1,
      height: container.offsetHeight || 1,
      layout: {
        background: { type: ColorType.Solid, color: BG_COLOR },
        textColor:  TEXT_COLOR,
        fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
        fontSize:   11,
      },
      grid: {
        vertLines: { color: GRID_COLOR },
        horzLines: { color: GRID_COLOR },
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
      leftPriceScale:  { visible: false },
      rightPriceScale: {
        visible:      true,
        borderColor:  GRID_COLOR,
        autoScale:    true,
        scaleMargins: { top: 0.1, bottom: 0.1 },
        minimumWidth: 70,
      },
      // Time axis hidden — main chart's axis serves all panes.
      timeScale:    { visible: false, borderColor: GRID_COLOR, fixLeftEdge: true, fixRightEdge: true },
      handleScale:  true,
      handleScroll: true,
    });

    chartRef.current = chart;

    // ── Crosshair → live legend values ────────────────────────────────────────
    chart.subscribeCrosshairMove((param) => {
      if (!param.point || !param.time) {
        setLegendValues({});
        return;
      }
      const live: Record<string, string> = {};
      seriesRef.current.forEach((s, i) => {
        if (!s) return;
        const st = typeDefRef.current.series_styles[i];
        if (!st) return;
        const responseKey = instanceRef.current.uuid + st.key_suffix;
        const pt = param.seriesData.get(s) as { value: number } | undefined;
        if (pt?.value !== undefined) {
          live[responseKey] = Math.abs(pt.value) >= 1000
            ? pt.value.toFixed(0)
            : pt.value.toFixed(2);
        }
      });
      setLegendValues(live);
    });

    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) chart.applyOptions({ width, height });
    });
    ro.observe(container);

    return () => {
      // Clear series refs so the data effect never tries to remove stale handles
      // from a chart instance that's about to be destroyed.
      unregisterRef.current?.();
      unregisterRef.current = null;
      seriesRef.current     = [];
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  // ── Series update — runs whenever bars, data, instance, or typeDef change ─────
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    // Always unregister before tearing down series.
    unregisterRef.current?.();
    unregisterRef.current = null;

    // Tear down every existing series before rebuilding.
    seriesRef.current.forEach((s) => { if (s) chart.removeSeries(s); });
    seriesRef.current = [];

    // Nothing to draw without bar data.
    if (!bars.length) return;

    // Build and store the new series — filter guards against unexpected nulls.
    const newSeries = buildSubSeries(chart, instance, typeDef, bars, indicatorData)
      .filter((s): s is IndicatorSeries => s != null);
    seriesRef.current = newSeries;

    // Re-register with sync manager so time-scale stays locked to the main pane.
    if (newSeries.length > 0) {
      unregisterRef.current = syncManager.register(chart, newSeries[0]);
    }
  }, [bars, indicatorData, instance, typeDef, syncManager]);

  // Live crosshair value when hovering; falls back to last bar value.
  const primaryKey   = instance.uuid + (typeDef.series_styles[0]?.key_suffix ?? "");
  const currentValue = legendValues[primaryKey] ?? lastValue(indicatorData, primaryKey);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="relative h-[140px] min-h-[140px] w-full shrink-0 border-t border-zinc-800">
      <div ref={containerRef} className="h-full w-full" />

      {/* Legend overlay — top-left corner */}
      <div className="pointer-events-none absolute left-4 top-4 z-10 flex flex-col gap-1">
        <div className="pointer-events-auto">
          <ChartLegendItem
            instance={instance}
            typeDef={typeDef}
            currentValue={currentValue}
            onSettings={() => onSettings(instance)}
            onRemove={() => onRemove(instance.uuid)}
          />
        </div>
      </div>
    </div>
  );
};

export default SubPane;
