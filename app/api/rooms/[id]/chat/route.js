import { NextResponse } from "next/server";
import { findRoomById } from "../../../../../lib/room";
import jwt from "jsonwebtoken";

// GET - Fetch chat messages for a room
export async function GET(request, { params }) {
  try {
    const { id: roomId } = await params;

    // Get MongoDB connection
    const client = await import("../../../../../lib/mongodb.js").then(
      (m) => m.default
    );
    const db = client.db("middle-gate");
    const chatMessages = db.collection("chatMessages");

    // Get all messages for this room, sorted by timestamp
    const messages = await chatMessages
      .find({ roomId })
      .sort({ timestamp: 1 })
      .toArray();

    return NextResponse.json({
      success: true,
      messages: messages.map((msg) => ({
        id: msg._id.toString(),
        username: msg.username,
        message: msg.message,
        timestamp: msg.timestamp,
        isHost: msg.isHost,
      })),
    });
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Send a chat message
export async function POST(request, { params }) {
  try {
    const { id: roomId } = await params;
    const { message } = await request.json();

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

    // Check if user is in the room
    const isParticipant = room.participants.some(
      (p) => p.userId === decoded.userId
    );
    if (!isParticipant) {
      return NextResponse.json(
        { error: "You are not a participant in this room" },
        { status: 403 }
      );
    }

    // Store the message in database
    const client = await import("../../../../../lib/mongodb.js").then(
      (m) => m.default
    );
    const db = client.db("middle-gate");
    const chatMessages = db.collection("chatMessages");

    const newMessage = {
      roomId,
      userId: decoded.userId,
      username: decoded.username,
      message,
      timestamp: new Date(),
      isHost: room.hostId === decoded.userId,
    };

    const result = await chatMessages.insertOne(newMessage);

    return NextResponse.json({
      success: true,
      message: {
        id: result.insertedId.toString(),
        username: newMessage.username,
        message: newMessage.message,
        timestamp: newMessage.timestamp,
        isHost: newMessage.isHost,
      },
    });
  } catch (error) {
    console.error("Error sending chat message:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
