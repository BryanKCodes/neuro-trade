"use client";

import { useState, useImperativeHandle, forwardRef, ForwardedRef } from "react";
import { FiSearch, FiChevronDown } from "react-icons/fi";
import SearchModal, { SearchItem } from "@/components/dashboard/toolbar/SearchModal";

export type AssetSelectorHandle = {
  getData: () => string;
};

type AssetSelectorProps = {
  onChange?: (symbol: string) => void;
};

const FALLBACK_TICKERS: SearchItem[] = [
  { id: "AAPL",  label: "AAPL",  description: "Apple Inc" },
  { id: "MSFT",  label: "MSFT",  description: "Microsoft Corp" },
  { id: "GOOGL", label: "GOOGL", description: "Alphabet Inc" },
  { id: "AMZN",  label: "AMZN",  description: "Amazon.com Inc" },
  { id: "TSLA",  label: "TSLA",  description: "Tesla Inc" },
  { id: "NVDA",  label: "NVDA",  description: "NVIDIA Corp" },
  { id: "META",  label: "META",  description: "Meta Platforms Inc" },
  { id: "NFLX",  label: "NFLX",  description: "Netflix Inc" },
  { id: "SPY",   label: "SPY",   description: "SPDR S&P 500 ETF Trust" },
  { id: "QQQ",   label: "QQQ",   description: "Invesco QQQ Trust" },
];

const AssetSelector = forwardRef(function AssetSelector(
  { onChange }: AssetSelectorProps,
  ref: ForwardedRef<AssetSelectorHandle>
) {
  const [selectedSymbol, setSelectedSymbol] = useState("AAPL");
  const [isOpen,     setIsOpen]     = useState(false);
  const [tickers,    setTickers]    = useState<SearchItem[]>([]);
  const [isLoading,  setIsLoading]  = useState(false);

  useImperativeHandle(ref, () => ({
    getData: () => selectedSymbol,
  }));

  const handleOpen = async () => {
    setIsOpen(true);
    if (tickers.length > 0 || isLoading) return;
    setIsLoading(true);
    try {
      const res  = await fetch("/api/tickers");
      const data = await res.json();
      setTickers(
        (data as { symbol: string; name: string }[]).map((t) => ({
          id:          t.symbol,
          label:       t.symbol,
          description: t.name,
        }))
      );
    } catch {
      setTickers(FALLBACK_TICKERS);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (symbol: string) => {
    setSelectedSymbol(symbol);
    onChange?.(symbol);
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex h-full items-center gap-2 px-3 text-sm font-medium text-content-primary transition-colors hover:bg-surface-raised"
      >
        <FiSearch className="h-4 w-4 text-content-muted" />
        <span>{selectedSymbol}</span>
        <FiChevronDown className="h-4 w-4 text-content-muted" />
      </button>

      {isOpen && (
        <SearchModal
          title="Select Asset"
          items={tickers}
          onSelect={handleSelect}
          onClose={() => setIsOpen(false)}
          placeholder="Search symbols…"
          isLoading={isLoading}
        />
      )}
    </>
  );
});

export default AssetSelector;
