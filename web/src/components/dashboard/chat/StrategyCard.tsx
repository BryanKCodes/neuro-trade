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
  const tradeTypes = [...new Set(rules.map((r) => r.trade))].join(", ");

  const handleUse = () => {
    localStorage.setItem("currentStrategy", JSON.stringify(strategy));
    setLoaded(true);
    setTimeout(() => setLoaded(false), 2500);
  };

  return (
    <div className="mt-3 rounded-lg border border-accent-green/30 bg-accent-green/5 px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-green" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-accent-green">
              Strategy Generated
            </span>
          </div>
          <span className="font-mono text-[10px] text-content-muted">
            {ruleCount} rule{ruleCount !== 1 ? "s" : ""}
            {tradeTypes ? ` · ${tradeTypes}` : ""}
          </span>
        </div>

        <button
          onClick={handleUse}
          className={`shrink-0 rounded-md px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider transition-colors ${
            loaded
              ? "cursor-default bg-accent-green/20 text-accent-green"
              : "bg-accent-green/10 text-accent-green hover:bg-accent-green/20 active:bg-accent-green/30"
          }`}
        >
          {loaded ? "Loaded ✓" : "Use this Strategy"}
        </button>
      </div>
    </div>
  );
};

export default StrategyCard;
