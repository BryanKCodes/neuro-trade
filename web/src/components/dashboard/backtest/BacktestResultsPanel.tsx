"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import Chart, { ChartHandle, PreviewBar } from "@/components/dashboard/backtest/Chart";
import MetricsStrip from "@/components/dashboard/backtest/MetricsStrip";
import MetricsDrawer from "@/components/dashboard/backtest/MetricsDrawer";

export type BacktestResultsHandle = {
  setData:        (data: any) => void;
  setPreviewData: (bars: PreviewBar[]) => void;
};

const BacktestResultsPanel = forwardRef<BacktestResultsHandle>((_, ref) => {
  const chartRef = useRef<ChartHandle>(null);
  const [metricsData, setMetricsData] = useState<any>(null);
  const [drawerOpen, setDrawerOpen]   = useState(false);

  useImperativeHandle(ref, () => ({
    setData: (data: any) => {
      chartRef.current?.setData(data);
      setMetricsData(data.metrics);
    },
    setPreviewData: (bars: PreviewBar[]) => {
      chartRef.current?.setPreviewData(bars);
      // Clear stale metrics when the asset/timeframe changes.
      setMetricsData(null);
    },
  }));

  return (
    // relative + overflow-hidden establishes the positioning context for the
    // MetricsDrawer slide-up overlay and clips it to the panel boundary.
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      {/* Chart — fills all available vertical space */}
      <div className="min-h-0 flex-1 p-2 pb-1">
        <Chart ref={chartRef} />
      </div>

      {/* Slim KPI strip — always visible at the bottom */}
      <MetricsStrip
        metrics={metricsData}
        onOpenDetails={() => setDrawerOpen(true)}
      />

      {/* Full-details drawer — slides up from the bottom */}
      <MetricsDrawer
        metrics={metricsData}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
});

BacktestResultsPanel.displayName = "BacktestResultsPanel";
export default BacktestResultsPanel;
