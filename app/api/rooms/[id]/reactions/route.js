import { NextResponse } from "next/server";
import { findRoomById } from "../../../../../lib/room";
import jwt from "jsonwebtoken";

// GET - Fetch reactions for a room
export async function GET(request, { params }) {
  try {
    const { id: roomId } = await params;

    // Get MongoDB connection
    const client = await import("../../../../../lib/mongodb.js").then(
      (m) => m.default
    );
    const db = client.db("middle-gate");
    const reactions = db.collection("reactions");

    // Get all reactions for this room, sorted by timestamp
    const roomReactions = await reactions
      .find({ roomId })
      .sort({ timestamp: -1 })
      .limit(50) // Limit to last 50 reactions
      .toArray();

    // Group reactions by type
    const groupedReactions = {};
    roomReactions.forEach((reaction) => {
      if (!groupedReactions[reaction.type]) {
        groupedReactions[reaction.type] = [];
      }
      groupedReactions[reaction.type].push({
        id: reaction._id.toString(),
        username: reaction.username,
        timestamp: reaction.timestamp,
      });
    });

    return NextResponse.json({
      success: true,
      reactions: groupedReactions,
    });
  } catch (error) {
    console.error("Error fetching reactions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Add a reaction
export async function POST(request, { params }) {
  try {
    const { id: roomId } = await params;
    const { type } = await request.json();

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

    // Store the reaction in database
    const client = await import("../../../../../lib/mongodb.js").then(
      (m) => m.default
    );
    const db = client.db("middle-gate");
    const reactions = db.collection("reactions");

    const newReaction = {
      roomId,
      userId: decoded.userId,
      username: decoded.username,
      type,
      timestamp: new Date(),
    };

    const result = await reactions.insertOne(newReaction);

    return NextResponse.json({
      success: true,
      reaction: {
        id: result.insertedId.toString(),
        username: newReaction.username,
        type: newReaction.type,
        timestamp: newReaction.timestamp,
      },
    });
  } catch (error) {
    console.error("Error adding reaction:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
