"use client";

export default function Topbar() {
  return (
    <div className="h-16 bg-[#0f1a26] flex items-center justify-between px-6 border-b border-gray-700">
      <input
        placeholder="Tourist ID, Location, Status"
        className="bg-[#111827] px-4 py-2 rounded-md w-96"
      />

      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-300">Welcome, Officer</span>
        <div className="w-8 h-8 bg-gray-400 rounded-full" />
      </div>
    </div>
  );
}

