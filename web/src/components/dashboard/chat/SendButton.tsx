import { IoSend } from "react-icons/io5";

const SendButton = ({ onClick, disabled }: { onClick: () => void; disabled: boolean }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-blue text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
      aria-label="Send message"
    >
      <IoSend className="h-3.5 w-3.5" />
    </button>
  );
};

export default SendButton;
