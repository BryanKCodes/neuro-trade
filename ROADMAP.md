# NeuroTrade — Product Roadmap

**Vision**: A no-code algorithmic trading platform where a user describes a strategy in plain English, an LLM translates it into a validated JSON DSL, and a professional-grade backtesting engine executes it — all without writing a single line of code.

**Core loop**:
```
User prompt → LLM → JSON DSL → Pydantic validation → Strategy classes → Custom Simulator → Results → Dashboard
```

**Engine decision**: Custom Simulator (Path C). See `ARCHITECTURE_DECISION.md` for the full evaluation.

**Guiding principle**: Each phase must leave the app in a fully working, deployable state. No phase breaks what the previous phase built.

---

## Phase 1 — Foundation & Public-Facing Web (Complete)

- Firebase Authentication (email/password + Google SSO)
- Home page (`/`), About page (`/about`), auth flows
- Dashboard gated behind authentication

---

## Phase 2 — UI/UX & Charting Overhaul (Complete)

- TradingView-style charting with candlesticks and trade markers
- Resizable panel layout (chart / backtest / chat)
- Backtest input widgets, equity curve visualization
- Metrics panel (Sharpe, drawdown, annualized return, XIRR)

---

## Phase 3 — Engine Integrity (Complete)

**Goal**: The simulator must produce financially correct results before any user-facing feature is built on top of it. Every item in this phase is a blocker for Phase 4.

### 3.1 — Critical Bug Fixes

These are correctness bugs — the engine produces wrong numbers today.

| # | Bug | File | Fix |
|---|---|---|---|
| 1 | Short trades never execute | `rule.py:75` | `Long if 'long' else Short` is always truthy; fix to `Long if self.trade_type == 'long' else Short` |
| 2 | Same-bar entry at close | `simulator.py`, `rule.py` | Enter at `df['Open'].iloc[i+1]`, not `df['Close'].iloc[i]` of signal bar |
| 3 | No cash accounting | `simulator.py` | Deduct `trade.cost()` from `_portfolio_value` on entry; add `cost + pnl` on close |
| 4 | Equity wrong during open positions | `long.py`, `short.py` | Equity = cash + notional value; not just PnL delta |
| 5 | Sizing `or 1.0` default | `rule.py:70` | Remove `or 1.0`; a sizing of 0 should suppress the trade, not default to 1 |

**Exit criterion**: A buy-and-hold benchmark (buy at start, hold to end) produces an equity curve that matches a manual calculation to within 0.1%. Cash never goes negative. Short trades produce negative entries in the equity curve.

### 3.2 — Realism Upgrades

| Item | Description |
|---|---|
| Commission model | Configurable flat fee + bps percentage, applied at `trade.close()` |
| Slippage model | Apply to both entry and exit prices, not just PnL; configurable via `Simulator.__init__` |
| Max open trades | `max_open_trades: int` per strategy — prevents unlimited leverage from simultaneous rules |
| Minimum bar guard | Skip entry if `i + 1 >= len(df)` to prevent out-of-bounds on last bar |

### 3.3 — Performance Upgrades

| Item | Description |
|---|---|
| Warm-up pre-pass | Call `series.calculate(i, df)` for all indicator series in the strategy tree before the simulation loop begins, so no indicator is computed mid-loop |
| Unique column names | Indicators use composite keys (e.g., `EMA_14_close`) to prevent column collisions when the same indicator is used twice with different inputs |
| Indicator tree walker | Helper function `extract_all_series(strategy)` traverses the component tree and returns all `Series` instances for the warm-up pass |

### 3.4 — Metrics Expansion

| Metric | Notes |
|---|---|
| Win rate | % of closed trades with `pnl > 0` |
| Average trade duration | Mean number of bars held |
| Profit factor | Gross profit / gross loss |
| Sortino ratio | Return / downside deviation only |
| Calmar ratio | Annualized return / max drawdown |
| Average winner / loser | Mean PnL of winning and losing trades separately |

### 3.5 — Deliverables

- [ ] `backend/simulator/simulator.py` — cash accounting, next-bar entry, max open trades
- [ ] `backend/strategies/rule.py` — fix Short bug, fix sizing default
- [ ] `backend/components/trades/long.py` — fix equity calculation
- [ ] `backend/components/trades/short.py` — fix equity calculation
- [ ] `backend/simulator/metrics.py` — add win rate, profit factor, Sortino, Calmar
- [ ] `backend/simulator/warmup.py` — `extract_all_series(strategy)` + warm-up pass
- [ ] Manual test: buy-and-hold SPY 1y matches `(end_price / start_price - 1) * initial_cash` within 0.1%
- [ ] Manual test: short strategy produces losses when asset rises

---

## Phase 4 — AI Strategy Generation (Current Priority)

**Goal**: The LLM generates valid JSON DSL strategies from natural language. The user never writes JSON manually.

See `backend/ai/LLM_STRATEGY.md` for the full technical plan.

### 4.1 — LLM Service Architecture

**New file**: `backend/ai/llm_service.py`

