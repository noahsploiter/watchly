import { NextResponse } from "next/server";
import { updateRoomState } from "../../../../../lib/room";
import jwt from "jsonwebtoken";

export async function POST(request, { params }) {
  try {
    const { id: roomId } = await params;
    const { roomState } = await request.json();

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

    // Validate room state
    const validStates = ["waiting", "countdown", "playing", "ended"];
    if (!validStates.includes(roomState)) {
      return NextResponse.json(
        { error: "Invalid room state" },
        { status: 400 }
      );
    }

    const room = await updateRoomState(roomId, roomState, decoded.userId);

    return NextResponse.json({
      success: true,
      room,
      message: "Room state updated successfully",
    });
  } catch (error) {
    console.error("Error updating room state:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
