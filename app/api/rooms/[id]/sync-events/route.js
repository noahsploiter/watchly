import { NextResponse } from "next/server";
import { findRoomById } from "../../../../../lib/room";
import { MongoClient } from "mongodb";

export async function GET(request, { params }) {
  try {
    const { id: roomId } = await params;

    // Get MongoDB connection
    const client = await import("../../../../../lib/mongodb.js").then(
      (m) => m.default
    );
    const db = client.db("middle-gate");
    const videoEvents = db.collection("videoEvents");

    // Get recent video events for this room (last 30 seconds)
    const thirtySecondsAgo = new Date(Date.now() - 30000);
    const events = await videoEvents
      .find({
        roomId,
        timestamp: { $gte: thirtySecondsAgo },
      })
      .sort({ timestamp: -1 })
      .limit(20)
      .toArray();

    console.log(`Found ${events.length} video events for room ${roomId}`);

    return NextResponse.json({
      success: true,
      events: events.map((event) => ({
        type: event.type,
        timestamp: event.timestamp,
        videoTime: event.videoTime,
      })),
    });
  } catch (error) {
    console.error("Error fetching video events:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
