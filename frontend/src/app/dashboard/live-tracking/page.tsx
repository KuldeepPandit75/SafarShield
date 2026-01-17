"use client";

import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import AuthorityMap from "@/components/dashboard/AuthorityMap";
import AlertsPanel from "@/components/dashboard/AlertsPanel";
import StatsPanel from "@/components/dashboard/StatsPanel";
import LiveTrackingSidebar from "@/components/dashboard/live-tracking/LiveTrackingSidebar";

export default function LiveTrackingPage() {
  return (
    <div className="flex min-h-screen bg-[#0b0f14] text-white">

      {/* LEFT MAIN SIDEBAR */}
      <Sidebar />

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col">
        <Topbar />

        <div className="p-6 grid grid-cols-12 gap-6">

          {/* MAP + BOTTOM TABLE */}
          <div className="col-span-8 space-y-4">
            <h2 className="text-lg font-semibold">
              Live Tracking & Risk Zones
            </h2>

            <div className="h-130">
              <AuthorityMap />
            </div>

            {/* Active Incidents Table (UI only) */}
            <div className="bg-[#0f1a26] rounded-xl p-4">
              <h3 className="font-semibold mb-3">Active Incidents</h3>
              <table className="w-full text-sm text-gray-300">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-2">ID</th>
                    <th>Type</th>
                    <th>Time</th>
                    <th>Location</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>1</td>
                    <td>SOS Triggered</td>
                    <td>12:30</td>
                    <td>Zone B</td>
                    <td className="text-red-400">Critical</td>
                  </tr>
                  <tr>
                    <td>2</td>
                    <td>Off Route</td>
                    <td>12:10</td>
                    <td>Zone A</td>
                    <td className="text-yellow-400">Warning</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* RIGHT LIVE TRACKING CONTROLS */}
          <div className="col-span-4 space-y-6">
            <LiveTrackingSidebar />
            <AlertsPanel />
            <StatsPanel />
          </div>

        </div>
      </div>
    </div>
  );
}
