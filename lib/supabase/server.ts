import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import {
  DASHBOARD_DATA_PROFILE_COOKIE,
  getServerDataSupabaseCredentials,
  parseDashboardDataProfile,
} from "@/lib/dashboard-data-profile";

/**
 * Especially important if using Fluid compute: Don't put this client in a
 * global variable. Always create a new client within each function when using
 * it.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const profile = parseDashboardDataProfile(
    cookieStore.get(DASHBOARD_DATA_PROFILE_COOKIE)?.value,
  );
  const { url, anonKey } = getServerDataSupabaseCredentials(profile);

  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have proxy refreshing
            // user sessions.
          }
        },
      },
    },
  );
}
