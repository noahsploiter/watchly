import { NextResponse } from "next/server";
import { createRoom, findActiveRooms } from "../../../lib/room";
import jwt from "jsonwebtoken";

// GET - Fetch all active rooms
export async function GET() {
  try {
    const rooms = await findActiveRooms();
    return NextResponse.json({ success: true, rooms });
  } catch (error) {
    console.error("Error fetching rooms:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a new room
export async function POST(request) {
  try {
    const { movieTitle, movieUrl } = await request.json();

    // Validate input
    if (!movieTitle || !movieUrl) {
      return NextResponse.json(
        { error: "Movie title and URL are required" },
        { status: 400 }
      );
    }

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

    // Create room
    const room = await createRoom({
      hostId: decoded.userId,
      hostName: decoded.username,
      movieTitle,
      movieUrl,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Room created successfully",
        room,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating room:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
