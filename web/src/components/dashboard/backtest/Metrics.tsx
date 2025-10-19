"use client";

import { forwardRef, useImperativeHandle, useState, ReactNode } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
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

function formatNumberAbbrev(input: any) {
  if (input == null) return "0.00";

  const str = String(input).trim();
  const hasDollar = str.includes("$");
  const hasPercent = str.includes("%");

  // Remove all non-numeric chars except decimal point and minus sign
  const numeric = parseFloat(str.replace(/[^0-9.-]/g, ""));

  if (isNaN(numeric)) return "0.00";

  let formatted: string;
  if (Math.abs(numeric) >= 1_000_000_000) {
    formatted = (numeric / 1_000_000_000).toFixed(2) + "B";
  } else if (Math.abs(numeric) >= 1_000_000) {
    formatted = (numeric / 1_000_000).toFixed(2) + "M";
  } else if (Math.abs(numeric) >= 1_000) {
    formatted = (numeric / 1_000).toFixed(2) + "K";
  } else {
    formatted = numeric.toFixed(2);
  }

  // Add back original symbols in the correct position
  if (hasDollar) formatted = "$" + formatted;
  if (hasPercent) formatted = formatted + "%";

  return formatted;
}

function formatNumberFull(input: any) {
  if (input == null) return "0.00";

  const str = String(input).trim();
  const hasDollar = str.includes("$");
  const hasPercent = str.includes("%");

  // Remove all non-numeric chars except decimal point and minus sign
  const numeric = parseFloat(str.replace(/[^0-9.-]/g, ""));

  if (isNaN(numeric)) return "0.00";

  // Format with proper decimal places and commas
  let formatted = numeric.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  });

  // Add back original symbols in the correct position
  if (hasDollar) formatted = "$" + formatted;
  if (hasPercent) formatted = formatted + "%";

  return formatted;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95">
        <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          Period {payload[0].payload.index}
        </p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: payload[0].color }} />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Strategy</span>
            </div>
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {formatNumberAbbrev(payload[0].value)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: payload[1].color }} />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Benchmark</span>
            </div>
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {formatNumberAbbrev(payload[1].value)}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const MetricItem = ({ 
  label, 
  value, 
  icon, 
  isPositive 
}: { 
  label: string; 
  value: string | number; 
  icon?: ReactNode; 
  isPositive?: boolean | null;
}) => (
  <div className="group flex items-start gap-2.5 rounded-lg p-2.5 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800/50">
    
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 group-hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-slate-700 [&>svg]:h-4 [&>svg]:w-4">
      {icon}
    </div>

    <div className="flex-1 min-w-0">
      <div className="text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">{label}</div>
      <div 
        className={`text-base font-semibold ${
          isPositive === true 
            ? 'text-emerald-600 dark:text-emerald-400' 
            : isPositive === false 
            ? 'text-red-600 dark:text-red-400'
            : 'text-slate-900 dark:text-slate-100'
        }`}
      >
        {value}
      </div>
    </div>
  </div>
);

const ComparisonTable = ({ data }: { data: any }) => {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="w-full text-left">
        <thead className="bg-slate-50 dark:bg-slate-800/50">
          <tr>
            <th className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
              Metric
            </th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">
              Strategy
            </th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">
              Benchmark
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {Object.entries(data).map(([metric, values]: any, index) => (
            <tr 
              key={metric} 
              className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/25'
              }`}
            >
              <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">
                {metric}
              </td>
              <td className="px-4 py-3 text-right text-sm font-medium text-slate-900 dark:text-slate-100">
                {formatNumberFull(values.Strategy) ?? "—"}
              </td>
              <td className="px-4 py-3 text-right text-sm font-medium text-slate-600 dark:text-slate-400">
                {formatNumberFull(values.Benchmark) ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const Metrics = forwardRef<MetricsHandle>((_, ref) => {
  const [metrics, setMetrics] = useState<any>(null);

  useImperativeHandle(ref, () => ({
    setData: (data: any) => setMetrics(data),
  }));

  if (!metrics) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 p-8 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-slate-200 p-4 dark:bg-slate-700">
              <FiBarChart2 className="h-8 w-8 text-slate-500 dark:text-slate-400" />
            </div>
          </div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            No metrics available
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
            Run a backtest to see performance analytics
          </p>
        </div>
      </div>
    );
  }

  const { equity_curve, benchmark_curve, metrics: metricData } = metrics;
  const chartData = equity_curve.map((v: number, i: number) => ({
    index: i,
    Strategy: v,
    Benchmark: benchmark_curve[i],
  }));

  const getIconForMetric = (metricName: string) => {
    switch (metricName) {
      case "Trades Taken": 
        return <FiHash />;
      case "Volatility": 
        return <FiActivity />;
      case "Outperformance": 
        return <FiBarChart2 />;
      case "Sharpe Ratio": 
        return <FiTrendingUp />;
      case "Max Drawdown": 
        return <FiTrendingDown />;
      default: 
        return <FiBarChart />;
    }
  };

  const getMetricSentiment = (metricName: string, value: any): boolean | null => {
    const lowerCaseName = metricName.toLowerCase();
    const numericValue = parseFloat(String(value).replace(/[^0-9.-]/g, ""));
    
    if (isNaN(numericValue)) return null;
    
    if (lowerCaseName.includes("drawdown")) return numericValue > -10; // Less negative is better
    if (lowerCaseName.includes("sharpe") || lowerCaseName.includes("return") || lowerCaseName.includes("cagr")) {
      return numericValue > 0;
    }
    return null;
  };

  return (
    <div className="flex h-full flex-col gap-4 p-3 min-h-0">
      {/* Chart Section - Top */}
      <div className="flex-1 flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 min-h-0">
        <div className="flex items-center justify-between p-4 pb-3 shrink-0">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Performance Overview
          </h2>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-500"></div>
              <span className="font-medium text-slate-600 dark:text-slate-400">Strategy</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-orange-500"></div>
              <span className="font-medium text-slate-600 dark:text-slate-400">Benchmark</span>
            </div>
          </div>
        </div>
        
        <div className="flex-1 px-4 pb-4 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                strokeOpacity={0.1} 
                stroke="currentColor"
              />
              <YAxis
                domain={[dataMin => dataMin * 0.98, dataMax => dataMax * 1.02]}
                tickFormatter={(val) => formatNumberAbbrev(val)}
                width={70}
                tick={{ fill: "currentColor", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                className="text-slate-600 dark:text-slate-400"
              />
              <XAxis
                dataKey="index"
                tick={{ fill: "currentColor", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                className="text-slate-600 dark:text-slate-400"
                interval="preserveStartEnd"
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="Strategy" 
                stroke="#3b82f6" 
                dot={false} 
                strokeWidth={2.5}
                activeDot={{ r: 4, fill: "#3b82f6" }}
              />
              <Line 
                type="monotone" 
                dataKey="Benchmark" 
                stroke="#f97316" 
                dot={false} 
                strokeWidth={2.5}
                activeDot={{ r: 4, fill: "#f97316" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Metrics Section - Bottom */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Key Metrics Box */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
            Key Metrics
          </h3>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {Object.entries(metricData.Details).map(([key, value]) => (
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

        {/* Strategy vs Benchmark Box */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <ComparisonTable data={metricData.Comparison} />
        </div>
      </div>
    </div>
  );
});

Metrics.displayName = "Metrics";
export default Metrics;