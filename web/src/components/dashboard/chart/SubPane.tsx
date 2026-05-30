"use client";

import { useEffect, useRef } from "react";
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

function buildSubSeries(
  chart:   IChartApi,
  inst:    IndicatorInstance,
  typeDef: IndicatorTypeMeta,
  bars:    PreviewBar[],
  data:    IndicatorData,
): IndicatorSeries[] {
  const { uuid } = inst;
  const base = {
    priceLineVisible:       false,
    lastValueVisible:       false,
    crosshairMarkerVisible: false,
  } as const;

  switch (typeDef.render_type) {
    case "line": {
      const st = typeDef.series_styles[0];
      const s  = chart.addSeries(LineSeries, {
        ...base,
        color:     st.color,
        lineWidth: st.line_width as 1 | 2 | 3 | 4,
      });
      s.setData(toLinePoints(bars, data[uuid]));
      for (const level of typeDef.ref_lines) {
        s.createPriceLine({
          price:            level,
          color:            st.color + "80",
          lineWidth:        1,
          lineStyle:        LineStyle.Dashed,
          axisLabelVisible: false,
          title:            String(level),
        });
      }
      return [s];
    }

    case "histogram": {
      const st = typeDef.series_styles[0];
      const s  = chart.addSeries(HistogramSeries, { ...base, color: st.color });
      s.setData(toLinePoints(bars, data[uuid]));
      return [s];
    }

    case "multi_line": {
      return typeDef.series_styles.map((st) => {
        const s = chart.addSeries(LineSeries, {
          ...base,
          color:     st.color,
          lineWidth: st.line_width as 1 | 2 | 3 | 4,
        });
        s.setData(toLinePoints(bars, data[uuid + st.key_suffix]));
        return s;
      });
    }

    case "macd_composite": {
      return typeDef.series_styles.map((st) => {
        const key = uuid + st.key_suffix;
        if (st.series_type === "histogram") {
          const s = chart.addSeries(HistogramSeries, { ...base, color: st.color });
          s.setData(toLinePoints(bars, data[key]));
          return s;
        }
        const s = chart.addSeries(LineSeries, {
          ...base,
          color:     st.color,
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
      },
      // Time axis hidden — main chart's axis serves all panes.
      timeScale:    { visible: false, borderColor: GRID_COLOR },
      handleScale:  true,
      handleScroll: true,
    });

    if (typeDef.y_min !== null || typeDef.y_max !== null) {
      chart.priceScale("right").applyOptions({ autoScale: false });
    }

    chartRef.current = chart;

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Series update — runs when data changes ────────────────────────────────────
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    // Unregister from sync manager before removing series.
    unregisterRef.current?.();
    unregisterRef.current = null;

    // Remove old series — guard against undefined/stale handles.
    seriesRef.current.forEach((s) => {
      if (s) chart.removeSeries(s);
    });
    seriesRef.current = [];

    if (!bars.length) return;

    if (typeDef.y_min !== null || typeDef.y_max !== null) {
      chart.priceScale("right").applyOptions({
        autoScale: false,
        ...(typeDef.y_min !== null && { minimum: typeDef.y_min }),
        ...(typeDef.y_max !== null && { maximum: typeDef.y_max }),
      });
    }

    // Build new series, filtering out any unexpected undefined results.
    const newSeries = buildSubSeries(chart, instance, typeDef, bars, indicatorData)
      .filter((s): s is IndicatorSeries => s != null);
    seriesRef.current = newSeries;

    if (newSeries.length > 0) {
      unregisterRef.current = syncManager.register(chart, newSeries[0]);
    }
  }, [bars, indicatorData, instance, typeDef, syncManager]);

  // Derive the current value for the legend from the primary series key.
  const primaryKey   = instance.uuid + (typeDef.series_styles[0]?.key_suffix ?? "");
  const currentValue = lastValue(indicatorData, primaryKey);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="relative h-[140px] w-full shrink-0 border-t border-zinc-800">
      <div ref={containerRef} className="h-full w-full" />

      {/* Legend overlay — stacked vertically inside the pane, clears the right axis */}
      <div className="pointer-events-none absolute left-20 top-2 z-10 flex flex-col gap-1">
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
