"use client";

import { useState } from "react";
import type { IndicatorInstance, IndicatorTypeMeta } from "@/types/indicators";

type Props = {
  instance: IndicatorInstance;
  typeDef:  IndicatorTypeMeta;
  onApply:  (uuid: string, newParams: Record<string, number>, newColors: Record<string, string>) => void;
  onClose:  () => void;
};

const COLOR_PALETTE = [
  "#3B82F6", // blue
  "#10B981", // green
  "#EF4444", // red
  "#F59E0B", // amber
  "#A78BFA", // violet
  "#06B6D4", // cyan
  "#F97316", // orange
  "#EC4899", // pink
];

const IndicatorSettingsModal = ({ instance, typeDef, onApply, onClose }: Props) => {
  const [localParams, setLocalParams] = useState<Record<string, number>>(
    () => ({ ...instance.params })
  );
  const [localColors, setLocalColors] = useState<Record<string, string>>(
    () => ({ ...(instance.colors ?? {}) })
  );

  const handleParamChange = (name: string, raw: string) => {
    const num = parseFloat(raw);
    if (!isNaN(num)) {
      setLocalParams((prev) => ({ ...prev, [name]: num }));
    }
  };

  const handleColorSelect = (keySuffix: string, hex: string) => {
    setLocalColors((prev) => ({ ...prev, [keySuffix]: hex }));
  };

  const handleApply = () => {
    onApply(instance.uuid, localParams, localColors);
    onClose();
  };

  const hasParams = typeDef.param_schema.length > 0;
  const hasColors = typeDef.series_styles.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex w-72 flex-col rounded-xl border border-border-subtle bg-surface-card shadow-2xl">
        {/* Header */}
        <div className="border-b border-border-subtle px-4 py-3">
          <h3 className="text-sm font-semibold text-content-primary">
            {typeDef.label} Settings
          </h3>
        </div>

        <div className="flex flex-col gap-4 p-4">
          {/* Param inputs */}
          {hasParams && typeDef.param_schema.map((param) => (
            <div key={param.name} className="flex items-center justify-between gap-3">
              <label
                htmlFor={`param-${instance.uuid}-${param.name}`}
                className="text-sm text-content-muted"
              >
                {param.label}
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  id={`param-${instance.uuid}-${param.name}`}
                  type="number"
                  step={param.dtype === "float" ? "0.1" : "1"}
                  min={param.min_val ?? undefined}
                  max={param.max_val ?? undefined}
                  value={localParams[param.name] ?? param.default}
                  onChange={(e) => handleParamChange(param.name, e.target.value)}
                  className="w-20 rounded-md border border-border-subtle bg-surface-raised px-2 py-1 text-right text-sm text-content-primary focus:border-accent-blue focus:outline-none"
                />
                {(param.min_val != null || param.max_val != null) && (
                  <span className="whitespace-nowrap text-xs text-content-muted">
                    ({param.min_val ?? ""}–{param.max_val ?? ""})
                  </span>
                )}
              </div>
            </div>
          ))}

          {/* Color pickers — one row per series_style */}
          {hasColors && (
            <div className="flex flex-col gap-3">
              {hasParams && (
                <div className="border-t border-border-subtle" />
              )}
              <span className="text-xs font-semibold uppercase tracking-wider text-content-muted">
                Color
              </span>
              {typeDef.series_styles.map((st) => {
                const current = localColors[st.key_suffix] ?? st.color;
                return (
                  <div key={st.key_suffix} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-content-muted">{st.label}</span>
                    <div className="flex items-center gap-1.5">
                      {COLOR_PALETTE.map((hex) => (
                        <button
                          key={hex}
                          title={hex}
                          onClick={() => handleColorSelect(st.key_suffix, hex)}
                          className="h-5 w-5 shrink-0 rounded-full transition-transform hover:scale-110 focus:outline-none"
                          style={{
                            background: hex,
                            outline: current === hex ? `2px solid ${hex}` : "none",
                            outlineOffset: "2px",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-border-subtle px-4 py-3">
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-content-muted transition-colors hover:bg-surface-raised hover:text-content-primary"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="rounded-md bg-accent-blue/10 px-3 py-1.5 text-sm font-medium text-accent-blue transition-colors hover:bg-accent-blue/20 active:bg-accent-blue/30"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default IndicatorSettingsModal;
