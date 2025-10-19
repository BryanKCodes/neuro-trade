"use client";

import { useRouter } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import Logo from "@/components/Logo";

const Header = () => {
  const router = useRouter();

  return (
    <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900">
      {/* Left section */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => router.back()}
          className="group flex items-center rounded-lg p-2.5 transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-800/50"
        >
          <FiArrowLeft className="h-4 w-4" />
        </button>
        <Logo />
      </div>
    </header>
  );
}

export default Header;
