"use client";

import React from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuthStore from "../Zustand_Store/AuthStore";

const LandingPage: React.FC = () => {
  const router = useRouter();
  const { isAuthenticated, user, loading, verifyUser, getRedirectPath } = useAuthStore();

  useEffect(() => {
    // Verify user on mount
    verifyUser();
  }, [verifyUser]);

  useEffect(() => {
    // Redirect based on role from AuthStore
    if (!loading && isAuthenticated && user) {
      const redirectPath = getRedirectPath(user);
      if (redirectPath !== '/') {
        router.replace(redirectPath);
      }
    } else if (!loading && !isAuthenticated) {
      // If not authenticated, stay on landing page or redirect to home
      router.replace('/');
    }
  }, [isAuthenticated, user, loading, router, getRedirectPath]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0f14]">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f14] text-white">
      
    </div>
  );
};

export default LandingPage;
