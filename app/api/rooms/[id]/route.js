import { NextResponse } from "next/server";
import { findRoomById } from "../../../../lib/room";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import clientPromise from "../../../../lib/mongodb";

export async function GET(request, { params }) {
  try {
    const { id: roomId } = await params;

    // Validate roomId
    if (!roomId) {
      return NextResponse.json(
        { error: "Room ID is required" },
        { status: 400 }
      );
    }

    const room = await findRoomById(roomId);

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    console.log(`Room ${roomId} state:`, room.roomState || "undefined");

    return NextResponse.json({
      success: true,
      room: {
        _id: room._id,
        hostId: room.hostId,
        hostName: room.hostName,
        movieTitle: room.movieTitle,
        movieUrl: room.movieUrl,
        participants: room.participants || [],
        isActive: room.isActive,
        roomState: room.roomState || "waiting",
        createdAt: room.createdAt,
      },
    });
  } catch (error) {
    console.error("Error fetching room:", error);

    // Check if it's a MongoDB connection error
    if (error.message && error.message.includes("MongoDB")) {
      return NextResponse.json(
        {
          error:
            "Database connection error. Please check MONGODB_URI environment variable.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a room (host only)
export async function DELETE(request, { params }) {
  try {
    const { id: roomId } = await params;

    if (!roomId) {
      return NextResponse.json(
        { error: "Room ID is required" },
        { status: 400 }
      );
    }

    // Auth: only the host can delete their room
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

    const client = await clientPromise;
    const db = client.db("middle-gate");
    const rooms = db.collection("rooms");

    // Verify room and ownership
    const room = await rooms.findOne({ _id: new ObjectId(roomId) });
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.hostId !== decoded.userId) {
      return NextResponse.json(
        { error: "Only the host can delete this room" },
        { status: 403 }
      );
    }

    await rooms.deleteOne({ _id: new ObjectId(roomId) });

    return NextResponse.json({ success: true, message: "Room deleted" });
  } catch (error) {
    console.error("Error deleting room:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
