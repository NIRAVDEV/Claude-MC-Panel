import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth-utils";

export async function GET(request: NextRequest) {
  try {
    const { user } = await validateRequest();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      credits: user.credits,
    });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}