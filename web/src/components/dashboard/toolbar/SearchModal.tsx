"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FiSearch, FiX } from "react-icons/fi";
import Fuse from "fuse.js";

export type SearchItem = {
  id:           string;
  label:        string;
  description?: string;
  category?:    string;
  color?:       string;
};

type SearchModalProps = {
  items:        SearchItem[];
  onSelect:     (id: string) => void;
  onClose:      () => void;
  /** When provided, items are grouped by category in this order when no query is active. */
  groupOrder?:  string[];
  placeholder?: string;
  isLoading?:   boolean;
  title?:       string;
};

const SearchModal = ({
  items,
  onSelect,
  onClose,
  groupOrder,
  placeholder = "Search…",
  isLoading   = false,
  title,
}: SearchModalProps) => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys:          ["label", "description"],
        threshold:     0.4,
        includeScore:  true,
        shouldSort:    true,
      }),
    [items]
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return items.slice(0, 120);
    return fuse.search(query).map((r) => r.item);
  }, [query, items, fuse]);

  // Group items by category when browsing (no active query); flat list when searching.
  const grouped = useMemo<[string, SearchItem[]][] | null>(() => {
    if (!groupOrder || query.trim()) return null;
    const map = new Map<string, SearchItem[]>();
    for (const item of filtered) {
      const cat = item.category ?? "Other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    const ordered = [...groupOrder.filter((g) => map.has(g))];
    for (const [cat] of map) {
      if (!ordered.includes(cat)) ordered.push(cat);
    }
    return ordered.map((cat) => [cat, map.get(cat)!]);
  }, [filtered, groupOrder, query]);

  const handleSelect = (id: string) => {
    onSelect(id);
    onClose();
  };

  const renderItem = (item: SearchItem) => (
    <button
      key={item.id}
      onClick={() => handleSelect(item.id)}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-surface-raised"
    >
      <span className="shrink-0 text-sm font-medium text-content-primary">
        {item.label}
      </span>
      {item.description && (
        <span className="flex-1 truncate text-xs text-content-muted">
          {item.description}
        </span>
      )}
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex w-full max-w-md flex-col rounded-xl border border-border-subtle bg-surface-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <span className="text-sm font-semibold text-content-primary">
            {title ?? placeholder}
          </span>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-content-muted transition-colors hover:text-content-primary"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>

        {/* Search input */}
        <div className="border-b border-border-subtle px-3 py-2">
          <div className="flex items-center gap-2 rounded-md bg-surface-raised px-3 py-1.5">
            <FiSearch className="h-3.5 w-3.5 shrink-0 text-content-muted" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="flex-1 bg-transparent text-sm text-content-primary placeholder:text-content-muted focus:outline-none"
            />
          </div>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-border-subtle scrollbar-track-transparent">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-subtle border-t-accent-blue" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-4 text-center text-sm text-content-muted">
              No results found.
            </p>
          ) : grouped ? (
            grouped.map(([cat, catItems]) => (
              <div key={cat} className="mb-1">
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-content-muted">
                  {cat}
                </div>
                {catItems.map(renderItem)}
              </div>
            ))
          ) : (
            filtered.map(renderItem)
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
