import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD;
const COOKIE_NAME = "dashboard_access";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function POST(request: NextRequest) {
  if (!DASHBOARD_PASSWORD) {
    console.error("DASHBOARD_PASSWORD environment variable is not set");
    return NextResponse.json(
      { success: false, error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    const { password } = await request.json();

    if (password === DASHBOARD_PASSWORD) {
      // Create a simple token (in production, use a proper JWT or signed cookie)
      const token = Buffer.from(`${Date.now()}-${DASHBOARD_PASSWORD}`).toString("base64");

      const cookieStore = await cookies();
      cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: COOKIE_MAX_AGE,
        path: "/",
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: "Invalid password" },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}
