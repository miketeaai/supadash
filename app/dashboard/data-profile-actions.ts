"use server";

import { cookies } from "next/headers";

import {
  DASHBOARD_DATA_PROFILE_COOKIE,
  type DashboardDataProfileId,
  hasPeakoDataProfileConfigured,
} from "@/lib/dashboard-data-profile";

export async function setDashboardDataProfile(profile: DashboardDataProfileId) {
  if (profile === "peako" && !hasPeakoDataProfileConfigured()) {
    return { ok: false as const, error: "Peako profile is not configured" };
  }
  const cookieStore = await cookies();
  cookieStore.set(DASHBOARD_DATA_PROFILE_COOKIE, profile, {
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
    sameSite: "lax",
  });
  return { ok: true as const };
}
