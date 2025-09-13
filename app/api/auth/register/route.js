import { NextResponse } from "next/server";
import { createUser } from "../../../../lib/user";
import jwt from "jsonwebtoken";

export async function POST(request) {
  try {
    const { username, phone, password } = await request.json();

    // Validate input
    if (!username || !phone || !password) {
      return NextResponse.json(
        { error: "Username, phone, and password are required" },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // Validate username format
    if (username.length < 3) {
      return NextResponse.json(
        { error: "Username must be at least 3 characters long" },
        { status: 400 }
      );
    }

    // Validate phone format (09XXXXXXXXX)
    const phoneRegex = /^09[0-9]{8}$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        {
          error:
            "Please enter a valid phone number starting with 09 (10 digits total)",
        },
        { status: 400 }
      );
    }

    // Create user
    const user = await createUser({
      username,
      phone,
      password,
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Return success response with token
    return NextResponse.json(
      {
        success: true,
        message: "User registered successfully",
        user: user,
        token: token,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);

    if (
      error.message === "User already exists with this username or phone number"
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
