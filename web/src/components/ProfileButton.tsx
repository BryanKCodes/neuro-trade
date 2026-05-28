"use client";

import { useState, useRef, useEffect } from "react";
import { FaHouse, FaPenToSquare, FaRightFromBracket } from "react-icons/fa6";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { handleSignOut } from "@/scripts/auth";

type ProfileButtonProps = {
    align?: "left" | "right";
};

const ProfileButton = ({ align = "right" }: ProfileButtonProps) => {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    try {
      await handleSignOut();
      // Close the dropdown before redirecting
      setOpen(false);
      // Redirect to the login page
      router.push("/");
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  // close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center rounded-full border border-zinc-700 bg-zinc-800 p-1.5 transition hover:bg-zinc-700"
      >
        <Image
          src="/user.png"
          alt="User Profile"
          width={25}
          height={25}
          className="rounded-full"
        />
      </button>

      {open && (
        <div className={`absolute z-10 mt-2 w-40 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-lg
            ${align === "right" ? "left-0" : "right-0"}`
        }>
          <Link
            href="/"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
          >
            <FaHouse className="inline mr-2" />
            <span>Home</span>
          </Link>
          <button
            onClick={() => alert("Edit Profile placeholder")}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
          >
            <FaPenToSquare className="inline mr-2" />
            <span>Edit Profile</span>
          </button>

          {/* Divider */}
            <div className="my-1 h-px bg-zinc-700" />

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-500 hover:bg-red-500 hover:text-white dark:hover:bg-red-500"
            >
              <FaRightFromBracket className="inline mr-2" />
              <span>Log Out</span>
            </button>
        </div>
      )}
    </div>
  );
}

export default ProfileButton;
