"use client";

import { useState, useEffect, useCallback } from "react";
import { AuthProvider, useAuth } from "../../../contexts/AuthContext";
import WaitingRoom from "../../../components/WaitingRoom";
import { useRouter } from "next/navigation";

function WaitingRoomContent({ params }) {
  const { user } = useAuth();
  const router = useRouter();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [participants, setParticipants] = useState([]);
  const [roomId, setRoomId] = useState(null);

  useEffect(() => {
    const getRoomId = async () => {
      const resolvedParams = await params;
      setRoomId(resolvedParams.id);
    };
    getRoomId();
  }, [params]);

  const fetchRoom = useCallback(async () => {
    if (!roomId) return;

    try {
      const response = await fetch(`/api/rooms/${roomId}`);

      if (!response.ok) {
        if (response.status === 500) {
          setError(
            "Server error. Please check your environment variables (MONGODB_URI, JWT_SECRET)"
          );
          return;
        }
        const errorData = await response.json();
        setError(errorData.error || "Failed to load room");
        return;
      }

      const data = await response.json();

      if (data.success) {
        console.log("Fetched room data:", data.room);
        setRoom(data.room);
        setParticipants(data.room.participants || []);

        // Check room state and redirect if needed
        const roomState = data.room.roomState || "waiting";
        if (roomState === "playing") {
          router.push(`/room/${roomId}/player`);
        } else if (roomState === "countdown") {
          router.push(`/room/${roomId}/countdown`);
        } else if (roomState === "ended") {
          router.push("/");
        }
      } else {
        setError(data.error);
      }
    } catch (error) {
      console.error("Error fetching room:", error);
      setError("Failed to load room");
    } finally {
      setLoading(false);
    }
  }, [roomId, router]);

  useEffect(() => {
    fetchRoom();
  }, [roomId, fetchRoom]);

  const handleStartMovie = async () => {
    console.log("Host starting movie - setting state to countdown");
    // Update room state in database
    try {
      const response = await fetch(`/api/rooms/${roomId}/state`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ roomState: "countdown" }),
      });
      const data = await response.json();
      console.log("Room state update response:", data);

      if (data.success) {
        router.push(`/room/${roomId}/countdown`);
      }
    } catch (error) {
      console.error("Error updating room state:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-white">Loading room...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-400 text-2xl">!</span>
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">Error</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl transition-colors"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white">Room not found</p>
        </div>
      </div>
    );
  }

  return <WaitingRoom room={room} onStartMovie={handleStartMovie} />;
}

export default function WaitingRoomPage({ params }) {
  return (
    <AuthProvider>
      <WaitingRoomContent params={params} />
    </AuthProvider>
  );
}
