# Architecture Decision: Backtesting Engine

**Date:** 2026-05-15  
**Author:** Lead Architect (Claude Sonnet 4.6)  
**Status:** Accepted — Path C Recommended

---

## Context

NeuroTrade's core value proposition is its DSL pipeline:

```
User Prompt → LLM → JSON DSL → Pydantic Validation → Modular Python Classes → Engine
```

The platform already has a mature component library (~40 expression/predicate types, 20+ indicators) with a clean dual-class pattern (runtime + Pydantic schema). The backtesting engine must be evaluated against this constraint: **any engine that cannot natively consume Python objects is a liability, not an asset.**

A previous migration attempt to QuantConnect LEAN's Cloud API failed due to:
- 32k character limit on algorithm scripts
- LEAN's requirement for monolithic `QCAlgorithm` subclasses — fundamentally incompatible with our multi-file, multi-import component architecture

---

## Codebase Audit: Current Bugs

A code audit of the custom simulator found the following defects that must be fixed regardless of path chosen:

| Bug | File | Impact |
|---|---|---|
| **Short trades never execute** | `rule.py:75` — `Long if 'long' else Short` (non-empty string is always truthy) | Critical — all short signals silently enter as longs |
| **Same-bar entry at close** | `simulator.py:49` + `rule.py:82` — enters at `df['Close'].iloc[i]` of signal bar | Moderate look-ahead bias on intraday timeframes |
| **No cash accounting** | `simulator.py` — `_portfolio_value` never decremented on entry | Critical — unlimited leverage; equity curve is wrong during open trades |
| **Equity calculation underreports cost basis** | `long.py:38` — returns `size * (close - entry_price)` (PnL delta, not notional value) | Moderate — misleading equity during active trades |
| **Sizing default shadows zero** | `rule.py:70` — `sizing.calculate(...) or 1.0` turns a deliberate 0-size into 1 | Minor — prevents intentional trade suppression via sizing |
| **Win rate metric missing** | `metrics.py` — no per-trade win/loss tracked | Minor — dashboard shows incomplete stats |

---

## Path A: Local LEAN via Docker

### What It Is

QuantConnect LEAN is the open-source backtesting engine behind QuantConnect's cloud platform. It can run locally via Docker, removing the 32k script limit that caused the prior failure.

### How Integration Would Work

1. Run a LEAN Docker container alongside FastAPI.
2. At backtest time, generate a monolithic Python algorithm file from our DSL objects.
3. Write it to a temp directory mounted into the container.
4. Execute the container, read JSON output files.

```
DSL objects → code generator → algorithm.py file → LEAN Docker → output JSON
```

### Strengths

- Institutional-grade fills: realistic bid-ask spread modeling, partial fills, slippage
- Built-in live trading bridge (Interactive Brokers, Alpaca, etc.)
- Handles corporate actions, splits, dividends correctly
- Large community and pre-built data connectors

### Weaknesses

- **The bridge problem is unsolvable.** Our component library uses deep Python imports across 40+ files. LEAN requires a single algorithm file or a LEAN-specific project structure. We would need to either:
  - Serialize every runtime object to a string and embed it in the generated file (fragile, unmaintainable), or
  - Bundle the entire `components/` library into the LEAN Docker image and import from it — which requires rebuilding the Docker image every time a new component is added.
- **Operational complexity.** Docker-in-Docker or sidecar containers on a SaaS deployment (Fly.io, Railway, EC2) adds significant infrastructure overhead, cold-start latency (~5–15s per backtest), and surface area for failure.
- **Pydantic validation step becomes redundant.** LEAN validates its own input; our Pydantic schemas validate ours. There is no shared validation boundary.
- **No benefit over Path C for our architecture.** LEAN's advantages (realistic fills, live trading) require the algorithm to be written in LEAN's idiom. A generated adapter file captures none of these benefits — it just wraps our logic in a LEAN shell.

### Verdict: Rejected

The code-generation bridge defeats the purpose of the modular architecture. Every component added to our library becomes a maintenance burden on the bridge. LEAN's strengths are only accessible if you write strategies in LEAN's paradigm — which contradicts our DSL.

---

## Path B: Migrate to Backtesting.py or VectorBT

### Backtesting.py

A lightweight Python library where strategies subclass `bt.Strategy` and implement `next()`, called once per candle.

**Compatibility assessment:**

Our `Rule.generate_signal(i, df, **context)` and `Predicate.condition(i, df, **context)` map cleanly to `next()`. A thin adapter bridge is feasible:

```python
class BTAdapter(bt.Strategy):
    def next(self):
        for rule in self._nt_strategy.rules:
            rule.generate_signal(len(self.data) - 1, df_slice, ...)
```

**Problems:**
- `backtesting.py` manages its own data access via `self.data.Close[-1]` — bridging to our pandas DataFrame `df.iloc[i]` requires maintaining a synchronized slice at every step, which is error-prone.
- Position management (entry/exit/sizing) is handled by `bt.Strategy.buy/sell/close` — our `Trade` objects would need to be reconciled with `backtesting.py`'s order system or be discarded entirely.
- The library is largely unmaintained (last release 2023, open issues unresolved).
- **Net result:** We would still need to rewrite the `Trade` lifecycle, the `Simulator` loop, and cash accounting — the same work as Path C, but shackled to an external API.

### VectorBT

A NumPy/Numba vectorized engine that operates on entire signal arrays at once rather than iterating candles.

**Compatibility assessment: Fundamentally incompatible.**

Our predicates like `Crossover`, `Shifted`, `Sequence`, `Follows`, and `Delay` are inherently stateful and bar-by-bar. Converting `Shifted(Crossover(EMA(5), EMA(20)), shift=3)` to a vectorized signal array requires:
1. Pre-materializing the full Crossover signal series.
2. Shifting that series by 3.
3. AND-ing with other vectorized signals.

