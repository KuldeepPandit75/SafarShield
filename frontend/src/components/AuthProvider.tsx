"use client";

import { useEffect, useState } from "react";
import useAuthStore from "@/Zustand_Store/AuthStore";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { verifyUser, loading } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Verify user on app initialization only once
    if (!isInitialized) {
      verifyUser().finally(() => {
        setIsInitialized(true);
      });
    }
  }, [verifyUser, isInitialized]);

  // Show loading state only on initial mount
  if (!isInitialized && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0f14]">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}

