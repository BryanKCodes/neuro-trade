import { useState, useRef, useEffect } from "react";
import { HiOutlineLightBulb } from "react-icons/hi2";
import { PiGraph } from "react-icons/pi";
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
]

const ChatWidget = () => {
  const [messages, setMessages] = useState<{ text: string; isUser: boolean }[]>([]);
  const [input, setInput] = useState("");
  const [selectedTools, setSelectedTools] = useState<string[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Effect to auto-resize the textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const newHeight = Math.min(textareaRef.current.scrollHeight, 120);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [input]);

  // Effect to auto-scroll the message container to the bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  // Toolbar handlers
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

    // Add user message first
    setMessages((prev) => [...prev, { text: input, isUser: true }]);

    const userMessage = input;
    setInput("");

    // Inside handleSend in ChatWidget.tsx
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });
      const data = await res.json();

      // Store the returned strategy in localStorage for later
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full h-full bg-white dark:bg-neutral-900 text-black dark:text-white p-4 border border-gray-300 dark:border-neutral-800 rounded-lg shadow-sm flex flex-col">
      {/* Message area */}
      <div
        className="flex-1 overflow-y-auto mb-4 flex flex-col pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-neutral-700 scrollbar-transparent"
        ref={containerRef}
      >
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-neutral-600">
            Start the conversation...
          </div>
        )}
        {messages.map((msg, i) => (
          <Message key={i} text={msg.text} isUser={msg.isUser} />
        ))}
      </div>

      {/* Input bar */}
      <div className="bg-gray-100 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-2xl px-3 py-2 flex flex-col">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Describe your trading strategy"
          rows={1}
          className="w-full resize-none overflow-y-auto max-h-[120px] bg-transparent text-m 
             text-black dark:text-white placeholder-gray-500 dark:placeholder-neutral-400 
             focus:outline-none scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-neutral-700 
             scrollbar-track-transparent"
          style={{ height: `${Math.max(textareaRef.current?.scrollHeight || 0, 40)}px` }}
        />
        
        {/* Toolbar and Send button */}
        <div className="mt-5 flex items-end justify-between">
          <ToolBar
            availableTools={AVAILABLE_TOOLS}
            selectedTools={selectedTools}
            onToolSelect={handleToolSelect}
            onToolDeselect={handleToolDeselect}
          />
          <SendButton
            onClick={handleSend}
            disabled={!input.trim()}
          />
        </div>
      </div>
    </div>
  );
}

export default ChatWidget;
