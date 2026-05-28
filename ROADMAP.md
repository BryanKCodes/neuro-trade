# NeuroTrade — Product Roadmap

**Vision**: A no-code algorithmic trading platform where a user describes a strategy in plain English, an LLM translates it into a validated JSON DSL, and a professional-grade backtesting engine executes it — all without writing a single line of code.

**Core loop**:
```
User prompt → LLM → JSON DSL → Pydantic validation → Strategy classes → Custom Simulator → Results → Dashboard
```

**Engine decision**: Custom Simulator (Path C). See `ARCHITECTURE_DECISION.md` for the full evaluation.

**Guiding principle**: Each phase must leave the app in a fully working, deployable state. No phase breaks what the previous phase built.

---

## Completed Phases

### Phase 1 — Foundation & Authentication ✓
- Firebase Authentication (email/password + Google SSO)
- Home page, About page, auth flows
- Dashboard gated behind authentication

### Phase 2 — Dashboard & Charting ✓
- `lightweight-charts` v5 backtest chart (`backtest/Chart.tsx`) with candlestick, dual Y-axes, equity/benchmark lines, trade markers, OHLC header, series toggle legend
- Resizable panel layout (`react-resizable-panels`)
- Backtest input widgets (AssetSelector, DurationSelector, TimeframeSelector, CashSelector, StrategySelector)
- Metrics panel (Sharpe, drawdown, XIRR, win rate, comparison table)

### Phase 3 — Engine Integrity ✓
- Cash accounting, next-bar entry (no look-ahead bias), equity correctness
- Short trade fix, sizing-zero suppression
- Composite indicator column names (`{INDICATOR}_{period}_{input}`), pre-computation warm-up pass
- Commission model, slippage, max open trades guard
- Extended metrics: Sortino, Calmar, profit factor, average trade duration

### Phase 4 — AI Strategy Generation ✓
- `LLMService` (`backend/ai/llm_service.py`) with Anthropic async streaming, tool-use (`update_strategy`), 3-attempt Pydantic retry loop
- Prompt caching on schema block (ephemeral `cache_control`) — already active
- Default model: `claude-haiku-4-5-20251001` — already cost-optimized
- `LLM_MODEL` env var for model override
- `/api/chat` FastAPI SSE endpoint
- `ChatWidget` with SSE streaming (`text_delta`, `tool_start`, `strategy`, `error`, `done`)
- `StrategyCard` with "Use this strategy" button → `localStorage`

**Remaining Phase 4 items:**
- [ ] Firestore strategy persistence (`users/{uid}/strategies` collection — save/load named strategies)
- [ ] Integration test: 10 diverse English prompts all pass Pydantic validation on first attempt

---

## Phase 5 — Dashboard UI/UX Overhaul (Current Priority)

**Goal**: Eliminate the cluttered two-tab layout. Replace it with a single professional workspace: top ribbon for backtest inputs, full-width chart, collapsible AI sidebar, metrics bottom strip.

**What actually needs to change** (cross-referenced with codebase):
- `dashboard/page.tsx` — restructure layout entirely; remove `PanelGroup`, add ribbon + single chart workspace + sidebar
- `backtest/BacktestWidget.tsx` — refactor inputs from panel component into ribbon component
- `dashboard/chart/ChartWidget.tsx` — **delete this file**; the TradingView TV.js embed is retired
- `backtest/BacktestResultsPanel.tsx` — simplify; Chart fills the workspace directly, no more stacked layout
- `backtest/Metrics.tsx` — replace with MetricsStrip + MetricsDrawer pattern
- `chat/ChatWidget.tsx` — content unchanged; only its container/wrapper changes

### 5.1 — Retire the Live Chart Tab

The current "Live Chart" tab renders `ChartWidget.tsx`, which embeds the full TradingView.com TV.js widget. This tab and component are eliminated entirely. The `lightweight-charts` backtest chart becomes the one and only chart surface.

- [ ] Delete `web/src/components/dashboard/chart/ChartWidget.tsx`
- [ ] Delete the `chart/` directory under `components/dashboard/`
- [ ] Remove `ChartWidget` import and the "Live Chart" tab from `dashboard/page.tsx`
- [ ] Remove the `activeTab` state and `TabButton` component from `dashboard/page.tsx`

### 5.2 — Top Ribbon / Backtest Toolbar

Move all engine inputs from `BacktestWidget` (right panel) into a compact 48px horizontal toolbar above the chart. `BacktestWidget` is replaced by `BacktestToolbar`.

