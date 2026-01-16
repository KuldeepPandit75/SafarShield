"use client";

import { useState } from "react";
import OtpModal from "./OtpModal";

interface Props {
  onClose: () => void;
}

const AadhaarModal = ({ onClose }: Props) => {
  const [step, setStep] = useState<"form" | "otp">("form");

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#0f1a26] w-full max-w-md rounded-xl p-6 text-white relative">

        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-gray-400 hover:text-white"
        >
          ✕
        </button>

        {step === "form" ? (
          <>
            <h2 className="text-xl font-semibold mb-2 text-center">
              Aadhaar Verification Required
            </h2>

            <p className="text-sm text-gray-400 text-center mb-6">
              As per government safety norms, Aadhaar verification is mandatory
              before accessing the app.
            </p>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Aadhaar Number"
                className="w-full px-4 py-2 bg-transparent border border-gray-600 rounded-md"
              />

              <input
                type="text"
                placeholder="Mobile Number (Linked with Aadhaar)"
                className="w-full px-4 py-2 bg-transparent border border-gray-600 rounded-md"
              />
            </div>

            <button
              onClick={() => setStep("otp")}
              className="w-full mt-6 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 transition"
            >
              Send OTP
            </button>
          </>
        ) : (
          <OtpModal />
        )}
      </div>
    </div>
  );
};

export default AadhaarModal;
