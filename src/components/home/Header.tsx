"use client";

import Link from "next/link";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import ProfileButton from "@/components/ProfileButton";
import Logo from "@/components/Logo";

const Header = () => {
  const [user] = useAuthState(auth);

  return (
    <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900">
      {/* Left section */}
      <Logo />

      {/* Right section */}
      <div className="flex items-center gap-6">
        {user ? (
          <>
            <Link
              href="/dashboard"
              className="rounded-md px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Dashboard
            </Link>
            <ProfileButton align="left" />
          </>
        ) : (
          <Link
            href="/auth/login"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}

export default Header;
