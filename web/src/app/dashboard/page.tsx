"use client";

import { useEffect, useRef, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import Header from "@/components/dashboard/Header";
import BacktestToolbar from "@/components/dashboard/toolbar/BacktestToolbar";
import BacktestResultsPanel, {
  BacktestResultsHandle,
} from "@/components/dashboard/backtest/BacktestResultsPanel";
import ChatWidget from "@/components/dashboard/chat/ChatWidget";
import type { IndicatorTypeMeta } from "@/types/indicators";

const DashboardPage = () => {
  const resultsRef      = useRef<BacktestResultsHandle>(null);
  const previewAbortRef = useRef<AbortController | null>(null);

  const [indicatorMeta, setIndicatorMeta] = useState<IndicatorTypeMeta[]>([]);

  useEffect(() => {
    fetch("/api/indicators")
      .then((r) => r.json())
      .then(setIndicatorMeta)
      .catch((err) => console.error("Failed to load indicator metadata:", err));
  }, []);

  const handlePreviewNeeded = async (asset: string, timeframe: string) => {
    previewAbortRef.current?.abort();
    const controller = new AbortController();
    previewAbortRef.current = controller;

    try {
      const res = await fetch("/api/preview", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        // instances: [] until full IndicatorInstance wiring in the next batch
        body:    JSON.stringify({ asset, timeframe, instances: [] }),
        signal:  controller.signal,
      });
      if (!res.ok) return;
      const data = await res.json();
      resultsRef.current?.setPreviewData(data.bars, [], data.indicators ?? {});
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      console.error("Preview fetch failed:", err);
    }
  };

  const handleIndicatorSelected = (typeId: string) => {
    // Stub: full addInstance() wiring comes in the next batch
    console.debug("[IndicatorPicker] selected:", typeId);
  };

  return (
    <div className="flex h-screen flex-col bg-surface-base text-content-primary">
      <Header />
      <BacktestToolbar
        onResult={(data) => resultsRef.current?.setData(data)}
        onPreviewNeeded={handlePreviewNeeded}
        indicatorMeta={indicatorMeta}
        onIndicatorSelected={handleIndicatorSelected}
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
