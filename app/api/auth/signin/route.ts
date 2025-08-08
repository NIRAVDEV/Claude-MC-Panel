import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { lucia } from "@/lib/lucia";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 400 }
      );
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 400 }
      );
    }

    // Create session
    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    (await cookies()).set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);

    return NextResponse.json({
      message: "Signed in successfully",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        credits: user.credits,
      },
    });
  } catch (error) {
    console.error("Signin error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}