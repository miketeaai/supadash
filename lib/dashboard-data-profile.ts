export type DashboardDataProfileId = "default" | "peako";

export const DASHBOARD_DATA_PROFILE_COOKIE = "dashboard_data_profile";

export function parseDashboardDataProfile(
  value: string | undefined,
): DashboardDataProfileId {
  return value === "peako" ? "peako" : "default";
}

/** Whether the Peako datasource env pair is set (server / build-time). */
export function hasPeakoDataProfileConfigured(): boolean {
  return Boolean(
    process.env.PEAKO_NEXT_PUBLIC_SUPABASE_URL &&
      process.env.PEAKO_NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/**
 * Supabase URL + anon key for analytics data reads.
 * Auth/session still uses the primary project in `lib/supabase/proxy.ts`.
 */
export function getServerDataSupabaseCredentials(
  profile: DashboardDataProfileId,
): { url: string; anonKey: string } {
  if (profile === "default") {
    return {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    };
  }
  const url = process.env.PEAKO_NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.PEAKO_NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    };
  }
  return { url, anonKey };
}

/**
 * Browser bundle: Peako values come from `next.config.ts` `env` mapping
 * (`NEXT_PUBLIC_PEAKO_DATASOURCE_*`) so they are available client-side.
 */
export function getBrowserDataSupabaseCredentials(
  profile: DashboardDataProfileId,
): { url: string; anonKey: string } {
  if (profile === "default") {
    return {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    };
  }
  const url = process.env.NEXT_PUBLIC_PEAKO_DATASOURCE_URL;
  const anonKey = process.env.NEXT_PUBLIC_PEAKO_DATASOURCE_ANON_KEY;
  if (!url || !anonKey) {
    return {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    };
  }
  return { url, anonKey };
}
