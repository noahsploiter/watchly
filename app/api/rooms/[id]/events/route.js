import { NextResponse } from "next/server";
import { subscribeToRoom, sseHeaders } from "../../../../../lib/sseHub";
import { findRoomById } from "../../../../../lib/room";

export async function GET(request, { params }) {
	try {
		const { id: roomId } = await params;
		if (!roomId) {
			return NextResponse.json({ error: "Room ID is required" }, { status: 400 });
		}

		// Seed initial snapshot so clients render immediately
		const snapshot = await findRoomById(roomId);
		const { stream, unsubscribe } = subscribeToRoom(roomId);

		const encoder = new TextEncoder();
		const initial = encoder.encode(
			`event: snapshot\n` +
			`data: ${JSON.stringify({
				roomState: snapshot?.roomState || "waiting",
				participants: snapshot?.participants || [],
				isActive: snapshot?.isActive ?? false,
			})}\n\n`
		);

		const prefixed = new ReadableStream({
			start(controller) {
				controller.enqueue(initial);
				stream.pipeTo(new WritableStream({
					write(chunk) {
						controller.enqueue(chunk);
					},
					close() {
						controller.close();
					},
					abort() {
						controller.error("aborted");
					},
				})).catch(() => {});
			},
			cancel() {
				unsubscribe();
			},
		});

		return new NextResponse(prefixed, { headers: sseHeaders() });
	} catch (error) {
		console.error("Error in SSE events route:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}


