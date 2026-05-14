"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import ProfileButton from "@/components/ProfileButton";

const Header = () => {
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-border-subtle bg-surface-card px-4 py-2">
      <div className="flex items-center gap-3">
        <Link href="/" aria-label="NeuroTrade home">
          <Logo />
        </Link>
        <div className="flex items-center gap-1.5 rounded-sm border border-accent-green/30 bg-accent-green/10 px-2 py-0.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-green" />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-accent-green">
            Live
          </span>
        </div>
      </div>
      <ProfileButton align="left" />
    </header>
  );
};

export default Header;
