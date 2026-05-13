import Header from "@/components/home/Header";
import Footer from "@/components/home/Footer";

const steps = [
  {
    n: "01",
    title: "Describe your strategy",
    body: "Type a plain-English description of what your algorithm should do — 'buy when RSI is oversold and price is above the 200-day moving average.'",
  },
  {
    n: "02",
    title: "AI generates a JSON strategy",
    body: "Claude AI parses your intent and emits a structured JSON strategy definition, using NeuroTrade's validated component schema.",
  },
  {
    n: "03",
    title: "Pydantic validates it",
    body: "The JSON is validated against Pydantic models — every indicator, predicate, and expression is type-checked before execution. Invalid strategies never reach the engine.",
  },
  {
    n: "04",
    title: "LEAN runs the backtest",
    body: "QuantConnect's LEAN engine simulates the strategy across years of historical market data, handling fills, slippage, and position management.",
  },
  {
    n: "05",
    title: "Review your results",
    body: "Inspect your equity curve, Sharpe ratio, max drawdown, win rate, and individual trade history in the interactive dashboard.",
  },
];

const stack = [
  { name: "QuantConnect LEAN", role: "Backtesting Engine", color: "text-accent-green" },
  { name: "Anthropic Claude", role: "AI Strategy Parser", color: "text-accent-cyan" },
  { name: "Pydantic v2", role: "Schema Validation", color: "text-accent-blue" },
  { name: "Next.js 15", role: "Frontend Framework", color: "text-accent-blue" },
  { name: "Firebase", role: "Auth & Storage", color: "text-accent-amber" },
  { name: "FastAPI", role: "Backend API", color: "text-accent-green" },
];

const faqs = [
  {
    q: "Is this paper trading only?",
    a: "For now, yes — NeuroTrade is focused on historical backtesting. Live trading integration is on the long-term roadmap.",
  },
  {
    q: "Which assets are supported?",
    a: "Any ticker available via Yahoo Finance — US equities, ETFs, and major indices. Coverage expands with the LEAN engine migration.",
  },
  {
    q: "How accurate is the AI?",
    a: "The AI uses a retry loop with Pydantic validation: if generated JSON fails schema checks, it self-corrects before running. Invalid strategies never reach the engine.",
  },
  {
    q: "Do I need to know Python or finance?",
    a: "No. NeuroTrade is designed for curious people who want to test ideas, not just professional quants. If you can describe your idea in a sentence, we can backtest it.",
  },
  {
    q: "How is NeuroTrade different from other platforms?",
    a: "Most backtesting platforms require code. NeuroTrade's AI layer means you can go from natural language to running backtest results in under a minute.",
  },
];

const AboutPage = () => {
  return (
    <div className="flex min-h-screen flex-col bg-surface-base text-content-primary">
      <Header />

      <main className="flex-1">
        {/* ── Mission ───────────────────────────────────────── */}
        <section className="px-6 py-28 text-center">
          <div className="mx-auto max-w-5xl">
            <p className="mb-3 font-mono text-xs font-semibold uppercase tracking-widest text-accent-cyan">
              Our mission
            </p>
            <h1 className="mb-6 text-4xl font-bold leading-snug tracking-tight sm:text-5xl">
              Algorithmic trading
              <br />
              for everyone.
            </h1>
            <p className="text-lg leading-relaxed text-content-muted">
              Quantitative strategies were once the exclusive domain of hedge
              funds with armies of engineers. NeuroTrade removes the code
              barrier entirely — if you have an idea, you can test it.
            </p>
          </div>
        </section>

        {/* ── How it works ──────────────────────────────────── */}
        <section className="border-y border-border-subtle bg-surface-card px-6 py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-12 text-center text-2xl font-bold text-content-primary">
              How it works
            </h2>

            <ol className="space-y-0">
              {steps.map(({ n, title, body }, idx) => (
                <li key={n} className="flex gap-5">
                  {/* Step indicator + connector */}
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent-blue bg-surface-base font-mono text-[11px] font-bold text-accent-blue">
                      {n}
                    </div>
                    {idx < steps.length - 1 && (
                      <div className="my-1 w-px flex-1 bg-border-subtle" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="pb-10">
                    <h3 className="mb-1.5 font-semibold text-content-primary">
                      {title}
                    </h3>
                    <p className="text-sm leading-relaxed text-content-muted">
                      {body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Tech stack ────────────────────────────────────── */}
        <section className="px-6 py-20">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-10 text-center text-2xl font-bold text-content-primary">
              Built on proven infrastructure
            </h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {stack.map(({ name, role, color }) => (
                <div
                  key={name}
                  className="rounded-lg border border-border-subtle bg-surface-card p-4"
                >
                  <p className={`mb-0.5 font-mono text-sm font-semibold ${color}`}>
                    {name}
                  </p>
                  <p className="text-xs text-content-muted">{role}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────── */}
        <section className="border-t border-border-subtle px-6 py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-10 text-center text-2xl font-bold text-content-primary">
              Frequently asked questions
            </h2>
            <dl className="space-y-0">
              {faqs.map(({ q, a }) => (
                <div
                  key={q}
                  className="border-b border-border-subtle py-6 first:pt-0 last:border-none"
                >
                  <dt className="mb-2 font-semibold text-content-primary">{q}</dt>
                  <dd className="text-sm leading-relaxed text-content-muted">{a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default AboutPage;
