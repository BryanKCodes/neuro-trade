import { IoSend } from "react-icons/io5";

const SendButton = ({ onClick, disabled }: { onClick: () => void; disabled: boolean }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center transition-colors
                      bg-gray-200 text-white hover:bg-gray-300
                      dark:bg-neutral-700 dark:text-white dark:hover:bg-neutral-600
                      disabled:bg-gray-200 dark:disabled:bg-neutral-700/50 disabled:cursor-not-allowed"
      aria-label="Send message"
    >
      <IoSend className="w-4 h-4" />
    </button>
  );
}

export default SendButton;
