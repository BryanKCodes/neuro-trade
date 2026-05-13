# NeuroTrade — Product Roadmap

**Vision**: A no-code algorithmic trading platform where a user describes a strategy in plain English, an LLM translates it into a validated JSON DSL, and a professional-grade backtesting engine executes it — all without writing a single line of code.

**Core loop**:
```
User prompt → LLM → JSON DSL → Pydantic validation → Strategy classes → LEAN engine → Backtest results → Dashboard
```

**Guiding principle**: Each phase must leave the app in a fully working, deployable state. No phase breaks what the previous phase built.

---

## Phase 1 — Foundation & Public-Facing Web

**Goal**: Establish brand identity and build the public-facing pages that convert visitors into users.

**Status of existing work**:
- Firebase Authentication (email/password + Google SSO) is complete.
- A blank Home page (`/web/src/app/page.tsx`) and auth flows (`/auth/login`, `/auth/signup`) exist.
- The dashboard is gated behind authentication.

---

### 1.1 Brand Identity

**Color palette — "Quant Dark"**

| Token | Hex | Usage |
|---|---|---|
| `bg-primary` | `#0A0E1A` | Page backgrounds |
| `bg-surface` | `#111827` | Cards, panels, sidebars |
| `bg-elevated` | `#1C2333` | Hover states, active panels |
| `border` | `#1F2D40` | Dividers, input borders |
| `accent-blue` | `#2563EB` | Primary CTAs, links, active indicators |
| `accent-cyan` | `#06B6D4` | Chart lines, highlight accents |
| `accent-green` | `#10B981` | Profit, positive PnL |
| `accent-red` | `#EF4444` | Loss, negative PnL, alerts |
| `accent-amber` | `#F59E0B` | Warnings, pending states |
| `text-primary` | `#F1F5F9` | Body copy |
| `text-muted` | `#64748B` | Labels, secondary text |

All colors are defined as Tailwind CSS custom tokens in `tailwind.config.ts`. Never hardcode hex values in components.

**Typography**:
- Headings: `Inter` (variable weight, tight tracking)
- Monospace / data: `JetBrains Mono` or `Fira Code` (ticker symbols, prices, code blocks)
- Body: `Inter` at `text-sm` / `text-base`

**UI/UX guidelines**:
- Minimum contrast ratio 4.5:1 for all text (WCAG AA).
- Borders are always `1px` — never `2px` on interior elements.
- Rounded corners: `rounded-md` (4px) for inputs/chips, `rounded-lg` (8px) for cards, `rounded-xl` (12px) for modals.
- Shadows: use `ring-1 ring-white/5` instead of `shadow-*` on dark surfaces.
- Animations: `transition-all duration-150` maximum — no slow fades on interactive elements.
- Loading states: skeleton loaders (animated `bg-elevated` divs), never spinners on content areas.

---

### 1.2 Home Page

**Route**: `/` — publicly accessible, redirects authenticated users to `/dashboard`.

**Sections**:

1. **Hero** — Full-viewport headline, subheading, and two CTAs ("Start for free" → `/auth/signup`, "See how it works" → anchor scroll). Animated background: subtle grid or particle field in `accent-blue/5`.

2. **Value proposition strip** — Three horizontal cards:
   - "Describe it" — plain-English prompt input
   - "Validate it" — Pydantic schema + LEAN engine
   - "Backtest it" — equity curve, Sharpe, drawdown

3. **Feature highlights** — Three-column grid (no-code, professional-grade engine, AI-powered), each with an icon, heading, and two-sentence description.

4. **Live demo preview** — Static screenshot or looping MP4 of the dashboard. Drives urgency without requiring auth.

5. **CTA footer banner** — "Ready to build your first strategy?" with signup button.

**Implementation notes**:
- This is a Next.js server component — no `"use client"` directive.
- No API calls from this page.
- Reuse `Header` from `/web/src/components/home/Header.tsx`; extend it with nav links for Home, About, and Login.

---

### 1.3 About Page

**Route**: `/about`

**Sections**:
1. **Mission statement** — One paragraph explaining the platform.
2. **How it works** — Numbered stepper (5 steps matching the core loop above).
3. **Tech stack transparency** — Show LEAN, Claude AI, Firebase, Next.js logos. Builds credibility with quant audience.
4. **FAQ** — 5–7 questions ("Is this paper trading only?", "Which assets are supported?", "How accurate is the AI?").

---

### 1.4 Deliverables for Phase 1

