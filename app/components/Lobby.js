"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { FaSignOutAlt, FaUser, FaPlus, FaPlay, FaUsers } from "react-icons/fa";

export default function Lobby() {
  const { user, logout } = useAuth();
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoom, setNewRoom] = useState({ movieTitle: "", movieUrl: "" });
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch rooms on component mount
  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await fetch("/api/rooms");
      const data = await response.json();

      if (data.success) {
        setRooms(data.rooms);
      } else {
        setError("Failed to fetch rooms");
      }
    } catch (error) {
      console.error("Error fetching rooms:", error);
      setError("Failed to fetch rooms");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newRoom),
      });

      const data = await response.json();

      if (data.success) {
        setRooms([data.room, ...rooms]);
        setShowCreateRoom(false);
        setNewRoom({ movieTitle: "", movieUrl: "" });
        // Redirect to the room
        window.location.href = `/room/${data.room._id}`;
      } else {
        setError(data.error);
      }
    } catch (error) {
      console.error("Error creating room:", error);
      setError("Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (roomId) => {
    console.log("Attempting to join room:", roomId);
    try {
      const token = localStorage.getItem("token");
      console.log("Token found:", !!token);
      
      const response = await fetch(`/api/rooms/${roomId}/join`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Join response status:", response.status);
      console.log("Join response ok:", response.ok);

      const data = await response.json();
      console.log("Join response data:", data);

      if (data.success) {
        console.log("Join successful, redirecting to:", `/room/${roomId}`);
        // Redirect to the room page
        window.location.href = `/room/${roomId}`;
      } else {
        console.error("Join failed:", data.error);
        setError(data.error);
      }
    } catch (error) {
      console.error("Error joining room:", error);
      setError("Failed to join room");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Watchly
              </h1>
            </div>

            {/* User Info & Actions */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                <FaUser className="w-4 h-4 text-purple-300" />
                <span className="text-sm font-medium text-white">
                  {user?.username}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
              >
                <FaSignOutAlt className="w-4 h-4" />
                <span className="text-sm hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="text-center mb-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Welcome back, {user?.username}!
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Create a watch party or join your friends for synchronized viewing
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-md mx-auto mb-6 bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-center">
            {error}
          </div>
        )}

        {/* Create Room Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={() => setShowCreateRoom(true)}
            disabled={loading}
            className="bg-gradient-to-r from-purple-600 to-pink-500 text-white px-8 py-4 rounded-2xl font-semibold hover:from-purple-700 hover:to-pink-600 transition-all transform hover:scale-105 flex items-center space-x-3 shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <FaPlus className="w-6 h-6" />
            <span>{loading ? "Loading..." : "Create Watch Party"}</span>
          </button>
        </div>

        {/* Create Room Modal */}
        {showCreateRoom && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-white/20">
              <h3 className="text-xl font-semibold text-white mb-6">
                Create New Watch Party
              </h3>
              <form onSubmit={handleCreateRoom} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Movie Title
                  </label>
                  <input
                    type="text"
                    value={newRoom.movieTitle}
                    onChange={(e) =>
                      setNewRoom({ ...newRoom, movieTitle: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-slate-700 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    placeholder="Enter movie title"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Video URL
                  </label>
                  <input
                    type="url"
                    value={newRoom.movieUrl}
                    onChange={(e) =>
                      setNewRoom({ ...newRoom, movieUrl: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-slate-700 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    placeholder="Paste video URL here"
                    required
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateRoom(false)}
                    className="flex-1 px-4 py-3 bg-slate-600 text-white rounded-xl hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl hover:from-purple-700 hover:to-pink-600 transition-all"
                  >
                    Create Room
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && rooms.length === 0 && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
            <p className="text-gray-300">Loading watch parties...</p>
          </div>
        )}

        {/* Active Rooms */}
        {!loading && (
          <div className="mb-8">
            <h3 className="text-2xl font-semibold text-white mb-6">
              Active Watch Parties
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms
                .filter((room) => room.isActive)
                .map((room) => (
                  <div
                    key={room._id}
                    className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all cursor-pointer group"
                    onClick={() => handleJoinRoom(room._id)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                          <FaPlay className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-white group-hover:text-purple-300 transition-colors">
                            {room.movieTitle}
                          </h4>
                          <p className="text-sm text-gray-300">
                            Hosted by {room.hostName}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 text-gray-300">
                        <FaUsers className="w-4 h-4" />
                        <span className="text-sm">
                          {room.participants?.length || 0}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
                        Live
                      </span>
                      <button className="text-purple-300 hover:text-purple-200 transition-colors text-sm font-medium">
                        Join Party →
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Inactive Rooms */}
        {!loading && rooms.some((room) => !room.isActive) && (
          <div>
            <h3 className="text-2xl font-semibold text-white mb-6">
              Recent Watch Parties
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms
                .filter((room) => !room.isActive)
                .map((room) => (
                  <div
                    key={room._id}
                    className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 opacity-60"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gray-600 rounded-xl flex items-center justify-center">
                          <FaPlay className="w-6 h-6 text-gray-400" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-white">
                            {room.movieTitle}
                          </h4>
                          <p className="text-sm text-gray-400">
                            Hosted by {room.hostName}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 text-gray-400">
                        <FaUsers className="w-4 h-4" />
                        <span className="text-sm">
                          {room.participants?.length || 0}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
                        Ended
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && rooms.filter((room) => room.isActive).length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <FaPlay className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No active watch parties
            </h3>
            <p className="text-gray-400 mb-6">
              Be the first to create a watch party and invite your friends!
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
