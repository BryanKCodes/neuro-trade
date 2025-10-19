"use client";

import { useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import Header from "@/components/dashboard/Header";
import ChartWidget from "@/components/dashboard/chart/ChartWidget";
import ChatWidget from "@/components/dashboard/chat/ChatWidget";
import BacktestWidget from "@/components/dashboard/backtest/BacktestWidget";
import Separator from "@/components/Seperator";

export type View = "Chart" | "Backtest";

const DashboardPage = () => {
  const [activeView, setActiveView] = useState<View>("Chart");

  return (
    <div className="flex h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <Header activeView={activeView} setActiveView={setActiveView} />

      <PanelGroup direction="horizontal" className="flex-1">
        <Panel defaultSize={65} minSize={50}>
          <div className="h-full w-full p-2">
            
            {/* ChartWidget is always mounted, but hidden when not active */}
            <div className={activeView === "Chart" ? "h-full w-full" : "hidden"}>
              <ChartWidget />
            </div>

            {/* BacktestWidget is always mounted, but hidden when not active */}
            <div className={activeView === "Backtest" ? "h-full w-full" : "hidden"}>
              <BacktestWidget />
            </div>
            
          </div>
        </Panel>

        <PanelResizeHandle>
          <Separator />
        </PanelResizeHandle>

        <Panel defaultSize={35} minSize={25} maxSize={38}>
          <div className="h-full w-full p-2">
            <ChatWidget />
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}

export default DashboardPage;
