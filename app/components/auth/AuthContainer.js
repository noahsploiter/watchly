"use client";

import { useState } from "react";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";

export default function AuthContainer() {
  const [isSignUp, setIsSignUp] = useState(false);

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-500 px-4 py-8">
        <h1 className="text-white text-4xl font-bold text-center">Watchly</h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white rounded-t-3xl -mt-4 px-6 py-8">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isSignUp ? "Get started free." : "Welcome Back"}
            </h2>
            <p className="text-gray-600">
              {isSignUp
                ? "Free forever. No credit card needed."
                : "Enter your details below."}
            </p>
          </div>

          {isSignUp ? (
            <SignupForm onToggleMode={toggleMode} />
          ) : (
            <LoginForm onToggleMode={toggleMode} />
          )}
        </div>
      </div>
    </div>
  );
}
