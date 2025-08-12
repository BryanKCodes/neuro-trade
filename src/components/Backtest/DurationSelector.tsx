"use client";

import {
  useState,
  useImperativeHandle,
  forwardRef,
  ForwardedRef,
} from "react";
import { FiClock } from "react-icons/fi";
import clsx from "clsx";

export type DurationSelectorHandle = {
  /** Returns integer total days */
  getData: () => number;
};

const MAX_DAYS = 3650;

const unitToDays = {
  days: 1,
  weeks: 7,
  months: 30,
  years: 365,
} as const;

type Unit = keyof typeof unitToDays;

const DurationSelector = forwardRef(function DurationSelector(
  _props,
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
      return;
    }
    let num = Number(value);
    if (num < 1) num = 1;

    let totalDays = num * unitToDays[unit];
    if (totalDays > MAX_DAYS) totalDays = MAX_DAYS;

    // Keep same unit, but clamp value based on MAX_DAYS
    const clampedValue = Math.round(totalDays / unitToDays[unit]);
    setValue(String(clampedValue));
  };

  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newUnit = e.target.value as Unit;

    // Convert current value to total days first
    let totalDays = Number(value) * unitToDays[unit];
    if (totalDays > MAX_DAYS) totalDays = MAX_DAYS;

    // Then convert total days to new unit and round
    const newValue = Math.round(totalDays / unitToDays[newUnit]);

    setUnit(newUnit);
    setValue(String(newValue));
  };

  return (
    <div className="flex items-center text-sm text-black dark:text-white">
      {/* Icon + Number */}
      <div
        className={clsx(
          "flex items-center px-2 py-2 rounded-md",
          "hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
        )}
      >
        <FiClock className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          min={1}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          className="pl-4 bg-transparent focus:outline-none text-black dark:text-white"
          style={{
            width: `${Math.max(value.length, 1) + 2}ch`,
          }}
        />
      </div>

      {/* Dropdown */}
      <div
        className={clsx(
          "ml-1 px-1 py-2 rounded-md",
          "hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
        )}
      >
        <select
          value={unit}
          onChange={handleUnitChange}
          className="bg-transparent focus:outline-none text-black dark:text-white"
        >
          <option value="days">days</option>
          <option value="weeks">weeks</option>
          <option value="months">months</option>
          <option value="years">years</option>
        </select>
      </div>
    </div>
  );
});

export default DurationSelector;
