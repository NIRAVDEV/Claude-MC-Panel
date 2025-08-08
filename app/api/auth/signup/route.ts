import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { lucia } from "@/lib/lucia";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: name || null,
        password: hashedPassword,
        credits: 100, // Welcome credits
      },
    });

    // Create session
    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    (await cookies()).set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);

    return NextResponse.json({
      message: "Account created successfully",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        credits: user.credits,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}