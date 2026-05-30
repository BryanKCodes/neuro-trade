"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import ChartWorkspace, {
  type ChartWorkspaceHandle,
} from "@/components/dashboard/chart/ChartWorkspace";
import MetricsStrip from "@/components/dashboard/backtest/MetricsStrip";
import MetricsDrawer from "@/components/dashboard/backtest/MetricsDrawer";
import type {
  IndicatorCatalogue,
  IndicatorData,
  IndicatorInstance,
  PreviewBar,
} from "@/types/indicators";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BacktestPayload = any;

export type BacktestResultsHandle = {
  setData: (data: BacktestPayload) => void;
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

const BacktestResultsPanel = forwardRef<BacktestResultsHandle, Props>(
  ({ onLegendSettings, onLegendRemove }, ref) => {
    const workspaceRef = useRef<ChartWorkspaceHandle>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [metricsData, setMetricsData] = useState<any>(null);
    const [drawerOpen,  setDrawerOpen]  = useState(false);

    useImperativeHandle(ref, () => ({
      setData: (data) => {
        workspaceRef.current?.setData(data);
        setMetricsData(data.metrics);
      },
      setPreviewData: (bars, instances, catalogue, indicatorData, preserveZoom) => {
        workspaceRef.current?.setPreviewData(
          bars, instances, catalogue, indicatorData, preserveZoom
        );
        setMetricsData(null);
      },
    }));

    return (
      <div className="relative flex h-full w-full flex-col overflow-hidden">
        <div className="min-h-0 flex-1 p-2 pb-1">
          <ChartWorkspace
            ref={workspaceRef}
            onLegendSettings={onLegendSettings}
            onLegendRemove={onLegendRemove}
          />
        </div>

        <MetricsStrip
          metrics={metricsData}
          onOpenDetails={() => setDrawerOpen(true)}
        />

        <MetricsDrawer
          metrics={metricsData}
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />
      </div>
    );
  }
);

BacktestResultsPanel.displayName = "BacktestResultsPanel";
export default BacktestResultsPanel;
