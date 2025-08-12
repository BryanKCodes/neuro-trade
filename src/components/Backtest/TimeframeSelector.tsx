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

export type TimeframeSelectorHandle = {
  getData: () => string;
};

const SHORTHANDS: Record<string, string> = {
  "1m": "1m",
  "2m": "2m",
  "5m": "5m",
  "15m": "15m",
  "30m": "30m",
  "60m": "1h",
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
  "60m": "1 hour",
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
  HOURS: ["60m", "90m", "1h"],
  DAYS: ["1d", "5d", "1wk"],
  MONTHS: ["1mo", "3mo"],
};

const QUICK_TABS = ["1m", "30m", "1h"];

const TimeframeSelector = forwardRef<TimeframeSelectorHandle>(
  (_props, ref) => {
    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const [selected, setSelected] = useState("1d");
    const [customTab, setCustomTab] = useState("1d");
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const handleTabClick = (tf: string) => {
      setSelected(tf);
    };

    const handleDropdownSelect = (tf: string) => {
      setSelected(tf);
      if (!QUICK_TABS.includes(tf)) {
        setCustomTab(tf);
      }
      setDropdownOpen(false);
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
      <div className="relative flex items-center gap-2 h-full">
        {/* Quick tabs */}
        {QUICK_TABS.map((tf) => (
          <button
            key={tf}
            onClick={() => handleTabClick(tf)}
            className={clsx(
              "px-1 h-full rounded-md text-sm transition-colors",
              "bg-transparent hover:bg-gray-200 dark:hover:bg-neutral-800",
              selected === tf &&
              "bg-gray-300 dark:bg-neutral-600 text-black dark:text-white font-medium"
            )}
          >
            {SHORTHANDS[tf] ?? tf}
          </button>
        ))}

        {/* Custom tab (always shown, active only if selected is not in QUICK_TABS) */}
        <button
          onClick={() => handleTabClick(customTab)}
          className={clsx(
            "px-1 h-full rounded-md text-sm transition-colors",
            "bg-transparent hover:bg-gray-200 dark:hover:bg-neutral-800",
            !QUICK_TABS.includes(selected) &&
            "bg-gray-300 dark:bg-neutral-600 text-black dark:text-white font-medium"
          )}
        >
          {SHORTHANDS[customTab] ?? customTab}
        </button>

        {/* Dropdown */}
        <div className="relative h-full" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center justify-center px-1 h-full rounded-md transition-colors
                        bg-transparent hover:bg-gray-200 dark:hover:bg-neutral-800"
          >
            <FiChevronDown className="w-4 h-4" />
          </button>

          {dropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-40 max-h-64 overflow-auto rounded-md 
                            border border-gray-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 
                            shadow-lg scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-neutral-700 
                            scrollbar-track-transparent"
            >
              {Object.entries(GROUPS).map(([group, list]) => (
                <div key={group} className="px-2 py-1">
                  <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                    {group}
                  </div>
                  {list.map((tf) => (
                    <div
                      key={tf}
                      onClick={() => handleDropdownSelect(tf)}
                      className={clsx(
                        "px-3 py-1 rounded-md text-sm cursor-pointer",
                        "hover:bg-gray-200 dark:hover:bg-neutral-800",
                        selected === tf &&
                        "bg-gray-300 dark:bg-neutral-600 font-medium text-black dark:text-white"
                      )}
                    >
                      {LABELS[tf] ?? tf}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
);

export default TimeframeSelector;
