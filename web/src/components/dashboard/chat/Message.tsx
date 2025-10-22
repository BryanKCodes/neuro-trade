const Message = ({ text, isUser }: { text: string; isUser: boolean }) => {
  return (
    <div
      className={`max-w-[75%] px-4 py-2 rounded-lg text-sm my-1 whitespace-pre-wrap break-words ${isUser
        ? "bg-blue-500 text-white self-end"
        : "bg-gray-200 dark:bg-neutral-800 text-black dark:text-white self-start"
        }`}
    >
      {text}
    </div>
  );
}

export default Message;
