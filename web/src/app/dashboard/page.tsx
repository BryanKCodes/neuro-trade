"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import Header from "@/components/dashboard/Header";
import BacktestToolbar from "@/components/dashboard/toolbar/BacktestToolbar";
import BacktestResultsPanel, {
  type BacktestResultsHandle,
} from "@/components/dashboard/backtest/BacktestResultsPanel";
import ChatWidget from "@/components/dashboard/chat/ChatWidget";
import IndicatorSettingsModal from "@/components/dashboard/toolbar/IndicatorSettingsModal";
import type {
  IndicatorCatalogue,
  IndicatorInstance,
  IndicatorTypeMeta,
  PreviewBar,
} from "@/types/indicators";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_MAIN_OVERLAYS = 3;
const MAX_SUB_PANES     = 2;

// ─── Component ────────────────────────────────────────────────────────────────

const DashboardPage = () => {
  const resultsRef      = useRef<BacktestResultsHandle>(null);
  const previewAbortRef = useRef<AbortController | null>(null);

  // ── State ──────────────────────────────────────────────────────────────────
  const [indicatorMeta, setIndicatorMeta] = useState<IndicatorTypeMeta[]>([]);
  const [instances,     setInstances]     = useState<IndicatorInstance[]>([]);
  const [currentAsset,     setCurrentAsset]     = useState("AAPL");
  const [currentTimeframe, setCurrentTimeframe] = useState("1d");
  // Which instance has its settings modal open (null = closed).
  const [settingsInstance, setSettingsInstance] = useState<IndicatorInstance | null>(null);

  // Stable lookup: type_id → IndicatorTypeMeta.
  const catalogue = useMemo<IndicatorCatalogue>(
    () => Object.fromEntries(indicatorMeta.map((m) => [m.type_id, m])),
    [indicatorMeta]
  );

  // Keep a ref so async fetch closures always see the latest catalogue.
  const catalogueRef = useRef(catalogue);
  useEffect(() => { catalogueRef.current = catalogue; }, [catalogue]);

  // ── Fetch indicator catalogue on mount ─────────────────────────────────────
  useEffect(() => {
    fetch("/api/indicators")
      .then((r) => r.json())
      .then(setIndicatorMeta)
      .catch((err) => console.error("Failed to load indicator metadata:", err));
  }, []);

  // ── Preview fetch ──────────────────────────────────────────────────────────

  const fetchPreview = (
    asset:        string,
    timeframe:    string,
    inst:         IndicatorInstance[],
    preserveZoom: boolean,
  ) => {
    previewAbortRef.current?.abort();
    const controller = new AbortController();
    previewAbortRef.current = controller;

    fetch("/api/preview", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        asset,
        timeframe,
        instances: inst.map((i) => ({
          uuid:    i.uuid,
          type_id: i.type_id,
          params:  i.params,
        })),
      }),
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ bars: PreviewBar[]; indicators: Record<string, (number | null)[]> }>;
      })
      .then((data) => {
        resultsRef.current?.setPreviewData(
          data.bars,
          inst,
          catalogueRef.current,
          data.indicators ?? {},
          preserveZoom,
        );
      })
      .catch((err) => {
        if (err instanceof Error && err.name === "AbortError") return;
        console.error("Preview fetch failed:", err);
      });
  };

  // ── Toolbar callbacks ──────────────────────────────────────────────────────

  const handlePreviewNeeded = (asset: string, timeframe: string) => {
    setCurrentAsset(asset);
    setCurrentTimeframe(timeframe);
    fetchPreview(asset, timeframe, instances, false);
  };

  // ── Instance management ────────────────────────────────────────────────────

  const handleIndicatorSelected = (typeId: string) => {
    const typeDef = catalogue[typeId];
    if (!typeDef) return;

    if (typeDef.pane === "main") {
      const count = instances.filter(
        (i) => catalogue[i.type_id]?.pane === "main"
      ).length;
      if (count >= MAX_MAIN_OVERLAYS) return; // TODO: surface toast
    }
    if (typeDef.pane === "sub") {
      const count = instances.filter(
        (i) => catalogue[i.type_id]?.pane === "sub"
      ).length;
      if (count >= MAX_SUB_PANES) return; // TODO: surface toast
    }

    const defaultParams = Object.fromEntries(
      typeDef.param_schema.map((p) => [p.name, p.default])
    );
    const newInst: IndicatorInstance = {
      uuid:    crypto.randomUUID(),
      type_id: typeId,
      params:  defaultParams,
    };
    const next = [...instances, newInst];
    setInstances(next);
    fetchPreview(currentAsset, currentTimeframe, next, false);
  };

  const handleUpdateInstance = (
    uuid:       string,
    newParams:  Record<string, number>,
    newColors?: Record<string, string>,
  ) => {
    const next = instances.map((i) =>
      i.uuid === uuid
        ? { ...i, params: newParams, ...(newColors !== undefined && { colors: newColors }) }
        : i
    );
    setInstances(next);
    fetchPreview(currentAsset, currentTimeframe, next, true);
  };

  const handleRemoveInstance = (uuid: string) => {
    const next = instances.filter((i) => i.uuid !== uuid);
    setInstances(next);
    fetchPreview(currentAsset, currentTimeframe, next, true);
  };

  // ── Settings modal ─────────────────────────────────────────────────────────

  const handleLegendSettings = (instance: IndicatorInstance) => {
    setSettingsInstance(instance);
  };

  const handleSettingsApply = (
    uuid:      string,
    newParams: Record<string, number>,
    newColors: Record<string, string>,
  ) => {
    handleUpdateInstance(uuid, newParams, newColors);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

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
              <BacktestResultsPanel
                ref={resultsRef}
                onLegendSettings={handleLegendSettings}
                onLegendRemove={handleRemoveInstance}
              />
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

      {/* ── Settings modal ────────────────────────────────────────────────── */}
      {settingsInstance && catalogue[settingsInstance.type_id] && (
        <IndicatorSettingsModal
          instance={settingsInstance}
          typeDef={catalogue[settingsInstance.type_id]}
          onApply={handleSettingsApply}
          onClose={() => setSettingsInstance(null)}
        />
      )}
    </div>
  );
};

export default DashboardPage;
