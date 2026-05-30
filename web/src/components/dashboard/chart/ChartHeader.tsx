"use client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OhlcvData = {
  open:      string;
  high:      string;
  low:       string;
  close:     string;
  volume:    string;
  bullish:   boolean;
  strategy:  string | null;
  benchmark: string | null;
};

type VisibilityKey = "price" | "strategy" | "benchmark";

type Props = {
  ohlcv:      OhlcvData | null;
  visibility: Record<VisibilityKey, boolean>;
  onToggle:   (key: VisibilityKey) => void;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const VISIBILITY_COLORS: Record<VisibilityKey, string> = {
  price:     "#10B981",
  strategy:  "#3b82f6",
  benchmark: "#f97316",
};

const numClass = (bullish: boolean) =>
  bullish ? "text-emerald-400" : "text-rose-400";

// ─── Component ────────────────────────────────────────────────────────────────

const ChartHeader = ({ ohlcv, visibility, onToggle }: Props) => {
  const nc = ohlcv ? numClass(ohlcv.bullish) : "text-content-primary";

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 px-4 py-2 text-[10px] font-mono">
      {/* ── Left: OHLCV ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {ohlcv ? (
          <>
            <span className="text-zinc-500">
              O&nbsp;<span className={`tabular-nums ${nc}`}>{ohlcv.open}</span>
            </span>
            <span className="text-zinc-500">
              H&nbsp;<span className={`tabular-nums ${nc}`}>{ohlcv.high}</span>
            </span>
            <span className="text-zinc-500">
              L&nbsp;<span className={`tabular-nums ${nc}`}>{ohlcv.low}</span>
            </span>
            <span className="text-zinc-500">
              C&nbsp;<span className={`tabular-nums ${nc}`}>{ohlcv.close}</span>
            </span>
            {visibility.price && (
              <span className="text-zinc-500">
                Vol&nbsp;<span className="tabular-nums text-zinc-400">{ohlcv.volume}</span>
              </span>
            )}
            {ohlcv.strategy !== null && visibility.strategy && (
              <span className="text-zinc-500">
                Eq&nbsp;<span className="tabular-nums text-zinc-200">{ohlcv.strategy}</span>
              </span>
            )}
            {ohlcv.benchmark !== null && visibility.benchmark && (
              <span className="text-zinc-500">
                Bm&nbsp;<span className="tabular-nums text-zinc-200">{ohlcv.benchmark}</span>
              </span>
            )}
          </>
        ) : (
          <span className="font-sans text-[10px] text-zinc-600">No data</span>
        )}
      </div>

      {/* ── Right: Visibility toggle chips ───────────────────────────────── */}
      <div className="flex items-center gap-3">
        {(["price", "strategy", "benchmark"] as VisibilityKey[]).map((key) => (
          <button
            key={key}
            onClick={() => onToggle(key)}
            className={`flex items-center gap-1 font-sans text-[10px] text-zinc-400 transition-opacity duration-150 ${
              visibility[key] ? "opacity-100" : "opacity-30"
            }`}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: VISIBILITY_COLORS[key] }}
            />
            <span className="capitalize">{key}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ChartHeader;
