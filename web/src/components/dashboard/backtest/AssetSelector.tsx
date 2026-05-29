"use client";

import {
  useState,
  useEffect,
  useMemo,
  useImperativeHandle,
  forwardRef,
  ForwardedRef,
} from "react";
import { FiSearch, FiChevronDown } from "react-icons/fi";
import { useModal } from "@/contexts/ModalContext";
import Fuse from "fuse.js";

export type AssetSelectorHandle = {
  getData: () => string;
};

type AssetSelectorProps = {
  onChange?: (symbol: string) => void;
};

const AssetSelector = forwardRef(function AssetSelector(
  { onChange }: AssetSelectorProps,
  ref: ForwardedRef<AssetSelectorHandle>
) {
  const [selectedSymbol, setSelectedSymbol] = useState("AAPL");
  const { openModal } = useModal();

  const handleClick = () => {
    openModal(
      <AssetSearchModal
        onSelect={(symbol) => {
          setSelectedSymbol(symbol);
          onChange?.(symbol);
        }}
      />
    );
  };

  useImperativeHandle(ref, () => ({
    getData: () => selectedSymbol,
  }));

  return (
    <button
      onClick={handleClick}
      className="flex h-full items-center gap-2 px-3 transition-colors hover:bg-surface-raised text-sm font-medium text-content-primary"
    >
      <FiSearch className="w-4 h-4 text-content-muted" />
      <span>{selectedSymbol}</span>
      <FiChevronDown className="w-4 h-4 text-content-muted" />
    </button>
  );
});

export default AssetSelector;

// --- Internal Search Modal Component ---

function AssetSearchModal({ onSelect }: { onSelect: (symbol: string) => void }) {
  type Ticker = { symbol: string; name: string };

  const { closeModal } = useModal();
  const [query, setQuery] = useState("");
  const [allSymbols, setAllSymbols] = useState<Ticker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch symbols from API when modal mounts
  useEffect(() => {
    const fetchTickers = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch('/api/tickers');

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }

        const tickers = await response.json();
        setAllSymbols(tickers);
      } catch (error) {
        console.error("Failed to load tickers:", error);
        setError("Failed to load ticker symbols. Using limited set.");
        setAllSymbols([
          { symbol: "AAPL", name: "Apple Inc" },
          { symbol: "MSFT", name: "Microsoft Corp" },
          { symbol: "GOOGL", name: "Alphabet Inc" },
          { symbol: "AMZN", name: "Amazon.com Inc" },
          { symbol: "TSLA", name: "Tesla Inc" },
          { symbol: "META", name: "Meta Platforms Inc" },
          { symbol: "NFLX", name: "Netflix Inc" },
          { symbol: "NVDA", name: "NVIDIA Corp" },
          { symbol: "BRK.B", name: "Berkshire Hathaway Inc" },
          { symbol: "SPY", name: "SPDR S&P 500 ETF Trust" },
          { symbol: "QQQ", name: "Invesco QQQ Trust" },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTickers();
  }, []);

  const fuse = useMemo(
    () =>
      new Fuse(allSymbols, {
        keys: ["symbol", "name"],
        threshold: 0.3,
        includeScore: true,
        shouldSort: true
      }),
    [allSymbols]
  );

  const results = useMemo(() => {
    if (!query) return allSymbols.slice(0, 50);
    return fuse.search(query).map((result) => result.item);
  }, [query, allSymbols, fuse]);

  const handleSelect = (symbol: string) => {
    onSelect(symbol);
    closeModal();
  };

  return (
    <div className="flex flex-col gap-4 h-[500px] relative">
      {/* Close button */}
      <button
        onClick={closeModal}
        className="absolute top-2 right-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition"
      >
        ✕
      </button>

      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        Select Symbol
      </h3>

      {/* Search Input */}
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none" />
        <input
          autoFocus
          className="w-full pl-10 pr-4 py-2 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-transparent focus:border-blue-500 focus:ring-0 outline-none transition"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto -mr-3 pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-neutral-700 scrollbar-track-transparent">
        {error && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-3 mb-4">
            <p>{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-3 text-neutral-500">Loading tickers...</p>
          </div>
        ) : (
          <ul className="flex flex-col">
            {results.length > 0 ? (
              results.map((ticker) => (
                <li key={ticker.symbol}>
                  <button
                    className="w-full flex items-center px-3 py-2.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors gap-2"
                    onClick={() => handleSelect(ticker.symbol)}
                  >
                    <span className="font-medium text-base">{ticker.symbol}</span>
                    <span
                      className="text-sm text-neutral-500 truncate"
                      style={{ maxWidth: "calc(100% - 4rem)" }} // leave room for ticker symbol
                      title={ticker.name} // full name on hover
                    >
                      {ticker.name}
                    </span>
                  </button>
                </li>
              ))
            ) : (
              <p className="text-center text-neutral-500 py-4">No results found.</p>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