- [ ] `tailwind.config.ts` updated with custom color tokens and font families
- [ ] `web/src/app/page.tsx` — full Home page with all 5 sections
- [ ] `web/src/app/about/page.tsx` — About page
- [ ] `web/src/components/home/Header.tsx` — extended with About + Login nav links
- [ ] `web/src/components/home/Footer.tsx` — links, copyright, social
- [ ] `web/public/fonts/` — Inter + JetBrains Mono loaded via `next/font`

---

## Phase 2 — Complete UI/UX & Charting Overhaul

**Goal**: Replace the current dashboard with an industry-grade trading terminal. Full visual redesign with zero loss of existing functionality.

**Constraint**: All existing state hooks (`useAuth`, `useUser`, `useModal`), API calls (`/api/backtest`, `/api/chat`, `/api/tickers`), and context providers must be preserved exactly. Only the visual layer changes.

---

### 2.1 Dashboard Layout Redesign

**New layout — "Terminal Grid"**:

```
┌──────────────────────────────────────────────────────────────────┐
│  HEADER: Logo | Asset Selector | Timeframe | View Toggle | User  │
├────────────────────────────┬─────────────────────┬───────────────┤
│                            │                     │               │
│   CHART PANEL              │   STRATEGY PANEL    │  CHAT PANEL   │
│   (TradingView LWC         │   (Backtest config  │  (LLM prompt  │
│    or Recharts)            │    + results)       │   + history)  │
│                            │                     │               │
│   ~50%                     │   ~25%              │   ~25%        │
├────────────────────────────┴─────────────────────┴───────────────┤
│  STATUS BAR: Engine status | Last run time | Data source        │
└──────────────────────────────────────────────────────────────────┘
```

All three columns are `react-resizable-panels` — collapsible, draggable, with minimum widths enforced.

**Header changes**:
- Asset search with `fuse.js` fuzzy match (already available) — moves into header as a command-palette style input (`⌘K`).
- Timeframe selector becomes a pill row: `1m | 5m | 15m | 1h | 1d`.
- User avatar stays top-right, unchanged.

---

### 2.2 Charting Library

**Recommendation**: **TradingView Lightweight Charts** (`lightweight-charts` npm package).

| Criteria | Lightweight Charts | Recharts |
|---|---|---|
| Performance on large OHLCV series | Excellent (WebGL canvas) | Moderate (SVG) |
| Candlestick support | Native | Requires custom renderer |
| Real-time updates | Designed for it | Re-renders entire tree |
| Bundle size | ~40 KB | ~300 KB |
| Looks like a real terminal | Yes | No |

**Implementation**:
```
web/src/components/dashboard/chart/
├── ChartContainer.tsx     # "use client" wrapper, initializes LWC instance
├── CandlestickSeries.tsx  # Renders OHLCV candles
├── EquitySeries.tsx       # Renders backtest equity curve overlay
├── ChartControls.tsx      # Timeframe pills, indicator toggles
└── useChartData.ts        # Hook: fetches OHLCV, formats for LWC
```

The existing `ChartWidget.tsx` is replaced by `ChartContainer.tsx`. The API calls inside it are preserved and rewired.

**Backtest equity overlay**: After a backtest runs, the equity curve (currently returned as a time-series by FastAPI) is added as a second line series on the same chart instance, color `accent-cyan`. A legend chip shows TWR / MWR values.

---

### 2.3 Backtest Panel Redesign

**Current state**: Inputs + raw results displayed sequentially.

**New design — two sub-states**:

**State A — Config** (before run):
- Asset, duration, timeframe, cash inputs as a clean form
- Strategy JSON preview panel (read-only, syntax-highlighted with `highlight.js` or Prism)
- "Run Backtest" button — full width, `accent-blue`, shows spinner while pending

**State B — Results** (after run):
```
┌─────────────────────────────┐
│ Metrics grid (2×3)          │
│  Sharpe  | Max DD | Win %   │
│  XIRR    | TWR    | MWR     │
├─────────────────────────────┤
│ Trades table (scrollable)   │
│  Entry | Exit | PnL | Size  │
└─────────────────────────────┘
```
Metrics are color-coded: positive values `accent-green`, negative `accent-red`.

A "← New Backtest" button resets to State A without clearing the strategy.

---

### 2.4 Chat Panel Redesign

