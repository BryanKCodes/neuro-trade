"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useEffect,
} from "react";
import { FiChevronDown } from "react-icons/fi";
import clsx from "clsx";
import Dropdown from "@/components/dashboard/toolbar/Dropdown";

export type TimeframeSelectorHandle = {
  getData: () => string;
};

type TimeframeSelectorProps = {
  onChange?: (timeframe: string) => void;
};

const SHORTHANDS: Record<string, string> = {
  "1m": "1m",
  "2m": "2m",
  "5m": "5m",
  "15m": "15m",
  "30m": "30m",
  "90m": "1.5h",
  "1h": "1h",
  "1d": "D",
  "5d": "5D",
  "1wk": "W",
  "1mo": "M",
  "3mo": "3M",
};

const LABELS: Record<string, string> = {
  "1m": "1 minute",
  "2m": "2 minutes",
  "5m": "5 minutes",
  "15m": "15 minutes",
  "30m": "30 minutes",
  "90m": "1.5 hours",
  "1h": "1 hour",
  "1d": "1 day",
  "5d": "5 days",
  "1wk": "1 week",
  "1mo": "1 month",
  "3mo": "3 months",
};

const GROUPS = {
  MINUTES: ["1m", "2m", "5m", "15m", "30m"],
  HOURS: ["90m", "1h"],
  DAYS: ["1d", "5d", "1wk"],
  MONTHS: ["1mo", "3mo"],
};

const QUICK_TABS = ["1m", "30m", "1h"];

const TimeframeSelector = forwardRef<TimeframeSelectorHandle, TimeframeSelectorProps>(
  ({ onChange }, ref) => {
    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const [selected, setSelected] = useState("1d");
    const [customTab, setCustomTab] = useState("1d");
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const handleTabClick = (tf: string) => {
      setSelected(tf);
      onChange?.(tf);
    };

    const handleDropdownSelect = (tf: string) => {
      setSelected(tf);
      if (!QUICK_TABS.includes(tf)) {
        setCustomTab(tf);
      }
      setDropdownOpen(false);
      onChange?.(tf);
    };

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
          setDropdownOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useImperativeHandle(ref, () => ({
      getData: () => selected,
    }));

    return (
      <div className="relative flex items-center h-full">
        {/* Quick tabs */}
        {QUICK_TABS.map((tf) => (
          <button
            key={tf}
            onClick={() => handleTabClick(tf)}
            className={clsx(
              "px-2 h-full text-sm transition-colors",
              selected === tf
                ? "bg-surface-raised text-content-primary font-medium"
                : "bg-transparent text-content-muted hover:bg-surface-raised hover:text-content-primary"
            )}
          >
            {SHORTHANDS[tf] ?? tf}
          </button>
        ))}

        {/* Custom tab (always shown, active only if selected is not in QUICK_TABS) */}
        <button
          onClick={() => handleTabClick(customTab)}
          className={clsx(
            "px-2 h-full text-sm transition-colors",
            !QUICK_TABS.includes(selected)
              ? "bg-surface-raised text-content-primary font-medium"
              : "bg-transparent text-content-muted hover:bg-surface-raised hover:text-content-primary"
          )}
        >
          {SHORTHANDS[customTab] ?? customTab}
        </button>

        {/* Dropdown */}
        <Dropdown
          buttonLabel={null}
          selected={selected}
          onSelect={handleDropdownSelect}
          categories={GROUPS}
          renderLabel={(tf) => LABELS[tf] ?? tf}
        />
      </div>
    );
  }
);

export default TimeframeSelector;
