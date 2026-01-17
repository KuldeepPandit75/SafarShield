"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthHeader from "@/components/AuthHeader";
import useAuthStore, { Role } from "@/Zustand_Store/AuthStore";

export default function SignUpPage() {
  const { error, register, checkUsernameAvailability, googleLogin, isAuthenticated, user, loading, verifyUser, getRedirectPath } = useAuthStore();
  const router = useRouter();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'traveller' as 'traveller' | 'officer',
    agreeToTerms: false
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [formErrors, setFormErrors] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    username: "",
    terms: ""
  });

  // Check if already authenticated and redirect
  useEffect(() => {
    verifyUser();
  }, [verifyUser]);

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      const redirectPath = getRedirectPath(user);
      router.replace(redirectPath);
    }
  }, [loading, isAuthenticated, user, router, getRedirectPath]);

  const handleCheckUsername = async (username: string) => {
    if (!username) return true;
    setIsCheckingUsername(true);
    try {
      const isAvailable = await checkUsernameAvailability(username);
      return isAvailable;
    } catch (error) {
      console.error('Error checking username:', error);
      return false;
    } finally {
      setIsCheckingUsername(false);
    }
  };

  // Validation functions
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.([^\s@]{2,})+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    if (password.length < 6) {
      return false;
    }
    const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/;
    return passwordRegex.test(password);
  };

  const validateFullName = (firstName: string, lastName: string) => {
    const nameRegex = /^[a-zA-Z\s]{2,20}$/;
    return nameRegex.test(firstName) && nameRegex.test(lastName);
  };

  const validateForm = async () => {
    const errors = {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      username: "",
      terms: ""
    };
    let isValid = true;

    // First Name and Last Name validation
    if (!validateFullName(formData.firstName, formData.lastName)) {
      errors.fullName = "First and last name must be 2-20 characters long and contain only letters";
      isValid = false;
    }

    // Email validation
    if (!validateEmail(formData.email)) {
      errors.email = "Please enter a valid email address";
      isValid = false;
    }

    // Password validation
    if (formData.password.length < 6) {
      errors.password = "Password must be at least 6 characters long";
      isValid = false;
    } else if (!validatePassword(formData.password)) {
      errors.password = "Password must contain at least 8 characters, 1 capital letter, 1 number, and 1 special character";
      isValid = false;
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
      isValid = false;
    }

    // Username validation
    if (!formData.username) {
      errors.username = "Username is required";
      isValid = false;
    } else if (formData.username.length < 3) {
      errors.username = "Username must be at least 3 characters long";
      isValid = false;
    }

    // Terms and conditions validation
    if (!formData.agreeToTerms) {
      errors.terms = "You must agree to the Terms and Conditions";
      isValid = false;
    }

    setFormErrors(errors);

    if (isValid) {
      const isUsernameAvailable = await handleCheckUsername(formData.username);
      if (!isUsernameAvailable) {
        errors.username = "Username is already taken";
        setFormErrors(errors);
        return false;
      }
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(await validateForm())) return;

    setIsLoading(true);
    try {
      const redirectPath = await register({
        fullname: {
          firstname: formData.firstName,
          lastname: formData.lastName
        },
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });
      router.push(redirectPath);
    } catch (err) {
      console.error('Registration failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
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
          <h2 className="text-xl font-semibold text-center mb-6">Sign Up for SafarShield</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500 rounded-md text-red-500 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* First Name */}
            <div>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="First Name"
                className="w-full px-4 py-2 bg-transparent border border-gray-600 rounded-md focus:outline-none focus:border-emerald-400"
                required
              />
              {formErrors.fullName && (
                <p className="text-red-500 text-xs mt-1">{formErrors.fullName}</p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Last Name"
                className="w-full px-4 py-2 bg-transparent border border-gray-600 rounded-md focus:outline-none focus:border-emerald-400"
                required
              />
            </div>

            {/* Username */}
            <div>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Username"
                className="w-full px-4 py-2 bg-transparent border border-gray-600 rounded-md focus:outline-none focus:border-emerald-400"
                required
              />
              {isCheckingUsername && (
                <p className="text-gray-400 text-xs mt-1">Checking username...</p>
              )}
              {formErrors.username && (
                <p className="text-red-500 text-xs mt-1">{formErrors.username}</p>
              )}
            </div>

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

            {/* Role Selection */}
            <div>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-[#0b0f14] border border-gray-600 rounded-md focus:outline-none focus:border-emerald-400 text-white"
                required
              >
                <option value="traveller">Traveller</option>
                <option value="officer">Officer</option>
              </select>
              <p className="text-gray-400 text-xs mt-1">Select your role</p>
            </div>

            {/* Password */}
            <div>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create Password"
                className="w-full px-4 py-2 bg-transparent border border-gray-600 rounded-md focus:outline-none focus:border-emerald-400"
                required
              />
              {formErrors.password && (
                <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm Password"
                className="w-full px-4 py-2 bg-transparent border border-gray-600 rounded-md focus:outline-none focus:border-emerald-400"
                required
              />
              {formErrors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{formErrors.confirmPassword}</p>
              )}
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="flex items-start gap-2 mt-4 text-sm text-gray-400">
            <input
              type="checkbox"
              name="agreeToTerms"
              checked={formData.agreeToTerms}
              onChange={handleChange}
              className="mt-1"
            />
            <p>
              I agree to the{" "}
              <span className="text-emerald-400 cursor-pointer">
                Terms & Conditions
              </span>{" "}
              and{" "}
              <span className="text-emerald-400 cursor-pointer">
                Privacy Policy
              </span>
            </p>
          </div>
          {formErrors.terms && (
            <p className="text-red-500 text-xs mt-1">{formErrors.terms}</p>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || isCheckingUsername}
            className="w-full mt-6 py-3 rounded-full bg-emerald-700 hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </button>

          <p className="text-center mt-4 text-sm text-gray-400">
            Already have an account?{" "}
            <a href="/Login" className="text-emerald-400 hover:underline">
              Log In
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
