"use client";

const Topbar = () => {
  return (
    <div className="h-16 bg-[#0f1a26] flex items-center justify-between px-6 border-b border-gray-700">
      <input
        type="text"
        placeholder="Search location / tourist ID"
        className="w-96 px-4 py-2 bg-[#111827] text-white rounded-md outline-none"
      />

      <div className="flex items-center gap-3">
        <span className="text-gray-300">Welcome Officer!</span>
        <div className="w-8 h-8 bg-gray-400 rounded-full" />
      </div>
    </div>
  );
};

export default Topbar;