This is mechanically possible for simple indicators, but `Sequence`, `Repeat`, `Follows`, and candlestick patterns are sequential state machines. They cannot be vectorized without a complete rewrite of the predicate system. The component library's entire value — arbitrary composition of stateful predicates — is destroyed.

### Verdict: Rejected

Backtesting.py introduces a maintenance burden without solving any current problems. VectorBT requires abandoning the predicate architecture entirely. Neither option is compatible with our non-negotiable architectural constraint.

---

## Path C: Upgrade the Custom Simulator (Recommended)

### Why the Custom Simulator is the Right Foundation

The candle-by-candle `Simulator` is the only engine architecture that natively and directly consumes our runtime objects. Every `Predicate.condition(i, df)` and `Expression.calculate(i, df)` call fits naturally into the per-bar loop. No bridge, no serialization, no code generation.

The current simulator is not bad — it is **young and undertested**. The bugs listed in the audit are classic first-iteration issues, not architectural flaws. All are fixable within the existing design.

### Upgrade Plan (High Level)

**Engine Integrity Fixes (must do first):**

1. **Fix Short trade bug.** `rule.py:75` — change `Long if 'long' else Short` → `Long if self.trade_type == 'long' else Short`. One line.
2. **Fix same-bar entry.** Entry should execute at the open of the next bar (`df['Open'].iloc[i+1]`), not the close of the signal bar. This eliminates look-ahead bias on intraday timeframes and matches how real-world market orders work.
3. **Implement cash accounting.** On entry, deduct `trade.cost()` from `_portfolio_value`. On close, return `trade.cost() + trade.pnl()`. This prevents over-leveraging and produces a correct equity curve.
4. **Fix equity calculation.** Equity during open positions = cash + sum of `(current_price * size)` for longs, not just the PnL delta.
5. **Fix sizing default.** Remove `or 1.0` fallback; return `None` to suppress trade if sizing returns 0.

**Performance Upgrades:**

6. **Indicator memoization is already correct in `Series.calculate()`.** The column-caching pattern (`if col_name not in df.columns: compute`) is sound. Ensure all indicators use unique, deterministic column names (e.g., `EMA_14_close` not just `EMA_14`).
7. **Pre-compute all indicator columns before the simulation loop.** Currently indicators are lazily computed on first access, causing per-bar overhead. A `warm_up(df)` pass over all series in the strategy tree before `run()` eliminates this.

**Realism Upgrades:**

8. **Commission model.** Add a configurable `commission_per_trade` (flat) and `commission_bps` (percentage) to `Simulator.__init__`. Deduct on `trade.close()`.
9. **Slippage model.** The current `_slippage = 0.001` constant in `Trade` is hardcoded and applied only to PnL, not entry price. Proper slippage should adjust both entry and exit prices.
10. **Max open trades / risk limits.** Add `max_open_trades: int` guard per strategy, not just per rule.

**Metrics Upgrades:**

11. **Win rate and average trade duration.** Track per-trade PnL, compute win rate, average winner, average loser, profit factor.
12. **Risk-adjusted metrics.** Sortino ratio, Calmar ratio alongside Sharpe.

### Why This Scales for SaaS

- **Stateless per request.** Each backtest is a self-contained `Simulator` instantiation. Horizontal scaling is trivial — add FastAPI workers.
- **No external process dependencies.** No Docker sidecar, no LEAN container, no third-party engine to maintain.
- **Component library grows the moat.** Every new `Predicate` or `Expression` added to the library immediately becomes available in the backtest engine and the AI prompt. In Paths A and B, a new component also requires bridge/adapter work.
- **Future: async backtesting.** Long-running backtests can be queued via Celery + Redis and polled by the frontend, with no changes to the engine itself.
- **Future: portfolio-level simulation.** The `Simulator` can be extended to run multiple assets simultaneously once cash accounting is correct.

### Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| Performance too slow for intraday 5m data | Medium | Pre-compute indicators; profile and Cython/Numba hot loops if needed |
| Missing institutional fill realism | Low for MVP | Commission + slippage model covers 95% of retail use cases |
| Indicator accuracy vs pandas-ta | Low | pandas-ta is the standard; only custom indicators need validation |

---

## Decision Matrix

| Criterion | Path A (LEAN Docker) | Path B (Backtesting.py / VBT) | Path C (Custom Upgrade) |
|---|---|---|---|
| DSL architecture preserved | No — requires code gen bridge | Partial / No | **Yes — native** |
| Component library extensible | Difficult — bridge must be updated | Partial | **Yes — add a file** |
| Operational complexity | High — Docker sidecar | Low | **Low — pure Python** |
| Time to fix current bugs | High — bridge rewrite | Medium — adapter rewrite | **Low — in-place fixes** |
| Performance ceiling | High (C#) | Medium / High (VBT) | **Medium (fixable)** |
| SaaS horizontal scaling | Difficult (stateful container) | Easy | **Easy** |
| Live trading bridge | Yes (LEAN) | No | Future work |
| Institutional fill realism | Yes (LEAN) | Partial | Commission + slippage model |

---

## Final Recommendation

**Path C: Upgrade the Custom Simulator.**

The modular OOP architecture is the project's core IP and competitive moat. Any engine that cannot directly consume `Predicate` and `Expression` objects creates a maintenance tax that grows with every new component. The bugs in the current simulator are well-understood, bounded, and fixable in a focused sprint. The architecture itself is sound.

LEAN and vectorized engines solve problems NeuroTrade does not yet have (live trading, microsecond performance). Solve for correctness and reliability first; optimize for speed and realism once the engine is proven at scale.
