# NeuroTrade — CLAUDE.md

NeuroTrade is a full-stack algorithmic trading strategy backtesting platform. Users define strategies via a JSON DSL (or AI-generated prompts), which are validated by Pydantic, executed by a custom simulation engine, and visualized in a Next.js dashboard.

**Current phase**: Phase 5 — Dashboard UI/UX Overhaul. See `ROADMAP.md` for the full plan.

---

## Project Structure

```
neuro_trade/
├── backend/        # Python FastAPI backtesting engine
└── web/            # Next.js 15 React frontend
```

---

## Tech Stack

### Frontend (`/web`)

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 15.4.5 (App Router) | |
| Language | TypeScript 5 (strict mode) | |
| UI | React 19 | |
| Styling | Tailwind CSS 4 | Custom design tokens in `globals.css` |
| Charts | **lightweight-charts ^5.2.0** | Used in `backtest/Chart.tsx`; v5 API — `createChart`, `addSeries(CandlestickSeries)`, `addSeries(LineSeries)`, `createSeriesMarkers` |
| Fuzzy search | fuse.js ^7.1.0 | Asset ticker search in `AssetSelector` |
| Auth | Firebase 12 + react-firebase-hooks | |
| Markdown | react-markdown + remark-gfm | Used in `ChatMessage` |
| Layout | react-resizable-panels ^3.0.4 | Dashboard panel splits |
| Icons | react-icons ^5.5.0 | |
| Scrollbar | tailwind-scrollbar ^4.0.2 | |

**Stale packages (installed but unused — do not use in new code):**
- `recharts` — zero usage in source; will be removed
- `openai` — zero usage in source; will be removed

### Backend (`/backend`)

| Layer | Technology | Notes |
|---|---|---|
| Framework | FastAPI 0.115 | |
| Language | Python 3.12 | |
| Data | yfinance 0.2.64 + pandas 2 | |
| Simulation | Custom Simulator | No backtrader/vectorbt/backtrading.py at runtime |
| Indicators | pandas-ta 0.4.71b0 | |
| Validation | Pydantic 2.11 | |
| Returns | pyxirr | XIRR/TWR/MWR |
| AI | anthropic >=0.40.0 | Async streaming, tool-use, prompt caching |
| Config | python-dotenv | `.env` at `backend/` root |

**Stale packages (in `requirements.txt` but not imported in source):**
- `backtrader` — architecture decision rejected it; remove from `requirements.txt`
- `mplfinance`, `matplotlib` — vestiges from an earlier phase; not used in current source

---

## Running the Servers

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd web
npm install
npm run dev   # starts on http://localhost:3000
```

Frontend requires `/web/.env.local`:
```
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:8000/
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
```

Backend requires `/backend/.env`:
```
ANTHROPIC_API_KEY=...
LLM_MODEL=claude-haiku-4-5-20251001        # optional; this is already the default
LLM_MODEL_STRATEGY=claude-haiku-4-5-20251001  # Phase 8: strategy generation model
LLM_MODEL_CHAT=claude-haiku-4-5-20251001      # Phase 8: conversational chat model
```

---

## Architecture

### Request Flow

```
Browser
  → Next.js page component
  → fetch("/api/backtest")           # relative — hits Next.js API route
  → /web/src/app/api/backtest/route.ts
  → fetch("http://localhost:8000/api/backtest")   # proxied to FastAPI
  → /backend/main.py POST /api/backtest
  → backtest.py → Simulator → metrics
  → JSON response back up the chain
```

The Next.js API routes (`/web/src/app/api/`) act as a proxy layer between the browser and FastAPI. The browser never calls FastAPI directly.

Chat uses **SSE (Server-Sent Events)** streaming. The `/api/chat` Next.js route proxies to FastAPI's `/api/chat`, which returns a `StreamingResponse`. The frontend reads events (`text_delta`, `tool_start`, `strategy`, `error`, `done`) via `ReadableStream`.

### Backend Pipeline

```
JSON request (BacktestRequest)
  → Pydantic validation (ai/schemas.py)
  → build_strategy_from_model()       # JSON DSL → Strategy object
  → Simulator(strategy, data, cash)
  → Simulator.run()                   # iterates OHLCV candle by candle
  → metrics.py                        # Sharpe, drawdown, XIRR, win rate, etc.
  → JSON response
```

### AI Pipeline (`/api/chat`)

```
ChatRequest (message + history + currentStrategy)
  → LLMService.stream_and_validate()
      Phase 1: stream text tokens → yield text_delta SSE events
      Phase 2 (if tool call): Pydantic validate → retry loop (max 3)
                               → yield strategy or error SSE event
      Always: yield done SSE event
