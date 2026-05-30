/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { ReactNode } from "react";
import {
  FiTrendingUp,
  FiTrendingDown,
  FiBarChart,
  FiBarChart2,
  FiHash,
  FiActivity,
} from "react-icons/fi";

// Accepts a metrics object directly — no longer uses forwardRef/useImperativeHandle.
type MetricsProps = {
  metrics: any;
};

function formatNumberFull(input: any) {
  if (input == null) return "0.00";
  const str = String(input).trim();
  const hasDollar = str.includes("$");
  const hasPercent = str.includes("%");
  const numeric = parseFloat(str.replace(/[^0-9.-]/g, ""));
  if (isNaN(numeric)) return "0.00";
  let formatted = numeric.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
  if (hasDollar) formatted = "$" + formatted;
  if (hasPercent) formatted = formatted + "%";
  return formatted;
}

const MetricItem = ({
  label,
  value,
  icon,
  isPositive,
}: {
  label: string;
  value: string | number;
  icon?: ReactNode;
  isPositive?: boolean | null;
}) => (
  <div className="group flex items-start gap-2.5 rounded-lg p-2.5 transition-all duration-200 hover:bg-zinc-800/60">
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700 [&>svg]:h-4 [&>svg]:w-4">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-xs font-medium text-zinc-400 whitespace-nowrap">{label}</div>
      <div
        className={`text-base font-semibold ${
          isPositive === true
            ? "text-emerald-400"
            : isPositive === false
            ? "text-red-400"
            : "text-zinc-100"
        }`}
      >
        {value}
      </div>
    </div>
  </div>
);

const ComparisonTable = ({ data }: { data: any }) => (
  <div className="overflow-hidden rounded-lg border border-zinc-800">
    <table className="w-full text-left">
      <thead className="bg-zinc-800/50">
        <tr>
          <th className="px-4 py-3 text-sm font-semibold text-zinc-100">Metric</th>
          <th className="px-4 py-3 text-right text-sm font-semibold text-zinc-100">Strategy</th>
          <th className="px-4 py-3 text-right text-sm font-semibold text-zinc-100">Benchmark</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-800">
        {Object.entries(data).map(([metric, values]: any, index) => (
          <tr
            key={metric}
            className={`transition-colors hover:bg-zinc-800/60 ${
              index % 2 === 0 ? "bg-zinc-900" : "bg-zinc-800/25"
            }`}
          >
            <td className="px-4 py-3 text-sm font-medium text-zinc-100">{metric}</td>
            <td className="px-4 py-3 text-right text-sm font-medium text-zinc-100">
              {formatNumberFull(values.Strategy) ?? "—"}
            </td>
            <td className="px-4 py-3 text-right text-sm font-medium text-zinc-400">
              {formatNumberFull(values.Benchmark) ?? "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

function getIconForMetric(metricName: string) {
  switch (metricName) {
    case "Trades Taken":   return <FiHash />;
    case "Volatility":     return <FiActivity />;
    case "Outperformance": return <FiBarChart2 />;
    case "Sharpe Ratio":   return <FiTrendingUp />;
    case "Max Drawdown":   return <FiTrendingDown />;
    default:               return <FiBarChart />;
  }
}

function getMetricSentiment(metricName: string, value: any): boolean | null {
  const lower = metricName.toLowerCase();
  const num = parseFloat(String(value).replace(/[^0-9.-]/g, ""));
  if (isNaN(num)) return null;
  if (lower.includes("drawdown")) return num > -10;
  if (lower.includes("sharpe") || lower.includes("return") || lower.includes("cagr"))
    return num > 0;
  return null;
}

const Metrics = ({ metrics }: MetricsProps) => {
  if (!metrics) return null;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-zinc-100">Key Metrics</h3>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {Object.entries(metrics.Details).map(([key, value]) => (
            <MetricItem
              key={key}
              label={key}
              value={String(value)}
              icon={getIconForMetric(key)}
              isPositive={getMetricSentiment(key, value)}
            />
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 shadow-sm">
        <ComparisonTable data={metrics.Comparison} />
      </div>
    </div>
  );
};

export default Metrics;