All input selectors (`AssetSelector`, `DurationSelector`, `TimeframeSelector`, `CashSelector`, `StrategySelector`) already exist as ref-based components — they only need a new parent container.

- [ ] Create `web/src/components/dashboard/toolbar/BacktestToolbar.tsx`
  - Single `<div>` row, 48px height, `border-b border-border-subtle bg-surface-card`
  - Imports and lays out all five existing selector refs in a horizontal flex row
  - Includes the "▶ Run Backtest" button (same `handleRun` logic as `BacktestWidget`)
  - Calls `onResult(data)` callback to pass backtest result up to the page
- [ ] Remove `BacktestWidget` from `dashboard/page.tsx`; render `BacktestToolbar` between Header and chart
- [ ] Delete `web/src/components/dashboard/backtest/BacktestWidget.tsx` once toolbar is wired

### 5.3 — Collapsible AI Chat Sidebar

`ChatWidget` content is already correct — only its container changes. The right panel becomes a fixed 300px sidebar that can be toggled closed.

- [ ] In `dashboard/page.tsx`, replace the `react-resizable-panels` layout with a plain `flex` row:
  - Left: `flex-1 min-w-0` chart workspace
  - Right: `w-[300px] shrink-0` sidebar, hidden when closed (`hidden` or `w-0 overflow-hidden`)
- [ ] Add a chevron toggle button on the right edge of the chart area to open/close the sidebar
- [ ] Persist sidebar open/closed state in `localStorage` key `"chatSidebarOpen"`
- [ ] Remove `react-resizable-panels` import from `dashboard/page.tsx` (can keep the package for now in case it's used elsewhere; remove it from `package.json` when confirmed unused)

### 5.4 — Metrics Bottom Strip + Drawer

Replace the always-visible two-column metrics block below the chart with a compact 40px strip and an expandable drawer.

The existing `Metrics.tsx` rendering logic (MetricItem, ComparisonTable) is reused inside the drawer — no metrics calculation changes.

- [ ] Create `web/src/components/dashboard/backtest/MetricsStrip.tsx`
  - 40px height, single flex row of KPI chips: Trades · Win Rate · Sharpe · Max Drawdown · Total Return
  - Shows dashes (`—`) before a backtest runs; chips populate on `setData()`
  - Clicking any chip (or a dedicated expand icon) sets `drawerOpen = true`
  - `setData()` exposed via `useImperativeHandle` (same pattern as `Metrics`)
- [ ] Create `web/src/components/dashboard/backtest/MetricsDrawer.tsx`
  - Full metrics detail (reuses `MetricItem` and `ComparisonTable` from `Metrics.tsx`)
  - Slides up from bottom or overlays with `fixed bottom-0`; closes on click-outside or Escape
- [ ] Update `BacktestResultsPanel.tsx` to render `MetricsStrip` instead of `Metrics`
- [ ] Keep `Metrics.tsx` until drawer is wired; then consolidate or delete

### 5.5 — Dependency Cleanup

- [ ] Remove `recharts` from `web/package.json` (confirmed zero usage in source)
- [ ] Remove `openai` from `web/package.json` (confirmed zero usage in source)
- [ ] Remove `backtrader` from `backend/requirements.txt` (not imported in any source file)
- [ ] Remove `mplfinance` and `matplotlib` from `backend/requirements.txt` if confirmed unused after full audit

### 5.6 — Deliverables & Verification

- [ ] `dashboard/page.tsx` — new layout: ribbon + chart workspace + collapsible sidebar
- [ ] `toolbar/BacktestToolbar.tsx` — all engine inputs in a 48px ribbon
- [ ] `ChartWidget.tsx` deleted; `chart/` directory deleted
- [ ] `BacktestWidget.tsx` deleted
- [ ] `MetricsStrip.tsx` + `MetricsDrawer.tsx`
- [ ] Zero regressions: backtest runs, chart renders, SSE chat works, strategy card appears
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] Sidebar open/close toggle works and persists on page refresh

---

## Phase 6 — Landing Pages & UX Transitions

**Goal**: Professional marketing pages and smooth loading transitions to the dashboard.

### 6.1 — Home Page Overhaul

- [ ] Hero section: headline, sub-headline, single CTA ("Start for free")
- [ ] Feature grid: 3–4 cards (AI generation, backtesting, metrics, no-code)
- [ ] Demo/preview section: static screenshot of the Phase 5 dashboard
- [ ] Pricing section (mirroring Phase 7 tiers)
- [ ] Footer: links, legal

