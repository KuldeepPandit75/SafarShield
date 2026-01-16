"use client";

import AuthHeader from "@/components/AuthHeader";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0f14]">
      <div className="w-full max-w-md bg-[#0f1a26] rounded-xl shadow-lg">

        <AuthHeader />

        <div className="p-8 text-white">
          <h2 className="text-xl font-semibold text-center mb-6">Sign Up</h2>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Full Name"
              className="w-full px-4 py-2 bg-transparent border border-gray-600 rounded-md focus:outline-none focus:border-emerald-400"
            />

            <input
              type="text"
              placeholder="Mobile No."
              className="w-full px-4 py-2 bg-transparent border border-gray-600 rounded-md focus:outline-none focus:border-emerald-400"
            />

            <input
              type="email"
              placeholder="Email Address"
              className="w-full px-4 py-2 bg-transparent border border-gray-600 rounded-md focus:outline-none focus:border-emerald-400"
            />

            <input
              type="password"
              placeholder="Create Password"
              className="w-full px-4 py-2 bg-transparent border border-gray-600 rounded-md focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div className="flex items-start gap-2 mt-4 text-sm text-gray-400">
            <input type="checkbox" className="mt-1" />
            <p>
              I agree to the{" "}
              <span className="text-emerald-400 cursor-pointer">
                Terms & Conditions
              </span>{" "}
              and{" "}
              <span className="text-emerald-400 cursor-pointer">
                Privacy Policy
              </span>
            </p>
          </div>

          <button className="w-full mt-6 py-3 rounded-full bg-emerald-700 hover:bg-emerald-600 transition">
            Continue
          </button>
        </div>

      </div>
    </div>
  );
}
