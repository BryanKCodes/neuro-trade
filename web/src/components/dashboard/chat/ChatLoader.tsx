import { FiCpu } from "react-icons/fi";

const ChatLoader = () => (
  <div className="mt-2 flex items-center gap-2">
    <FiCpu className="h-3 w-3 animate-pulse text-accent-cyan" />
    <span className="font-mono text-[11px] animate-pulse text-content-muted">
      Validating strategy...
    </span>
  </div>
);

export default ChatLoader;
