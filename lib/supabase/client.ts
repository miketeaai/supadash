import { createBrowserClient } from "@supabase/ssr";

import {
  DASHBOARD_DATA_PROFILE_COOKIE,
  getBrowserDataSupabaseCredentials,
  parseDashboardDataProfile,
} from "@/lib/dashboard-data-profile";

function readProfileFromDocument(): ReturnType<typeof parseDashboardDataProfile> {
  if (typeof document === "undefined") return "default";
  const escaped = DASHBOARD_DATA_PROFILE_COOKIE.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${escaped}=(default|peako)(?:;|$)`),
  );
  return parseDashboardDataProfile(match?.[1]);
}

export function createClient() {
  const profile = readProfileFromDocument();
  const { url, anonKey } = getBrowserDataSupabaseCredentials(profile);
  return createBrowserClient(url, anonKey);
}
