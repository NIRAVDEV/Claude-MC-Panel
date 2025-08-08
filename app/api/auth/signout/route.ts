import { NextRequest, NextResponse } from "next/server";
import { lucia } from "@/lib/lucia";
import { validateRequest } from "@/lib/auth-utils";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const { session } = await validateRequest();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await lucia.invalidateSession(session.id);

    const sessionCookie = lucia.createBlankSessionCookie();
    (await cookies()).set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);

    return NextResponse.json({ message: "Signed out successfully" });
  } catch (error) {
    console.error("Signout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}