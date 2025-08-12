"use client";

import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import Header from "@/components/Header";
import ChartWidget from "@/components/Chart/ChartWidget";
import ChatWidget from "@/components/Chat/ChatWidget";
import BacktestWidget from "@/components/Backtest/BacktestWidget";
import Separator from "@/components/Seperator";

export default function Dashboard() {
  return (
    <div className="h-screen flex flex-col">
      <Header />
      <PanelGroup direction="horizontal" className="flex-1">
        {/* Left side: Chart & Backtest stacked vertically */}
        <Panel
          defaultSize={65}
          minSize={50}
          maxSize={85}
        >
          <PanelGroup direction="vertical">
            <Panel
              defaultSize={50}
              minSize={30}
              maxSize={70}
            >
              <div className="h-full w-full">
                <ChartWidget />
              </div>
            </Panel>
            <PanelResizeHandle>
              <Separator isHorizontal />
            </PanelResizeHandle>
            <Panel
              defaultSize={50}
              minSize={30}
              maxSize={70}
            >
              <div className="h-full w-full">
                <BacktestWidget />
              </div>
            </Panel>
          </PanelGroup>
        </Panel>

        <PanelResizeHandle>
          <Separator />
        </PanelResizeHandle>

        {/* Right side: Chat */}
        <Panel
          defaultSize={35}
          minSize={15}
          maxSize={50}
        >
          <div className="h-full w-full">
            <ChatWidget />
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}
