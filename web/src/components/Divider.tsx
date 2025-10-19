const Divider = ({ isHorizontal = false }: { isHorizontal?: boolean }) => {
  return (
    <div
      className={
        isHorizontal
          ? "w-full h-px bg-gray-300 dark:bg-neutral-700 my-2"
          : "h-6 w-px bg-gray-300 dark:bg-neutral-700 mx-2"
      }
    />
  );
}

export default Divider;
