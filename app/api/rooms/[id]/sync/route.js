import { NextResponse } from "next/server";
import { findRoomById } from "../../../../../lib/room";
import jwt from "jsonwebtoken";

export async function POST(request, { params }) {
  try {
    const { id: roomId } = await params;
    const { type, timestamp } = await request.json();

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

    const room = await findRoomById(roomId);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Check if user is the host
    if (room.hostId !== decoded.userId) {
      return NextResponse.json(
        { error: "Only the host can control playback" },
        { status: 403 }
      );
    }

    // Store the video event in database for participants to sync
    const client = await import("../../../../../lib/mongodb.js").then(
      (m) => m.default
    );
    const db = client.db("middle-gate");
    const videoEvents = db.collection("videoEvents");

    await videoEvents.insertOne({
      roomId,
      type,
      timestamp: new Date(),
      videoTime: timestamp,
      hostId: decoded.userId,
    });

    console.log(
      `Broadcasting ${type} event at ${timestamp} for room ${roomId}`
    );

    return NextResponse.json({
      success: true,
      message: "Event broadcasted successfully",
    });
  } catch (error) {
    console.error("Error syncing room:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