- Message bubbles: user messages right-aligned (`bg-elevated`), assistant messages left-aligned (`bg-surface`) with a robot avatar.
- Assistant responses that contain JSON DSL are rendered as collapsible code blocks.
- A "Use this strategy" button appears below valid JSON responses — clicking it populates the Backtest Panel config.
- Input stays at the bottom with a character counter and send button.

---

### 2.5 Deliverables for Phase 2

- [ ] `web/package.json` — add `lightweight-charts`
- [ ] `web/src/components/dashboard/chart/ChartContainer.tsx` — new LWC wrapper
- [ ] `web/src/components/dashboard/chart/useChartData.ts` — data hook
- [ ] `web/src/components/dashboard/backtest/BacktestPanel.tsx` — redesigned with config/results states
- [ ] `web/src/components/dashboard/chat/ChatPanel.tsx` — redesigned message UI
- [ ] `web/src/app/dashboard/page.tsx` — updated to Terminal Grid layout
- [ ] All existing `fetch("/api/...")` calls preserved, only JSX/styling changes

---

## Phase 3 — The LEAN Migration (Core Engine Overhaul)

**Goal**: Replace the custom `Simulator` with QuantConnect's LEAN engine. This phase finalizes the Python architecture and Pydantic schemas — the LLM in Phase 4 will generate JSON targeting these finalized schemas.

**Why LEAN before the LLM**: If the LLM learns to produce JSON for the custom simulator's schema and we later migrate to LEAN, every prompt, example, and schema reference becomes stale. Migrating first means Phase 4 builds on a stable, production-grade foundation.

---

### 3.1 LEAN Architecture Overview

LEAN is an **event-driven** backtesting engine. Instead of the current manual candle loop:

```python
# Current custom simulator (imperative loop)
for i in range(len(df)):
    rule.generate_signal(i, df)
    trade.update(df.iloc[i])
```

LEAN calls into an `Algorithm` class via event handlers:

```python
# LEAN pattern (event-driven)
class MyAlgorithm(QCAlgorithm):
    def Initialize(self):
        self.AddEquity("SPY", Resolution.Daily)

    def OnData(self, data: Slice):
        # Called once per bar — equivalent to one iteration of the current loop
        if self.sma.IsReady and self.Portfolio.Invested is False:
            self.SetHoldings("SPY", 1.0)
```

This is structurally different but conceptually equivalent. The migration is an **adapter pattern**: our existing `Rule`, `Predicate`, and `Expression` classes become the "model layer"; LEAN's `QCAlgorithm` becomes the "execution layer".

---

### 3.2 Adapter Pattern Design

**Goal**: Keep all existing modular component classes (`SMA`, `Crossover`, `Rule`, etc.) and make them usable from within a LEAN `QCAlgorithm`.

**New file**: `backend/lean/algorithm.py`

```python
class NeuroTradeAlgorithm(QCAlgorithm):
    """
    LEAN algorithm that delegates all signal logic to a NeuroTrade Strategy object.
    Acts as the adapter between LEAN's event-driven API and our component DSL.
    """

    def Initialize(self):
        # Called once by LEAN at startup
        self.SetStartDate(...)
        self.SetCash(...)
        self.AddEquity(self.GetParameter("asset"), Resolution.Daily)
        self.strategy: Strategy = build_strategy_from_model(
            json.loads(self.GetParameter("strategy_json"))
        )
        self._bar_index = 0
        self._df = pd.DataFrame()   # populated incrementally in OnData

    def OnData(self, data: Slice):
        # Append the new bar to our running DataFrame
        bar = data[self.asset]
        self._df = append_bar(self._df, bar)
        i = self._bar_index

        for rule in self.strategy.rules:
            signal = rule.generate_signal(i, self._df)
            if signal:
                self._execute_lean_order(signal)

        self._bar_index += 1

    def _execute_lean_order(self, trade: Trade):
        if isinstance(trade, LongTrade):
            self.SetHoldings(self.asset, trade.size)
        elif isinstance(trade, ShortTrade):
            self.SetHoldings(self.asset, -trade.size)
```

**Key principle**: `rule.generate_signal(i, df)` is unchanged. LEAN simply provides the `i` and appends to `df` — our entire component library works without modification.

---

### 3.3 Pydantic Schema Changes for LEAN Compatibility

LEAN introduces constraints that require schema updates:

**1. Resolution field** — LEAN requires an explicit data resolution.
```python
class RuleModel(BaseModel):
    # existing fields...
    resolution: Literal["minute", "hour", "daily"] = "daily"
```

