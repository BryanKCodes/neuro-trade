import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import StrategyCard from "@/components/dashboard/chat/StrategyCard";
import ChatLoader from "@/components/dashboard/chat/ChatLoader";

// ─── Thinking dots (shown before first token arrives) ─────────────────────────

const ThinkingDots = () => (
  <div className="flex items-center gap-1.5 py-1">
    {[0, 150, 300].map((delay) => (
      <span
        key={delay}
        className="block h-1.5 w-1.5 animate-bounce rounded-full bg-content-muted"
        style={{ animationDelay: `${delay}ms` }}
      />
    ))}
  </div>
);

// ─── Markdown renderer ────────────────────────────────────────────────────────

const md = {
  p: ({ children }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="mb-2 last:mb-0 text-sm leading-relaxed text-content-primary">
      {children}
    </p>
  ),
  h1: ({ children }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="mb-2 mt-3 text-base font-semibold text-content-primary first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="mb-1.5 mt-3 text-sm font-semibold text-content-primary first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="mb-1 mt-2 text-sm font-medium text-content-primary first:mt-0">
      {children}
    </h3>
  ),
  ul: ({ children }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="mb-2 ml-4 list-disc space-y-0.5">{children}</ul>
  ),
  ol: ({ children }: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="mb-2 ml-4 list-decimal space-y-0.5">{children}</ol>
  ),
  li: ({ children }: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="text-sm leading-relaxed text-content-primary">{children}</li>
  ),
  strong: ({ children }: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold text-content-primary">{children}</strong>
  ),
  em: ({ children }: React.HTMLAttributes<HTMLElement>) => (
    <em className="italic text-content-muted">{children}</em>
  ),
  pre: ({ children }: React.HTMLAttributes<HTMLPreElement>) => (
    <pre className="my-2 overflow-x-auto rounded-md bg-surface-raised p-3">
      {children}
    </pre>
  ),
  code: ({ className, children }: React.HTMLAttributes<HTMLElement>) =>
    className ? (
      <code className={`font-mono text-xs text-accent-cyan ${className}`}>
        {children}
      </code>
    ) : (
      <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-xs text-accent-cyan">
        {children}
      </code>
    ),
  blockquote: ({ children }: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote className="my-2 border-l-2 border-accent-cyan pl-3 italic text-content-muted">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-border-subtle" />,
  a: ({ href, children }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent-cyan underline underline-offset-2 hover:text-accent-cyan/80"
    >
      {children}
    </a>
  ),
};

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChatMessageData =
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content: string;
      strategy?: Record<string, unknown>;
      isStreaming?: boolean;
      isValidating?: boolean;
    };

// ─── Component ────────────────────────────────────────────────────────────────

type ChatMessageProps = {
  message: ChatMessageData;
};

const ChatMessage = memo(({ message }: ChatMessageProps) => {
  const isUser = message.role === "user";
  const isStreaming =
    message.role === "assistant" && message.isStreaming === true;
  const isValidating =
    message.role === "assistant" && message.isValidating === true;
  const showThinking = isStreaming && message.content === "";

  return (
    <div className={`flex w-full px-1 py-3 ${isUser ? "justify-end" : ""}`}>
      {isUser ? (
        <p className="max-w-[85%] rounded-xl rounded-tr-sm bg-surface-raised px-3.5 py-2 text-sm leading-relaxed text-content-primary">
          {message.content}
        </p>
      ) : (
        <div className="max-w-full min-w-0">
          {showThinking ? (
            <ThinkingDots />
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={md}>
              {message.content}
            </ReactMarkdown>
          )}

          {message.role === "assistant" && message.strategy && (
            <StrategyCard strategy={message.strategy} />
          )}

          {isValidating && <ChatLoader />}
        </div>
      )}
    </div>
  );
});

ChatMessage.displayName = "ChatMessage";

export default ChatMessage;