```

`LLMService` uses Anthropic tool-use (`update_strategy` tool) with:
- Prompt caching on the schema documentation block (ephemeral, ~2000 tokens)
- Default model: `claude-haiku-4-5-20251001` (overrideable via `LLM_MODEL` env var)
- 3-attempt retry loop feeding `ValidationError` back to the LLM

### Component System (DSL)

All strategy logic is expressed as composable components in two families:

**Expressions** — return a `float` (prices, indicator values, sizes)
- Operators: `Add`, `Subtract`, `Multiply`, `Divide`
- Primitives: `Number`, `NoneExpression`
- Indicators: `EMA`, `SMA`, `RSI`, `ATR`, `MACD`, `BollingerBands`, `ADX`, 20+ more
- Variables: `StopLoss`, `TakeProfit`, `Cash`

**Predicates** — return a `bool` (entry/exit conditions)
- Logic: `And`, `Or`, `Not`
- Signals: `Crossover`, `Threshold`, `Peak`, `Trough`, `Shifted`, `Delay`, `Repeat`, `Follows`, `Sequence`
- Patterns: candlestick patterns, `Session`, `Interval`, `Wick`

Each component has two classes:
- **Runtime class** (`Add`, `EMA`, etc.) — implements `.calculate()` or `.condition()`
- **Pydantic model** (`AddModel`, `EMAModel`, etc.) — validates JSON schema; has `.build()` → runtime class

Central union types live in `backend/ai/schemas.py`:
- `AnyExpression` — union of all expression model types
- `AnyPredicate` — union of all predicate model types

### Strategy Hierarchy

```
StrategyModel
  └── RuleModel[]
        ├── trade: "long" | "short"
        ├── filter: AnyPredicate
        ├── entry: AnyPredicate
        ├── exit: AnyPredicate
        ├── stop_loss: AnyExpression
        ├── take_profit: AnyExpression
        └── sizing: AnyExpression
```

### Frontend Routing

```
/web/src/app/
├── page.tsx               # Home / marketing
├── about/page.tsx         # About page
├── layout.tsx             # Root layout (AuthProvider, UserProvider, ModalProvider)
├── auth/login/page.tsx
├── auth/signup/page.tsx
├── dashboard/page.tsx     # Main trading dashboard
└── api/
    ├── backtest/route.ts  # Proxy → FastAPI /api/backtest
    ├── chat/route.ts      # Proxy → FastAPI /api/chat (SSE passthrough)
    └── tickers/route.ts   # NASDAQ ticker list (revalidates daily)
