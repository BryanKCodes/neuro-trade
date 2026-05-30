"use client";

import { useState, useRef, useEffect } from "react";
import clsx from "clsx";
import { FiChevronDown } from "react-icons/fi";

type DropdownProps<T extends string | number> = {
  buttonLabel?: string | null;
  selected: T;
  onSelect: (value: T) => void;
  categories?: Record<string, T[]>;
  items?: T[];
  renderLabel?: (item: T) => string;
  className?: string;
  align?: "left" | "right";
};

export default function Dropdown<T extends string | number>({
  buttonLabel,
  selected,
  onSelect,
  categories,
  items,
  renderLabel = (i) => String(i),
  align = "right",
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const renderOption = (item: T) => (
    <div
      key={item}
      onClick={() => {
        onSelect(item);
        setOpen(false);
      }}
      className={clsx(
        "px-3 py-1 rounded-md text-sm cursor-pointer text-content-primary",
        "hover:bg-surface-raised",
        selected === item && "bg-surface-raised font-medium"
      )}
    >
      {renderLabel(item)}
    </div>
  );

  const displayLabel = buttonLabel === null ? null : buttonLabel ?? renderLabel(selected);

  return (
    <div className="relative h-full" ref={dropdownRef}>
      {/* Trigger — no border-radius so hover fills flush to toolbar edges */}
      <button
        onClick={() => setOpen(!open)}
        className="flex h-full items-center justify-center px-1 transition-colors hover:bg-surface-raised text-content-primary"
      >
        {displayLabel && <span className="px-1 text-sm">{displayLabel}</span>}
        <FiChevronDown className="w-4 h-4 text-content-muted" />
      </button>

      {open && (
        <div
          className={clsx(
            "absolute z-50 mt-1 w-44 max-h-64 overflow-auto rounded-md shadow-lg",
            "border border-border-subtle bg-surface-card",
            "scrollbar-thin scrollbar-thumb-border-subtle scrollbar-track-transparent",
            align === "left" ? "left-0" : "right-0"
          )}
        >
          {categories
            ? Object.entries(categories).map(([group, list]) => (
                <div key={group} className="px-2 py-1">
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-content-muted">
                    {group}
                  </div>
                  {list.map((item) => renderOption(item))}
                </div>
              ))
            : items?.map((item) => renderOption(item))}
        </div>
      )}
    </div>
  );
}
