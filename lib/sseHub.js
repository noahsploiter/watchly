// Simple in-memory SSE hub for per-room subscriptions

const roomIdToClients = new Map(); // roomId -> Map(clientId -> writer)

let nextClientId = 1;

function getRoomClients(roomId) {
	if (!roomIdToClients.has(roomId)) {
		roomIdToClients.set(roomId, new Map());
	}
	return roomIdToClients.get(roomId);
}

export function subscribeToRoom(roomId) {
	const clients = getRoomClients(roomId);
	const clientId = String(nextClientId++);

	// Create a TransformStream to get a writable for pushing events
	const stream = new TransformStream();
	const writer = stream.writable.getWriter();

	clients.set(clientId, writer);

	// Send an initial comment to open the stream promptly
	void writer.write(encodeSseComment(`connected ${Date.now()}`));

	const keepAliveInterval = setInterval(() => {
		void writer.write(encodeSseComment("keepalive"));
	}, 15000);

	const unsubscribe = async () => {
		clearInterval(keepAliveInterval);
		try {
			clients.delete(clientId);
			await writer.close();
		} catch (_) {}
	};

	return { stream: stream.readable, clientId, unsubscribe };
}

export function publishToRoom(roomId, event) {
	const clients = getRoomClients(roomId);
	if (!clients || clients.size === 0) return;
	const payload = JSON.stringify(event);
	const chunk = encodeSseData(payload);
	for (const [, writer] of clients.entries()) {
		void writer.write(chunk).catch(() => {
			// On error, drop the client
			for (const [id, w] of clients.entries()) {
				if (w === writer) {
					clients.delete(id);
					break;
				}
			}
		});
	}
}

function encodeSseData(data) {
	return new TextEncoder().encode(`data: ${data}\n\n`);
}

function encodeSseComment(comment) {
	return new TextEncoder().encode(`: ${comment}\n\n`);
}

export function sseHeaders() {
	return {
		"Content-Type": "text/event-stream",
		"Cache-Control": "no-cache, no-transform",
		Connection: "keep-alive",
		// Allow CORS for client EventSource if needed
		"Access-Control-Allow-Origin": "*",
	};
}


