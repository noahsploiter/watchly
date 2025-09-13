import bcrypt from "bcryptjs";

export class User {
  constructor({ username, phone, password, createdAt = new Date() }) {
    this.username = username;
    this.phone = phone;
    this.password = password;
    this.createdAt = createdAt;
  }

  // Hash password before saving
  async hashPassword() {
    const saltRounds = 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
  }

  // Verify password
  async verifyPassword(password) {
    return await bcrypt.compare(password, this.password);
  }

  // Convert to JSON (exclude password)
  toJSON() {
    return {
      username: this.username,
      phone: this.phone,
      createdAt: this.createdAt,
    };
  }
}

// Database operations
export async function createUser(userData) {
  const client = await import("./mongodb.js").then((m) => m.default);
  const db = client.db("middle-gate");
  const users = db.collection("users");

  // Check if user already exists
  const existingUser = await users.findOne({
    $or: [{ username: userData.username }, { phone: userData.phone }],
  });

  if (existingUser) {
    throw new Error("User already exists with this username or phone number");
  }

  // Create new user
  const user = new User(userData);
  await user.hashPassword();

  try {
    const result = await users.insertOne(user);
    return { ...user.toJSON(), _id: result.insertedId };
  } catch (error) {
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      throw new Error(`User already exists with this ${field}`);
    }
    throw error;
  }
}

export async function findUserByUsername(username) {
  const client = await import("./mongodb.js").then((m) => m.default);
  const db = client.db("middle-gate");
  const users = db.collection("users");

  return await users.findOne({ username });
}

export async function findUserByPhone(phone) {
  const client = await import("./mongodb.js").then((m) => m.default);
  const db = client.db("middle-gate");
  const users = db.collection("users");

  return await users.findOne({ phone });
}
