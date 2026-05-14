"use client";

import { useState, useRef, useEffect } from "react";
import { HiOutlineLightBulb } from "react-icons/hi2";
import { PiGraph } from "react-icons/pi";
import { FiMessageSquare } from "react-icons/fi";
import Message from "@/components/dashboard/chat/Message";
import SendButton from "@/components/dashboard/chat/SendButton";
import { Tool } from "@/components/dashboard/chat/Dropdown";
import ToolBar from "@/components/dashboard/chat/ToolBar";

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

const ChatWidget = () => {
  const [messages, setMessages] = useState<{ text: string; isUser: boolean }[]>([]);
  const [input, setInput] = useState("");
  const [selectedTools, setSelectedTools] = useState<string[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const newHeight = Math.min(textareaRef.current.scrollHeight, 120);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [input]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleToolSelect = (tool: string) => {
    if (!selectedTools.includes(tool)) {
      setSelectedTools((prev) => [...prev, tool]);
    }
  };

  const handleToolDeselect = (tool: string) => {
    setSelectedTools((prev) => prev.filter((t) => t !== tool));
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    setMessages((prev) => [...prev, { text: input, isUser: true }]);
    const userMessage = input;
    setInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });
      const data = await res.json();

      if (data.strategy) {
        localStorage.setItem("currentStrategy", JSON.stringify(data.strategy));
      }

      if (data.reply) {
        setMessages((prev) => [...prev, { text: data.reply, isUser: false }]);
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { text: "Error: failed to get response", isUser: false },
      ]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface-card">
      {/* Terminal panel header */}
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
        {messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <span className="font-mono text-xs text-content-muted">
              Describe a strategy to get started...
            </span>
          </div>
        ) : (
          messages.map((msg, i) => (
            <Message key={i} text={msg.text} isUser={msg.isUser} />
          ))
        )}
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-border-subtle bg-surface-raised p-2">
        <div className="rounded-lg border border-border-subtle bg-surface-card px-3 py-2 focus-within:border-accent-blue/50 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Describe your trading strategy..."
            rows={1}
            className="w-full resize-none overflow-y-auto bg-transparent text-sm text-content-primary placeholder-content-muted focus:outline-none scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border-subtle"
            style={{ maxHeight: "120px" }}
          />
          <div className="mt-2 flex items-end justify-between">
            <ToolBar
              availableTools={AVAILABLE_TOOLS}
              selectedTools={selectedTools}
              onToolSelect={handleToolSelect}
              onToolDeselect={handleToolDeselect}
            />
            <SendButton onClick={handleSend} disabled={!input.trim()} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatWidget;
