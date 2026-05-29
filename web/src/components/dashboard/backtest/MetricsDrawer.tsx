"use client";

import { useEffect } from "react";
import { FiX } from "react-icons/fi";
import Metrics from "@/components/dashboard/backtest/Metrics";

type MetricsDrawerProps = {
  metrics: any;
  isOpen: boolean;
  onClose: () => void;
};

const MetricsDrawer = ({ metrics, isOpen, onClose }: MetricsDrawerProps) => {
  // Close on Escape key.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop — click to dismiss */}
      <div
        onClick={onClose}
        className={`absolute inset-0 z-10 bg-black/40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Slide-up panel */}
      <div
        className={`absolute inset-x-0 bottom-0 z-20 flex max-h-[65%] flex-col rounded-t-xl border-t border-border-subtle bg-surface-card shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Drag handle + header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border-subtle px-4 py-3">
          {/* Visual drag handle */}
          <div className="absolute left-1/2 top-2 h-1 w-8 -translate-x-1/2 rounded-full bg-border-subtle" />
          <span className="text-sm font-semibold text-content-primary">Performance Details</span>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-content-muted transition-colors hover:bg-surface-raised hover:text-content-primary"
            aria-label="Close details"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable metrics content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-border-subtle scrollbar-track-transparent">
          <Metrics metrics={metrics} />
        </div>
      </div>
    </>
  );
};

export default MetricsDrawer;
