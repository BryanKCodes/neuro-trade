"use client";
import { useEffect, useRef } from "react";

export default function ChartWidget({ symbol = "NASDAQ:AAPL", interval = "D" }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = prefersDark ? "dark" : "light";

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
        theme,
        style: "1",
        locale: "en",
        toolbar_bg: theme === "dark" ? "#1e1e1e" : "#f1f3f6",
        enable_publishing: false,
        allow_symbol_change: true,
      });
    };

    document.body.appendChild(script);
  }, [symbol, interval]);

  return <div id="tv_chart_container" ref={containerRef} />;
}
