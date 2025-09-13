import { ObjectId } from "mongodb";

export class Room {
  constructor({
    hostId,
    hostName,
    movieTitle,
    movieUrl,
    participants = [],
    isActive = true,
    roomState = "waiting",
    createdAt = new Date(),
  }) {
    this.hostId = hostId;
    this.hostName = hostName;
    this.movieTitle = movieTitle;
    this.movieUrl = movieUrl;
    this.participants = participants;
    this.isActive = isActive;
    this.roomState = roomState;
    this.createdAt = createdAt;
  }

  // Convert to JSON (exclude sensitive data)
  toJSON() {
    return {
      id: this._id,
      hostId: this.hostId,
      hostName: this.hostName,
      movieTitle: this.movieTitle,
      movieUrl: this.movieUrl,
      participants: this.participants,
      isActive: this.isActive,
      roomState: this.roomState,
      createdAt: this.createdAt,
    };
  }
}

// Database operations
export async function createRoom(roomData) {
  const client = await import("./mongodb.js").then((m) => m.default);
  const db = client.db("middle-gate");
  const rooms = db.collection("rooms");

  const room = new Room(roomData);
  const result = await rooms.insertOne(room);
  return { ...room.toJSON(), _id: result.insertedId };
}

export async function findRoomById(roomId) {
  const client = await import("./mongodb.js").then((m) => m.default);
  const db = client.db("middle-gate");
  const rooms = db.collection("rooms");

  return await rooms.findOne({ _id: new ObjectId(roomId) });
}

export async function findActiveRooms() {
  const client = await import("./mongodb.js").then((m) => m.default);
  const db = client.db("middle-gate");
  const rooms = db.collection("rooms");

  return await rooms.find({ isActive: true }).sort({ createdAt: -1 }).toArray();
}

export async function joinRoom(roomId, userId, username) {
  const client = await import("./mongodb.js").then((m) => m.default);
  const db = client.db("middle-gate");
  const rooms = db.collection("rooms");

  const room = await findRoomById(roomId);
  if (!room) {
    throw new Error("Room not found");
  }

  if (!room.isActive) {
    throw new Error("Room is not active");
  }

  // Check if user is already in the room
  const existingParticipant = room.participants.find(
    (p) => p.userId === userId
  );

  if (!existingParticipant) {
    await rooms.updateOne(
      { _id: new ObjectId(roomId) },
      {
        $push: {
          participants: {
            userId,
            username,
            joinedAt: new Date(),
          },
        },
      }
    );
  }

  return await findRoomById(roomId);
}

export async function leaveRoom(roomId, userId) {
  const client = await import("./mongodb.js").then((m) => m.default);
  const db = client.db("middle-gate");
  const rooms = db.collection("rooms");

  await rooms.updateOne(
    { _id: new ObjectId(roomId) },
    {
      $pull: {
        participants: { userId },
      },
    }
  );

  return await findRoomById(roomId);
}

export async function updateRoomState(roomId, roomState, hostId) {
  const client = await import("./mongodb.js").then((m) => m.default);
  const db = client.db("middle-gate");
  const rooms = db.collection("rooms");

  const room = await findRoomById(roomId);
  if (!room) {
    throw new Error("Room not found");
  }

  if (room.hostId !== hostId) {
    throw new Error("Only the host can update room state");
  }

  await rooms.updateOne(
    { _id: new ObjectId(roomId) },
    { $set: { roomState, updatedAt: new Date() } }
  );

  return await findRoomById(roomId);
}

export async function endRoom(roomId, hostId) {
  const client = await import("./mongodb.js").then((m) => m.default);
  const db = client.db("middle-gate");
  const rooms = db.collection("rooms");

  const room = await findRoomById(roomId);
  if (!room) {
    throw new Error("Room not found");
  }

  if (room.hostId !== hostId) {
    throw new Error("Only the host can end the room");
  }

  await rooms.updateOne(
    { _id: new ObjectId(roomId) },
    { $set: { isActive: false, endedAt: new Date() } }
  );

  return await findRoomById(roomId);
}