**2. Asset universe** — LEAN requires assets declared at `Initialize` time, not at signal time.
```python
class StrategyModel(BaseModel):
    rules: list[RuleModel]
    assets: list[str]   # new — e.g. ["SPY", "QQQ"]
```

**3. Indicator warm-up** — LEAN needs to know the lookback period to skip the warm-up window. Add a `period` field to all indicator models that don't already have one, and enforce `period >= 1`.

**4. Sizing** — LEAN's `SetHoldings` takes a portfolio fraction (0.0–1.0). The `sizing` Expression must now be validated to return values in `[0, 1]`. Add a `SizingModel` wrapper that clamps the output.

These changes are **backwards-compatible** with the existing schema — all new fields have defaults.

---

### 3.4 LEAN Infrastructure

**Option A — LEAN Docker** (recommended for development):
```bash
docker pull quantconnect/lean:latest
docker run -v $(pwd)/backend:/workspace quantconnect/lean \
  --data-folder /workspace/data \
  --algorithm-location /workspace/lean/algorithm.py
```

**Option B — lean-cli** (recommended for production):
```bash
pip install lean
lean backtest "NeuroTrade Algorithm"
```

**New backend files**:
```
backend/
├── lean/
│   ├── algorithm.py          # QCAlgorithm adapter (see above)
│   ├── runner.py             # Calls lean-cli or Docker; parses output JSON
│   └── result_parser.py      # Maps LEAN output → existing BacktestResponse shape
```

`runner.py` replaces `backtest.py` as the orchestrator. The FastAPI route in `main.py` is updated to call `runner.run_lean_backtest()` instead of `run_backtest()`. The response shape is unchanged — the frontend sees no difference.

---

### 3.5 Migration Safety Plan

Run both engines in parallel during transition:

```python
# backend/main.py — during migration period
@app.post("/api/backtest")
async def backtest(req: BacktestRequest):
    if req.engine == "lean":           # new optional field, default "custom"
        return await runner.run_lean_backtest(req)
    return run_backtest(req)           # existing path, untouched
```

This lets you A/B compare results between engines on the same strategy before removing the custom simulator.

---

### 3.6 Deliverables for Phase 3

- [ ] `backend/lean/algorithm.py` — LEAN adapter
- [ ] `backend/lean/runner.py` — lean-cli integration
- [ ] `backend/lean/result_parser.py` — output normalizer
- [ ] `backend/ai/schemas.py` — add `resolution`, `assets`, warm-up period fields
- [ ] `backend/main.py` — dual-engine routing with `engine` field
- [ ] `requirements.txt` — add `lean` CLI package
- [ ] Integration tests: run same strategy through both engines, assert equity curves are within 1% of each other
- [ ] Remove custom `Simulator` once LEAN parity is confirmed

---

## Phase 4 — The LLM to DSL Pipeline (AI Layer)

**Goal**: Build a production-grade LLM service that takes a plain-English strategy description and reliably returns validated JSON that passes Pydantic and runs through LEAN without modification.

**Default model**: `claude-sonnet-4-5` via Anthropic API. The service is designed so the model can be swapped via a single config change.

---

### 4.1 Service Architecture

**New file**: `backend/ai/llm_service.py`

```python
class LLMService:
    def __init__(self, model: str = "claude-sonnet-4-5"):
        self.client = anthropic.Anthropic()
        self.model = model
        self.schema_prompt = build_schema_prompt()   # from existing prompt.py

    def generate_strategy(self, user_prompt: str) -> StrategyModel:
        for attempt in range(MAX_RETRIES):
            raw = self._call_llm(user_prompt, error_context=None if attempt == 0 else last_error)
            try:
                return StrategyModel.model_validate_json(raw)
            except ValidationError as e:
                last_error = str(e)
        raise StrategyGenerationError(f"Failed after {MAX_RETRIES} attempts")
```

**Key design decisions**:
- `model` is injected at construction — swap to `claude-opus-4-7` or `gpt-4o` by changing one line or env var.
- Retry loop (max 3) passes the Pydantic `ValidationError` back to the LLM on retry so it can self-correct.
- `build_schema_prompt()` is the existing `backend/ai/prompt.py` — already generates schema documentation from the Pydantic models. This function is the single source of truth; updating the schema automatically updates what the LLM sees.

---

### 4.2 System Prompt Design

The system prompt has three parts, assembled in `backend/ai/prompt.py`:

