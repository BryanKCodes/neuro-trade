"use client";

import { useRef, useState, useEffect } from "react";
import { FiPlay, FiLoader } from "react-icons/fi";
import AssetSelector, {
  AssetSelectorHandle,
} from "@/components/dashboard/toolbar/AssetSelector";
import DurationSelector, {
  DurationSelectorHandle,
} from "@/components/dashboard/toolbar/DurationSelector";
import TimeframeSelector, {
  TimeframeSelectorHandle,
} from "@/components/dashboard/toolbar/TimeframeSelector";
import CashSelector, {
  CashSelectorHandle,
} from "@/components/dashboard/toolbar/CashSelector";
import StrategySelector, {
  StrategySelectorHandle,
} from "@/components/dashboard/toolbar/StrategySelector";
import IndicatorPicker from "@/components/dashboard/toolbar/IndicatorPicker";
import type { IndicatorTypeMeta } from "@/types/indicators";

type BacktestToolbarProps = {
  onResult:        (data: unknown) => void;
  onPreviewNeeded: (asset: string, timeframe: string) => void;
  indicatorMeta:   IndicatorTypeMeta[];
  onIndicatorSelected: (typeId: string) => void;
};

const Sep = () => (
  <div className="mx-0.5 h-5 w-px shrink-0 self-center bg-border-subtle" />
);

const BacktestToolbar = ({
  onResult,
  onPreviewNeeded,
  indicatorMeta,
  onIndicatorSelected,
}: BacktestToolbarProps) => {
  const [isRunning, setIsRunning] = useState(false);

  const assetRef     = useRef<AssetSelectorHandle>(null);
  const durationRef  = useRef<DurationSelectorHandle>(null);
  const timeframeRef = useRef<TimeframeSelectorHandle>(null);
  const cashRef      = useRef<CashSelectorHandle>(null);
  const strategyRef  = useRef<StrategySelectorHandle>(null);

  const getAsset     = () => assetRef.current?.getData()     ?? "AAPL";
  const getTimeframe = () => timeframeRef.current?.getData() ?? "1d";

  useEffect(() => {
    onPreviewNeeded(getAsset(), getTimeframe());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAssetChange = (asset: string) => {
    onPreviewNeeded(asset, getTimeframe());
  };

  const handleTimeframeChange = (timeframe: string) => {
    onPreviewNeeded(getAsset(), timeframe);
  };

  async function handleRun() {
    if (isRunning) return;

    const asset     = getAsset();
    const timeframe = getTimeframe();
    const duration  = durationRef.current?.getData();
    const cash      = cashRef.current?.getData();
    const { strategy, benchmark } = strategyRef.current?.getData() ?? {};

    setIsRunning(true);
    try {
      const res = await fetch("/api/backtest", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ asset, timeframe, duration, cash, strategy, benchmark }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onResult(await res.json());
    } catch (err) {
      console.error("Backtest failed:", err);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="flex h-10 shrink-0 items-stretch border-b border-border-subtle bg-surface-card px-1">
      <AssetSelector ref={assetRef} onChange={handleAssetChange} />
      <Sep />
      <DurationSelector ref={durationRef} />
      <Sep />
      <TimeframeSelector ref={timeframeRef} onChange={handleTimeframeChange} />
      <Sep />
      <CashSelector ref={cashRef} />
      <Sep />
      <IndicatorPicker
        meta={indicatorMeta}
        onSelect={onIndicatorSelected}
      />
      <Sep />

      <div className="flex min-w-0 flex-1 items-center">
        <StrategySelector ref={strategyRef} />
      </div>

      <button
        onClick={handleRun}
        disabled={isRunning}
        className="ml-2 mr-1 flex shrink-0 self-center items-center gap-1.5 rounded-md bg-accent-green/10 px-3 py-1.5 text-sm font-medium text-accent-green transition-colors hover:bg-accent-green/20 active:bg-accent-green/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isRunning ? (
          <FiLoader className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <FiPlay className="h-3.5 w-3.5" />
        )}
        <span>{isRunning ? "Running…" : "Run"}</span>
      </button>
    </div>
  );
};

export default BacktestToolbar;
