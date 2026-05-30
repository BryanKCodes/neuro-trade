import Link from "next/link";
import Header from "@/components/home/Header";
import Footer from "@/components/home/Footer";
import {
  FaBrain,
  FaShieldHalved,
  FaChartLine,
  FaCode,
  FaBolt,
  FaRocket,
} from "react-icons/fa6";

const valueProps = [
  {
    step: "01",
    title: "Describe it",
    body: "Type your strategy in plain English. No syntax, no libraries, no prior coding experience required.",
    icon: <FaBrain className="h-4 w-4 text-accent-cyan" />,
  },
  {
    step: "02",
    title: "Validate it",
    body: "AI generates structured JSON validated by Pydantic schemas against the LEAN engine's architecture.",
    icon: <FaShieldHalved className="h-4 w-4 text-accent-cyan" />,
  },
  {
    step: "03",
    title: "Backtest it",
    body: "Run against years of historical data. Get Sharpe ratio, max drawdown, win rate, and a full equity curve.",
    icon: <FaChartLine className="h-4 w-4 text-accent-cyan" />,
  },
];

const features = [
  {
    icon: <FaCode className="h-5 w-5 text-accent-blue" />,
    title: "No-Code Strategy Builder",
    body: "Compose entry signals, exit conditions, stop-losses, and position sizing using natural language — no Python required.",
  },
  {
    icon: <FaBolt className="h-5 w-5 text-accent-blue" />,
    title: "Professional-Grade Engine",
    body: "Backtests run on QuantConnect's LEAN engine — the same platform used by institutional quant funds worldwide.",
  },
  {
    icon: <FaRocket className="h-5 w-5 text-accent-blue" />,
    title: "AI-Powered Insights",
    body: "Claude AI understands your intent, enforces schema validation, and self-corrects if the generated strategy has errors.",
  },
];

const HomePage = () => {
  return (
    <div className="flex min-h-screen flex-col bg-surface-base text-content-primary">
      <Header />

      <main className="flex-1">
        {/* ── Hero ──────────────────────────────────────────── */}
        <section className="relative overflow-hidden px-6 py-32 text-center">
          {/* Subtle dot-grid background */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(37,99,235,0.15) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          {/* Fade to surface at the bottom */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
            style={{
              background: "linear-gradient(to bottom, transparent, #0A0E1A)",
            }}
          />

          <div className="relative mx-auto max-w-4xl">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-card px-4 py-1.5 text-xs font-medium text-accent-cyan">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-cyan" />
              Powered by Claude AI + QuantConnect LEAN
            </div>

            <h1 className="mb-5 text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
              Build strategies.
              <br />
              <span className="text-accent-blue">Not code.</span>
            </h1>

            <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-content-muted">
              Describe a trading strategy in plain English. NeuroTrade&apos;s AI
              translates it into a validated, backtestable algorithm — no
              programming required.
            </p>

            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/auth/signup"
                className="rounded-lg bg-accent-blue px-8 py-3 text-sm font-semibold text-white transition-all hover:brightness-110 active:brightness-90"
              >
                Start for free
              </Link>
              <a
                href="#how-it-works"
                className="rounded-lg border border-border-subtle px-8 py-3 text-sm font-semibold text-content-muted transition-colors hover:border-accent-blue hover:text-content-primary"
              >
                See how it works
              </a>
            </div>
          </div>
        </section>

        {/* ── Value proposition strip ────────────────────────── */}
        <section className="border-y border-border-subtle bg-surface-card px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
              {valueProps.map(({ step, title, body, icon }) => (
                <div key={step} className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-accent-cyan">
                      {step}
                    </span>
                    <div className="h-px flex-1 bg-border-subtle" />
                    {icon}
                  </div>
                  <h3 className="font-semibold text-content-primary">{title}</h3>
                  <p className="text-sm leading-relaxed text-content-muted">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Feature highlights ────────────────────────────── */}
        <section className="px-6 py-24">
          <div className="mx-auto max-w-5xl">
            <div className="mb-12 text-center">
              <h2 className="mb-3 text-3xl font-bold text-content-primary">
                Everything a quant needs.
              </h2>
              <p className="text-content-muted">
                A professional-grade toolkit, accessible to everyone.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {features.map(({ icon, title, body }) => (
                <div
                  key={title}
                  className="rounded-xl border border-border-subtle bg-surface-card p-6 transition-all hover:border-accent-blue/40 hover:bg-surface-raised"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-surface-raised">
                    {icon}
                  </div>
                  <h3 className="mb-2 font-semibold text-content-primary">
                    {title}
                  </h3>
                  <p className="text-sm leading-relaxed text-content-muted">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Dashboard preview ─────────────────────────────── */}
        <section id="how-it-works" className="px-6 pb-24">
          <div className="mx-auto max-w-5xl">
            <div className="overflow-hidden rounded-xl border border-border-subtle">
              {/* Fake window chrome */}
              <div className="flex items-center gap-2 border-b border-border-subtle bg-surface-raised px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-accent-red" />
                <span className="h-3 w-3 rounded-full bg-accent-amber" />
                <span className="h-3 w-3 rounded-full bg-accent-green" />
                <span className="ml-4 font-mono text-xs text-content-muted">
                  NeuroTrade — Dashboard
                </span>
              </div>

              {/* Mockup interior */}
              <div className="bg-surface-card px-8 py-16 text-center">
                <p className="mb-2 font-mono text-sm text-content-muted">
                  <span className="text-accent-cyan">✦</span> Full trading
                  terminal coming in Phase 2
                </p>
                <p className="text-xs text-content-muted">
                  Live charts · AI strategy assistant · Interactive backtest
                  results
                </p>

                {/* Placeholder equity curve sketch */}
                <div className="mx-auto mt-10 h-40 max-w-2xl overflow-hidden rounded-lg border border-border-subtle bg-surface-base p-4">
                  <svg
                    viewBox="0 0 400 120"
                    className="h-full w-full"
                    preserveAspectRatio="none"
                  >
                    <polyline
                      points="0,100 40,90 80,95 120,70 160,60 200,40 240,50 280,30 320,20 360,10 400,5"
                      fill="none"
                      stroke="#06B6D4"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <polyline
                      points="0,100 40,92 80,88 120,85 160,82 200,78 240,75 280,72 320,68 360,64 400,60"
                      fill="none"
                      stroke="#64748B"
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <p className="mt-3 font-mono text-[10px] text-content-muted">
                  <span className="text-accent-cyan">— Strategy</span>
                  {"  "}
                  <span className="text-content-muted">- - Benchmark</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA banner ────────────────────────────────────── */}
        <section className="border-t border-border-subtle bg-surface-card px-6 py-20 text-center">
          <div className="mx-auto max-w-2xl">
            <h2 className="mb-3 text-3xl font-bold text-content-primary">
              Ready to build your first strategy?
            </h2>
            <p className="mb-8 text-content-muted">
              Sign up for free and run your first backtest in minutes.
            </p>
            <Link
              href="/auth/signup"
              className="inline-flex rounded-lg bg-accent-blue px-8 py-3 text-sm font-semibold text-white transition-all hover:brightness-110"
            >
              Get started — it&apos;s free
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HomePage;
