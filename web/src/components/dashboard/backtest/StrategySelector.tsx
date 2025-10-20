"use client";

import { useState, forwardRef, useImperativeHandle, useEffect } from "react";
import { AiOutlineLineChart } from "react-icons/ai";
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
    <div className="flex items-center gap-1">
      <AiOutlineLineChart className="w-4 h-4 text-inherit" />
      {/* Left dropdown */}
      <select
        value={strategy || ""}
        onChange={(e) => setStrategy(e.target.value || null)}
        className="bg-transparent px-1 py-0 text-sm focus:outline-none"
      >
        <option value="Current">Current</option>
      </select>
      <span className="font-semibold">vs</span>
      {/* Right dropdown */}
      <select
        value={benchmark?.name}
        onChange={(e) => {
          const selected = strategiesData.strategies.find(
            (s: Strategy) => s.name === e.target.value
          );
          setBenchmark(selected || null);
        }}
        className="bg-transparent px-1 py-0 text-sm focus:outline-none"
      >
        {strategiesData.strategies.map((s: Strategy) => (
          <option key={s.name} value={s.name}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
});

StrategySelector.displayName = "StrategySelector";
export default StrategySelector;
