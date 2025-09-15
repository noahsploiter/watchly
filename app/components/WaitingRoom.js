"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { FaPlay, FaCopy, FaCheck, FaUsers, FaTimes } from "react-icons/fa";

export default function WaitingRoom({ room, onStartMovie }) {
  const { user } = useAuth();
  const [participants, setParticipants] = useState(room.participants || []);
  const [roomLink, setRoomLink] = useState("");
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Generate room link
    const link = `${window.location.origin}/room/${room._id}`;
    setRoomLink(link);

    // Subscribe to SSE for realtime updates
    const es = new EventSource(`/api/rooms/${room._id}/events`);

    const handleMessage = (evt) => {
      try {
        const payload = JSON.parse(evt.data);
        if (payload.participants) {
          setParticipants(payload.participants);
        }
        const state = payload.roomState || "waiting";
        if (state === "countdown") {
          router.push(`/room/${room._id}/countdown`);
        } else if (state === "playing") {
          router.push(`/room/${room._id}/player`);
        } else if (payload.isActive === false || state === "ended") {
          router.push("/");
        }
      } catch (e) {
        // ignore malformed
      }
    };

    es.onmessage = handleMessage;
    es.addEventListener("snapshot", handleMessage);

    es.onerror = () => {
      // Auto-reconnect will happen; optional logging
    };

    return () => {
      es.close();
    };
  }, [room._id, router]);

  const copyRoomLink = async () => {
    try {
      await navigator.clipboard.writeText(roomLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  };

  const isHost = user?.userId === room.hostId;

  // Cancel stream function
  const handleCancelStream = async () => {
    if (!isHost) return;

    if (
      window.confirm(
        "Are you sure you want to end this stream? This will remove the room from the lobby."
      )
    ) {
      try {
        const response = await fetch(`/api/rooms/${room._id}/end`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (response.ok) {
          // Redirect to lobby
          window.location.href = "/";
        } else {
          console.error("Failed to end room");
        }
      } catch (error) {
        console.error("Error ending room:", error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 w-full max-w-2xl border border-white/20">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <FaPlay className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {room.movieTitle}
          </h1>
          <p className="text-gray-300">Waiting for participants to join...</p>
        </div>

        {/* Room Link */}
        <div className="bg-white/5 rounded-2xl p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">
            Share Room Link
          </h3>
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={roomLink}
              readOnly
              className="flex-1 px-4 py-3 bg-slate-700 border border-white/20 rounded-xl text-white text-sm"
            />
            <button
              onClick={copyRoomLink}
              className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors flex items-center space-x-2"
            >
              {copied ? (
                <>
                  <FaCheck className="w-4 h-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <FaCopy className="w-4 h-4" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Participants */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <FaUsers className="w-5 h-5" />
            <span>Participants ({participants.length})</span>
          </h3>
          <div className="space-y-3">
            {participants.map((participant, index) => (
              <div
                key={participant.userId}
                className="flex items-center space-x-3 bg-white/5 rounded-xl p-4"
              >
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {participant.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">
                    {participant.username}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {participant.userId === room.hostId
                      ? "Host"
                      : "Participant"}
                  </p>
                </div>
                {participant.userId === room.hostId && (
                  <div className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs font-medium">
                    Host
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Host Controls */}
        {isHost && (
          <div className="text-center space-y-4">
            <button
              onClick={onStartMovie}
              className="bg-gradient-to-r from-green-600 to-emerald-500 text-white px-8 py-4 rounded-2xl font-semibold hover:from-green-700 hover:to-emerald-600 transition-all transform hover:scale-105 flex items-center space-x-3 mx-auto"
            >
              <FaPlay className="w-6 h-6" />
              <span>Start Movie</span>
            </button>

            <button
              onClick={handleCancelStream}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-medium transition-colors duration-200 flex items-center space-x-2 mx-auto"
            >
              <FaTimes className="w-4 h-4" />
              <span>End Stream</span>
            </button>
          </div>
        )}

        {/* Participant Message */}
        {!isHost && (
          <div className="text-center">
            <p className="text-gray-300 mb-4">
              Waiting for the host to start the movie...
            </p>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-sm text-gray-400">
                You&apos;ll be redirected automatically when the movie starts
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
