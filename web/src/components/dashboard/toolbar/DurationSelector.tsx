"use client";

import {
  useState,
  useImperativeHandle,
  forwardRef,
  ForwardedRef,
} from "react";
import { FiClock } from "react-icons/fi";
import clsx from "clsx";
import Dropdown from "@/components/dashboard/toolbar/Dropdown";

export type DurationSelectorHandle = {
  /** Returns integer total days */
  getData: () => number;
};

type DurationSelectorProps = {
  onChange?: (days: number) => void;
};

const MAX_DAYS = 3650; // backstop used only by getData()

const unitToDays = {
  days: 1,
  weeks: 7,
  months: 30,
  years: 365,
} as const;

const maxPerUnit: Record<string, number> = {
  days: 3650,
  weeks: 520,
  months: 120,
  years: 10,
};

type Unit = keyof typeof unitToDays;

const DurationSelector = forwardRef(function DurationSelector(
  { onChange }: DurationSelectorProps,
  ref: ForwardedRef<DurationSelectorHandle>
) {
  const [value, setValue] = useState<string>("30");
  const [unit, setUnit] = useState<Unit>("days");

  // Expose days count as integer
  useImperativeHandle(ref, () => ({
    getData: () => {
      const totalDays = Math.min(
        Number(value) * unitToDays[unit],
        MAX_DAYS
      );
      return totalDays;
    },
  }));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, "");
    setValue(digitsOnly);
  };

  const handleBlur = () => {
    if (value.trim() === "") {
      setValue("1");
      onChange?.(unitToDays["days"]);
      return;
    }
    let num = Number(value);
    if (num < 1) num = 1;
    if (num > maxPerUnit[unit]) num = maxPerUnit[unit];
    setValue(String(num));
    onChange?.(Math.min(num * unitToDays[unit], MAX_DAYS));
  };

  const handleUnitChange = (item: string) => {
    const newUnit = item as Unit;
    // Keep the number as-is; only cap if it would exceed 10 years in the new unit.
    const current = Math.max(1, Number(value) || 1);
    setValue(String(Math.min(current, maxPerUnit[newUnit])));
    setUnit(newUnit);
  };

  return (
    <div className="flex h-full items-center text-sm text-content-primary">
      {/* Icon + Number */}
      <div
        className={clsx(
          "flex h-full items-center px-2",
          "hover:bg-surface-raised transition-colors"
        )}
      >
        <FiClock className="w-4 h-4 text-content-muted" />
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          min={1}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          className="pl-2 bg-transparent focus:outline-none text-content-primary"
          style={{
            width: `${Math.max(value.length, 1) + 2}ch`,
          }}
        />
      </div>

      {/* Dropdown */}
      <Dropdown
        selected={unit}
        onSelect={handleUnitChange}
        items={["days", "weeks", "months", "years"]}
        align="left"
      />
    </div>
  );
});

export default DurationSelector;
