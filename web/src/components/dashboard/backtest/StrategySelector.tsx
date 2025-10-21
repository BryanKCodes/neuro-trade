"use client";

import { useState, forwardRef, useImperativeHandle } from "react";
import { AiOutlineLineChart } from "react-icons/ai";
import Dropdown from "@/components/dashboard/backtest/Dropdown";
import strategiesData from "@/data/strategies.json";

export type StrategySelectorHandle = {
  getData: () => {
    strategy: string | null;
    benchmark: any | null;
  };
};

type Strategy = {
  name: string;
  json: any;
};

const StrategySelector = forwardRef<StrategySelectorHandle>((props, ref) => {
  const [strategy, setStrategy] = useState<string | null>("Current");
  const [benchmark, setBenchmark] = useState<Strategy | null>(
    strategiesData.strategies[0]
  );

  useImperativeHandle(ref, () => ({
    getData: () => {
      let strategyJson: any | null = null;

      if (strategy === "Current") {
        try {
          const saved = localStorage.getItem("currentStrategy");
          if (saved) strategyJson = JSON.parse(saved);
        } catch {
          strategyJson = null;
        }
      } else {
        // In future: handle user-saved strategies here
        strategyJson = null;
      }

      return {
        strategy: strategyJson,
        benchmark: benchmark?.json || null,
      };
    },
  }));

  return (
    <div className="flex h-full items-center gap-1 text-sm">
      <AiOutlineLineChart className="w-4 h-4 text-inherit mr-1" />
      {/* Left dropdown */}
      <Dropdown
        selected={strategy || ""}
        onSelect={(value) => setStrategy(value)}
        items={["Current"]}
        renderLabel={(v) => v}
      />

      <span className="font-semibold px-1">vs</span>

      {/* Right dropdown */}
      <Dropdown
        selected={benchmark?.name || ""}
        onSelect={(value) => setBenchmark(strategiesData.strategies.find((s: Strategy) => s.name === value) || null)}
        items={strategiesData.strategies.map((s: Strategy) => s.name)}
        renderLabel={(v) => v}
      />
    </div>
  );
});

StrategySelector.displayName = "StrategySelector";
export default StrategySelector;
