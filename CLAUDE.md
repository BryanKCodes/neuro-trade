# NeuroTrade — CLAUDE.md

NeuroTrade is a full-stack algorithmic trading strategy backtesting platform. Users define strategies via a JSON DSL (or AI-generated prompts), which are validated by Pydantic, executed by a custom simulation engine, and visualized in a Next.js dashboard.

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
| Layer | Technology |
|---|---|
| Framework | Next.js 15.4.5 (App Router) |
| Language | TypeScript 5 (strict mode) |
| UI | React 19 |
| Styling | Tailwind CSS 4 |
| Charts | Recharts 3 |
| Auth | Firebase 12 + react-firebase-hooks |
| AI Client | openai 5 SDK |
| Layout | react-resizable-panels |

### Backend (`/backend`)
| Layer | Technology |
|---|---|
| Framework | FastAPI |
| Language | Python 3 |
| Data | yfinance + pandas 2 |
| Simulation | Custom simulator (no backtrader at runtime) |
| Indicators | pandas-ta |
| Validation | Pydantic 2 |
| Returns | pyxirr (XIRR/TWR/MWR) |

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
├── page.tsx               # Home / auth redirect
├── layout.tsx             # Root layout (AuthProvider, UserProvider, ModalProvider)
├── auth/login/page.tsx
├── auth/signup/page.tsx
├── dashboard/page.tsx     # Main trading dashboard
└── api/
    ├── backtest/route.ts  # Proxy → FastAPI /api/backtest
    ├── chat/route.ts      # Proxy → FastAPI /api/chat
    └── tickers/route.ts   # NASDAQ ticker list (revalidates daily)
```

Dashboard layout uses `react-resizable-panels` — 65% chart/backtest pane, 35% chat pane.

---

## Key Files

| File | Role |
|---|---|
| `backend/main.py` | FastAPI app; defines `/api/backtest` and `/api/chat` |
| `backend/backtest.py` | Orchestrates full backtest pipeline |
| `backend/simulator/simulator.py` | Core candle-by-candle simulation engine |
| `backend/simulator/metrics.py` | Sharpe, drawdown, XIRR, win rate, equity curves |
| `backend/strategies/rule.py` | `Rule` — holds predicates and expressions, generates trades |
| `backend/strategies/strategy.py` | `Strategy` — ordered list of `Rule` objects |
| `backend/ai/schemas.py` | Pydantic union types; central validation hub |
| `backend/ai/prompt.py` | Generates AI prompt from schema for strategy suggestions |
| `backend/data/loader.py` | `load_yfinance_data()` — downloads OHLCV from Yahoo Finance |
| `backend/components/trades/base.py` | Abstract `Trade` (long/short subclasses) |
| `web/src/app/layout.tsx` | Wraps app in Firebase + context providers |
| `web/src/app/dashboard/page.tsx` | Main dashboard page |
| `web/src/contexts/AuthContext.tsx` | Firebase auth provider; exposes `useAuth()` |
| `web/src/components/dashboard/` | Chart, Backtest, and Chat widgets |

---

## Engine Architecture (Non-Negotiable)

The backtesting engine is the custom `Simulator` class in `backend/simulator/`. This decision is final and documented in `ARCHITECTURE_DECISION.md`. Do not introduce LEAN, backtrader, backtesting.py, or vectorbt.

### Engine Invariants

These constraints apply to all simulator code. Violating them introduces financial calculation bugs:

1. **No same-bar entry.** Entry price must be `df['Open'].iloc[i+1]` (next bar's open), never `df['Close'].iloc[i]`. Check `i + 1 < len(df)` before entry.
2. **Cash is finite.** `_portfolio_value` must be decremented by `trade.cost()` before a trade is accepted. Never open a trade when `_portfolio_value < trade.cost()`.
3. **Equity = cash + notional.** During open positions, equity is `_portfolio_value + sum(size * current_price)` for longs and `_portfolio_value + sum(size * (2 * entry_price - current_price))` for shorts. Never just PnL delta.
4. **Short/Long selection.** Use `Long if self.trade_type == 'long' else Short`. Never `Long if 'long' else Short` (always truthy).
5. **Sizing of zero suppresses trade.** Do not apply an `or 1.0` fallback to sizing expressions. Zero means do not trade.
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
- **Do not use LEAN, backtrader, backtesting.py, or vectorbt.** The project uses the custom `Simulator` class. See `ARCHITECTURE_DECISION.md`.
- **Indicators use composite column names.** Name format: `{INDICATOR}_{period}_{input}` (e.g., `EMA_14_close`). Never use bare names like `EMA_14` — they collide when the same indicator is used with different inputs.
- Use `pandas-ta` for indicator computation; do not implement indicators from scratch.
- Keep data fetching isolated in `backend/data/`; strategies and simulators must not call `yfinance` directly.

### TypeScript / Frontend

- **Use Tailwind CSS exclusively for styling.** Do not write inline styles or CSS modules.
- **Use the `"use client"` directive** only when a component needs browser APIs or React hooks. Default to server components.
- **All backend calls go through Next.js API routes.** Components never fetch `localhost:8000` directly.
- **Use React Context + hooks** (`useAuth`, `useUser`, `useModal`) for shared state. Do not introduce a third-party state library.
- **Type all API request/response shapes** with TypeScript interfaces. Do not use `any`.
- Keep chart and visualization logic inside `components/dashboard/`; do not add chart code to page files.
- Authentication is Firebase-only. Do not add other auth providers without updating `AuthContext`.

### General

- No comments unless the **why** is non-obvious (a workaround, hidden constraint, or subtle invariant).
- No speculative abstractions — only add a layer when three concrete cases already exist.
- Prefer editing existing files over creating new ones.
- Keep backend and frontend concerns strictly separated; no business logic in Next.js API routes beyond proxying.