### 6.2 — About Page

- [ ] Mission statement, tech stack callouts, team section (placeholder-ready)
- [ ] Consistent dark theme using design tokens from `globals.css`

### 6.3 — Loading Transitions

- [ ] `next/dynamic` with `loading` skeleton for heavy dashboard components (chart, chat)
- [ ] `DashboardSkeleton.tsx` — placeholder panels matching Phase 5 layout
- [ ] `opacity` fade-in via Tailwind on dashboard mount (eliminates white flash on hydration)

### 6.4 — Deliverables

- [ ] `web/src/app/page.tsx` — hero, features, pricing, footer
- [ ] `web/src/app/about/page.tsx` — brand page
- [ ] `web/src/components/DashboardSkeleton.tsx`
- [ ] Tailwind only; no new CSS files

---

## Phase 7 — SaaS Monetization & Subscriptions

**Goal**: Stripe-based subscription tiers, entitlement enforcement at the Next.js proxy layer, upgrade flow.

### 7.1 — Subscription Tiers

| Feature | Free | Pro ($29/mo) | Max ($149/mo) |
|---|---|---|---|
| AI strategy generations | 3 / day | 50 / day | Unlimited |
| Backtest history | 1 year | 5 years | 20+ years |
| Saved strategies | 3 | Unlimited | Unlimited |
| Timeframes | Daily only | All (1m → W) | All |
| Metrics | 5 core | Full suite (15+) | Full suite |
| Multi-asset backtest | ✗ | ✗ | Up to 10 |
| Portfolio simulation | ✗ | ✗ | ✓ |
| Strategy export (PDF/JSON) | ✗ | ✓ | ✓ |
| API access | ✗ | ✗ | ✓ |
| Support | Community | Email | Priority |

### 7.2 — Stripe Integration

- [ ] Install `stripe` (Node SDK), `@stripe/stripe-js` (browser)
- [ ] `web/src/app/api/stripe/create-checkout/route.ts` — creates Stripe Checkout Session
- [ ] `web/src/app/api/stripe/webhook/route.ts` — handles `customer.subscription.created/updated/deleted`; writes `{ tier, stripe_customer_id, subscription_status }` to Firestore `users/{uid}`
- [ ] `web/src/app/api/stripe/portal/route.ts` — Stripe Customer Portal session for self-serve management
- [ ] Stripe product/price IDs stored in `.env.local`; never hardcoded

### 7.3 — Entitlement Enforcement (Next.js proxy layer only — FastAPI stays stateless)

- [ ] `web/src/lib/entitlements.ts` — `getUserTier(uid): "free" | "pro" | "max"` reads Firestore via Firebase Admin SDK
- [ ] `web/src/lib/rateLimit.ts` — increments Firestore counter `usage/{uid}/daily`; resets at UTC midnight
- [ ] `/api/chat/route.ts` — checks generation limit before proxying; returns `402 { code: "LIMIT_REACHED" }` if exceeded
- [ ] `/api/backtest/route.ts` — checks `lookback_months` against tier limit; returns `402` if exceeded

### 7.4 — Upgrade Flow

- [ ] `web/src/components/UpgradeModal.tsx` — triggered on any `402` response; tier comparison + CTA
- [ ] `web/src/app/pricing/page.tsx` — full pricing page; also embedded in home page
- [ ] `useSubscription()` hook — reads Firestore tier in real time; exposes `{ tier, generationsUsedToday, canGenerate }`

### 7.5 — Deliverables & Verification

- [ ] Stripe routes, webhook, portal
- [ ] `entitlements.ts`, `rateLimit.ts`
- [ ] `UpgradeModal.tsx`, `/pricing` page
- [ ] Manual test: free user hits limit → upgrade modal; Pro user does not
- [ ] Manual test: Stripe subscription cancel → Firestore tier reverts within one webhook cycle

---

## Phase 8 — LLM Cost Optimisation & Multi-Provider Routing

**Goal**: Reduce per-prompt cost further via intent-based routing. Prompt caching and Haiku default are already active — what remains is separating the chat and strategy models.

**Current state**: `claude-haiku-4-5-20251001` is already the default model in `llm_service.py`. Prompt caching on the schema block is already implemented. This phase is lower priority than previously described.

### 8.1 — Model Router

