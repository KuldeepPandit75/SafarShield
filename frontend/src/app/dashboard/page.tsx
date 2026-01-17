"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import MapPanel from "@/components/dashboard/MapPanel";
import AlertsPanel from "@/components/dashboard/AlertsPanel";
import AnalyticsPanel from "@/components/dashboard/AnalyticsPanel";
import useAuthStore from "@/Zustand_Store/AuthStore";

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading, verifyUser } = useAuthStore();

  useEffect(() => {
    // Verify user on mount
    verifyUser();
  }, [verifyUser]);

  useEffect(() => {
    // Redirect if not authenticated after loading
    if (!loading && !isAuthenticated) {
      router.push('/Login');
    } else if (!loading && isAuthenticated && user) {
      // Redirect based on role if not officer/police/admin
      const userRole = String(user.role).toLowerCase();
      if (userRole === 'tourist' || userRole === 'traveller') {
        router.push('/user');
      }
    }
  }, [loading, isAuthenticated, user, router]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0f14]">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

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
