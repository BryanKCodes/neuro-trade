import { useState, useRef, useEffect } from "react";
import { IoSend } from "react-icons/io5";
import Message from "@/components/Chat/Message";

export default function ChatWidget() {
  const [messages, setMessages] = useState<{ text: string; isUser: boolean }[]>([]);
  const [input, setInput] = useState("");
  const [inputHeight, setInputHeight] = useState(40);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Effect to auto-resize the textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      // Temporarily reset height to auto to get the new scrollHeight
      textareaRef.current.style.height = "auto";
      // Cap the height at 120px, otherwise use the content's height
      const newHeight = Math.min(textareaRef.current.scrollHeight, 120);
      setInputHeight(newHeight);
      // Apply the new calculated height
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [input]);

  // Effect to auto-scroll the message container to the bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    // Add user message first
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
      if (data.reply) {
        setMessages((prev) => [...prev, { text: data.reply, isUser: false }]);
      }
    } catch (e) {
      setMessages((prev) => [...prev, { text: "Error: failed to get response", isUser: false }]);
    }
  };

  // Allow sending with Enter key, but Shift+Enter for a new line
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent new line on Enter
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
      <div className="bg-gray-100 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl px-3 py-2 flex flex-col">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Describe your trading strategy..."
          rows={1}
          className="resize-none overflow-y-auto max-h-[120px] bg-transparent text-sm 
             text-black dark:text-white placeholder-gray-500 dark:placeholder-neutral-400 
             focus:outline-none scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-neutral-700 
             scrollbar-track-transparent"
          style={{ height: inputHeight }}
        />
        {/* UPDATED: Button is now a styled circle with proper dark/light mode styles */}
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="mt-2 self-end w-9 h-9 rounded-full flex items-center justify-center transition-colors
                        bg-blue-500 text-white hover:bg-blue-600 
                        dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600
                        disabled:bg-gray-200 dark:disabled:bg-neutral-700/50 disabled:cursor-not-allowed"
          aria-label="Send message"
        >
          <IoSend className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
