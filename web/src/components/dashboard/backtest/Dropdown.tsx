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
        "px-3 py-1 rounded-md text-sm cursor-pointer",
        "hover:bg-gray-200 dark:hover:bg-neutral-800",
        selected === item && "bg-gray-300 dark:bg-neutral-600 font-medium text-black dark:text-white"
      )}
    >
      {renderLabel(item)}
    </div>
  );

  const displayLabel = buttonLabel === null ? null : buttonLabel ?? renderLabel(selected);

  return (
    <div className="relative h-full" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center px-1 h-full rounded-md transition-colors
                    bg-transparent hover:bg-gray-200 dark:hover:bg-neutral-800"
      >
        {displayLabel && <span className="px-1">{displayLabel}</span>}
        <FiChevronDown
          className={clsx("w-4 h-4")}
        />
      </button>

      {open && (
        <div
          className={`absolute z-50 ${align === "left" ? "left-0" : "right-0"} mt-2 w-40 max-h-64 overflow-auto rounded-md border border-gray-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-neutral-700 scrollbar-track-transparent`}
        >
          {categories
            ? Object.entries(categories).map(([group, list]) => (
                <div key={group} className="px-2 py-1">
                  <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
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
