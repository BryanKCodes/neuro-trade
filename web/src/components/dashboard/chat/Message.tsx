const Message = ({ text, isUser }: { text: string; isUser: boolean }) => {
  return (
    <div
      className={`my-1 max-w-[82%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words ${
        isUser
          ? "self-end bg-accent-blue text-white"
          : "self-start bg-surface-raised text-content-primary"
      }`}
    >
      {text}
    </div>
  );
};

export default Message;
