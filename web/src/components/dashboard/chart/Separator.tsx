"use client";

type Props = {
  onDrag: (deltaY: number) => void;
};

const Separator = ({ onDrag }: Props) => {
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    let lastY = e.clientY;

    const handleMove = (ev: PointerEvent) => {
      const delta = ev.clientY - lastY;
      lastY = ev.clientY;
      onDrag(delta);
    };

    const handleUp = () => {
      el.removeEventListener("pointermove", handleMove);
      el.removeEventListener("pointerup", handleUp);
    };

    el.addEventListener("pointermove", handleMove);
    el.addEventListener("pointerup", handleUp);
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      className="h-1 w-full shrink-0 cursor-row-resize bg-zinc-800 transition-colors hover:bg-accent-blue/50"
    />
  );
};

export default Separator;