```python
class LLMService:
    def __init__(self, model: str = "claude-sonnet-4-6"):
        self.client = anthropic.Anthropic()
        self.model = model
        self.schema_prompt = generate_prompt()  # existing prompt.py

    def generate_strategy(self, user_prompt: str) -> StrategyModel:
        for attempt in range(MAX_RETRIES):
            raw = self._call_llm(user_prompt, error_context=last_error)
            try:
                return StrategyModel.model_validate_json(raw)
            except ValidationError as e:
                last_error = str(e)
        raise StrategyGenerationError(f"Failed after {MAX_RETRIES} attempts")
```

- Model injected at construction; swap via `LLM_MODEL` env var with zero code changes.
- Retry loop (max 3) feeds the `ValidationError` back to the LLM so it can self-correct.
- `generate_prompt()` in `backend/ai/prompt.py` is the single source of truth — updating the schema automatically updates what the LLM sees.

### 4.2 — Prompt Caching

The schema documentation is large (~2000 tokens) and static. Use Anthropic prompt caching:

```python
response = self.client.messages.create(
    model=self.model,
    system=[
        {"type": "text", "text": ROLE_PROMPT},
        {"type": "text", "text": self.schema_prompt, "cache_control": {"type": "ephemeral"}},
    ],
    messages=[{"role": "user", "content": user_prompt}],
)
```

At high volume: ~80% cost reduction and ~30% latency reduction on cached tokens.

### 4.3 — Frontend Integration

The `/api/chat` Next.js route already proxies to FastAPI. The only frontend change: if FastAPI returns a `strategy` field alongside `message`, the chat panel renders a collapsible JSON block with a "Use this strategy" button that populates the Backtest Panel.

### 4.4 — Strategy Persistence

- Firestore collection `users/{uid}/strategies` — save named strategies per user
- Strategy selector widget loads user's saved strategies
- "Save" and "Load" actions in the backtest panel

### 4.5 — Deliverables

- [ ] `backend/ai/llm_service.py` — `LLMService` with retry loop and prompt caching
- [ ] `backend/ai/prompt.py` — improved few-shot examples targeting current schema
- [ ] `backend/main.py` — `/api/chat` calls `LLMService.generate_strategy()`
- [ ] `backend/.env.example` — document `LLM_MODEL`, `ANTHROPIC_API_KEY`
- [ ] `requirements.txt` — add `anthropic`
- [ ] `web/src/components/dashboard/chat/ChatWidget.tsx` — "Use this strategy" button
- [ ] Firestore strategy persistence (save/load)
- [ ] Integration test: 10 diverse English prompts, all pass Pydantic validation

---

## Phase 5 — Multi-Asset and Portfolio Simulation

**Goal**: Simulate strategies across multiple tickers simultaneously with a shared capital pool.

### 5.1 — Multi-Asset Data

- Extend `data/loader.py` to accept a list of tickers
- Return `Dict[str, pd.DataFrame]` keyed by ticker
- Align DataFrames on a common datetime index (outer join, forward-fill gaps)

### 5.2 — Portfolio Simulator

- New `PortfolioSimulator` wrapping multiple `Simulator` instances
- Shared `_portfolio_value` across all simulators
- Allocation rules: equal-weight or user-defined sizing expressions per asset

### 5.3 — Portfolio Metrics

- Portfolio-level Sharpe, drawdown, correlation matrix
- Per-asset contribution to return

---

## Phase 6 — Productionization and SaaS Launch

### 6.1 — Infrastructure

- Containerize FastAPI with Docker; deploy on Fly.io or Railway
- Environment-based config via Pydantic `BaseSettings`
- Rate limiting on `/api/backtest` and `/api/chat`

### 6.2 — Async Backtesting

- Long-running backtests (>5s) queued via Celery + Redis
- Frontend polls a status endpoint; spinner until complete
- Result stored in Firestore, retrieved on completion

### 6.3 — Observability

- Structured JSON logging with request IDs
- Sentry for both frontend and backend
- Backtest duration and trade count logged per run

### 6.4 — Monetization

- Stripe: free tier (3 backtests/day, 1y lookback), Pro ($29/mo, unlimited), Team ($99/mo, multi-user)
- Entitlement checks in Next.js API routes before proxying to FastAPI
- Upgrade modal triggered on `402` responses

---

## Dependency Map

```
Phase 1 (Foundation) ──► Phase 2 (UI/UX)
                              │
                              └──► Phase 3 (Engine Integrity)
                                        │
                                        └──► Phase 4 (AI Pipeline)  ← CURRENT
                                                  │
                                                  └──► Phase 5 (Portfolio)
                                                            │
                                                            └──► Phase 6 (SaaS)
```

---

## Invariants — What Must Never Break

1. Firebase authentication (login, signup, Google SSO) works.
2. `POST /api/backtest` returns a valid equity curve and metrics JSON.
3. `POST /api/chat` returns a message.
4. The dashboard renders without errors for an authenticated user.
5. All Pydantic models validate the same JSON they validated before (backwards compatibility).
6. `npm run build` passes with zero TypeScript errors.
7. `uvicorn main:app` starts without import errors.
8. Cash cannot go negative during any simulation.
9. All new components follow the dual-class pattern (runtime + Pydantic model with `.build()`).
