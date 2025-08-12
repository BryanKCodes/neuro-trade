"use client";

import { useRef } from "react";
import { FaPlay } from "react-icons/fa"; // solid green triangle
import Divider from "@/components/Divider";
import AssetSelector, { AssetSelectorHandle } from "@/components/Backtest/AssetSelector";
import TimeframeSelector, { TimeframeSelectorHandle } from "@/components/Backtest/TimeframeSelector";
import DurationSelector, { DurationSelectorHandle } from "@/components/Backtest/DurationSelector";
import CashSelector, { CashSelectorHandle } from "@/components/Backtest/CashSelector";

export default function BacktestWidget() {
  const assetSelectorRef = useRef<AssetSelectorHandle>(null);
  const timeframeSelectorRef = useRef<TimeframeSelectorHandle>(null);
  const durationSelectorRef = useRef<DurationSelectorHandle>(null);
  const cashSelectorRef = useRef<CashSelectorHandle>(null);

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
        </div>

        {/* Right side: run button */}
        <button
          className="h-full pl-4 pr-3 rounded-md bg-transparent hover:bg-neutral-800 transition-colors"
          onClick={() => {
            console.log("Running backtest with current settings...");
            const asset = assetSelectorRef.current?.getData();
            const timeframe = timeframeSelectorRef.current?.getData();
            const duration = durationSelectorRef.current?.getData();
            const cash = cashSelectorRef.current?.getData();
            console.log({ asset, timeframe, duration, cash });
          }}
        >
          <FaPlay className="w-4 h-4 text-green-600" />
        </button>
      </div>
      <Divider isHorizontal={true} />

      {/* Placeholder Body */}
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Chart and metrics setup coming soon...
      </div>
    </div>
  );
}
