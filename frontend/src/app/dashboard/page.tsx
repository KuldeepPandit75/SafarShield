"use client";

import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import AuthorityMap from "@/components/dashboard/AuthorityMap";
import AlertsPanel from "@/components/dashboard/AlertsPanel";
import StatsPanel from "@/components/dashboard/StatsPanel";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen bg-[#0b0f14] text-white">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Topbar />

        <div className="p-6 grid grid-cols-12 gap-6">
          <div className="col-span-8 h-96">
            <AuthorityMap />
          </div>

          <div className="col-span-4 space-y-6">
            <AlertsPanel />
            <StatsPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
