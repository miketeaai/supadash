import { NextResponse } from "next/server";
import { clearDashboardAuth } from "@/lib/dashboard-auth";

export async function POST() {
  await clearDashboardAuth();
  return NextResponse.json({ success: true });
}

