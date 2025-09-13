"use client";

import { useState } from "react";
import { EyeOpenIcon, EyeClosedIcon } from "@radix-ui/react-icons";
import { useAuth } from "../../contexts/AuthContext";

export default function SignupForm({ onToggleMode }) {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    phone: "",
    username: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);

  const { register } = useAuth();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Calculate password strength
    if (name === "password") {
      let strength = 0;
      if (value.length >= 6) strength += 1;
      if (value.length >= 8) strength += 1;
      if (/[A-Z]/.test(value)) strength += 1;
      if (/[0-9]/.test(value)) strength += 1;
      if (/[^A-Za-z0-9]/.test(value)) strength += 1;
      setPasswordStrength(strength);
    }

    // Clear error when user starts typing
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Validate phone number format (09XXXXXXXXX)
    const phoneRegex = /^09[0-9]{8}$/;
    if (!phoneRegex.test(formData.phone)) {
      setError(
        "Please enter a valid phone number starting with 09 (10 digits total)"
      );
      setIsLoading(false);
      return;
    }

    const result = await register(
      formData.username,
      formData.phone,
      formData.password
    );

    if (result.success) {
      // Registration successful, user will be redirected to lobby
      console.log("Registration successful:", result.user);
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 2) return "bg-red-500";
    if (passwordStrength <= 3) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 2) return "Weak";
    if (passwordStrength <= 3) return "Medium";
    return "Strong";
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Phone Number Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Phone Number
        </label>
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleInputChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-500"
          placeholder="09XXXXXXXXX"
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          Enter your phone number starting with 09 (10 digits total)
        </p>
      </div>

      {/* Username Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Username
        </label>
        <input
          type="text"
          name="username"
          value={formData.username}
          onChange={handleInputChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-500"
          placeholder="Choose a username"
          required
        />
      </div>

      {/* Password Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Password
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-500"
            placeholder="Create a password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showPassword ? (
              <EyeClosedIcon className="w-5 h-5" />
            ) : (
              <EyeOpenIcon className="w-5 h-5" />
            )}
          </button>
        </div>
        {formData.password && (
          <div className="mt-2 flex items-center">
            <div
              className={`h-1 rounded-full flex-1 ${getPasswordStrengthColor()}`}
              style={{ width: `${(passwordStrength / 5) * 100}%` }}
            ></div>
            <span
              className={`ml-2 text-sm font-medium ${
                passwordStrength <= 2
                  ? "text-red-600"
                  : passwordStrength <= 3
                  ? "text-yellow-600"
                  : "text-green-600"
              }`}
            >
              {getPasswordStrengthText()}
            </span>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white py-3 rounded-xl font-medium hover:from-purple-700 hover:to-pink-600 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        {isLoading ? "Creating account..." : "Sign up"}
      </button>

      {/* Account Toggle */}
      <div className="text-center mt-6">
        <span className="text-gray-600 text-sm">Already have an account?</span>
        <button
          type="button"
          onClick={onToggleMode}
          className="ml-2 text-purple-600 text-sm font-medium hover:text-purple-700 transition-colors"
        >
          Sign in
        </button>
      </div>
    </form>
  );
}
