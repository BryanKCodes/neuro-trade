"use client";

import { useRef, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { FiBarChart2, FiGrid } from "react-icons/fi";
import Header from "@/components/dashboard/Header";
import ChartWidget from "@/components/dashboard/chart/ChartWidget";
import BacktestWidget from "@/components/dashboard/backtest/BacktestWidget";
import BacktestResultsPanel, {
  BacktestResultsHandle,
} from "@/components/dashboard/backtest/BacktestResultsPanel";
import ChatWidget from "@/components/dashboard/chat/ChatWidget";

type LeftTab = "chart" | "backtest";

const DashboardPage = () => {
  const [activeTab, setActiveTab] = useState<LeftTab>("chart");
  const resultsRef = useRef<BacktestResultsHandle>(null);

  const handleBacktestResult = (data: any) => {
    resultsRef.current?.setData(data);
    setActiveTab("backtest");
  };

  return (
    <div className="flex h-screen flex-col bg-surface-base text-content-primary">
      <Header />

      <PanelGroup direction="horizontal" className="min-h-0 flex-1">
        {/* ── Left column: tabbed view ───────────────────────── */}
        <Panel defaultSize={62} minSize={40}>
          <div className="flex h-full w-full flex-col p-2">
            {/* Tab bar */}
            <div className="flex shrink-0 items-end gap-0 border-b border-border-subtle">
              <TabButton
                label="Live Chart"
                icon={<FiBarChart2 className="h-3.5 w-3.5" />}
                isActive={activeTab === "chart"}
                onClick={() => setActiveTab("chart")}
              />
              <TabButton
                label="Backtest Results"
                icon={<FiGrid className="h-3.5 w-3.5" />}
                isActive={activeTab === "backtest"}
                onClick={() => setActiveTab("backtest")}
              />
            </div>

            {/* Tab content */}
            <div className="min-h-0 flex-1 overflow-hidden rounded-b-lg border border-t-0 border-border-subtle bg-surface-card">
              <div className={activeTab === "chart" ? "h-full w-full" : "hidden"}>
                <ChartWidget />
              </div>
              <div className={activeTab === "backtest" ? "h-full w-full" : "hidden"}>
                <BacktestResultsPanel ref={resultsRef} />
              </div>
            </div>
          </div>
        </Panel>

        <PanelResizeHandle className="w-px cursor-col-resize bg-border-subtle transition-colors hover:bg-accent-blue/50" />

        {/* ── Right column: config + chat ────────────────────── */}
        <Panel defaultSize={38} minSize={28} maxSize={52}>
          <div className="flex h-full w-full flex-col gap-2 p-2">
            <BacktestWidget onResult={handleBacktestResult} />
            <div className="min-h-0 flex-1">
              <ChatWidget />
            </div>
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
};

function TabButton({
  label,
  icon,
  isActive,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-t-md px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-wider transition-colors ${
        isActive
          ? "border border-b-0 border-border-subtle bg-surface-card text-content-primary"
          : "text-content-muted hover:text-content-primary"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export default DashboardPage;
