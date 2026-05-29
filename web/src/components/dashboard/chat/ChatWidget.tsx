"use client";

import { useState, useRef, useEffect } from "react";
import { FiMessageSquare } from "react-icons/fi";
import ChatMessage, { ChatMessageData } from "@/components/dashboard/chat/ChatMessage";
import ChatInput from "@/components/dashboard/chat/ChatInput";

type HistoryEntry = { role: "user" | "assistant"; content: string };

// How many prior turns to send to the API (caps context window growth).
const MAX_HISTORY = 20;

const ChatWidget = () => {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);

  // Streaming state — kept outside `messages` so we update it without
  // rebuilding the entire list on every incoming token.
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const streamingRef = useRef(""); // accumulates text without re-render lag

  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on every content change.
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, streamingText, isValidating]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput("");
    setIsLoading(true);
    setIsStreaming(true);
    streamingRef.current = "";
    setStreamingText("");

    const snapshotHistory = history;

    // Add user message immediately.
    setMessages((prev) => [...prev, { role: "user", content: userText }]);

    // Read current strategy (best-effort).
    let currentStrategy: Record<string, unknown> | null = null;
    try {
      const saved = localStorage.getItem("currentStrategy");
      if (saved) currentStrategy = JSON.parse(saved);
    } catch { /* ignore */ }

    let finalText = "";
    let finalStrategy: Record<string, unknown> | null = null;

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

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by \n\n
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data: ")) continue;

          let event: { type: string; data?: unknown };
          try {
            event = JSON.parse(line.slice(6));
          } catch {
            continue;
          }

          switch (event.type) {
            case "text_delta":
              streamingRef.current += event.data as string;
              finalText = streamingRef.current;
              setStreamingText(streamingRef.current);
              break;

            case "tool_start":
              setIsStreaming(false);
              setIsValidating(true);
              break;

            case "strategy":
              finalStrategy = event.data as Record<string, unknown>;
              break;

            case "error":
              // Error text appended to the message content.
              finalText =
                (finalText ? finalText + "\n\n" : "") +
                `*Could not generate a valid strategy: ${event.data}*`;
              setStreamingText(finalText);
              streamingRef.current = finalText;
              break;

            case "done": {
              // Commit the completed assistant turn to messages.
              const assistantMsg: ChatMessageData = finalStrategy
                ? {
                    role: "assistant",
                    content: finalText || "Strategy generated.",
                    strategy: finalStrategy,
                  }
                : { role: "assistant", content: finalText || "Done." };

              setMessages((prev) => [...prev, assistantMsg]);

              // Record exchange in history for next turn.
              setHistory((prev) => [
                ...prev,
                { role: "user", content: userText },
                {
                  role: "assistant",
                  content: finalText || assistantMsg.content,
                },
              ]);

              // Clear streaming state.
              setStreamingText("");
              setIsStreaming(false);
              setIsValidating(false);
              streamingRef.current = "";
              break;
            }
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Error: could not reach the AI service. Is the backend running?",
        },
      ]);
      setStreamingText("");
      setIsStreaming(false);
      setIsValidating(false);
      streamingRef.current = "";
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface-card">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border-subtle px-3 py-2">
        <FiMessageSquare className="h-3.5 w-3.5 text-accent-cyan" />
        <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-content-muted">
          AI Assistant
        </span>
      </div>

      {/* Message list */}
      <div
        ref={containerRef}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border-subtle"
      >
        {messages.length === 0 && !isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <span className="font-mono text-xs text-content-muted">
              Ask about trading or describe a strategy...
            </span>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <ChatMessage key={i} message={msg} />
            ))}

            {/* Live streaming row */}
            {isLoading && (
              <ChatMessage
                message={{
                  role: "assistant",
                  content: streamingText,
                  isStreaming,
                  isValidating,
                }}
              />
            )}
          </>
        )}
      </div>

      {/* Divider */}
      <ChatInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
        disabled={isLoading}
        selectedTools={selectedTools}
        onToolSelect={(t) => {
          if (!selectedTools.includes(t))
            setSelectedTools((prev) => [...prev, t]);
        }}
        onToolDeselect={(t) =>
          setSelectedTools((prev) => prev.filter((x) => x !== t))
        }
      />
    </div>
  );
};

export default ChatWidget;
