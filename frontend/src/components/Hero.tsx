"use client";

import React, { useState } from "react";
import AadhaarModal from "./AadhaarModal";

const Hero: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <section
        className="pt-32 px-6 rounded-2xl mx-5 mt-20"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.9)), url('https://images.unsplash.com/photo-1501785888041-af3ef285b470')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="max-w-4xl mx-auto text-center py-24">
          <h2 className="text-4xl md:text-5xl font-extrabold leading-tight">
            Your Safety, Our Priority <br />
            <span className="text-emerald-400">in Remote Regions</span>
          </h2>

          <p className="mt-6 text-gray-300 text-lg">
            AI-Powered, Offline-First Tourist Safety Ecosystem
          </p>

          <button
            onClick={() => setOpen(true)}
            className="mt-10 px-8 py-4 rounded-full bg-emerald-400 text-black font-semibold hover:scale-105 transition"
          >
            Download App
          </button>
        </div>
      </section>

      {/* Aadhaar Modal */}
      {open && <AadhaarModal onClose={() => setOpen(false)} />}
    </>
  );
};

export default Hero;