```

### Dashboard Layout (current — Phase 4)

```
┌─ Header ──────────────────────────────────────────────────────────┐
├─ PanelGroup (horizontal, react-resizable-panels) ─────────────────┤
│  Left panel (62%)             │  Right panel (38%)                 │
│  ┌─ Tab bar ───────────────┐  │  BacktestWidget (collapsible)      │
│  │ Live Chart | Backtest   │  │    AssetSelector, CashSelector,    │
│  └─────────────────────────┘  │    DurationSelector,               │
│  ChartWidget (TradingView TV.js│    TimeframeSelector,             │
│   full embed) — "Live Chart"  │    StrategySelector,               │
│                               │    RUN BACKTEST button             │
│  BacktestResultsPanel          │                                   │
│    Chart.tsx (lw-charts v5)   │  ChatWidget                        │
│    Metrics.tsx                │    SSE streaming, StrategyCard     │
└───────────────────────────────┴───────────────────────────────────┘
```

### Dashboard Layout (Phase 5 target)

```
┌─ Header ──────────────────────────────────────────────────────────────────┐
├─ BacktestToolbar (48px ribbon) ────────────────────────────────────────────┤
│  [Asset ▾] [Duration ▾] [Timeframe ▾] [Capital ▾] [Strategy ▾] [▶ RUN]   │
├─ Main workspace ──────────────────────────────────────────┬─ ChatSidebar ─┤
│                                                            │  (300px,      │
│   Chart.tsx (lightweight-charts v5) — full width          │  collapsible) │
│   candlestick + equity overlay + trade markers            │               │
│                                                            │               │
├─ MetricsStrip (40px) ─────────────────────────────────────┤               │
│  [Trades] [Win%] [Sharpe] [Drawdown] [Return]  ← click → drawer           │
└───────────────────────────────────────────────────────────┴───────────────┘
```

---

## Key Files

| File | Role |
|---|---|
| `backend/main.py` | FastAPI app; `/api/backtest` and `/api/chat` (SSE) |
| `backend/backtest.py` | Orchestrates full backtest pipeline |
| `backend/simulator/simulator.py` | Core candle-by-candle simulation engine |
| `backend/simulator/metrics.py` | Sharpe, drawdown, XIRR, win rate, equity curves |
| `backend/strategies/rule.py` | `Rule` — holds predicates and expressions, generates trades |
| `backend/strategies/strategy.py` | `Strategy` — ordered list of `Rule` objects |
| `backend/ai/schemas.py` | Pydantic union types; central validation hub |
| `backend/ai/prompt.py` | System prompt builder — single source of truth for LLM schema |
| `backend/ai/llm_service.py` | `LLMService` — Anthropic streaming, tool-use, retry loop |
| `backend/data/loader.py` | `load_yfinance_data()` — downloads OHLCV from Yahoo Finance |
| `backend/components/trades/base.py` | Abstract `Trade` (long/short subclasses) |
| `web/src/app/dashboard/page.tsx` | Main dashboard layout and tab orchestration |
| `web/src/components/dashboard/backtest/Chart.tsx` | Backtest chart (lightweight-charts v5) |
| `web/src/components/dashboard/backtest/BacktestWidget.tsx` | Engine input panel (to become top ribbon in Phase 5) |
| `web/src/components/dashboard/backtest/BacktestResultsPanel.tsx` | Thin orchestrator for Chart + Metrics |
| `web/src/components/dashboard/backtest/Metrics.tsx` | Key Metrics card + Comparison table (to become MetricsStrip in Phase 5) |
| `web/src/components/dashboard/chart/ChartWidget.tsx` | TradingView TV.js embed — **to be retired in Phase 5** |
| `web/src/components/dashboard/chat/ChatWidget.tsx` | AI chat with SSE streaming |
| `web/src/components/dashboard/chat/StrategyCard.tsx` | "Use this strategy" button → localStorage |
| `web/src/contexts/AuthContext.tsx` | Firebase auth provider; exposes `useAuth()` |
| `web/src/app/globals.css` | Tailwind 4 theme tokens (surfaces, borders, accents, typography) |

---

## Design Tokens (globals.css)

All Tailwind classes in the project use these custom tokens — never hardcoded hex values in new components:

| Token | Value | Use |
|---|---|---|
| `surface-base` | `#0A0A0B` | Page background |
| `surface-card` | `#111113` | Panel backgrounds |
| `surface-raised` | `#1A1A1C` | Input backgrounds |
| `border-subtle` | `#27272A` | Dividers, borders |
| `accent-blue` | `#2563EB` | Primary CTA, icons |
| `accent-cyan` | `#06B6D4` | AI chat accent |
| `accent-green` | `#10B981` | Success, run button |
| `accent-red` | `#EF4444` | Errors, bearish |
| `accent-amber` | `#F59E0B` | Benchmark, warnings |
| `content-primary` | `#F4F4F5` | Body text |
| `content-muted` | `#71717A` | Labels, hints |

Fonts: `font-sans` (Inter) and `font-mono` (JetBrains Mono) — both defined as CSS variables in `layout.tsx`.

The chart internals (`Chart.tsx`) use hardcoded hex constants matching these tokens for direct use in the lightweight-charts API (which does not read CSS variables).

---

## Engine Architecture (Non-Negotiable)

The backtesting engine is the custom `Simulator` class in `backend/simulator/`. This decision is final. Do not introduce LEAN, backtrader, backtesting.py, or vectorbt.

### Engine Invariants

These constraints apply to all simulator code:

