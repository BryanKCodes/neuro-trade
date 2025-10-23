"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { FiBarChart2 } from "react-icons/fi";
import Dropdown from "@/components/dashboard/backtest/Dropdown";

// A specific handle for this component
export type ChartHandle = {
  setData: (data: any) => void;
};

// Define the available return types
type ReturnType = "Simple" | "Time-Weighted" | "Money-Weighted";
const RETURN_TYPES: ReturnType[] = ["Simple", "Time-Weighted", "Money-Weighted"];

// Utility function needed for the chart's Y-axis and tooltip
function formatNumberAbbrev(input: any) {
  if (input == null) return "0.00";
  const numeric = parseFloat(String(input).replace(/[^0-9.-]/g, ""));
  if (isNaN(numeric)) return "0.00";

  if (Math.abs(numeric) >= 1_000_000_000) return (numeric / 1_000_000_000).toFixed(2) + "B";
  if (Math.abs(numeric) >= 1_000_000) return (numeric / 1_000_000).toFixed(2) + "M";
  if (Math.abs(numeric) >= 1_000) return (numeric / 1_000).toFixed(2) + "K";
  return numeric.toFixed(2);
}

// The tooltip is only used by the chart, so it belongs here
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

const Chart = forwardRef<ChartHandle>((_, ref) => {
  const [chartData, setChartData] = useState<any[] | null>(null);
  const [returnType, setReturnType] = useState<ReturnType>("Simple");

  useImperativeHandle(ref, () => ({
    setData: (data: any) => {
      // This component only needs the equity curves
      const formattedData = data.equity_curve.simple.map((v: number, i: number) => ({
        index: i,
        Strategy: v,
        Benchmark: data.benchmark_curve[i],
      }));
      setChartData(formattedData);
    },
  }));

  if (!chartData) {
    // A placeholder specific to the chart
    return (
      <div className="flex flex-1 items-center justify-center rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 p-8 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-slate-200 p-4 dark:bg-slate-700">
              <FiBarChart2 className="h-8 w-8 text-slate-500 dark:text-slate-400" />
            </div>
          </div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            No performance data available
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
            Run a backtest to see the performance chart
          </p>
        </div>
      </div>
    );
  }

  return (
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
          <div className="flex items-center font-sm h-8">
            <Dropdown
              items={RETURN_TYPES}
              selected={returnType}
              onSelect={(value) => setReturnType(value as ReturnType)}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 pb-4 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} stroke="currentColor" />
            <YAxis
              domain={['dataMin * 0.98', 'dataMax * 1.02']}
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
            <Line type="monotone" dataKey="Strategy" stroke="#3b82f6" dot={false} strokeWidth={2.5} activeDot={{ r: 4, fill: "#3b82f6" }} />
            <Line type="monotone" dataKey="Benchmark" stroke="#f97316" dot={false} strokeWidth={2.5} activeDot={{ r: 4, fill: "#f97316" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

export default Chart;
