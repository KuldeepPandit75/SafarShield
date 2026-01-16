"use client";

import React from "react";
import Link from "next/link";

const Navbar: React.FC = () => {
  return (
    <nav className="fixed top-0 left-0 w-full z-50 backdrop-blur-md bg-black/30 px-6 py-4 flex items-center justify-between">
      <h1 className="text-xl font-bold text-emerald-400">
        SafarShield
        <span className="text-gray-300 font-normal"> : Tourist Safety</span>
      </h1>

      <div className="flex gap-3">
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
      </div>    </nav>
  );
};

export default Navbar;
