"use client";

import { useRef, useEffect } from "react";
import { HiOutlineLightBulb } from "react-icons/hi2";
import { PiGraph } from "react-icons/pi";
import SendButton from "@/components/dashboard/chat/SendButton";
import ToolBar from "@/components/dashboard/chat/ToolBar";
import { Tool } from "@/components/dashboard/chat/Dropdown";

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

type ChatInputProps = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
  selectedTools: string[];
  onToolSelect: (t: string) => void;
  onToolDeselect: (t: string) => void;
};

const ChatInput = ({
  value,
  onChange,
  onSend,
  disabled,
  selectedTools,
  onToolSelect,
  onToolDeselect,
}: ChatInputProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const newHeight = Math.min(textareaRef.current.scrollHeight, 120);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="shrink-0 border-t border-border-subtle bg-surface-raised p-2">
      <div className="rounded-lg border border-border-subtle bg-surface-card px-3 py-2 focus-within:border-accent-blue/50 transition-colors">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Ask a question or describe a strategy..."
          rows={1}
          className="w-full resize-none overflow-y-auto bg-transparent text-sm text-content-primary placeholder-content-muted focus:outline-none disabled:opacity-50 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border-subtle"
          style={{ maxHeight: "120px" }}
        />
        <div className="mt-2 flex items-end justify-between">
          <ToolBar
            availableTools={AVAILABLE_TOOLS}
            selectedTools={selectedTools}
            onToolSelect={onToolSelect}
            onToolDeselect={onToolDeselect}
          />
          <SendButton
            onClick={onSend}
            disabled={!value.trim() || disabled}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
