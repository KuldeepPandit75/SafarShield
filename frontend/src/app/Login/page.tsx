"use client";

import AuthHeader from "@/components/AuthHeader";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0f14]">
      <div className="w-full max-w-md bg-[#0f1a26] rounded-xl shadow-lg">

        <AuthHeader />

        <div className="p-8 text-white">
          <h2 className="text-xl font-semibold text-center mb-6">Log In</h2>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Mobile No."
              className="w-full px-4 py-2 bg-transparent border border-gray-600 rounded-md focus:outline-none focus:border-emerald-400"
            />

            <p className="text-center text-sm text-emerald-400">OR</p>

            <input
              type="email"
              placeholder="Email Address"
              className="w-full px-4 py-2 bg-transparent border border-gray-600 rounded-md focus:outline-none focus:border-emerald-400"
            />

            <input
              type="password"
              placeholder="Password"
              className="w-full px-4 py-2 bg-transparent border border-gray-600 rounded-md focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div className="text-right mt-2 text-sm text-gray-400 cursor-pointer hover:text-emerald-400">
            Forgot Password?
          </div>

          <button className="w-full mt-6 py-3 rounded-full bg-emerald-700 hover:bg-emerald-600 transition">
            Log In
          </button>

          <p className="text-center mt-4 text-sm text-gray-400">
            Don’t have an account?{" "}
            <a href="/signup" className="text-emerald-400 hover:underline">
              Sign Up
            </a>
          </p>
        </div>

      </div>
    </div>
  );
}
