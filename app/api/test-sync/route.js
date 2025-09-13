import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

export async function POST(request) {
  try {
    const { roomId, type, timestamp } = await request.json();

    console.log(`Test sync: ${type} at ${timestamp} for room ${roomId}`);

    // Get MongoDB connection
    const client = await import("../../lib/mongodb.js").then((m) => m.default);
    const db = client.db("middle-gate");
    const videoEvents = db.collection("videoEvents");

    // Insert test event
    const result = await videoEvents.insertOne({
      roomId,
      type,
      timestamp: new Date(),
      videoTime: timestamp,
      hostId: "test-host",
    });

    console.log("Test event inserted:", result.insertedId);

    return NextResponse.json({
      success: true,
      message: "Test event created",
      eventId: result.insertedId,
    });
  } catch (error) {
    console.error("Error creating test event:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