**Part 1 — Role and constraints** (static, ~200 tokens):
```
You are a quantitative trading strategy assistant for NeuroTrade.
Your only job is to output valid JSON matching the NeuroTrade strategy schema.
Never output prose, markdown, or explanation. Only output raw JSON.
The JSON must be parseable by Python's json.loads() with no preprocessing.
```

**Part 2 — Schema documentation** (dynamic, generated from Pydantic models):
```
The schema is as follows. Every field is required unless marked optional.

StrategyModel:
  assets: list[str]           — e.g. ["SPY"]
  rules: list[RuleModel]

RuleModel:
  trade: "long" | "short"
  filter: AnyPredicate
  entry: AnyPredicate
  exit: AnyPredicate
  stop_loss: AnyExpression
  take_profit: AnyExpression
  sizing: AnyExpression       — must return a value between 0.0 and 1.0
  resolution: "minute" | "hour" | "daily"

AnyPredicate types: Crossover | Threshold | And | Or | Not | Peak | Trough | ...
AnyExpression types: EMA | SMA | RSI | ATR | Add | Subtract | Number | ...

[Full type documentation auto-generated from Pydantic model schemas]
```

**Part 3 — Few-shot examples** (2–3 examples, static):
```json
// Example: "Buy when 10-day EMA crosses above 50-day EMA"
{
  "assets": ["SPY"],
  "rules": [{
    "trade": "long",
    "filter": {"type": "TruePredicate"},
    "entry": {"type": "Crossover", "fast": {"type": "EMA", "period": 10}, "slow": {"type": "EMA", "period": 50}},
    ...
  }]
}
```

Few-shot examples are the single highest-leverage improvement to output quality. Add more examples as edge cases are discovered in production.

---

### 4.3 Retry / Fallback Loop

```
User prompt
    │
    ▼
LLMService.generate_strategy(prompt)
    │
    ├── Attempt 1: call LLM with system prompt + user prompt
    │       ├── Pydantic validates → SUCCESS → return StrategyModel
    │       └── ValidationError → extract error message
    │
    ├── Attempt 2: call LLM with system prompt + user prompt + "Previous attempt failed: {error}"
    │       ├── Pydantic validates → SUCCESS → return StrategyModel
    │       └── ValidationError → extract error message
    │
    ├── Attempt 3: same as attempt 2
    │       ├── Pydantic validates → SUCCESS → return StrategyModel
    │       └── ValidationError → raise StrategyGenerationError
    │
    └── Fallback: return a default "buy and hold SPY" strategy + show warning in UI
```

The fallback ensures the UI never shows a blank result — it always has something runnable.

---

### 4.4 Prompt Caching

Since the schema documentation (Part 2) is large (~2000 tokens) and static across all requests, use Anthropic's prompt caching to avoid re-processing it on every call:

```python
response = self.client.messages.create(
    model=self.model,
    system=[
        {"type": "text", "text": STATIC_ROLE_PROMPT},
        {"type": "text", "text": self.schema_prompt, "cache_control": {"type": "ephemeral"}},
    ],
    messages=[{"role": "user", "content": user_prompt}],
)
```

The `cache_control: ephemeral` marker tells Anthropic to cache the schema block for up to 5 minutes. At high volume this reduces latency by ~30% and cost by ~80% on the cached tokens.

---

### 4.5 Frontend Changes

**Chat panel update** — the `/api/chat` Next.js route already proxies to `/api/chat` on FastAPI. The only change: if FastAPI returns a `strategy` JSON field alongside the `message` field, the chat panel renders a "Run this strategy" button.

```typescript
// web/src/app/api/chat/route.ts — no change needed
// web/src/components/dashboard/chat/ChatPanel.tsx — add:
if (response.strategy) {
  // render strategy JSON block with "Use this strategy" button
  // button calls: onStrategySelect(response.strategy)
  // which populates the Backtest Panel config
}
```

**No other frontend changes required** — the LLM pipeline is entirely backend.

---

### 4.6 Model Swappability

The model is controlled by a single env var:

```bash
# backend/.env
LLM_MODEL=claude-sonnet-4-5          # default
# LLM_MODEL=claude-opus-4-7          # higher quality, slower
# LLM_MODEL=gpt-4o                   # if openai client is added
```

```python
# backend/ai/llm_service.py
model = os.environ.get("LLM_MODEL", "claude-sonnet-4-5")
service = LLMService(model=model)
```

Switching models requires zero code changes.

---

### 4.7 Deliverables for Phase 4

