"use client";

import { useRef } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import Header from "@/components/dashboard/Header";
import BacktestToolbar from "@/components/dashboard/toolbar/BacktestToolbar";
import BacktestResultsPanel, {
  BacktestResultsHandle,
} from "@/components/dashboard/backtest/BacktestResultsPanel";
import ChatWidget from "@/components/dashboard/chat/ChatWidget";

const DashboardPage = () => {
  const resultsRef      = useRef<BacktestResultsHandle>(null);
  const previewAbortRef = useRef<AbortController | null>(null);

  const handlePreviewNeeded = async (asset: string, timeframe: string) => {
    previewAbortRef.current?.abort();
    const controller = new AbortController();
    previewAbortRef.current = controller;

    try {
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset, timeframe }),
        signal: controller.signal,
      });
      if (!res.ok) return;
      const data = await res.json();
      resultsRef.current?.setPreviewData(data.bars);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      console.error("Preview fetch failed:", err);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-surface-base text-content-primary">
      <Header />
      <BacktestToolbar
        onResult={(data) => resultsRef.current?.setData(data)}
        onPreviewNeeded={handlePreviewNeeded}
      />

      <PanelGroup direction="horizontal" className="min-h-0 flex-1">
        {/* ── Chart workspace ──────────────────────────────── */}
        <Panel defaultSize={65} minSize={40}>
          <div className="flex h-full w-full flex-col p-2">
            <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border-subtle bg-surface-card">
              <BacktestResultsPanel ref={resultsRef} />
            </div>
          </div>
        </Panel>

        <PanelResizeHandle className="w-px cursor-col-resize bg-border-subtle transition-colors hover:bg-accent-blue/50" />

        {/* ── AI Chat panel ─────────────────────────────────── */}
        <Panel defaultSize={35} minSize={24} maxSize={52}>
          <div className="flex h-full w-full flex-col p-2">
            <ChatWidget />
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
};

export default DashboardPage;
