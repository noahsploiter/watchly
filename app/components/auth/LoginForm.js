"use client";

import { useState } from "react";
import { EyeOpenIcon, EyeClosedIcon } from "@radix-ui/react-icons";
import { useAuth } from "../../contexts/AuthContext";

export default function LoginForm({ onToggleMode }) {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { login } = useAuth();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const result = await login(formData.username, formData.password);

    if (result.success) {
      // Login successful, user will be redirected to lobby
      console.log("Login successful:", result.user);
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

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
          placeholder="Enter your username"
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
            placeholder="Enter your password"
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
      </div>

      {/* Forgot Password */}
      <div className="text-right">
        <button
          type="button"
          className="text-purple-600 text-sm hover:text-purple-700 transition-colors"
        >
          Forgot your password?
        </button>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white py-3 rounded-xl font-medium hover:from-purple-700 hover:to-pink-600 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        {isLoading ? "Signing in..." : "Sign In"}
      </button>

      {/* Account Toggle */}
      <div className="text-center mt-6">
        <span className="text-gray-600 text-sm">
          Don&apos;t have an account?
        </span>
        <button
          type="button"
          onClick={onToggleMode}
          className="ml-2 text-purple-600 text-sm font-medium hover:text-purple-700 transition-colors"
        >
          Get Started
        </button>
      </div>
    </form>
  );
}
