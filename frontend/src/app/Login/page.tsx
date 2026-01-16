"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthHeader from "@/components/AuthHeader";
import useAuthStore from "@/Zustand_Store/AuthStore";

export default function LoginPage() {
  const { error, login, loading } = useAuthStore();
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({
    email: "",
    password: ""
  });

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.([^\s@]{2,})+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const errors = {
      email: "",
      password: ""
    };
    let isValid = true;

    if (!validateEmail(formData.email)) {
      errors.email = "Please enter a valid email address";
      isValid = false;
    }

    if (formData.password.length < 6) {
      errors.password = "Password must be at least 6 characters long";
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await login(formData.email, formData.password);
      router.push('/');
    } catch (err) {
      console.error('Login failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear errors when user starts typing
    setFormErrors(prev => ({
      ...prev,
      [name]: ""
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0f14]">
      <div className="w-full max-w-md bg-[#0f1a26] rounded-xl shadow-lg">
        <AuthHeader />

        <form onSubmit={handleSubmit} className="p-8 text-white">
          <h2 className="text-xl font-semibold text-center mb-6">Log In to SafarShield</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500 rounded-md text-red-500 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Email */}
            <div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email Address"
                className="w-full px-4 py-2 bg-transparent border border-gray-600 rounded-md focus:outline-none focus:border-emerald-400"
                required
              />
              {formErrors.email && (
                <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Password"
                className="w-full px-4 py-2 bg-transparent border border-gray-600 rounded-md focus:outline-none focus:border-emerald-400"
                required
              />
              {formErrors.password && (
                <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>
              )}
            </div>
          </div>

          <div className="text-right mt-2 text-sm text-gray-400 cursor-pointer hover:text-emerald-400">
            Forgot Password?
          </div>

          <button
            type="submit"
            disabled={isLoading || loading}
            className="w-full mt-6 py-3 rounded-full bg-emerald-700 hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading || loading ? 'Logging In...' : 'Log In'}
          </button>

          <p className="text-center mt-4 text-sm text-gray-400">
            Don't have an account?{" "}
            <a href="/Signup" className="text-emerald-400 hover:underline">
              Sign Up
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
