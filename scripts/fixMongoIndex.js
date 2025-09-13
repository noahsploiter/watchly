// Script to fix MongoDB index issues
// Run this once to fix the duplicate key error

import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

async function fixMongoIndex() {
  const client = new MongoClient(uri);

  try {
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

    console.log("✅ Created proper indexes for username and phone");
    console.log("✅ MongoDB indexes fixed successfully!");
  } catch (error) {
    console.error("❌ Error fixing MongoDB indexes:", error);
  } finally {
    await client.close();
  }
}

// Run the fix
fixMongoIndex();
