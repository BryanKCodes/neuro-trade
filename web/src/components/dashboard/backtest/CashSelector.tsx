"use client";

import {
  useState,
  useImperativeHandle,
  forwardRef,
  ForwardedRef,
} from "react";
import clsx from "clsx";

export type CashSelectorHandle = {
  getData: () => number;
};

const CashSelector = forwardRef(function CashSelector(
  _props,
  ref: ForwardedRef<CashSelectorHandle>
) {
  const [cash, setCash] = useState<number>(100000);
  const [isFocused, setIsFocused] = useState(false);

  useImperativeHandle(ref, () => ({
    getData: () => cash,
  }));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/,/g, ""); // strip commas
    const value = Math.max(1, Number(numericValue) || 0);
    setCash(value);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    // remove commas when editing
    e.target.value = cash.toString();
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    // format with commas after editing
    e.target.value = cash.toLocaleString();
  };

  return (
    <div
      className={clsx(
        "flex items-center gap-2 px-3 py-2 rounded-md",
        "hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors",
        "text-sm text-black dark:text-white"
      )}
    >
      <span className="text-gray-700 dark:text-gray-300">$</span>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        min={1}
        defaultValue={cash.toLocaleString()}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="bg-transparent focus:outline-none text-black dark:text-white appearance-none"
        style={{
          width: `${(isFocused ? cash.toString() : cash.toLocaleString()).length + 1}ch`,
        }}
      />
    </div>
  );
});

export default CashSelector;
