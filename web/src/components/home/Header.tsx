"use client";

import Link from "next/link";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import ProfileButton from "@/components/ProfileButton";
import Logo from "@/components/Logo";

const Header = () => {
  const [user] = useAuthState(auth);

  return (
    <header className="flex shrink-0 items-center justify-between border-b border-border-subtle bg-surface-card px-6 py-3">
      <Link href="/" aria-label="NeuroTrade home">
        <Logo />
      </Link>

      <nav className="hidden items-center gap-7 text-sm text-content-muted sm:flex">
        <Link href="/" className="transition-colors hover:text-content-primary">
          Home
        </Link>
        <Link href="/about" className="transition-colors hover:text-content-primary">
          About
        </Link>
      </nav>

      <div className="flex items-center gap-3">
        {user ? (
          <>
            <Link
              href="/dashboard"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-content-muted transition-colors hover:bg-surface-raised hover:text-content-primary"
            >
              Dashboard
            </Link>
            <ProfileButton align="left" />
          </>
        ) : (
          <Link
            href="/auth/login"
            className="rounded-lg bg-accent-blue px-4 py-1.5 text-sm font-semibold text-white transition-all hover:brightness-110"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
};

export default Header;
