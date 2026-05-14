"use client";

import { useEffect, useRef } from "react";
import { FiBarChart2 } from "react-icons/fi";

type ChartWidgetProps = {
  symbol?: string;
  interval?: string;
};

const ChartWidget = ({ symbol = "NASDAQ:AAPL", interval = "D" }: ChartWidgetProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;

    script.onload = () => {
      // @ts-ignore
      new TradingView.widget({
        container_id: containerRef.current?.id,
        width: "100%",
        height: "100%",
        symbol,
        interval,
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
        toolbar_bg: "#111827",
        enable_publishing: false,
        allow_symbol_change: true,
      });
    };

    document.body.appendChild(script);
  }, [symbol, interval]);

  return (
    <div className="h-full w-full overflow-hidden rounded-lg border border-border-subtle">
      <div id="tv_chart_container" ref={containerRef} className="h-full w-full" />
    </div>
  );
};

export default ChartWidget;
