"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import Chart, { ChartHandle } from "@/components/dashboard/backtest/Chart";
import Metrics, { MetricsHandle } from "@/components/dashboard/backtest/Metrics";

export type BacktestResultsHandle = {
  setData: (data: any) => void;
};

const BacktestResultsPanel = forwardRef<BacktestResultsHandle>((_, ref) => {
  const chartRef = useRef<ChartHandle>(null);
  const metricsRef = useRef<MetricsHandle>(null);

  useImperativeHandle(ref, () => ({
    setData: (data: any) => {
      chartRef.current?.setData(data);
      metricsRef.current?.setData(data);
    },
  }));

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto p-3 gap-4">
      <div className="min-h-[320px] flex-1 flex flex-col">
        <Chart ref={chartRef} />
      </div>
      <Metrics ref={metricsRef} />
    </div>
  );
});

BacktestResultsPanel.displayName = "BacktestResultsPanel";
export default BacktestResultsPanel;
