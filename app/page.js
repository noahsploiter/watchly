"use client";

import { AuthProvider, useAuth } from "./contexts/AuthContext";
import AuthContainer from "./components/auth/AuthContainer";
import Lobby from "./components/Lobby";

function HomeContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return user ? <Lobby /> : <AuthContainer />;
}

export default function Home() {
  return (
    <AuthProvider>
      <HomeContent />
    </AuthProvider>
  );
}
