"use client";

import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Features from "../components/Features";
import Footer from "../components/Footer";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0b0f14] text-white">
      <Navbar />
      <Hero />
      <Features />
      <Footer />
    </main>
  );
}

