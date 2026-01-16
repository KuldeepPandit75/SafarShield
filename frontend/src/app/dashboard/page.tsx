"use client";

import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import MapPanel from "@/components/dashboard/MapPanel";
import AlertsPanel from "@/components/dashboard/AlertsPanel";
import AnalyticsPanel from "@/components/dashboard/AnalyticsPanel";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen bg-[#0b0f14] text-white">
      
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <Topbar />

        <div className="p-6 grid grid-cols-12 gap-6">
          
          {/* Map */}
          <div className="col-span-8">
            <MapPanel />
          </div>

          {/* Right Panels */}
          <div className="col-span-4 space-y-6">
            <AlertsPanel />
            <AnalyticsPanel />
          </div>

        </div>
      </div>

    </div>
  );
}
