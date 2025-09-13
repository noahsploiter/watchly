const { MongoClient } = require("mongodb");

// Try different MongoDB connection strings
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://localhost:27017" ||
  "mongodb://127.0.0.1:27017";
const DB_NAME = "middle-gate";

async function addRoomStateToExistingRooms() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log("Connecting to MongoDB...");
    await client.connect();
    console.log("Connected successfully");

    const db = client.db(DB_NAME);
    const rooms = db.collection("rooms");

    // First, check all existing rooms
    const allRooms = await rooms.find({}).toArray();
    console.log(`Found ${allRooms.length} total rooms in database`);

    // Find all rooms that don't have roomState field
    const roomsWithoutState = await rooms
      .find({ roomState: { $exists: false } })
      .toArray();

    console.log(
      `Found ${roomsWithoutState.length} rooms without roomState field`
    );

    if (roomsWithoutState.length > 0) {
      // Update all rooms to have roomState: "waiting"
      const result = await rooms.updateMany(
        { roomState: { $exists: false } },
        { $set: { roomState: "waiting" } }
      );

      console.log(
        `Updated ${result.modifiedCount} rooms with roomState: "waiting"`
      );
    } else {
      console.log("All rooms already have roomState field");
    }

    // Verify the update
    const updatedRooms = await rooms.find({}).toArray();
    console.log("All rooms after update:");
    updatedRooms.forEach((room) => {
      console.log(
        `Room ${room._id}: roomState = ${room.roomState || "undefined"}`
      );
    });
  } catch (error) {
    console.error("Error updating rooms:", error);
  } finally {
    await client.close();
    console.log("Connection closed");
  }
}

addRoomStateToExistingRooms();
