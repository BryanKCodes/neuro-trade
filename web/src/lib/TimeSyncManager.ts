import type { IChartApi, ISeriesApi, Time, TimeRange } from "lightweight-charts";

type Entry = {
  handler: (range: TimeRange | null) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  series:  ISeriesApi<any>;
};

/**
 * Coordinates time-scale and crosshair sync across N lw-charts instances
 * (1 MainPane + up to 2 SubPanes). All sync is timestamp-based to avoid the
 * logical-range misalignment that occurs when charts have different bar counts
 * due to null warmup filtering.
 *
 * Usage:
 *   const unsubscribe = syncManager.register(chart, primarySeries);
 *   // ... in cleanup:
 *   unsubscribe();
 */
export class TimeSyncManager {
  private syncing = false;
  private readonly entries = new Map<IChartApi, Entry>();

  /**
   * Register a chart with its primary series. Returns an unsubscribe function
   * that should be called in the component's cleanup (useEffect return).
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register(chart: IChartApi, primarySeries: ISeriesApi<any>): () => void {
    const handler = (range: TimeRange | null) => {
      if (this.syncing || !range) return;
      this.syncing = true;
      for (const [peer] of this.entries) {
        if (peer !== chart) peer.timeScale().setVisibleRange(range);
      }
      this.syncing = false;
    };

    this.entries.set(chart, { handler, series: primarySeries });
    chart.timeScale().subscribeVisibleTimeRangeChange(handler);

    return () => {
      chart.timeScale().unsubscribeVisibleTimeRangeChange(handler);
      this.entries.delete(chart);
    };
  }

  /**
   * Broadcast the crosshair position to all registered charts except the source.
   * Call this from each pane's `subscribeCrosshairMove` handler.
   * `series` stored at registration time is used as the anchor for setCrosshairPosition.
   */
  syncCrosshair(price: number, time: Time, source: IChartApi): void {
    for (const [peer, { series }] of this.entries) {
      if (peer !== source) {
        peer.setCrosshairPosition(price, time, series);
      }
    }
  }

  /**
   * Clear the crosshair on all registered charts except the source.
   * Call this when the source chart's crosshair leaves (e.g. mouse leaves).
   */
  clearCrosshair(source: IChartApi): void {
    for (const [peer] of this.entries) {
      if (peer !== source) {
        peer.clearCrosshairPosition();
      }
    }
  }
}
