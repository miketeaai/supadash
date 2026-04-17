import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Note: Dynamic data fetching is configured per-page using `export const dynamic = "force-dynamic"`
  env: {
    // Expose Peako anon credentials to the client bundle for hooks (see `lib/dashboard-data-profile.ts`).
    NEXT_PUBLIC_PEAKO_DATASOURCE_URL:
      process.env.PEAKO_NEXT_PUBLIC_SUPABASE_URL ?? "",
    NEXT_PUBLIC_PEAKO_DATASOURCE_ANON_KEY:
      process.env.PEAKO_NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  },
};

export default nextConfig;