- [ ] `backend/ai/model_router.py` — `classify_intent(message: str) -> "chat" | "strategy"`
  - Keyword heuristics first (regex on "generate", "build", "create", "strategy", "modify")
  - Falls back to a single-token LLM call if ambiguous
- [ ] Update `LLMService.__init__` to read `LLM_MODEL_STRATEGY` and `LLM_MODEL_CHAT` env vars independently (currently only `LLM_MODEL` exists)
- [ ] Add `LLM_MODEL_STRATEGY` and `LLM_MODEL_CHAT` to `backend/.env.example`
- [ ] Route pure chat messages to `LLM_MODEL_CHAT` (skip tool-use overhead entirely for non-strategy turns)

### 8.2 — Model Evaluation

Test these alternatives against the 10-prompt integration test suite before committing to any:

| Model | Provider | Input / 1M tokens | Notes |
|---|---|---|---|
| DeepSeek-V3 | Fireworks AI | ~$0.90 | Best price/quality for JSON DSL |
| Gemini 2.0 Flash | Google AI | ~$0.075 | Native JSON mode; lowest cost |
| Claude Haiku 4.5 | Anthropic | ~$0.80 | Already default; zero infra change |

- [ ] Document first-attempt Pydantic pass rate per model in `backend/ai/COST_BENCHMARK.md`

### 8.3 — Cost Guardrails

- [ ] Per-request token budget: reject prompts > 500 tokens before LLM call
- [ ] Log `cache_read_input_tokens` vs `input_tokens` per request; alert if cache hit rate < 70%

---

## Phase 9 — Multi-Asset & Portfolio Simulation

**Goal**: Simulate strategies across multiple tickers with a shared capital pool.

### 9.1 — Multi-Asset Data

- [ ] Extend `data/loader.py` to accept a list of tickers; return `Dict[str, pd.DataFrame]`
- [ ] Align DataFrames on a common datetime index (outer join, forward-fill gaps)

### 9.2 — Portfolio Simulator

- [ ] `backend/simulator/portfolio_simulator.py` — wraps multiple `Simulator` instances
- [ ] Shared `_portfolio_value` pool; allocation rules per asset

### 9.3 — Portfolio Metrics

- [ ] Portfolio-level Sharpe, drawdown, correlation matrix
- [ ] Per-asset return contribution

---

## Phase 10 — Infrastructure & SaaS Launch

### 10.1 — Deployment

- [ ] Containerise FastAPI with Docker; deploy on Fly.io or Railway
- [ ] Next.js on Vercel; `NEXT_PUBLIC_BACKEND_API_URL` points to Fly.io URL in production

### 10.2 — Async Backtesting

- [ ] Long-running backtests (>5s) queued via Celery + Redis
- [ ] Frontend polls `/api/backtest/status/{job_id}`; result stored in Firestore

### 10.3 — Observability

- [ ] Structured JSON logging with request IDs (`structlog`)
- [ ] Sentry for frontend (`@sentry/nextjs`) and backend (`sentry-sdk`)

### 10.4 — Security Hardening

- [ ] Firebase Admin SDK verifies ID tokens in Next.js middleware before any proxied request
- [ ] Rate limiting on `/api/backtest` and `/api/chat` (Redis-backed, per-user)
- [ ] CORS locked to production domain in FastAPI

---

## Dependency Map

```
Phases 1–4 (Complete) ──► Phase 5 (UI Overhaul)  ← CURRENT
                               │
                               ├──► Phase 6 (Landing Pages)
                               │
                               └──► Phase 7 (Monetisation)
                                         │
                                         ├──► Phase 8 (LLM Routing)
                                         │
                                         └──► Phase 9 (Portfolio)
                                                   │
                                                   └──► Phase 10 (Launch)
```

---

## Invariants — What Must Never Break

1. Firebase authentication (login, signup, Google SSO) works on every branch.
2. `POST /api/backtest` returns a valid equity curve and metrics JSON.
3. `POST /api/chat` returns a valid SSE stream with a `done` event.
4. The dashboard renders without errors for an authenticated user.
5. All Pydantic models validate the same JSON they validated before (backwards compatibility).
6. `npm run build` passes with zero TypeScript errors.
7. `uvicorn main:app` starts without import errors.
8. Cash cannot go negative during any simulation.
9. All new strategy components follow the dual-class pattern (runtime + Pydantic model with `.build()`).
10. No business logic lives in Next.js API routes beyond proxying and entitlement checks.
