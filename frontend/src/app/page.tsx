"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthHeader from "@/components/AuthHeader";
import useAuthStore from "@/Zustand_Store/AuthStore";

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated, loading, verifyUser, getRedirectPath } = useAuthStore();

  useEffect(() => {
    // Verify user on mount
    verifyUser();
  }, [verifyUser]);

  // Redirect based on user role
  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      const redirectPath = getRedirectPath(user);
      if (redirectPath !== '/') {
        router.push(redirectPath);
      }
    }
  }, [user, isAuthenticated, loading, router, getRedirectPath]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0f14]">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0f14]">
      <div className="w-full max-w-md bg-[#0f1a26] rounded-xl shadow-lg">
        <AuthHeader />

        <div className="p-8 text-white text-center">
          <h2 className="text-xl font-semibold mb-6">Welcome to SafarShield</h2>
          <p className="text-gray-400 mb-6">Your Tourist Safety Companion</p>
          
          <div className="space-y-3">
            <a 
              href="/Login" 
              className="block w-full py-3 rounded-full bg-emerald-700 hover:bg-emerald-600 transition"
            >
              Log In
            </a>
            <a 
              href="/Signup" 
              className="block w-full py-3 rounded-full border border-emerald-700 hover:bg-emerald-700/10 transition"
            >
              Sign Up
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
