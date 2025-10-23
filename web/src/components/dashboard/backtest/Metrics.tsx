"use client";

import { forwardRef, useImperativeHandle, useState, ReactNode } from "react";
import {
  FiTrendingUp,
  FiTrendingDown,
  FiBarChart,
  FiBarChart2,
  FiHash,
  FiActivity,
} from "react-icons/fi";

export type MetricsHandle = {
  setData: (data: any) => void;
};

// Utility function needed only for the comparison table
function formatNumberFull(input: any) {
  if (input == null) return "0.00";
  const str = String(input).trim();
  const hasDollar = str.includes("$");
  const hasPercent = str.includes("%");
  const numeric = parseFloat(str.replace(/[^0-9.-]/g, ""));
  if (isNaN(numeric)) return "0.00";
  let formatted = numeric.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  if (hasDollar) formatted = "$" + formatted;
  if (hasPercent) formatted = formatted + "%";
  return formatted;
}

const MetricItem = ({ label, value, icon, isPositive }: { label: string; value: string | number; icon?: ReactNode; isPositive?: boolean | null; }) => (
  <div className="group flex items-start gap-2.5 rounded-lg p-2.5 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800/50">
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 group-hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-slate-700 [&>svg]:h-4 [&>svg]:w-4">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">{label}</div>
      <div className={`text-base font-semibold ${isPositive === true ? 'text-emerald-600 dark:text-emerald-400' : isPositive === false ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-100'}`}>
        {value}
      </div>
    </div>
  </div>
);

const ComparisonTable = ({ data }: { data: any }) => (
  <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
    <table className="w-full text-left">
      <thead className="bg-slate-50 dark:bg-slate-800/50">
        <tr>
          <th className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Metric</th>
          <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">Strategy</th>
          <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">Benchmark</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
        {Object.entries(data).map(([metric, values]: any, index) => (
          <tr key={metric} className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/25'}`}>
            <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">{metric}</td>
            <td className="px-4 py-3 text-right text-sm font-medium text-slate-900 dark:text-slate-100">{formatNumberFull(values.Strategy) ?? "—"}</td>
            <td className="px-4 py-3 text-right text-sm font-medium text-slate-600 dark:text-slate-400">{formatNumberFull(values.Benchmark) ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Metrics = forwardRef<MetricsHandle>((_, ref) => {
  const [metricData, setMetricData] = useState<any>(null);

  useImperativeHandle(ref, () => ({
    setData: (data: any) => setMetricData(data.metrics),
  }));

  const getIconForMetric = (metricName: string) => {
    switch (metricName) {
      case "Trades Taken": return <FiHash />;
      case "Volatility": return <FiActivity />;
      case "Outperformance": return <FiBarChart2 />;
      case "Sharpe Ratio": return <FiTrendingUp />;
      case "Max Drawdown": return <FiTrendingDown />;
      default: return <FiBarChart />;
    }
  };

  const getMetricSentiment = (metricName: string, value: any): boolean | null => {
    const lowerCaseName = metricName.toLowerCase();
    const numericValue = parseFloat(String(value).replace(/[^0-9.-]/g, ""));
    if (isNaN(numericValue)) return null;
    if (lowerCaseName.includes("drawdown")) return numericValue > -10;
    if (lowerCaseName.includes("sharpe") || lowerCaseName.includes("return") || lowerCaseName.includes("cagr")) return numericValue > 0;
    return null;
  };

  // Only render the metrics grids. The placeholder can be removed if the parent handles it.
  if (!metricData) {
    return null; // Or a smaller, specific placeholder if desired
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Key Metrics
        </h3>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {Object.entries(metricData.Details).map(([key, value]) => (
            <MetricItem key={key} label={key} value={String(value)} icon={getIconForMetric(key)} isPositive={getMetricSentiment(key, value)} />
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <ComparisonTable data={metricData.Comparison} />
      </div>
    </div>
  );
});

export default Metrics;
