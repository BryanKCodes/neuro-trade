/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { FiChevronUp } from "react-icons/fi";

type Chip = {
  label: string;
  value: string;
  colorClass: string;
};

type MetricsStripProps = {
  metrics: any;
  onOpenDetails: () => void;
};

function parseSign(raw: string | null): "positive" | "negative" | "neutral" {
  if (!raw) return "neutral";
  const n = parseFloat(raw.replace(/[^0-9.-]/g, ""));
  if (isNaN(n)) return "neutral";
  return n >= 0 ? "positive" : "negative";
}

const MetricsStrip = ({ metrics, onOpenDetails }: MetricsStripProps) => {
  const totalReturn  = metrics?.Comparison?.["Cumulative Return"]?.Strategy ?? null;
  const winRate      = metrics?.Details?.["Win Rate"] ?? null;
  const maxDrawdown  = metrics?.Details?.["Max Drawdown"] ?? null;
  const trades       = metrics?.Details?.["Trades Taken"] ?? null;

  const returnSign   = parseSign(totalReturn);
  const drawdownSign = parseSign(maxDrawdown);

  const chips: Chip[] = [
    {
      label: "Return",
      value: totalReturn ?? "—",
      colorClass:
        totalReturn === null
          ? "text-content-muted"
          : returnSign === "positive"
          ? "text-emerald-400"
          : "text-red-400",
    },
    {
      label: "Win Rate",
      value: winRate ?? "—",
      colorClass: winRate === null ? "text-content-muted" : "text-content-primary",
    },
    {
      label: "Drawdown",
      value: maxDrawdown ?? "—",
      colorClass:
        maxDrawdown === null
          ? "text-content-muted"
          : drawdownSign === "negative"
          ? "text-red-400"
          : "text-emerald-400",
    },
    {
      label: "Trades",
      value: trades !== null ? String(trades) : "—",
      colorClass: trades === null ? "text-content-muted" : "text-content-primary",
    },
  ];

  return (
    <div className="flex h-9 shrink-0 items-center gap-5 border-t border-border-subtle bg-surface-card px-4">
      {chips.map((chip) => (
        <div key={chip.label} className="flex items-baseline gap-1.5">
          <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-content-muted">
            {chip.label}
          </span>
          <span className={`font-mono text-xs font-semibold tabular-nums ${chip.colorClass}`}>
            {chip.value}
          </span>
        </div>
      ))}

      <div className="flex-1" />

      <button
        onClick={onOpenDetails}
        disabled={!metrics}
        className="flex items-center gap-1 font-mono text-[9px] font-semibold uppercase tracking-widest text-content-muted transition-colors hover:text-content-primary disabled:cursor-default disabled:opacity-30"
      >
        Details
        <FiChevronUp className="h-3 w-3" />
      </button>
    </div>
  );
};

export default MetricsStrip;
