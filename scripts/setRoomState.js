const { MongoClient } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = "middle-gate";

async function setRoomState() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log("Connecting to MongoDB...");
    await client.connect();
    console.log("Connected successfully");

    const db = client.db(DB_NAME);
    const rooms = db.collection("rooms");

    // Get the room ID from command line argument
    const roomId = process.argv[2];
    const newState = process.argv[3] || "playing";

    if (!roomId) {
      console.log("Usage: node setRoomState.js <roomId> [state]");
      console.log(
        "Example: node setRoomState.js 68c4f74d42e55cfeeebddc37 playing"
      );
      return;
    }

    // Update the room state
    const result = await rooms.updateOne(
      { _id: new (require("mongodb").ObjectId)(roomId) },
      { $set: { roomState: newState } }
    );

    if (result.modifiedCount > 0) {
      console.log(`Room ${roomId} state updated to: ${newState}`);
    } else {
      console.log(`Room ${roomId} not found or not modified`);
    }

    // Verify the update
    const room = await rooms.findOne({
      _id: new (require("mongodb").ObjectId)(roomId),
    });
    if (room) {
      console.log(`Current room state: ${room.roomState || "undefined"}`);
    }
  } catch (error) {
    console.error("Error updating room state:", error);
  } finally {
    await client.close();
    console.log("Connection closed");
  }
}

setRoomState();
