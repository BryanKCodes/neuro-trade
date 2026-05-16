"use client";

import { useRef, useState } from "react";
import { FiGrid, FiPlay, FiChevronDown } from "react-icons/fi";
import AssetSelector, {
  AssetSelectorHandle,
} from "@/components/dashboard/backtest/AssetSelector";
import TimeframeSelector, {
  TimeframeSelectorHandle,
} from "@/components/dashboard/backtest/TimeframeSelector";
import DurationSelector, {
  DurationSelectorHandle,
} from "@/components/dashboard/backtest/DurationSelector";
import CashSelector, {
  CashSelectorHandle,
} from "@/components/dashboard/backtest/CashSelector";
import StrategySelector, {
  StrategySelectorHandle,
} from "@/components/dashboard/backtest/StrategySelector";

type BacktestWidgetProps = {
  onResult: (data: unknown) => void;
};

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-content-muted">
    {children}
  </span>
);

const FieldBox = ({ children }: { children: React.ReactNode }) => (
  <div className="relative flex h-8 items-center rounded-md border border-border-subtle bg-surface-raised px-1">
    {children}
  </div>
);

const BacktestWidget = ({ onResult }: BacktestWidgetProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const assetSelectorRef = useRef<AssetSelectorHandle>(null);
  const timeframeSelectorRef = useRef<TimeframeSelectorHandle>(null);
  const durationSelectorRef = useRef<DurationSelectorHandle>(null);
  const cashSelectorRef = useRef<CashSelectorHandle>(null);
  const strategySelectorRef = useRef<StrategySelectorHandle>(null);

  async function handleRun() {
    const asset = assetSelectorRef.current?.getData();
    const timeframe = timeframeSelectorRef.current?.getData();
    const duration = durationSelectorRef.current?.getData();
    const cash = cashSelectorRef.current?.getData();
    const { strategy, benchmark } =
      strategySelectorRef.current?.getData() || {};

    const payload = { asset, timeframe, duration, cash, strategy, benchmark };

    try {
      const res = await fetch("/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      onResult(data);
    } catch (err) {
      console.error("Backtest failed:", err);
    }
  }

  return (
    <div className="flex shrink-0 flex-col rounded-lg border border-border-subtle bg-surface-card">
      {/* Panel header — always visible */}
      <div className="flex items-center justify-between border-b border-border-subtle px-3 py-2">
        <div className="flex items-center gap-2">
          <FiGrid className="h-3.5 w-3.5 text-accent-blue" />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-content-muted">
            Backtest Engine
          </span>
        </div>
        <button
          onClick={() => setIsCollapsed((c) => !c)}
          aria-label={isCollapsed ? "Expand Backtest Engine" : "Collapse Backtest Engine"}
          className="rounded p-0.5 text-content-muted transition-colors hover:text-content-primary"
        >
          <FiChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-200 ${
              isCollapsed ? "-rotate-90" : ""
            }`}
          />
        </button>
      </div>

      {/* Collapsible body */}
      {!isCollapsed && (
        <>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 p-3">
            <div className="flex flex-col gap-1">
              <FieldLabel>Asset</FieldLabel>
              <FieldBox>
                <AssetSelector ref={assetSelectorRef} />
              </FieldBox>
            </div>

            <div className="flex flex-col gap-1">
              <FieldLabel>Capital</FieldLabel>
              <FieldBox>
                <CashSelector ref={cashSelectorRef} />
              </FieldBox>
            </div>

            <div className="flex flex-col gap-1">
              <FieldLabel>Duration</FieldLabel>
              <FieldBox>
                <DurationSelector ref={durationSelectorRef} />
              </FieldBox>
            </div>

            <div className="flex flex-col gap-1">
              <FieldLabel>Timeframe</FieldLabel>
              <FieldBox>
                <TimeframeSelector ref={timeframeSelectorRef} />
              </FieldBox>
            </div>

            <div className="col-span-2 flex flex-col gap-1">
              <FieldLabel>Strategy</FieldLabel>
              <FieldBox>
                <StrategySelector ref={strategySelectorRef} />
              </FieldBox>
            </div>
          </div>

          <div className="border-t border-border-subtle px-3 pb-3 pt-2">
            <button
              className="flex w-full items-center justify-center gap-2 rounded-md bg-accent-green/10 py-2 font-mono text-xs font-semibold text-accent-green transition-colors hover:bg-accent-green/20 active:bg-accent-green/30"
              onClick={handleRun}
            >
              <FiPlay className="h-3 w-3" />
              RUN BACKTEST
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default BacktestWidget;
