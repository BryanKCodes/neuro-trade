"use client";

import { useState, useRef, useEffect } from "react";
import { HiOutlineLightBulb } from "react-icons/hi2";
import { PiGraph } from "react-icons/pi";
import { FiMessageSquare } from "react-icons/fi";
import Message from "@/components/dashboard/chat/Message";
import SendButton from "@/components/dashboard/chat/SendButton";
import { Tool } from "@/components/dashboard/chat/Dropdown";
import ToolBar from "@/components/dashboard/chat/ToolBar";

// ─── Types ────────────────────────────────────────────────────────────────────

type HistoryEntry = { role: "user" | "assistant"; content: string };

type DisplayMessage =
  | { kind: "text"; content: string; isUser: boolean }
  | { kind: "strategy"; reply: string; strategy: Record<string, unknown> }
  | { kind: "thinking" };

// ─── Sub-components ───────────────────────────────────────────────────────────

function ThinkingBubble() {
  return (
    <div className="my-1 self-start flex items-center gap-1.5 rounded-lg bg-surface-raised px-3 py-3">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="block h-1.5 w-1.5 animate-bounce rounded-full bg-content-muted"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}

type StrategyRule = { trade: string; [key: string]: unknown };

function StrategyCard({
  reply,
  strategy,
}: {
  reply: string;
  strategy: Record<string, unknown>;
}) {
  const [loaded, setLoaded] = useState(false);

  const rules = (strategy.rules as StrategyRule[] | undefined) ?? [];
  const ruleCount = rules.length;
  const tradeTypes = [...new Set(rules.map((r) => r.trade))].join(", ");

  const handleUse = () => {
    localStorage.setItem("currentStrategy", JSON.stringify(strategy));
    setLoaded(true);
    setTimeout(() => setLoaded(false), 2500);
  };

  return (
    <div className="my-1 flex max-w-[82%] self-start flex-col gap-1.5">
      {/* Text reply */}
      <div className="rounded-lg bg-surface-raised px-3 py-2 text-sm text-content-primary whitespace-pre-wrap break-words">
        {reply}
      </div>

      {/* Strategy card */}
      <div className="rounded-lg border border-accent-green/30 bg-accent-green/5 px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-green" />
              <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-accent-green">
                Strategy Generated
              </span>
            </div>
            <span className="font-mono text-[10px] text-content-muted">
              {ruleCount} rule{ruleCount !== 1 ? "s" : ""}
              {tradeTypes ? ` · ${tradeTypes}` : ""}
            </span>
          </div>

          <button
            onClick={handleUse}
            className={`shrink-0 rounded-md px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider transition-colors ${
              loaded
                ? "bg-accent-green/20 text-accent-green cursor-default"
                : "bg-accent-green/10 text-accent-green hover:bg-accent-green/20 active:bg-accent-green/30"
            }`}
          >
            {loaded ? "Loaded ✓" : "Use this Strategy"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Available toolbar tools ───────────────────────────────────────────────────

const AVAILABLE_TOOLS: Tool[] = [
  {
    name: "Thinking",
    icon: <HiOutlineLightBulb className="w-4 h-4" />,
    description: "Think longer",
  },
  {
    name: "Strategy",
    icon: <PiGraph className="w-4 h-4" />,
    description: "Generate a backtest strategy",
  },
];

// Cap history sent to API to avoid bloating the context window.
const MAX_HISTORY = 20;

// ─── Main component ────────────────────────────────────────────────────────────

const ChatWidget = () => {
  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const newHeight = Math.min(textareaRef.current.scrollHeight, 120);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [input]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [displayMessages]);

  const handleToolSelect = (tool: string) => {
    if (!selectedTools.includes(tool)) {
      setSelectedTools((prev) => [...prev, tool]);
    }
  };

  const handleToolDeselect = (tool: string) => {
    setSelectedTools((prev) => prev.filter((t) => t !== tool));
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput("");
    setIsLoading(true);

    // Snapshot history before the async call so closures are stable.
    const snapshotHistory = history;

    // Show user message and thinking indicator immediately.
    setDisplayMessages((prev) => [
      ...prev,
      { kind: "text", content: userText, isUser: true },
      { kind: "thinking" },
    ]);

    // Read current strategy from localStorage (best-effort).
    let currentStrategy: Record<string, unknown> | null = null;
    try {
      const saved = localStorage.getItem("currentStrategy");
      if (saved) currentStrategy = JSON.parse(saved);
    } catch {
      // Ignore parse errors — send null and let the LLM generate fresh.
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          history: snapshotHistory.slice(-MAX_HISTORY),
          currentStrategy,
        }),
      });

      const data = await res.json();
      const assistantReply: string = data.reply || "No response received.";

      // Replace thinking bubble with the real response.
      setDisplayMessages((prev) => {
        const withoutThinking = prev.filter((m) => m.kind !== "thinking");
        if (data.strategy) {
          return [
            ...withoutThinking,
            { kind: "strategy", reply: assistantReply, strategy: data.strategy },
          ];
        }
        return [
          ...withoutThinking,
          { kind: "text", content: assistantReply, isUser: false },
        ];
      });

      // Append this exchange to history for the next turn.
      setHistory((prev) => [
        ...prev,
        { role: "user", content: userText },
        { role: "assistant", content: assistantReply },
      ]);
    } catch {
      setDisplayMessages((prev) => [
        ...prev.filter((m) => m.kind !== "thinking"),
        {
          kind: "text",
          content: "Error: could not reach the AI service. Is the backend running?",
          isUser: false,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface-card">
      {/* Panel header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border-subtle px-3 py-2">
        <FiMessageSquare className="h-3.5 w-3.5 text-accent-cyan" />
        <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-content-muted">
          AI Assistant
        </span>
      </div>

      {/* Message area */}
      <div
        ref={containerRef}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border-subtle"
      >
        {displayMessages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <span className="font-mono text-xs text-content-muted">
              Ask about trading or describe a strategy...
            </span>
          </div>
        ) : (
          displayMessages.map((msg, i) => {
            if (msg.kind === "thinking") {
              return <ThinkingBubble key={i} />;
            }
            if (msg.kind === "strategy") {
              return (
                <StrategyCard
                  key={i}
                  reply={msg.reply}
                  strategy={msg.strategy}
                />
              );
            }
            return <Message key={i} text={msg.content} isUser={msg.isUser} />;
          })
        )}
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-border-subtle bg-surface-raised p-2">
        <div className="rounded-lg border border-border-subtle bg-surface-card px-3 py-2 focus-within:border-accent-blue/50 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="Ask a question or describe a strategy..."
            rows={1}
            className="w-full resize-none overflow-y-auto bg-transparent text-sm text-content-primary placeholder-content-muted focus:outline-none disabled:opacity-50 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border-subtle"
            style={{ maxHeight: "120px" }}
          />
          <div className="mt-2 flex items-end justify-between">
            <ToolBar
              availableTools={AVAILABLE_TOOLS}
              selectedTools={selectedTools}
              onToolSelect={handleToolSelect}
              onToolDeselect={handleToolDeselect}
            />
            <SendButton
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatWidget;