- [ ] `backend/ai/llm_service.py` — `LLMService` class with retry loop
- [ ] `backend/ai/prompt.py` — updated `build_schema_prompt()` for LEAN-compatible schema
- [ ] `backend/main.py` — `/api/chat` route updated to call `LLMService`
- [ ] `backend/.env.example` — document `LLM_MODEL`, `ANTHROPIC_API_KEY`
- [ ] `requirements.txt` — add `anthropic`
- [ ] `web/src/components/dashboard/chat/ChatPanel.tsx` — "Use this strategy" button on valid JSON responses
- [ ] Prompt caching enabled on schema documentation block
- [ ] Integration test: send 10 diverse English prompts, assert all pass Pydantic validation

---

## Phase 5 — Monetization

**Goal**: Gate backtest execution and strategy saving behind a Stripe subscription. The free tier can explore the UI but cannot run backtests or persist strategies.

---

### 5.1 Subscription Tiers

| Tier | Price | Limits |
|---|---|---|
| **Free** | $0 | 3 backtests/day, no strategy saving, 1-year max lookback |
| **Pro** | $29/month | Unlimited backtests, strategy library, 10-year lookback |
| **Team** | $99/month | Everything in Pro + multi-user, API access |

---

### 5.2 Architecture

**Stripe integration points**:

1. **Checkout** — `/api/stripe/checkout` (Next.js route) creates a Stripe Checkout Session and redirects the user. On success, Stripe webhooks Firebase to set `user.subscription = "pro"`.

2. **Webhook handler** — `/api/stripe/webhook` (Next.js route) receives Stripe events (`checkout.session.completed`, `customer.subscription.deleted`) and updates Firebase Firestore user document.

3. **Entitlement check** — middleware in the Next.js API routes checks Firebase user subscription before proxying to FastAPI:

```typescript
// web/src/app/api/backtest/route.ts
const user = await verifyFirebaseToken(request);
if (!hasEntitlement(user, "backtest")) {
  return NextResponse.json({ error: "upgrade_required" }, { status: 402 });
}
// ... existing proxy logic
```

4. **Usage tracking** — FastAPI increments a `backtest_count` field in Firestore on each run. The entitlement check reads this before allowing execution.

**Why enforcement is in Next.js routes, not FastAPI**: The FastAPI service is not directly exposed to the browser. Enforcement at the proxy layer is sufficient and keeps the Python service stateless.

---

### 5.3 UI Changes

- **Upgrade modal**: Triggered when `402` is returned by `/api/backtest`. Shows tier comparison and Stripe Checkout button.
- **Usage indicator**: Free-tier users see "2 / 3 backtests today" in the dashboard header.
- **Strategy library panel**: New panel (or modal) showing saved strategies — locked behind Pro. Clicking it on Free shows the upgrade prompt.

---

### 5.4 Deliverables for Phase 5

- [ ] Stripe account configured with products and prices for Pro and Team tiers
- [ ] `web/src/app/api/stripe/checkout/route.ts` — creates Checkout Session
- [ ] `web/src/app/api/stripe/webhook/route.ts` — handles subscription lifecycle events
- [ ] `web/src/lib/entitlements.ts` — `hasEntitlement(user, feature)` helper
- [ ] `web/src/app/api/backtest/route.ts` — entitlement check added before proxy
- [ ] `web/src/components/UpgradeModal.tsx` — tier comparison + CTA
- [ ] Firestore security rules updated: users can only read their own subscription document
- [ ] `web/.env.local` additions: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

---

## Dependency Map

```
Phase 1 (Brand + Pages)
    │
    └──► Phase 2 (Dashboard UI)
              │
              └──► Phase 3 (LEAN Migration)   ← must complete before Phase 4
                        │
                        └──► Phase 4 (LLM Pipeline)
                                  │
                                  └──► Phase 5 (Monetization)
```

Each phase is a vertical slice: it touches frontend, backend, or both, but always ships a working product.

---

## What Must Never Break

These are the invariants that must hold at the end of every phase:

1. Firebase authentication (login, signup, Google SSO) works.
2. `POST /api/backtest` returns a valid equity curve and metrics JSON.
3. `POST /api/chat` returns a message.
4. The dashboard renders without errors for an authenticated user.
5. All Pydantic models validate the same JSON they validated before the phase started (backwards compatibility).
6. `npm run build` passes with zero TypeScript errors.
7. `uvicorn main:app` starts without import errors.
