import React from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuthStore from "../Zustand_Store/AuthStore";

const LandingPage: React.FC = () => {
  // Redirect based on role from AuthStore

  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === "officer") {
        router.replace("/dashboard");
      } else if (user.role === "traveller" || user.role === "tourist") {
        router.replace("/user");
      }
    }
  }, [isAuthenticated, user, router]);
  return (
    <div className="min-h-screen bg-[#0b0f14] text-white">
      
    </div>
  );
};

export default LandingPage;
