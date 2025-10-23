"use client";

import { useRef } from "react";
import { FaPlay } from "react-icons/fa";
import Divider from "@/components/Divider";
import AssetSelector, { AssetSelectorHandle } from "@/components/dashboard/backtest/AssetSelector";
import TimeframeSelector, { TimeframeSelectorHandle } from "@/components/dashboard/backtest/TimeframeSelector";
import DurationSelector, { DurationSelectorHandle } from "@/components/dashboard/backtest/DurationSelector";
import CashSelector, { CashSelectorHandle } from "@/components/dashboard/backtest/CashSelector";
import StrategySelector, { StrategySelectorHandle } from "@/components/dashboard/backtest/StrategySelector";
import Chart, { ChartHandle } from "@/components/dashboard/backtest/Chart";
import Metrics, { MetricsHandle } from "@/components/dashboard/backtest/Metrics";

const BacktestWidget = () => {
  const assetSelectorRef = useRef<AssetSelectorHandle>(null);
  const timeframeSelectorRef = useRef<TimeframeSelectorHandle>(null);
  const durationSelectorRef = useRef<DurationSelectorHandle>(null);
  const cashSelectorRef = useRef<CashSelectorHandle>(null);
  const strategySelectorRef = useRef<StrategySelectorHandle>(null);
  const chartRef = useRef<ChartHandle>(null);
  const metricsRef = useRef<MetricsHandle>(null);

  async function handleRun() {
    const asset = assetSelectorRef.current?.getData();
    const timeframe = timeframeSelectorRef.current?.getData();
    const duration = durationSelectorRef.current?.getData();
    const cash = cashSelectorRef.current?.getData();
    const { strategy, benchmark } = strategySelectorRef.current?.getData() || {};

    const payload = { asset, timeframe, duration, cash, strategy, benchmark };

    try {
      const res = await fetch("/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      chartRef.current?.setData(data);
      metricsRef.current?.setData(data);
    } catch (err) {
      console.error("Backtest failed:", err);
    }
  }

  return (
    <div className="w-full h-full bg-white dark:bg-neutral-900 text-black dark:text-white p-1 border border-gray-300 dark:border-neutral-700 rounded shadow-sm">
      {/* Top Bar */}
      <div className="flex justify-between items-stretch gap-4 h-8">
        {/* Left side: selector group */}
        <div className="flex flex-wrap items-center">
          <AssetSelector ref={assetSelectorRef} />
          <Divider />
          <TimeframeSelector ref={timeframeSelectorRef} />
          <Divider />
          <DurationSelector ref={durationSelectorRef} />
          <Divider />
          <CashSelector ref={cashSelectorRef} />
          <Divider />
          <StrategySelector ref={strategySelectorRef} />
        </div>

        {/* Right side: run button */}
        <button
          className="h-full pl-4 pr-3 rounded-md bg-transparent hover:bg-neutral-800 transition-colors"
          onClick={handleRun}
        >
          <FaPlay className="w-4 h-4 text-green-600" />
        </button>
      </div>
      <Divider isHorizontal={true} />

      {/* Metrics Section */}
      <div className="flex flex-col h-[calc(100%-3.5rem)] gap-2 mx-3">
        <Chart ref={chartRef} />
        <Metrics ref={metricsRef} />
      </div>
    </div>
  );
}

export default BacktestWidget;
