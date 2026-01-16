"use client";

const OtpModal = () => {
  return (
    <>
      <h2 className="text-xl font-semibold mb-2 text-center">
        OTP Verification
      </h2>

      <p className="text-sm text-gray-400 text-center mb-6">
        Enter the OTP sent to your Aadhaar-linked mobile number
      </p>

      <input
        type="text"
        placeholder="Enter OTP"
        className="w-full px-4 py-2 bg-transparent border border-gray-600 rounded-md text-center tracking-widest"
      />

      <button
        className="w-full mt-6 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 transition"
      >
        Verify & Continue
      </button>

      <p className="text-center text-sm text-gray-400 mt-4 cursor-pointer hover:text-emerald-400">
        Resend OTP
      </p>
    </>
  );
};

export default OtpModal;
