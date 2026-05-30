"use client";

import { useState } from "react";
import { FiBarChart2 } from "react-icons/fi";
import SearchModal from "@/components/dashboard/toolbar/SearchModal";
import type { IndicatorTypeMeta } from "@/types/indicators";

type Props = {
  meta:     IndicatorTypeMeta[];
  onSelect: (typeId: string) => void;
};

const CATEGORY_ORDER = ["Trend", "Momentum", "Volatility", "Volume"];

const IndicatorPicker = ({ meta, onSelect }: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  const items = meta.map((m) => ({
    id:          m.type_id,
    label:       m.label,
    description: m.description,
    category:    m.category,
    color:       m.series_styles[0]?.color ?? "#71717A",
  }));

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex h-full items-center gap-1.5 px-3 text-xs font-medium text-content-muted transition-colors hover:bg-surface-raised hover:text-content-primary"
      >
        <FiBarChart2 className="h-3.5 w-3.5 shrink-0" />
        <span>Indicators</span>
      </button>

      {isOpen && (
        <SearchModal
          title="Add Indicator"
          items={items}
          onSelect={onSelect}
          onClose={() => setIsOpen(false)}
          groupOrder={CATEGORY_ORDER}
          placeholder="Search indicators…"
        />
      )}
    </>
  );
};

export default IndicatorPicker;
