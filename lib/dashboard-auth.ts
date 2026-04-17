import { cookies } from "next/headers";

const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD;
const COOKIE_NAME = "dashboard_access";

export async function isDashboardAuthenticated(): Promise<boolean> {
  if (!DASHBOARD_PASSWORD) {
    console.error("DASHBOARD_PASSWORD environment variable is not set");
    return false;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return false;
  }

  try {
    // Decode and verify the token contains our password signature
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    return decoded.includes(DASHBOARD_PASSWORD);
  } catch {
    return false;
  }
}

export async function clearDashboardAuth(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
