const Separator = ({ isHorizontal = false }: { isHorizontal?: boolean }) => {
  return (
    <div
      className={`bg-gray-300 dark:bg-gray-700 flex items-center justify-center ${isHorizontal ? "h-1 w-full cursor-row-resize" : "w-1 h-full cursor-col-resize"}`}
    >
      <div
        className={`bg-gray-500 dark:bg-gray-400 rounded ${isHorizontal ? "w-15 h-1" : "h-15 w-1"}`}
      />
    </div>
  );
}

export default Separator;
