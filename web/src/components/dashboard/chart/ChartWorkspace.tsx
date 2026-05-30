"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { TimeSyncManager } from "@/lib/TimeSyncManager";
import ChartHeader, { type OhlcvData } from "@/components/dashboard/chart/ChartHeader";
import MainPane, { type MainPaneHandle } from "@/components/dashboard/chart/MainPane";
import SubPane from "@/components/dashboard/chart/SubPane";
import type {
  IndicatorCatalogue,
  IndicatorData,
  IndicatorInstance,
  PreviewBar,
} from "@/types/indicators";

// ─── Public types ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BacktestPayload = any;

export type ChartWorkspaceHandle = {
  setData:        (data: BacktestPayload) => void;
  setPreviewData: (
    bars:          PreviewBar[],
    instances:     IndicatorInstance[],
    catalogue:     IndicatorCatalogue,
    indicatorData: IndicatorData,
    preserveZoom:  boolean,
  ) => void;
};

type Props = {
  onLegendSettings: (instance: IndicatorInstance) => void;
  onLegendRemove:   (uuid: string) => void;
};

type VisibilityKey = "price" | "strategy" | "benchmark";

// ─── Component ────────────────────────────────────────────────────────────────

const ChartWorkspace = forwardRef<ChartWorkspaceHandle, Props>(
  ({ onLegendSettings, onLegendRemove }, ref) => {
    const syncManager = useRef(new TimeSyncManager()).current;
    const mainPaneRef = useRef<MainPaneHandle>(null);

    const [bars,          setBars]          = useState<PreviewBar[]>([]);
    const [instances,     setInstances]     = useState<IndicatorInstance[]>([]);
    const [catalogue,     setCatalogue]     = useState<IndicatorCatalogue>({});
    const [indicatorData, setIndicatorData] = useState<IndicatorData>({});
    const [ohlcv,         setOhlcv]         = useState<OhlcvData | null>(null);
    const [visibility,    setVisibility]    = useState<Record<VisibilityKey, boolean>>({
      price: true, strategy: true, benchmark: true,
    });

    const handleToggle = (key: VisibilityKey) => {
      setVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
      mainPaneRef.current?.toggleSeries(key);
    };

    useImperativeHandle(ref, () => ({
      setData: (data) => {
        mainPaneRef.current?.setData(data);
      },
      setPreviewData: (bars, inst, catalogue, indicatorData, preserveZoom) => {
        setBars(bars);
        setInstances(inst);
        setCatalogue(catalogue);
        setIndicatorData(indicatorData);

        const mainInstances = inst.filter(
          (i) => catalogue[i.type_id]?.pane === "main"
        );
        mainPaneRef.current?.setPreviewData(
          bars,
          mainInstances,
          catalogue,
          indicatorData,
          preserveZoom,
        );
      },
    }));

    const mainInstances = instances.filter((i) => catalogue[i.type_id]?.pane === "main");
    const subInstances  = instances.filter((i) => catalogue[i.type_id]?.pane === "sub").slice(0, 2);

    return (
      <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
        {/* Header: OHLCV + visibility toggles only (legends live inside panes) */}
        <ChartHeader
          ohlcv={ohlcv}
          visibility={visibility}
          onToggle={handleToggle}
        />

        {/* Main pane — fills remaining vertical space, renders its own legend overlay */}
        <MainPane
          ref={mainPaneRef}
          syncManager={syncManager}
          onOhlcvUpdate={setOhlcv}
          instances={mainInstances}
          catalogue={catalogue}
          indicatorData={indicatorData}
          onSettings={onLegendSettings}
          onRemove={onLegendRemove}
        />

        {/* Stacked sub-panes — each renders its own legend overlay */}
        {subInstances.map((inst) => {
          const typeDef = catalogue[inst.type_id];
          if (!typeDef) return null;
          return (
            <SubPane
              key={inst.uuid}
              instance={inst}
              typeDef={typeDef}
              bars={bars}
              indicatorData={indicatorData}
              syncManager={syncManager}
              onSettings={onLegendSettings}
              onRemove={onLegendRemove}
            />
          );
        })}
      </div>
    );
  }
);

ChartWorkspace.displayName = "ChartWorkspace";
export default ChartWorkspace;
