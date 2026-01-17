"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useAuthStore from "@/Zustand_Store/AuthStore";

const Navbar: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuthStore();
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  const handleLogout = async () => {
    await logout();
    setShowDropdown(false);
    router.push("/");
  };

  const getUserDisplayName = () => {
    if (user?.fullname?.firstname) {
      return `${user.fullname.firstname} ${user.fullname.lastname || ""}`.trim();
    }
    return user?.username || "User";
  };

  const getUserInitials = () => {
    if (user?.fullname?.firstname) {
      const first = user.fullname.firstname.charAt(0).toUpperCase();
      const last = user.fullname.lastname?.charAt(0).toUpperCase() || "";
      return first + last;
    }
    return user?.username?.charAt(0).toUpperCase() || "U";
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-50 backdrop-blur-md bg-black/30 px-6 py-4 flex items-center justify-between">
      <Link href="/">
        <h1 className="text-xl font-bold text-emerald-400 cursor-pointer">
          SafarShield
          <span className="text-gray-300 font-normal"> : Tourist Safety</span>
        </h1>
      </Link>

      <div className="flex gap-3 items-center">
        {!isAuthenticated ? (
          <>
            {/* LOGIN */}
            <Link href="/Login">
              <button className="px-4 py-2 rounded-md bg-emerald-700 hover:bg-emerald-600 transition">
                Login
              </button>
            </Link>

            {/* SIGN UP */}
            <Link href="/Signup">
              <button className="px-4 py-2 rounded-md border border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-black transition">
                Sign Up
              </button>
            </Link>
          </>
        ) : (
          /* PROFILE DROPDOWN */
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-emerald-700/20 transition"
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={getUserDisplayName()}
                  className="w-8 h-8 rounded-full object-cover border border-emerald-400"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center text-white font-semibold text-sm">
                  {getUserInitials()}
                </div>
              )}
              <span className="text-white hidden md:block">{getUserDisplayName()}</span>
              <svg
                className={`w-4 h-4 text-gray-300 transition-transform ${showDropdown ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* DROPDOWN MENU */}
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-[#0f1a26] border border-gray-700 rounded-md shadow-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-700">
                  <p className="text-sm font-medium text-white">{getUserDisplayName()}</p>
                  <p className="text-xs text-gray-400">{user?.email}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-400/10 transition"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
