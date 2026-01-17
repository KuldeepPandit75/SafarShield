"use client";

import { useRouter, usePathname } from "next/navigation";

const menu = [
  { label: "Overview", path: "/dashboard" },
  { label: "Live Tracking", path: "/dashboard/live-tracking" },
  { label: "Emergency Alerts", path: "#" },
  { label: "Tourist IDs", path: "#" },
  { label: "Reports", path: "#" },
  { label: "Analytics", path: "#" },
  { label: "Settings", path: "#" },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-[#0f1a26] p-6 space-y-6">
      <h2 className="text-xl font-bold text-emerald-400">
        HimalayanGuard
      </h2>

      <nav className="space-y-2">
        {menu.map((item) => (
          <div
            key={item.label}
            onClick={() => item.path !== "#" && router.push(item.path)}
            className={`px-3 py-2 rounded-md cursor-pointer transition
              ${
                pathname === item.path
                  ? "bg-emerald-600 text-white"
                  : "text-gray-300 hover:bg-[#1c2a3a]"
              }`}
          >
            {item.label}
          </div>
        ))}
      </nav>
    </aside>
  );
}
