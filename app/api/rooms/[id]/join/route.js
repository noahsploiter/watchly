import { NextResponse } from "next/server";
import { joinRoom } from "../../../../../lib/room";
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

    // Join room
    const room = await joinRoom(roomId, decoded.userId, decoded.username);

    return NextResponse.json(
      {
        success: true,
        message: "Joined room successfully",
        room,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error joining room:", error);

    if (error.message === "Room not found") {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (error.message === "Room is not active") {
      return NextResponse.json(
        { error: "Room is not active" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
