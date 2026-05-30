"use client";

import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { AiOutlineLineChart } from "react-icons/ai";
import { Timestamp } from "firebase/firestore";
import Dropdown from "@/components/dashboard/toolbar/Dropdown";
import { useUser } from "@/contexts/UserContext";
import strategiesData from "@/data/strategies.json";

export type StrategySelectorHandle = {
  getData: () => {
    strategy: string | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    benchmark: any | null;
  };
};

type Strategy = {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  json: any;
  lastUsed: Timestamp | null;
};

const StrategySelector = forwardRef<StrategySelectorHandle>((_, ref) => {
  const { userData } = useUser(); // from UserContext
  const [strategy, setStrategy] = useState<string | null>("Current");
  const [benchmark, setBenchmark] = useState<Strategy | null>(null);
  const [userStrategies, setUserStrategies] = useState<Strategy[]>([]);
  const [staticStrategies, setStaticStrategies] = useState<Strategy[]>([]);

  // Setup benchmarks from constants
  useEffect(() => {
    const staticBenchmarks: Strategy[] = strategiesData.strategies.map((s) => ({
      ...s,
      lastUsed: null,
    }));
    setStaticStrategies(staticBenchmarks);
    setBenchmark(staticBenchmarks[0]);
  }, []);

  // Pull user strategies from UserContext
  useEffect(() => {
    if (!userData?.strategies) return;

    const strategies: Strategy[] = Object.entries(userData.strategies).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ([name, data]: [string, any]) => ({
        name,
        json: data.json,
        lastUsed: data.lastUsed || null,
      })
    );

    // Sort by recency, fallback lexicographically
    strategies.sort((a, b) => {
      if (!a.lastUsed && !b.lastUsed) return a.name.localeCompare(b.name);
      if (!a.lastUsed) return 1;
      if (!b.lastUsed) return -1;
      return b.lastUsed.toMillis() - a.lastUsed.toMillis();
    });

    setUserStrategies(strategies);
  }, [userData]);

  // Expose strategy + benchmark data to parent
  useImperativeHandle(ref, () => ({
    getData: () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let strategyJson: any | null = null;

      if (strategy === "Current") {
        try {
          const saved = localStorage.getItem("currentStrategy");
          if (saved) strategyJson = JSON.parse(saved);
        } catch {
          strategyJson = null;
        }
      } else {
        const selected = userStrategies.find((s) => s.name === strategy);
        strategyJson = selected?.json || null;
      }

      return {
        strategy: strategyJson,
        benchmark: benchmark?.json || null,
      };
    },
  }));

  const strategyItems = ["Current", ...userStrategies.map((s) => s.name)];
  const benchmarkItems = staticStrategies.map((s) => s.name);

  return (
    <div className="flex h-full items-center gap-1 text-sm text-content-primary">
      <AiOutlineLineChart className="w-4 h-4 text-content-muted mr-1" />

      {/* Left dropdown: user strategies */}
      <Dropdown
        selected={strategy || ""}
        onSelect={(value) => setStrategy(value)}
        items={strategyItems}
        renderLabel={(v) => v}
        align="left"
      />

      <span className="font-semibold px-1">vs</span>

      {/* Right dropdown: benchmarks */}
      <Dropdown
        selected={benchmark?.name || ""}
        onSelect={(value) =>
          setBenchmark(staticStrategies.find((s) => s.name === value) || null)
        }
        items={benchmarkItems}
        renderLabel={(v) => v}
      />
    </div>
  );
});

StrategySelector.displayName = "StrategySelector";
export default StrategySelector;
