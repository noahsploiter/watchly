import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

export async function POST() {
  try {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    await client.connect();
    const db = client.db("middle-gate");
    const users = db.collection("users");

    // Drop the problematic email index if it exists
    try {
      await users.dropIndex("email_1");
      console.log("✅ Dropped email_1 index");
    } catch (error) {
      console.log("ℹ️  email_1 index does not exist or already dropped");
    }

    // Create proper indexes for our user model
    await users.createIndex({ username: 1 }, { unique: true });
    await users.createIndex({ phone: 1 }, { unique: true });

    await client.close();

    return NextResponse.json({
      success: true,
      message: "MongoDB indexes fixed successfully!",
    });
  } catch (error) {
    console.error("Error fixing MongoDB indexes:", error);
    return NextResponse.json(
      { error: "Failed to fix MongoDB indexes" },
      { status: 500 }
    );
  }
}
