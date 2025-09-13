"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

function RoomRedirect({ params }) {
  const router = useRouter();
  const [roomId, setRoomId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getRoomId = async () => {
      const resolvedParams = await params;
      setRoomId(resolvedParams.id);
    };
    getRoomId();
  }, [params]);

  useEffect(() => {
    if (!roomId) return;

    const fetchRoomAndRedirect = async () => {
      try {
        const response = await fetch(`/api/rooms/${roomId}`);
        
        if (!response.ok) {
          console.error("Failed to fetch room:", response.status);
          router.push("/");
          return;
        }

        const data = await response.json();

        if (data.success && data.room) {
          const roomState = data.room.roomState || "waiting";
          
          // Redirect to appropriate page based on room state
          switch (roomState) {
            case "waiting":
              router.push(`/room/${roomId}/waiting`);
              break;
            case "countdown":
              router.push(`/room/${roomId}/countdown`);
              break;
            case "playing":
              router.push(`/room/${roomId}/player`);
              break;
            case "ended":
              router.push("/");
              break;
            default:
              router.push(`/room/${roomId}/waiting`);
          }
        } else {
          console.error("Room not found or error:", data.error);
          router.push("/");
        }
      } catch (error) {
        console.error("Error fetching room:", error);
        router.push("/");
      } finally {
        setLoading(false);
      }
    };

    fetchRoomAndRedirect();
  }, [roomId, router]);

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

  return null;
}

export default function RoomPage({ params }) {
  return <RoomRedirect params={params} />;
}