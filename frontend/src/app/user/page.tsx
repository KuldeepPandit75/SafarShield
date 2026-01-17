"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import Hero from "../../components/Hero";
import Features from "../../components/Features";
import Footer from "../../components/Footer";
import useAuthStore from "@/Zustand_Store/AuthStore";

const UserPage: React.FC = () => {
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
      // Redirect based on role if not tourist
      const userRole = String(user.role).toLowerCase();
      if (userRole === 'officer' || userRole === 'police' || userRole === 'admin') {
        router.push('/dashboard');
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
    <div className="min-h-screen bg-[#0b0f14] text-white">
      <Navbar />
      <Hero />
      <Features />
      <Footer />
    </div>
  );
};

export default UserPage;
