"use client";

import { useEffect, useRef, useState } from "react";
import { FiBarChart2, FiChevronDown } from "react-icons/fi";
import type { IndicatorMeta } from "@/types/indicators";

type Props = {
  meta:        IndicatorMeta[];
  selectedIds: string[];
  onChange:    (ids: string[]) => void;
};

const CATEGORY_ORDER = ["Trend", "Momentum", "Volatility", "Volume"];

const IndicatorPicker = ({ meta, selectedIds, onChange }: Props) => {
  const [open, setOpen] = useState(false);
  const containerRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  const toggle = (id: string) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    onChange(next);
  };

  const groups = meta.reduce<Record<string, IndicatorMeta[]>>((acc, m) => {
    (acc[m.category] ??= []).push(m);
    return acc;
  }, {});

  const orderedGroups = CATEGORY_ORDER
    .filter((c) => groups[c])
    .map((c) => [c, groups[c]] as [string, IndicatorMeta[]]);

  return (
    <div ref={containerRef} className="relative flex items-stretch">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-full items-center gap-1.5 px-3 text-xs font-medium text-content-muted transition-colors hover:bg-surface-raised hover:text-content-primary"
      >
        <FiBarChart2 className="h-3.5 w-3.5 shrink-0" />
        <span>Indicators</span>
        {selectedIds.length > 0 && (
          <span className="rounded-full bg-accent-blue/20 px-1.5 py-px text-[10px] font-semibold text-accent-blue">
            {selectedIds.length}
          </span>
        )}
        <FiChevronDown
          className={`h-3 w-3 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-60 overflow-hidden rounded-lg border border-border-subtle bg-surface-card py-1.5 shadow-xl">
          {meta.length === 0 ? (
            <p className="px-3 py-2 text-xs text-content-muted">Loading…</p>
          ) : (
            orderedGroups.map(([category, indicators]) => (
              <div key={category}>
                <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-content-muted">
                  {category}
                </div>
                {indicators.map((m) => {
                  const checked   = selectedIds.includes(m.indicator_id);
                  const dotColor  = m.series_styles[0]?.color ?? "#71717A";
                  return (
                    <label
                      key={m.indicator_id}
                      className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-xs text-content-primary transition-colors hover:bg-surface-raised"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(m.indicator_id)}
                        className="h-3.5 w-3.5 shrink-0 accent-accent-blue"
                      />
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: dotColor }}
                      />
                      <span className="truncate">{m.label}</span>
                    </label>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default IndicatorPicker;
