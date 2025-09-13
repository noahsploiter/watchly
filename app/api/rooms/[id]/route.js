import { NextResponse } from "next/server";
import { findRoomById } from "../../../../lib/room";

export async function GET(request, { params }) {
  try {
    const { id: roomId } = await params;

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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
