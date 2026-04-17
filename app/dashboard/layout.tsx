import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { isDashboardAuthenticated } from "@/lib/dashboard-auth";
import {
  DASHBOARD_DATA_PROFILE_COOKIE,
  hasPeakoDataProfileConfigured,
  parseDashboardDataProfile,
} from "@/lib/dashboard-data-profile";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check dashboard password authentication
  const isAuthenticated = await isDashboardAuthenticated();
  if (!isAuthenticated) {
    return redirect("/dashboard-login");
  }

  // Get sidebar state from cookie
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
  const dataProfile = parseDashboardDataProfile(
    cookieStore.get(DASHBOARD_DATA_PROFILE_COOKIE)?.value,
  );

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar
        dataProfile={dataProfile}
        peakoProfileAvailable={hasPeakoDataProfileConfigured()}
      />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
