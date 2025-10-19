"use client";

import clsx from "clsx";
import { FiBarChart2, FiGrid } from "react-icons/fi";
import type { View } from "@/app/dashboard/page";
import ProfileButton from "@/components/ProfileButton";

type HeaderProps = {
  activeView: View;
  setActiveView: (view: View) => void;
};

const Header = ({ activeView, setActiveView }: HeaderProps) => {
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-4">
        <ProfileButton />

        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          <TabButton
            label="Chart"
            icon={<FiBarChart2 />}
            isActive={activeView === "Chart"}
            onClick={() => setActiveView("Chart")}
          />
          <TabButton
            label="Backtest"
            icon={<FiGrid />}
            isActive={activeView === "Backtest"}
            onClick={() => setActiveView("Backtest")}
          />
        </div>
      </div>

      <button className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
        <svg
          className="h-5 w-5 text-slate-600 dark:text-slate-400"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
    </header>
  );
}

function TabButton({
  label,
  icon,
  isActive,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex items-center gap-2 rounded-md px-3 py-1 text-sm font-semibold transition-colors",
        {
          "bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-slate-100": isActive,
          "text-slate-600 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:bg-slate-700/50": !isActive,
        }
      )}
    >
      {icon}
      {label}
    </button>
  );
}

export default Header;
