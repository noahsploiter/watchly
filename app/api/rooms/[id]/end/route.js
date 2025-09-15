import { NextResponse } from "next/server";
import { endRoom } from "../../../../../lib/room";
import { publishToRoom } from "../../../../../lib/sseHub";
import jwt from "jsonwebtoken";

export async function POST(request, { params }) {
  try {
    const { id: roomId } = await params;

    // Get user from JWT token
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authorization token required" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // First set room state to "ended" to notify all participants
    const { updateRoomState } = await import("../../../../../lib/room");
    await updateRoomState(roomId, "ended", decoded.userId);

    // Then end the room (mark as inactive)
    const room = await endRoom(roomId, decoded.userId);
    publishToRoom(roomId, {
      type: "ended",
      roomState: room.roomState,
      participants: room.participants || [],
      isActive: room.isActive,
      ts: Date.now(),
    });

    return NextResponse.json({
      success: true,
      message: "Room ended successfully",
      room,
    });
  } catch (error) {
    console.error("Error ending room:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
