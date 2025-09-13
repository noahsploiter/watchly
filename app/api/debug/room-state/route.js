import { NextResponse } from "next/server";
import { findRoomById } from "../../../../lib/room";
import { MongoClient } from "mongodb";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");

    if (!roomId) {
      return NextResponse.json({ error: "Room ID required" }, { status: 400 });
    }

    const room = await findRoomById(roomId);

    return NextResponse.json({
      success: true,
      room: {
        _id: room?._id,
        roomState: room?.roomState || "undefined",
        isActive: room?.isActive,
        participants: room?.participants?.length || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching room state:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { roomId, roomState } = await request.json();

    if (!roomId || !roomState) {
      return NextResponse.json(
        { error: "Room ID and state required" },
        { status: 400 }
      );
    }

    // Get MongoDB connection from the existing lib
    const client = await import("../../../../lib/mongodb.js").then(
      (m) => m.default
    );
    const db = client.db("middle-gate");
    const rooms = db.collection("rooms");

    // Update room state
    const result = await rooms.updateOne(
      { _id: new (await import("mongodb")).ObjectId(roomId) },
      { $set: { roomState } }
    );

    if (result.modifiedCount > 0) {
      return NextResponse.json({
        success: true,
        message: `Room ${roomId} state updated to: ${roomState}`,
      });
    } else {
      return NextResponse.json({
        success: false,
        message: "Room not found or not modified",
      });
    }
  } catch (error) {
    console.error("Error updating room state:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
