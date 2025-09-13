"use client";

import { useState, useEffect, useCallback } from "react";
import { AuthProvider, useAuth } from "../../contexts/AuthContext";
import WaitingRoom from "../../components/WaitingRoom";
import Countdown from "../../components/Countdown";
import VideoPlayer from "../../components/VideoPlayer";

function RoomContent({ params }) {
  const { user } = useAuth();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [roomState, setRoomState] = useState("waiting"); // waiting, countdown, playing, ended
  const [participants, setParticipants] = useState([]);
  const [roomId, setRoomId] = useState(null);
  const [isEnding, setIsEnding] = useState(false);

  useEffect(() => {
    const getRoomId = async () => {
      const resolvedParams = await params;
      setRoomId(resolvedParams.id);
    };
    getRoomId();
  }, [params]);

  useEffect(() => {
    fetchRoom();
  }, [roomId, fetchRoom]);

  // Sync room state across participants
  useEffect(() => {
    if (!roomId) return;

    const syncInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/rooms/${roomId}`);
        const data = await response.json();

        // If room not found, it means it was ended - redirect to lobby
        if (!data.success && data.error === "Room not found") {
          console.log("Room not found (likely ended), redirecting to lobby...");
          setIsEnding(true);
          // Show notification for 2 seconds before redirecting
          setTimeout(() => {
            window.location.href = "/";
          }, 2000);
          return;
        }

        if (data.success && data.room) {
          // Check if room state has changed
          const newRoomState = data.room.roomState || "waiting";
          console.log(
            `Current room state: ${roomState}, New room state: ${newRoomState}`
          );

          // Handle room ended state - redirect all participants to lobby
          if (newRoomState === "ended") {
            console.log("Room has been ended by host, redirecting to lobby...");
            setIsEnding(true);
            // Show notification for 2 seconds before redirecting
            setTimeout(() => {
              window.location.href = "/";
            }, 2000);
            return;
          }

          if (newRoomState !== roomState) {
            console.log(
              `Room state changed from ${roomState} to ${newRoomState}`
            );
            setRoomState(newRoomState);
          }
          setParticipants(data.room.participants || []);
        }
      } catch (error) {
        console.error("Error syncing room state:", error);
      }
    }, 1000);

    return () => clearInterval(syncInterval);
  }, [roomId, roomState]); // Added roomState back but with proper handling

  const fetchRoom = useCallback(async () => {
    if (!roomId) return;

    try {
      const response = await fetch(`/api/rooms/${roomId}`);
      const data = await response.json();

      if (data.success) {
        console.log("Fetched room data:", data.room);
        setRoom(data.room);
        setParticipants(data.room.participants || []);

        // Set initial room state from database
        if (data.room.roomState) {
          console.log(`Setting initial room state to: ${data.room.roomState}`);
          setRoomState(data.room.roomState);
        } else {
          // If roomState is not set, default to "waiting"
          console.log('Room state not found, defaulting to "waiting"');
          setRoomState("waiting");
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
  }, [roomId]);

  const handleStartMovie = async () => {
    console.log("Host starting movie - setting state to countdown");
    setRoomState("countdown");
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
    } catch (error) {
      console.error("Error updating room state:", error);
    }
  };

  const handleCountdownComplete = async () => {
    console.log("Countdown complete - setting state to playing");
    setRoomState("playing");
    // Update room state in database
    try {
      const response = await fetch(`/api/rooms/${roomId}/state`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ roomState: "playing" }),
      });
      const data = await response.json();
      console.log("Room state update response:", data);
    } catch (error) {
      console.error("Error updating room state:", error);
    }
  };

  const isHost = user?.userId === room?.hostId;

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
            onClick={() => (window.location.href = "/")}
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

  return (
    <>
      {/* Room Ending Notification */}
      {isEnding && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center border border-white/20 max-w-md mx-4">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-400 text-2xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2">
              Stream Ended
            </h2>
            <p className="text-gray-300 mb-4">
              The host has ended this stream. You&apos;ll be redirected to the
              lobby shortly.
            </p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto"></div>
          </div>
        </div>
      )}

      {roomState === "waiting" && (
        <WaitingRoom room={room} onStartMovie={handleStartMovie} />
      )}

      {roomState === "countdown" && (
        <Countdown
          participants={participants}
          onCountdownComplete={handleCountdownComplete}
        />
      )}

      {roomState === "playing" && (
        <VideoPlayer room={room} isHost={isHost} onRoomUpdate={fetchRoom} />
      )}
    </>
  );
}

export default function RoomPage({ params }) {
  return (
    <AuthProvider>
      <RoomContent params={params} />
    </AuthProvider>
  );
}