1. **No same-bar entry.** Entry price must be `df['Open'].iloc[i+1]` (next bar's open), never `df['Close'].iloc[i]`. Check `i + 1 < len(df)` before entry.
2. **Cash is finite.** `_portfolio_value` must be decremented by `trade.cost()` before a trade is accepted. Never open a trade when `_portfolio_value < trade.cost()`.
3. **Equity = cash + notional.** During open positions, equity is `_portfolio_value + sum(size * current_price)` for longs and `_portfolio_value + sum(size * (2 * entry_price - current_price))` for shorts.
4. **Short/Long selection.** Use `Long if self.trade_type == 'long' else Short`. Never `Long if 'long' else Short` (always truthy).
5. **Sizing of zero suppresses trade.** Do not apply an `or 1.0` fallback to sizing expressions.
6. **Pre-compute indicators.** Call `extract_all_series(strategy)` and warm up all `Series` before the simulation loop.

---

## Coding Conventions

### Python / Backend

- **Always implement new strategy components as modular Python classes.** Every component must have a runtime class (logic) and a corresponding Pydantic model class (schema + `.build()`). Do not add logic directly to route handlers.
- **All request and response bodies must be Pydantic models.** Never use raw `dict` for API I/O.
- **Register new component types in `backend/ai/schemas.py`.** Add to `AnyExpression` or `AnyPredicate` and call `model_rebuild()` to resolve forward references.
- **Expressions** must implement `calculate(i: int, df: DataFrame, **kwargs) -> Optional[float]`.
- **Predicates** must implement `condition(i: int, df: DataFrame, **kwargs) -> bool`.
- **Trades** (long/short) must subclass `Trade` from `backend/components/trades/base.py`.
- **Do not use LEAN, backtrader, backtesting.py, or vectorbt.**
- **Indicators use composite column names.** Name format: `{INDICATOR}_{period}_{input}` (e.g., `EMA_14_close`).
- Use `pandas-ta` for indicator computation; do not implement indicators from scratch.
- Keep data fetching isolated in `backend/data/`; strategies and simulators must not call `yfinance` directly.

### TypeScript / Frontend

- **Use Tailwind CSS exclusively for styling.** No inline styles or CSS modules. Always use the design tokens from `globals.css` (e.g., `bg-surface-card`, `text-content-muted`, `border-border-subtle`).
- **Use the `"use client"` directive** only when a component needs browser APIs or React hooks. Default to server components.
- **All backend calls go through Next.js API routes.** Components never fetch `localhost:8000` directly.
- **Use React Context + hooks** (`useAuth`, `useUser`, `useModal`) for shared state. Do not introduce a third-party state library.
- **Type all API request/response shapes** with TypeScript interfaces. Do not use `any`.
- **Charts use `lightweight-charts` v5 exclusively.** Do not use recharts for any new chart components (it is installed but unused and will be removed).
- Keep chart and visualization logic inside `components/dashboard/`; do not add chart code to page files.
- Authentication is Firebase-only.
- **Sidebar/panel open/closed state persists via `localStorage`**, not React state, so it survives navigation.

### Phase 5 UI Architecture Rules

- **No tab split.** The dashboard has one workspace — the chart. The "Live Chart" / "Backtest Results" tab bar is eliminated.
- **Top ribbon for backtest inputs.** Asset, Duration, Timeframe, Capital, Strategy, and Run Backtest all live in a 48px toolbar above the chart. `BacktestWidget` is refactored into a `BacktestToolbar` ribbon component; the right-panel `BacktestWidget` is removed.
- **AI chat is a collapsible 300px right sidebar.** `ChatWidget` content is unchanged; only its container changes. Open/closed state persists in `localStorage`.
- **Metrics are a bottom strip.** `Metrics.tsx` is replaced by a `MetricsStrip` (40px row of KPI chips) + `MetricsDrawer` (expandable detail view). The always-visible metrics block below the chart is eliminated.
- **`ChartWidget.tsx` (TradingView TV.js embed) is retired.** The file will be deleted; the "Live Chart" tab no longer exists.

### Phase 7 Monetization Architecture Rules

- **Stripe is the payment provider.** Stripe Checkout (hosted) + Stripe Billing + Stripe Customer Portal. Never store card data.
- **Entitlement enforcement is in Next.js API routes only.** FastAPI remains stateless — it has no knowledge of subscription tiers.
- **Tier state lives in Firestore** `users/{uid}` document: `{ tier, stripe_customer_id, subscription_status }`.
- **Stripe webhooks write to Firestore.** A dedicated `/api/stripe/webhook` route handles `customer.subscription.*` events.
- **Rate limits use a Firestore counter** `usage/{uid}/daily`, reset at UTC midnight.
- **A `402` response from any API route triggers the upgrade modal** on the frontend.

### Phase 8 LLM Cost Architecture Rules

- `LLMService` already defaults to `claude-haiku-4-5-20251001` — this is correct and intentional.
- Do not change the default model to Sonnet or Opus without a documented reason.
- Prompt caching on the schema block is already implemented — do not remove `cache_control`.
- Future routing: `LLM_MODEL_STRATEGY` and `LLM_MODEL_CHAT` env vars will allow independent model selection for strategy generation vs conversational chat.

### General

- No comments unless the **why** is non-obvious (a workaround, hidden constraint, or subtle invariant).
- No speculative abstractions — only add a layer when three concrete cases already exist.
- Prefer editing existing files over creating new ones.
- Keep backend and frontend concerns strictly separated; no business logic in Next.js API routes beyond proxying and entitlement checks.
