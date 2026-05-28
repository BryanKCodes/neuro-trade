"use client";

import { useState } from "react";

type StrategyRule = { trade: string; [key: string]: unknown };

type StrategyCardProps = {
  strategy: Record<string, unknown>;
};

const StrategyCard = ({ strategy }: StrategyCardProps) => {
  const [loaded, setLoaded] = useState(false);

  const rules = (strategy.rules as StrategyRule[] | undefined) ?? [];
  const ruleCount = rules.length;
  const tradeTypes = [...new Set(rules.map((r) => r.trade))].join(" / ");

  const handleUse = () => {
    localStorage.setItem("currentStrategy", JSON.stringify(strategy));
    setLoaded(true);
    setTimeout(() => setLoaded(false), 2500);
  };

  return (
    <div className="mt-2 flex items-center gap-2 rounded border border-accent-green/20 bg-accent-green/5 px-2.5 py-1.5">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-green" />
      <span className="font-mono text-[10px] text-accent-green/80">
        {ruleCount} rule{ruleCount !== 1 ? "s" : ""}
        {tradeTypes ? ` · ${tradeTypes}` : ""}
      </span>
      <div className="flex-1" />
      <button
        onClick={handleUse}
        className={`shrink-0 font-mono text-[10px] font-semibold uppercase tracking-wider transition-colors ${
          loaded
            ? "cursor-default text-accent-green/50"
            : "text-accent-green hover:text-accent-green/80"
        }`}
      >
        {loaded ? "Loaded ✓" : "Use →"}
      </button>
    </div>
  );
};

export default StrategyCard;
