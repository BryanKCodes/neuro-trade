"use client";

import { FiSettings, FiX } from "react-icons/fi";
import type { IndicatorInstance, IndicatorTypeMeta, ParamDef } from "@/types/indicators";

type Props = {
  instance:     IndicatorInstance;
  typeDef:      IndicatorTypeMeta;
  currentValue: string | null;
  onSettings:   () => void;
  onRemove:     () => void;
};

function formatParams(params: Record<string, number>, schema: ParamDef[]): string {
  if (schema.length === 0) return "";
  const values = schema.map((p) => {
    const v = params[p.name] ?? p.default;
    return p.dtype === "float" ? v.toFixed(1) : String(Math.round(v));
  });
  return ` (${values.join(", ")})`;
}

const ChartLegendItem = ({ instance, typeDef, currentValue, onSettings, onRemove }: Props) => {
  const dotColor = typeDef.series_styles[0]?.color ?? "#71717A";
  const label    = typeDef.label + formatParams(instance.params, typeDef.param_schema);

  return (
    <div className="flex items-center gap-1 rounded-md bg-surface-raised/60 px-2 py-1 text-[10px] font-mono">
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: dotColor }}
      />
      <span className="text-content-muted">{label}</span>
      {currentValue !== null && (
        <span className="tabular-nums text-content-primary">{currentValue}</span>
      )}
      {typeDef.param_schema.length > 0 && (
        <button
          onClick={onSettings}
          title="Settings"
          className="ml-0.5 rounded p-0.5 text-content-muted transition-colors hover:text-content-primary"
        >
          <FiSettings className="h-2.5 w-2.5" />
        </button>
      )}
      <button
        onClick={onRemove}
        title="Remove"
        className="rounded p-0.5 text-content-muted transition-colors hover:text-accent-red"
      >
        <FiX className="h-2.5 w-2.5" />
      </button>
    </div>
  );
};

export default ChartLegendItem;
